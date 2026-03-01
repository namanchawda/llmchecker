# Google Gemini status integration

- Primary feed: `https://status.cloud.google.com/incidents.json` (Google Cloud status JSON)
- Filtering: the monitor searches for "Gemini", "Vertex AI", or "Generative" in the `products/service_name` fields to isolate relevant incidents.
- Incident fields used when present: `id`, `summary`, `impact/severity`, `begin`, `uri/public_url`, and `updates[]` (`text/body`, `when/created`, `status/update_type`).
- Fallback: if the JSON endpoint changes or fails, the app scrapes `https://status.cloud.google.com/` for high-level "operational/outage/maintenance" markers to avoid a blank state.
- Components: the dashboard exposes synthetic components ("Gemini APIs", "Vertex AI generative services") using the same derived status to give quick drilldown even though Google does not publish component-level health.
- Customization: if Google exposes a Gemini-only feed later (e.g., `?product=gemini`), you can swap the feed URL in `lib/statusProviders.ts` to avoid heuristics.
