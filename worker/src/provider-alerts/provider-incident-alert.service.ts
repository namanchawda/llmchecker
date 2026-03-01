import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// All imports are from worker_src's own files — no cross-backend imports
import { ProviderIncidentAlertState } from '../status/entities/provider-incident-alert-state.entity';
import { ProviderAlertSubscription } from './provider-alert-subscription.entity';
import { NotificationIntegration } from '../notifications/entities/notification-integration.entity';
import { ProviderRecentIncident } from '../status/entities/provider-recent-incident.entity';

@Injectable()
export class ProviderIncidentAlertService {
  private readonly logger = new Logger(ProviderIncidentAlertService.name);

  constructor(
    @InjectRepository(ProviderIncidentAlertState)
    private readonly stateRepo: Repository<ProviderIncidentAlertState>,

    @InjectRepository(ProviderAlertSubscription)
    private readonly subRepo: Repository<ProviderAlertSubscription>,

    @InjectRepository(NotificationIntegration)
    private readonly integrationRepo: Repository<NotificationIntegration>,
  ) {}

  /**
   * Called every cron tick after incident ingest.
   * Receives the full list of recent incidents from the DB and decides
   * whether to fire "started" or "resolved" alerts per incident.
   */
  async processIncidents(incidents: ProviderRecentIncident[]): Promise<void> {
    for (const incident of incidents) {
      await this.processOne(incident);
    }
  }

  private async processOne(incident: ProviderRecentIncident): Promise<void> {
    const providerId = incident.provider?.id;
    if (!providerId) return;

    const { externalId, status: currentStatus } = incident;

    const existing = await this.stateRepo.findOne({
      where: { providerId, externalId },
    });

    if (!existing) {
      // Brand-new incident — skip if already resolved (avoids alerting old history on first boot)
      if (currentStatus !== 'resolved') {
        await this.fanOut(providerId, incident, 'incident_started');
      }
      await this.stateRepo.save(
        this.stateRepo.create({ providerId, externalId, lastAlertStatus: currentStatus }),
      );
      return;
    }

    // Already tracked — only fire on the resolved transition
    if (existing.lastAlertStatus !== 'resolved' && currentStatus === 'resolved') {
      await this.fanOut(providerId, incident, 'incident_resolved');
      existing.lastAlertStatus = 'resolved';
      existing.alertedAt = new Date();
      await this.stateRepo.save(existing);
    }
    // All other status changes (e.g. investigating → identified) produce no extra alert
  }

  // ── Fan-out: find all subscribers for this provider, then per-user send ──────

  private async fanOut(
    providerId: string,
    incident: ProviderRecentIncident,
    event: 'incident_started' | 'incident_resolved',
  ): Promise<void> {
    const subs = await this.subRepo.find({
      where: { providerId, alertsEnabled: true },
    });

    if (!subs.length) return;

    this.logger.log(
      `[${providerId}] ${event} — notifying ${subs.length} subscriber(s) for "${incident.name}"`,
    );

    await Promise.allSettled(
      subs.map((sub) => this.sendToUser(sub.userId, providerId, incident, event)),
    );
  }

  private async sendToUser(
    userId: string,
    providerId: string,
    incident: ProviderRecentIncident,
    event: 'incident_started' | 'incident_resolved',
  ): Promise<void> {
    const integrations = await this.integrationRepo.find({
      where: { userId, isEnabled: true },
    });

    if (!integrations.length) {
      this.logger.debug(`[${userId}] no enabled integrations — skipping`);
      return;
    }

    await Promise.allSettled(
      integrations.map((i) => this.sendViaChannel(i, providerId, incident, event)),
    );
  }

  // ── Per-channel dispatch ─────────────────────────────────────────────────────

  private async sendViaChannel(
    integration: NotificationIntegration,
    providerId: string,
    incident: ProviderRecentIncident,
    event: 'incident_started' | 'incident_resolved',
  ): Promise<void> {
    const isResolved = event === 'incident_resolved';
    const emoji = isResolved ? '🟢' : '🔴';
    const providerName = providerId.charAt(0).toUpperCase() + providerId.slice(1);
    const alertTitle = `${emoji} ${providerName} — ${isResolved ? 'Incident Resolved' : 'Incident Started'}`;
    const { name: incidentName, impact, link } = incident;
    const impactStr = impact ?? 'unknown';
    const ts = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    try {
      switch (integration.type) {
        case 'slack':
          await this.sendSlack(integration.webhookUrl, alertTitle, incidentName, impactStr, ts, isResolved, link ?? null, providerName);
          break;
        case 'discord':
          await this.sendDiscord(integration.webhookUrl, alertTitle, incidentName, impactStr, ts, isResolved, link ?? null, providerName);
          break;
        case 'teams':
          await this.sendTeams(integration.webhookUrl, alertTitle, incidentName, impactStr, ts, isResolved, link ?? null, providerName);
          break;
        case 'telegram':
          await this.sendTelegram(integration.chatId, alertTitle, incidentName, impactStr, ts, link ?? null, providerName);
          break;
        case 'email':
          await this.sendEmail(integration.emailAddress, alertTitle, incidentName, impactStr, ts, isResolved, link ?? null, providerName);
          break;
      }
      this.logger.log(`✅ ${integration.type} alert sent (${event}) → user ${integration.userId}`);
    } catch (err) {
      this.logger.error(
        `❌ ${integration.type} alert failed → user ${integration.userId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // ── Slack ────────────────────────────────────────────────────────────────────

  private async sendSlack(
    url: string, alertTitle: string, incidentName: string, impact: string,
    ts: string, isResolved: boolean, link: string | null, providerName: string,
  ) {
    const color = isResolved ? '#22c55e' : '#ef4444';
    const blocks: any[] = [
      { type: 'header', text: { type: 'plain_text', text: alertTitle } },
      { type: 'section', text: { type: 'mrkdwn', text: `*Provider:* ${providerName}` } },
      { type: 'section', text: { type: 'mrkdwn', text: `*Incident:* ${incidentName}` } },
      { type: 'section', text: { type: 'mrkdwn', text: `*Impact:* \`${impact}\`` } },
    ];
    if (link) {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*Details:* <${link}|View status page>` } });
    }
    blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `_${ts}_` }] });
    await this.post(url, { attachments: [{ color, blocks }] });
  }

  // ── Discord ──────────────────────────────────────────────────────────────────

  private async sendDiscord(
    url: string, alertTitle: string, incidentName: string, impact: string,
    ts: string, isResolved: boolean, link: string | null, providerName: string,
  ) {
    let description = `**Provider:** ${providerName}\n**Incident:** ${incidentName}\n**Impact:** \`${impact}\``;
    if (link) description += `\n**Details:** [View status page](${link})`;
    await this.post(url, {
      embeds: [{
        title: alertTitle,
        description,
        color: isResolved ? 0x22c55e : 0xef4444,
        footer: { text: `LLM Monitor • ${ts}` },
      }],
    });
  }

  // ── Microsoft Teams ──────────────────────────────────────────────────────────

  private async sendTeams(
    url: string, alertTitle: string, incidentName: string, impact: string,
    ts: string, isResolved: boolean, link: string | null, providerName: string,
  ) {
    const body: any[] = [
      { type: 'TextBlock', text: `**${alertTitle}**`, size: 'Medium', weight: 'Bolder', color: isResolved ? 'Good' : 'Attention' },
      { type: 'TextBlock', text: `Provider: ${providerName}`, wrap: true },
      { type: 'TextBlock', text: incidentName, wrap: true },
      { type: 'TextBlock', text: `Impact: ${impact}`, wrap: true, size: 'Small' },
    ];
    if (link) {
      body.push({ type: 'TextBlock', text: `[View status page](${link})`, wrap: true, size: 'Small' });
    }
    body.push({ type: 'TextBlock', text: ts, isSubtle: true, size: 'Small' });
    await this.post(url, {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body,
        },
      }],
    });
  }

  // ── Telegram ─────────────────────────────────────────────────────────────────

  private async sendTelegram(
    chatId: string, alertTitle: string, incidentName: string, impact: string,
    ts: string, link: string | null, providerName: string,
  ) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set');
    const linkLine = link ? `\n🔗 <a href="${link}">View status page</a>` : '';
    const text =
      `<b>${alertTitle}</b>\n\n` +
      `<b>Provider:</b> ${providerName}\n` +
      `<b>Incident:</b> ${incidentName}\n` +
      `<b>Impact:</b> <code>${impact}</code>` +
      linkLine +
      `\n\n<i>${ts}</i>`;
    await this.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
  }

  // ── Email ────────────────────────────────────────────────────────────────────

  private async sendEmail(
    to: string, alertTitle: string, incidentName: string, impact: string,
    ts: string, isResolved: boolean, link: string | null, providerName: string,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require('nodemailer');
    const color = isResolved ? '#22c55e' : '#ef4444';
    const linkBlock = link
      ? `<div style="margin-top:12px"><a href="${link}" style="color:#60a5fa;font-size:13px">View status page →</a></div>`
      : '';
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f1117;color:#e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:${color};padding:20px 24px">
          <h2 style="margin:0;color:#fff;font-size:18px">${alertTitle}</h2>
        </div>
        <div style="padding:24px">
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Provider</p>
          <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#e2e8f0">${providerName}</p>
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Incident</p>
          <p style="margin:0 0 16px;font-size:14px;color:#cbd5e1">${incidentName}</p>
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Impact</p>
          <p style="margin:0 0 0;font-family:monospace;color:#fca5a5;font-size:13px">${impact}</p>
          ${linkBlock}
          <p style="margin:20px 0 0;font-size:12px;color:#64748b">${ts}</p>
        </div>
        <div style="padding:12px 24px;background:#1e2433;font-size:11px;color:#475569">
          Sent by LLM Monitor — provider incident alerts
        </div>
      </div>`;

    let transporter: any;
    if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'LLM Monitor <noreply@llmmonitor.io>',
      to,
      subject: `[LLM Monitor] ${alertTitle}`,
      html,
    });
  }

  // ── HTTP helper ──────────────────────────────────────────────────────────────

  private async post(url: string, body: object): Promise<void> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }
}