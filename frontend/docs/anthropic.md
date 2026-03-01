# Anthropic (Claude) status integration

- Status API: `https://status.anthropic.com/api/v2/status.json`
- Incident feed: `https://status.anthropic.com/api/v2/incidents/unresolved.json`
- Component drilldown: `https://status.anthropic.com/api/v2/components.json` (mirrors Statuspage "API" and related components)
- Mapping mirrors OpenAI: `status.indicator` -> dashboard status; unresolved incidents rendered with `name`, `status`, `impact`, `started_at`, and `incident_updates`.
- Scraping fallback: the dashboard will fetch `https://status.anthropic.com/` and search for the usual Statuspage phrases to return an approximate state if the API is unreachable.
