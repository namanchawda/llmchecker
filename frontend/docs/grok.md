# Grok (xAI) status integration

- Status API: `https://status.x.ai/api/v2/status.json`
- Incident feed: `https://status.x.ai/api/v2/incidents/unresolved.json`
- Component drilldown: `https://status.x.ai/api/v2/components.json` (used when available to show API/chat service pieces)
- The monitor maps `status.indicator` to dashboard states and displays unresolved incidents with `name`, `status`, `impact`, `started_at`, `incident_updates`.
- Scraping fallback: if the API is unreachable, the app will fetch `https://status.x.ai/` and look for common Statuspage keywords to approximate health.
- Note: if xAI relocates their status page, update the host value in `lib/statusProviders.ts` (the helper works for any Statuspage-backed domain).
