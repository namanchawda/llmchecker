# OpenAI status integration

- Status API: `https://status.openai.com/api/v2/status.json` (Statuspage)
- Incident feed: `https://status.openai.com/api/v2/incidents/unresolved.json`
- Status feed: `https://status.openai.com/proxy/status.openai.com` (proxy JSON parsed for status/incidents)
- Component drilldown: components are taken from the `structure` node where group name is `APIs` or `ChatGPT`; if absent, synthetic components (`API`, `Chat Completions`, `Embeddings`, `Batch API`) mirror the overall status.
- Fields used:
  - `status.indicator` -> `operational | degraded | partial_outage | outage | maintenance`
  - `status.description` shown as the service message
  - `incident.id`, `name`, `status`, `impact`, `started_at`, `shortlink`, `incident_updates[]`
- If the API fails, the app scrapes `https://status.openai.com/` looking for common phrases ("All Systems Operational", "Partial Outage", "Major Outage") to keep a best-effort health signal.

incident json page -> https://status.openai.com/api/v2/incidents.json

status of openai and its components -> https://status.openai.com/api/v2/summary.json
