import { Incident, ServiceComponent, ServiceStatus } from '../fetchers/types';


type StatusIndicator = ServiceStatus['status'];

const fetchOpts = { cache: 'no-store' as const };

const statusPageHosts = {
  openai: 'status.openai.com',
  anthropic: 'status.anthropic.com',
  grok: 'status.x.ai'
};

const googleStatusJson = 'https://status.cloud.google.com/incidents.json';
const openAiRss = 'https://status.openai.com/feed.rss';
const openAiProxy = 'https://status.openai.com/proxy/status.openai.com';

const nowIso = () => new Date().toISOString();

const indicatorMap: Record<string, StatusIndicator> = {
  none: 'operational',
  minor: 'degraded',
  maintenance: 'maintenance',
  major: 'partial_outage',
  critical: 'outage'
};

const parseIndicator = (indicator?: string): StatusIndicator => {
  if (!indicator) return 'unknown';
  return indicatorMap[indicator] ?? 'unknown';
};

const parseComponentStatus = (status: string): ServiceComponent['status'] => {
  if (status === 'operational') return 'operational';
  if (status === 'degraded_performance') return 'degraded';
  if (status === 'partial_outage') return 'partial_outage';
  if (status === 'major_outage') return 'outage';
  if (status === 'under_maintenance') return 'maintenance';
  return 'unknown';
};

const inferFromIncidents = (incidents: Incident[]): StatusIndicator => {
  if (!incidents.length) return 'operational';
  const impacts = incidents.map((i) => i.impact).filter(Boolean) as Incident['impact'][];
  if (impacts.includes('critical') || impacts.includes('major')) return 'outage';
  if (impacts.includes('minor')) return 'partial_outage';
  return 'degraded';
};

const scrapeStatusFromHtml = (html: string): { status: StatusIndicator; message?: string } => {
  const lower = html.toLowerCase();
  if (lower.includes('all systems operational')) {
    return { status: 'operational', message: 'All systems operational (scraped)' };
  }
  if (lower.includes('partial outage')) return { status: 'partial_outage', message: 'Partial outage (scraped)' };
  if (lower.includes('major outage') || lower.includes('service disruption')) {
    return { status: 'outage', message: 'Major outage (scraped)' };
  }
  if (lower.includes('degraded performance')) return { status: 'degraded', message: 'Degraded performance (scraped)' };
  if (lower.includes('maintenance')) return { status: 'maintenance', message: 'Maintenance (scraped)' };
  return { status: 'unknown', message: 'Unable to scrape status' };
};

const safeFetchJson = async <T>(url: string) => {
  const res = await fetch(url, fetchOpts);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return (await res.json()) as T;
};

const safeFetchText = async (url: string) => {
  const res = await fetch(url, fetchOpts);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
};

const buildStatus = (partial: Partial<ServiceStatus> & { id: string; name: string; provider: string }): ServiceStatus => ({
  status: 'unknown',
  lastChecked: nowIso(),
  incidents: [],
  message: 'Status unavailable',
  components: [],
  recentIncidents: [],
  ...partial
});

const buildSyntheticComponents = (names: string[], status: ServiceComponent['status']): ServiceComponent[] =>
  names.map((name) => ({
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    status
  }));

const fetchStatuspageComponents = async (
  host: string,
  fallbackNames: string[],
  overallStatus: StatusIndicator
): Promise<ServiceComponent[]> => {
  try {
    const { components } = await safeFetchJson<{ components: Array<any> }>(`https://${host}/api/v2/components.json`);
    const normalized = (components || []).map((component) => ({
      id: component.id,
      name: component.name,
      status: parseComponentStatus(component.status),
      description: component.description,
      group: component.group_id || component.group
    }));

    if (normalized.length) return normalized;
    return buildSyntheticComponents(fallbackNames, overallStatus);
  } catch {
    return buildSyntheticComponents(fallbackNames, overallStatus);
  }
};

const fetchStatuspageHistory = async (host: string): Promise<Incident[]> => {
  try {
    const history = await safeFetchJson<{ incidents: Array<any> }>(`https://${host}/api/v2/incidents.json`);
    return (history?.incidents || []).slice(0, 12).map((incident) => ({
      id: incident.id,
      name: incident.name,
      status: incident.status,
      impact: incident.impact,
      startedAt: incident.started_at || incident.created_at,
      link: incident.shortlink,
      updates: (incident.incident_updates || []).map((update: any) => ({
        body: update.body,
        at: update.created_at,
        status: update.status
      }))
    }));
  } catch {
    return [];
  }
};

const fetchStatuspageService = async (host: string, name: string, fallbackComponents: string[]): Promise<ServiceStatus> => {
  try {
    const [status, incidents, history] = await Promise.all([
      safeFetchJson<{ status: { indicator: string; description: string } }>(`https://${host}/api/v2/status.json`),
      safeFetchJson<{ incidents: Array<any> }>(`https://${host}/api/v2/incidents/unresolved.json`),
      fetchStatuspageHistory(host)
    ]);

    const normalizedIncidents: Incident[] = (incidents?.incidents || []).map((incident) => ({
      id: incident.id,
      name: incident.name,
      status: incident.status,
      impact: incident.impact,
      startedAt: incident.started_at || incident.created_at,
      link: incident.shortlink,
      updates: (incident.incident_updates || []).map((update: any) => ({
        body: update.body,
        at: update.created_at,
        status: update.status
      }))
    }));

    const serviceStatus = parseIndicator(status?.status?.indicator);
    const derivedStatus = serviceStatus === 'unknown' ? inferFromIncidents(normalizedIncidents) : serviceStatus;
    const components = await fetchStatuspageComponents(host, fallbackComponents, derivedStatus);

    return buildStatus({
      id: host,
      name,
      provider: host,
      status: normalizedIncidents.length ? derivedStatus : serviceStatus,
      message: status?.status?.description || 'No description',
      lastChecked: nowIso(),
      incidents: normalizedIncidents,
      components,
      recentIncidents: history
    });
  } catch (error) {
    try {
      const html = await safeFetchText(`https://${host}/`);
      const scraped = scrapeStatusFromHtml(html);
      return buildStatus({
        id: host,
        name,
        provider: host,
        status: scraped.status,
        message: scraped.message,
        lastChecked: nowIso(),
        incidents: [],
        components: [],
        recentIncidents: []
      });
    } catch (scrapeError) {
      return buildStatus({
        id: host,
        name,
        provider: host,
        message: (error as Error).message,
        status: 'unknown',
        lastChecked: nowIso(),
        incidents: [],
        components: [],
        recentIncidents: []
      });
    }
  }
};

const fetchGoogleGeminiStatus = async (): Promise<ServiceStatus> => {
  try {
    const incidents = await safeFetchJson<any[]>(googleStatusJson);
    const relevant = (incidents || []).filter((incident) => {
      const products = incident?.products || incident?.service_name || '';
      const str = Array.isArray(products) ? products.join(' ').toLowerCase() : String(products).toLowerCase();
      return str.includes('gemini') || str.includes('vertex ai') || str.includes('generative');
    });

    const normalizedIncidents: Incident[] = relevant.map((incident) => ({
      id: incident.id || incident.external_desc || incident.msid || Math.random().toString(36).slice(2),
      name: incident.summary || incident.external_desc || 'Gemini incident',
      status: incident.most_recent_update?.status || 'investigating',
      impact: incident.impact || incident.severity,
      startedAt: incident.begin || incident.external_desc,
      link: incident.uri || incident.public_url,
      updates: (incident.updates || []).map((u: any) => ({
        body: u.text || u.body,
        at: u.when || u.created,
        status: u.status || u.update_type
      }))
    }));

    const status = inferFromIncidents(normalizedIncidents);

    return buildStatus({
      id: 'gemini',
      name: 'Gemini (Google)',
      provider: 'status.cloud.google.com',
      status,
      message: normalizedIncidents.length ? 'Active Gemini-related incidents' : 'Operational',
      lastChecked: nowIso(),
      incidents: normalizedIncidents,
      components: [
        { id: 'gemini-core', name: 'Gemini APIs', status },
        { id: 'gemini-vertex', name: 'Vertex AI generative services', status }
      ]
    });
  } catch (error) {
    try {
      const html = await safeFetchText('https://status.cloud.google.com/');
      const scraped = scrapeStatusFromHtml(html);
      return buildStatus({
        id: 'gemini',
        name: 'Gemini (Google)',
        provider: 'status.cloud.google.com',
        status: scraped.status,
      message: scraped.message,
      lastChecked: nowIso(),
      incidents: [],
      components: [
        { id: 'gemini-core', name: 'Gemini APIs', status: scraped.status },
        { id: 'gemini-vertex', name: 'Vertex AI generative services', status: scraped.status }
      ]
    });
  } catch {
      return buildStatus({
        id: 'gemini',
        name: 'Gemini (Google)',
        provider: 'status.cloud.google.com',
        status: 'unknown',
        message: (error as Error).message,
        lastChecked: nowIso(),
        incidents: [],
        components: [
          { id: 'gemini-core', name: 'Gemini APIs', status: 'unknown' },
          { id: 'gemini-vertex', name: 'Vertex AI generative services', status: 'unknown' }
        ]
      });
    }
  }
};

// updated
const parseRssValue = (item: string, tag: string) => {
  const match = item.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!match) return '';
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim();
};


const parseImpactFromTitle = (title: string): Incident['impact'] => {
  const lower = title.toLowerCase();
  if (lower.includes('major')) return 'major';
  if (lower.includes('partial') || lower.includes('degraded')) return 'minor';
  if (lower.includes('outage')) return 'critical';
  return undefined;
};

const isResolvedTitle = (title: string) => title.toLowerCase().includes('resolved');

const normalizeProxyComponent = (component: any): ServiceComponent => ({
  id: component.id || component.component_id || component.name || Math.random().toString(36).slice(2),
  name: component.name || component.display_name || 'Component',
  status: parseComponentStatus(component.status),
  description: component.description,
  group: component.group || component.group_id || component.parent
});

const collectComponentsFromStructure = (structure: any, componentsById: Map<string, any>, targetGroups: string[]) => {
  const results: any[] = [];
  const walk = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const name = typeof node.name === 'string' ? node.name.toLowerCase() : '';
    const isTarget = targetGroups.includes(name);
    if (isTarget) {
      const refs = (node.components || node.component_ids || node.children || []).flat();
      refs.forEach((ref: any) => {
        if (typeof ref === 'string' && componentsById.has(ref)) {
          results.push(componentsById.get(ref));
        } else if (ref && typeof ref === 'object') {
          results.push(ref);
        }
      });
    }
    const children = node.children || node.nodes || node.subgroups || node.component_groups || node.groups;
    if (children) walk(children);
  };
  walk(structure);
  return results;
};

const deriveStatusFromComponents = (components: ServiceComponent[], fallback: ServiceStatus['status']) => {
  if (!components.length) return fallback;
  const severityRank: Record<ServiceComponent['status'], number> = {
    operational: 0,
    maintenance: 1,
    degraded: 2,
    partial_outage: 3,
    outage: 4,
    unknown: 1
  };
  const worst = components.reduce((max, c) => Math.max(max, severityRank[c.status] ?? 0), 0);
  const inverse: Record<number, ServiceStatus['status']> = {
    0: 'operational',
    1: 'maintenance',
    2: 'degraded',
    3: 'partial_outage',
    4: 'outage'
  };
  return inverse[worst] ?? fallback;
};

const fetchOpenAiRssStatus = async (): Promise<ServiceStatus> => {
  try {
    const rss = await safeFetchText(openAiRss);
    const items = Array.from(rss.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map((m) => m[1]);

    const incidents: Incident[] = items
      .map((item) => {
        const title = parseRssValue(item, 'title');
        const link = parseRssValue(item, 'link');
        const pubDate = parseRssValue(item, 'pubDate');
        const description = parseRssValue(item, 'description');

        return {
          id: link || title || Math.random().toString(36).slice(2),
          name: title || 'OpenAI incident',
          status: isResolvedTitle(title) ? 'resolved' : 'investigating',
          impact: parseImpactFromTitle(title),
          startedAt: pubDate,
          link,
          updates: description
            ? [
                {
                  body: description,
                  at: pubDate,
                  status: isResolvedTitle(title) ? 'resolved' : 'update'
                }
              ]
            : []
        } as Incident;
      })
      .filter((incident) => !isResolvedTitle(incident.name));

    const status = incidents.length ? inferFromIncidents(incidents) : 'operational';
    return buildStatus({
      id: 'openai',
      name: 'OpenAI',
      provider: 'status.openai.com (RSS)',
      status,
      message: incidents.length ? 'Active incidents from RSS feed' : 'Operational',
      lastChecked: nowIso(),
      incidents,
      components: buildSyntheticComponents(['API', 'Chat Completions', 'Embeddings', 'Batch API'], status)
    });
  } catch (error) {
    return buildStatus({
      id: 'openai',
      name: 'OpenAI',
      provider: 'status.openai.com (RSS)',
      status: 'unknown',
      message: (error as Error).message,
      lastChecked: nowIso(),
      incidents: [],
      components: buildSyntheticComponents(['API', 'Chat Completions', 'Embeddings', 'Batch API'], 'unknown')
    });
  }
};

const fetchOpenAiRssHistory = async (): Promise<Incident[]> => {
  try {
    const rss = await safeFetchText(openAiRss);
    const items = Array.from(rss.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map((m) => m[1]);
    return items.slice(0, 15).map((item) => {
      const title = parseRssValue(item, 'title');
      const link = parseRssValue(item, 'link');
      const pubDate = parseRssValue(item, 'pubDate');
      const description = parseRssValue(item, 'description');
      return {
        id: link || title || Math.random().toString(36).slice(2),
        name: title || 'OpenAI incident',
        status: isResolvedTitle(title) ? 'resolved' : 'investigating',
        impact: parseImpactFromTitle(title),
        startedAt: pubDate,
        link,
        updates: description
          ? [
              {
                body: description,
                at: pubDate,
                status: isResolvedTitle(title) ? 'resolved' : 'update'
              }
            ]
          : []
      } as Incident;
    });
  } catch {
    return [];
  }
};

const fetchOpenAiProxyStatus = async (): Promise<ServiceStatus> => {
  try {
    const data = await safeFetchJson<any>(openAiProxy);
    const indicator = parseIndicator(data.status?.indicator);
    const incidentsRaw = data.incidents || data.unresolved_incidents || data.active_incidents || [];
    const incidents: Incident[] = (Array.isArray(incidentsRaw) ? incidentsRaw : []).map((incident) => ({
      id: incident.id || incident.shortlink || incident.name || Math.random().toString(36).slice(2),
      name: incident.name || incident.title || 'OpenAI incident',
      status: incident.status || 'investigating',
      impact: incident.impact || parseImpactFromTitle(incident.name || incident.title || ''),
      startedAt: incident.started_at || incident.created_at || incident.updated_at,
      link: incident.shortlink || incident.url || incident.page_url,
      updates: (incident.incident_updates || incident.updates || []).map((u: any) => ({
        body: u.body || u.text,
        at: u.created_at || u.updated_at || u.when,
        status: u.status || u.type
      }))
    }));

    const componentsArray = Array.isArray(data.components) ? data.components : [];
    const componentsById = new Map<string, any>(componentsArray.map((c: any) => [c.id, c]));
    const targetGroups = ['apis', 'chatgpt'];
    const structureComponents = collectComponentsFromStructure(data.structure, componentsById, targetGroups);
    const candidates = structureComponents.length ? structureComponents : componentsArray;

    const normalizedComponents = (candidates || []).map(normalizeProxyComponent);
    const statusFromIncidents = incidents.length ? inferFromIncidents(incidents) : 'operational';
    const baseStatus = indicator === 'unknown' ? statusFromIncidents : indicator;
    const derivedStatus = deriveStatusFromComponents(normalizedComponents, baseStatus);
    const components = normalizedComponents.length
      ? normalizedComponents
      : buildSyntheticComponents(['API', 'Chat Completions', 'Embeddings', 'Batch API'], derivedStatus);

    const recentIncidents = await fetchOpenAiRssHistory();

    return buildStatus({
      id: 'openai',
      name: 'OpenAI',
      provider: 'status.openai.com (proxy)',
      status: derivedStatus,
      message: incidents.length ? 'Active incidents via proxy feed' : 'Operational',
      lastChecked: nowIso(),
      incidents,
      components,
      recentIncidents
    });
  } catch (error) {
    return fetchOpenAiRssStatus().catch(() =>
      buildStatus({
        id: 'openai',
        name: 'OpenAI',
        provider: 'status.openai.com (proxy)',
        status: 'unknown',
        message: (error as Error).message,
        lastChecked: nowIso(),
        incidents: [],
        components: buildSyntheticComponents(['API', 'Chat Completions', 'Embeddings', 'Batch API'], 'unknown')
      })
    );
  }
};




export const fetchServiceStatuses = async (): Promise<ServiceStatus[]> => {
  const services: Array<Promise<ServiceStatus>> = [
    fetchOpenAiProxyStatus().then((s) => ({
      ...s,
      id: 'openai',
      name: 'OpenAI',
      provider: 'status.openai.com',
    })),

    fetchStatuspageService(
      statusPageHosts.anthropic,
      'Anthropic Claude',
      ['Messages API', 'Batch API']
    ).then((s) => ({
      ...s,
      id: 'anthropic',
      name: 'Anthropic Claude',
      provider: 'status.anthropic.com',
    })),

    fetchStatuspageService(
      statusPageHosts.grok,
      'Grok (xAI)',
      ['Grok API']
    ).then((s) => ({
      ...s,
      id: 'grok',
      name: 'Grok (xAI)',
      provider: 'status.x.ai',
    })),

    fetchGoogleGeminiStatus().then((s) => ({
      ...s,
      id: 'gemini',
      name: 'Gemini (Google)',
      provider: 'status.cloud.google.com',
    })),
  ];

  const results = await Promise.all(
    services.map((svc) =>
      svc.catch((error) =>
        buildStatus({
          id: 'unknown',
          name: 'Unknown Service',
          provider: 'unknown',
          status: 'unknown',
          lastChecked: new Date().toISOString(),
          message: (error as Error).message,
          incidents: [],
        })
      )
    )
  );

  // // ✅ Send to BACKEND (NestJS)
  // try {
  //   await fetch('http://localhost:3001/status/snapshots', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(results),
  //   });
  // } catch (err) {
  //   console.error('Failed to persist snapshots:', err);
  // }

  return results;
};