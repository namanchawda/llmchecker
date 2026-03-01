import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial migration — creates all tables from scratch.
 *
 * Generated from entities:
 *   - User (auth)
 *   - Provider
 *   - StatusSnapshot
 *   - CurrentStatusSnapshot
 *   - Incident
 *   - ProviderComponentStatus
 *   - ProviderRecentIncident
 *   - Prompt
 *   - PerformanceRun
 *   - CurrentPerformanceRun
 *   - PromptMonitorJob
 *   - PromptMonitorRun
 *   - PromptMonitorStatus
 *   - PromptMonitorIncident
 *   - NotificationIntegration
 */
export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /* ── User ────────────────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id"            UUID                NOT NULL DEFAULT uuid_generate_v4(),
        "name"          CHARACTER VARYING   NOT NULL,
        "email"         CHARACTER VARYING   NOT NULL,
        "passwordHash"  CHARACTER VARYING,
        "googleId"      CHARACTER VARYING,
        "emailVerified" BOOLEAN             NOT NULL DEFAULT false,
        "otpCode"       CHARACTER VARYING,
        "otpExpiresAt"  TIMESTAMP WITH TIME ZONE,
        "apiKey"        CHARACTER VARYING,
        "apiKeyQuota"   INTEGER             NOT NULL DEFAULT 0,
        "createdAt"     TIMESTAMP           NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_email" UNIQUE ("email")
      )
    `);

    /* ── Provider ────────────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "provider" (
        "id"    CHARACTER VARYING NOT NULL,
        "name"  CHARACTER VARYING NOT NULL,
        "host"  CHARACTER VARYING NOT NULL,
        CONSTRAINT "PK_provider" PRIMARY KEY ("id")
      )
    `);

    /* ── StatusSnapshot ──────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "status_snapshot" (
        "id"          UUID                     NOT NULL DEFAULT uuid_generate_v4(),
        "status"      CHARACTER VARYING        NOT NULL,
        "message"     CHARACTER VARYING,
        "checkedAt"   TIMESTAMP WITH TIME ZONE NOT NULL,
        "providerId"  CHARACTER VARYING        NOT NULL,
        CONSTRAINT "PK_status_snapshot" PRIMARY KEY ("id"),
        CONSTRAINT "FK_status_snapshot_provider"
          FOREIGN KEY ("providerId") REFERENCES "provider"("id") ON DELETE CASCADE
      )
    `);

    /* ── CurrentStatusSnapshot ───────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "current_status_snapshot" (
        "id"          UUID                     NOT NULL DEFAULT uuid_generate_v4(),
        "status"      CHARACTER VARYING        NOT NULL,
        "message"     CHARACTER VARYING,
        "checkedAt"   TIMESTAMP WITH TIME ZONE NOT NULL,
        "providerId"  CHARACTER VARYING        NOT NULL,
        CONSTRAINT "PK_current_status_snapshot" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_current_status_snapshot_provider" UNIQUE ("providerId"),
        CONSTRAINT "FK_current_status_snapshot_provider"
          FOREIGN KEY ("providerId") REFERENCES "provider"("id") ON DELETE CASCADE
      )
    `);

    /* ── Incident ────────────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "incident" (
        "id"                UUID                     NOT NULL DEFAULT uuid_generate_v4(),
        "name"              CHARACTER VARYING        NOT NULL,
        "status"            CHARACTER VARYING        NOT NULL,
        "impact"            CHARACTER VARYING,
        "startedAt"         TIMESTAMP WITH TIME ZONE,
        "link"              CHARACTER VARYING,
        "providerId"        CHARACTER VARYING        NOT NULL,
        "currentSnapshotId" UUID                     NOT NULL,
        CONSTRAINT "PK_incident" PRIMARY KEY ("id"),
        CONSTRAINT "FK_incident_provider"
          FOREIGN KEY ("providerId") REFERENCES "provider"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_incident_current_snapshot"
          FOREIGN KEY ("currentSnapshotId") REFERENCES "current_status_snapshot"("id") ON DELETE CASCADE
      )
    `);

    /* ── ProviderComponentStatus ─────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "provider_component_status" (
        "id"           UUID                     NOT NULL DEFAULT uuid_generate_v4(),
        "componentKey" CHARACTER VARYING        NOT NULL,
        "name"         CHARACTER VARYING        NOT NULL,
        "group"        CHARACTER VARYING,
        "status"       CHARACTER VARYING        NOT NULL,
        "description"  CHARACTER VARYING,
        "updatedAt"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "providerId"   CHARACTER VARYING        NOT NULL,
        CONSTRAINT "PK_provider_component_status" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_provider_component_status_key" UNIQUE ("providerId", "componentKey"),
        CONSTRAINT "FK_provider_component_status_provider"
          FOREIGN KEY ("providerId") REFERENCES "provider"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_provider_component_status_provider"
        ON "provider_component_status" ("providerId")
    `);

    /* ── ProviderRecentIncident ──────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "provider_recent_incident" (
        "id"         UUID                     NOT NULL DEFAULT uuid_generate_v4(),
        "externalId" CHARACTER VARYING        NOT NULL,
        "name"       CHARACTER VARYING        NOT NULL,
        "status"     CHARACTER VARYING        NOT NULL,
        "impact"     CHARACTER VARYING,
        "startedAt"  TIMESTAMP WITH TIME ZONE,
        "link"       CHARACTER VARYING,
        "createdAt"  TIMESTAMP                NOT NULL DEFAULT now(),
        "providerId" CHARACTER VARYING        NOT NULL,
        CONSTRAINT "PK_provider_recent_incident" PRIMARY KEY ("id"),
        CONSTRAINT "FK_provider_recent_incident_provider"
          FOREIGN KEY ("providerId") REFERENCES "provider"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_provider_recent_incident_dedupe"
        ON "provider_recent_incident" ("providerId", "externalId")
    `);

    /* ── Prompt ──────────────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prompt" (
        "id"        UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "name"      CHARACTER VARYING NOT NULL,
        "content"   TEXT              NOT NULL,
        "isActive"  BOOLEAN           NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_prompt" PRIMARY KEY ("id")
      )
    `);

    /* ── PerformanceRun ──────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "performance_run" (
        "id"           UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "latencyMs"    INTEGER           NOT NULL,
        "success"      BOOLEAN           NOT NULL,
        "errorType"    CHARACTER VARYING,
        "errorMessage" CHARACTER VARYING,
        "executedAt"   TIMESTAMP         NOT NULL DEFAULT now(),
        "providerId"   CHARACTER VARYING NOT NULL,
        "promptId"     UUID              NOT NULL,
        CONSTRAINT "PK_performance_run" PRIMARY KEY ("id"),
        CONSTRAINT "FK_performance_run_provider"
          FOREIGN KEY ("providerId") REFERENCES "provider"("id"),
        CONSTRAINT "FK_performance_run_prompt"
          FOREIGN KEY ("promptId") REFERENCES "prompt"("id")
      )
    `);

    /* ── CurrentPerformanceRun ───────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "current_performance_run" (
        "id"           UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "latencyMs"    INTEGER           NOT NULL,
        "success"      BOOLEAN           NOT NULL,
        "errorType"    CHARACTER VARYING,
        "errorMessage" CHARACTER VARYING,
        "executedAt"   TIMESTAMP         NOT NULL DEFAULT now(),
        "providerId"   CHARACTER VARYING NOT NULL,
        "promptId"     UUID              NOT NULL,
        CONSTRAINT "PK_current_performance_run" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_current_performance_run_provider" UNIQUE ("providerId"),
        CONSTRAINT "FK_current_performance_run_provider"
          FOREIGN KEY ("providerId") REFERENCES "provider"("id"),
        CONSTRAINT "FK_current_performance_run_prompt"
          FOREIGN KEY ("promptId") REFERENCES "prompt"("id")
      )
    `);

    /* ── PromptMonitorJob ────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prompt_monitor_job" (
        "id"              UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "provider"        CHARACTER VARYING NOT NULL,
        "model"           CHARACTER VARYING NOT NULL,
        "encryptedApiKey" CHARACTER VARYING NOT NULL,
        "prompt"          CHARACTER VARYING NOT NULL,
        "intervalSeconds" INTEGER           NOT NULL,
        "isActive"        BOOLEAN           NOT NULL DEFAULT true,
        "alertsEnabled"   BOOLEAN           NOT NULL DEFAULT true,
        "createdAt"       TIMESTAMP         NOT NULL DEFAULT now(),
        "userId"          UUID              NOT NULL,
        CONSTRAINT "PK_prompt_monitor_job" PRIMARY KEY ("id"),
        CONSTRAINT "FK_prompt_monitor_job_user"
          FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    /* ── PromptMonitorRun ────────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prompt_monitor_run" (
        "id"             UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "success"        BOOLEAN           NOT NULL,
        "responseTimeMs" INTEGER,
        "responseText"   TEXT,
        "errorType"      CHARACTER VARYING(50),
        "httpStatus"     INTEGER,
        "createdAt"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "jobId"          UUID              NOT NULL,
        CONSTRAINT "PK_prompt_monitor_run" PRIMARY KEY ("id"),
        CONSTRAINT "FK_prompt_monitor_run_job"
          FOREIGN KEY ("jobId") REFERENCES "prompt_monitor_job"("id") ON DELETE CASCADE
      )
    `);

    /* ── PromptMonitorStatus ─────────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prompt_monitor_status" (
        "id"             UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "jobId"          UUID              NOT NULL,
        "success"        BOOLEAN           NOT NULL,
        "responseTimeMs" INTEGER,
        "responseText"   TEXT,
        "errorType"      CHARACTER VARYING(50),
        "httpStatus"     INTEGER,
        "updatedAt"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_prompt_monitor_status" PRIMARY KEY ("id"),
        CONSTRAINT "FK_prompt_monitor_status_job"
          FOREIGN KEY ("jobId") REFERENCES "prompt_monitor_job"("id") ON DELETE CASCADE
      )
    `);

    /* ── PromptMonitorIncident ───────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prompt_monitor_incident" (
        "id"              UUID      NOT NULL DEFAULT uuid_generate_v4(),
        "jobId"           UUID      NOT NULL,
        "startedAt"       TIMESTAMP NOT NULL,
        "resolvedAt"      TIMESTAMP,
        "startHttpStatus" INTEGER,
        "startErrorType"  CHARACTER VARYING,
        CONSTRAINT "PK_prompt_monitor_incident" PRIMARY KEY ("id"),
        CONSTRAINT "FK_prompt_monitor_incident_job"
          FOREIGN KEY ("jobId") REFERENCES "prompt_monitor_job"("id") ON DELETE CASCADE
      )
    `);

    /* ── NotificationIntegration ─────────────────────────────── */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_integration" (
        "id"              UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "userId"          UUID              NOT NULL,
        "type"            CHARACTER VARYING NOT NULL,
        "name"            CHARACTER VARYING NOT NULL DEFAULT '',
        "webhookUrl"      CHARACTER VARYING NOT NULL DEFAULT '',
        "chatId"          CHARACTER VARYING NOT NULL DEFAULT '',
        "emailAddress"    CHARACTER VARYING NOT NULL DEFAULT '',
        "alertOnDown"     BOOLEAN           NOT NULL DEFAULT true,
        "alertOnRecovery" BOOLEAN           NOT NULL DEFAULT true,
        "isEnabled"       BOOLEAN           NOT NULL DEFAULT true,
        "createdAt"       TIMESTAMP         NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_integration" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_integration_user"
          FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_integration"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "prompt_monitor_incident"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "prompt_monitor_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "prompt_monitor_run"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "prompt_monitor_job"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "current_performance_run"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "performance_run"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "prompt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_provider_recent_incident_dedupe"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_recent_incident"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_provider_component_status_provider"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_component_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "incident"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "current_status_snapshot"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "status_snapshot"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "provider"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user"`);
  }
}