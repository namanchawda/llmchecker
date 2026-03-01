# LLM Service Monitor (Next.js)

Next.js dashboard that tracks health and active incidents for major LLM providers (OpenAI, Anthropic, Google Gemini, Grok/xAI). The page fetches each provider's status/incident feeds, falls back to lightweight scraping when an API is unavailable, and surfaces the data in cards, tables, and an incident stream.

## Features
- Live status fetch for OpenAI, Anthropic, Grok/xAI (Statuspage APIs) and Gemini (Google Cloud status feed)
- Incident awareness with quick descriptions and links back to provider pages
- Responsive dashboard with metrics, tabular health view, service-level drilldown (API/chat/batch components), and timeline-style incident feed
- Extensible design to add custom monitors (quota checks, latency probes, billing/usage hooks)

## Getting started
```bash
npm install
npm run dev
```
Then open `http://localhost:3000`. The app uses server-side fetches with `cache: 'no-store'`, so it will request fresh data on every load.

## How it works
- Status providers are defined in `lib/statusProviders.ts` and return a `ServiceStatus` object per vendor.
- OpenAI uses `https://status.openai.com/proxy/status.openai.com` (proxy JSON) to derive incidents/status; components come from the `structure` groups (`APIs`, `ChatGPT`) with synthetic fallbacks for API/chat/batch.
- Statuspage-backed vendors (Anthropic, Grok) use `https://<host>/api/v2/status.json` plus `.../incidents/unresolved.json`.
- Gemini uses the Google Cloud status feed (`https://status.cloud.google.com/incidents.json`) and filters Gemini/Vertex AI related items; if the feed shape changes the code falls back to scraping the HTML page for high-level health.
- If a provider’s API is unavailable, a scraper looks for common "operational/outage" markers in the HTML as a resilience fallback.

## Extending the monitor
1) Add a provider function in `lib/statusProviders.ts` that returns `ServiceStatus`. You can reuse `fetchStatuspageService` for other Statuspage vendors.  
2) Push new fields to the UI by extending `ServiceStatus` in `lib/types.ts` and rendering them in `app/page.tsx` or the table.  
3) For quota/usage checks, add a server action or API route that calls your internal observability endpoints and merge results into the dashboard props.  
4) Keep `cache: 'no-store'` or add `revalidate` windows per provider if you want light caching.

## Provider docs
Notes for each provider (endpoints, scraping fallbacks, incident mapping):
- `docs/openai.md`
- `docs/anthropic.md`
- `docs/gemini.md`
- `docs/grok.md`

## Testing
- `npm run lint` for static checks.
- Manual: load the dashboard and verify the cards/table update as status pages change. If running offline, expect the "scraped" or "unknown" status copy.

## Tech stack
- Next.js 14 (App Router, server components)
- React 18
- Custom CSS (no external UI libs) for a lightweight, opinionated dashboard look.
