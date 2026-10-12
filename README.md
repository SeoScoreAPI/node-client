# seoscoreapi

Node.js client for [SEO Score API](https://seoscoreapi.com) — audit any URL for SEO issues with one function call. 80+ checks across SEO, performance, accessibility, and AI readability, returned as scored JSON.

## Install

```bash
npm install seoscoreapi
```

## Quick Start

```js
const { audit } = require("seoscoreapi");

// Get a free API key (2 audits/day, no credit card) at https://seoscoreapi.com/#signup
const key = process.env.SEO_SCORE_API_KEY;

// Run an audit
const result = await audit("https://example.com", key);
console.log(`Score: ${result.score}/100 (${result.grade})`);
```

## Functions

| Function | Description |
|---|---|
| `signup(email)` | Start signup: the API emails a 6-digit code. Resolves with the API's response (`{ status: "verification_required", ... }`), not a key |
| `verify(email, code)` | Finish signup with the emailed code. Resolves with the API key (shown only once) |
| `audit(url, apiKey, { cwv })` | Run an SEO audit on a URL. `{ cwv: true }` adds measured Core Web Vitals (slower, see below) |
| `batchAudit(urls, apiKey, { cwv })` | Audit up to 10 URLs in one call (paid). `{ cwv: true }` adds Core Web Vitals to each |
| `compare(urls, apiKey)` | Compare 2–5 URLs with a structured diff (Basic+) |
| `competitiveAudit(url, competitorUrl, keyword, apiKey)` | Head-to-head audit with gap score (Pro+) |
| `history(url, apiKey, opts)` | Full audit timeseries for a URL (Starter+) |
| `historyDomains(apiKey)` | Every audited domain with latest score and 30-day trend (Starter+) |
| `usage(apiKey)` | Check usage and limits |
| `addMonitor(url, apiKey, opts)` | Set up score monitoring with optional Slack/webhook alerts (paid) |
| `listMonitors(apiKey)` / `removeMonitor(url, apiKey)` | List / remove monitors |
| `scoreboardOptOut(apiKey, optOut)` | Opt in or out of the public scoreboard |
| `reportUrl(domain)` | Get a shareable report URL |
| `accessibilityAudit(url, apiKey, { include })` | ADA / WCAG 2.1 AA audit (paid; own monthly allowance). `include: "trackers"` adds the tracker inventory |
| `auditExport(url, apiKey, { format, brandName, brandColor, logoUrl })` | Audit as a PDF / Markdown / CSV file; resolves with a `Buffer`. White-label on Pro and Ultra |
| `aiReadability(url, apiKey)` | How well AI/LLM systems can consume the page |
| `trackers(url, apiKey)` | Third-party trackers and pixels the page loads |
| `conversion(url, apiKey, { pageType })` | Conversion score: headline, CTA, trust, forms, objections |
| `quickWins({ rows \| csv, ...options }, apiKey)` | Page-2 quick wins from your own Search Console export (every plan) |
| `backlinks(domain, apiKey, { limit })` | Observed backlinks, an audit-fed sample (Basic+) |
| `generateLlmsTxt(domain, apiKey?)` | llms.txt for a domain; resolves with a string. Curated version on Basic+ |
| `geoAudit(url, apiKey)` | GEO audit: visibility to LLMs (Basic+) |
| `geoBrandProbe({ brand, domain, prompts, models, runs_per_prompt }, apiKey)` | How often LLMs mention your brand (Basic+) |
| `addGeoMonitor(url, apiKey, { frequency, alertThreshold, webhookUrl })` | Create a GEO monitor (Basic+) |
| `listGeoMonitors(apiKey)` / `removeGeoMonitor(url, apiKey)` | List / remove GEO monitors |
| `geoMonitorHistory(monitorId, apiKey, { page, perPage })` | Score history for a GEO monitor |
| `startCrawl(url, apiKey, { maxPages })` / `getCrawl(jobId, apiKey)` | Start / poll a multi-page site crawl (Pro/Ultra, or a Deep Audit credit) |
| `waitForCrawl(jobId, apiKey, wait)` / `crawl(url, apiKey, opts, wait)` | Poll a crawl to completion / start one and wait |
| `citationStarterPrompts(topic, apiKey, opts)` / `citationSuggestPrompts(domain, apiKey)` | Prompts to track for AI citations (not metered) |
| `createCitationTracker(tracker, apiKey)` | Track a brand in AI answers (Starter+) |
| `listCitationTrackers(apiKey)` / `getCitationTracker(id, apiKey)` | Trackers plus the month's check usage / one tracker |
| `updateCitationTracker(id, fields, apiKey)` / `deleteCitationTracker(id, apiKey)` | Edit / stop a tracker |
| `runCitationTracker(id, apiKey)` / `getCitationRun(runId, apiKey)` | Run a tracker now / read a run's results |
| `citationTrackerHistory(id, apiKey, { days })` | Mention rate, citation rate, share of voice, position over time |
| `citationCheck({ brand, prompt, ... }, apiKey)` | One-off citation check, metered per check (paid) |
| `citationTopups(apiKey)` / `citationTopupCheckout(pack, apiKey)` | Top-up packs and balance / Stripe Checkout URL for a pack |
| `citationAutoReload(apiKey)` | Read the auto-reload setting (read-only; change it on the dashboard) |

Every call rejects with an `Error` whose `message` is the API's `detail` and whose
`status` is the HTTP status.

## Get an API key from code

Signup takes two calls. `signup()` emails a 6-digit code (valid for 10 minutes) and
`verify()` trades that code for the key. You can also sign up at
[seoscoreapi.com](https://seoscoreapi.com/#signup).

```js
const readline = require("node:readline/promises");
const { signup, verify } = require("seoscoreapi");

(async () => {
  const email = "you@example.com";
  const { message } = await signup(email);
  console.log(message); // "Check your email for a 6-digit verification code."

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await rl.question("Code from the email: ");
  rl.close();

  try {
    const key = await verify(email, code);
    console.log(key); // save it: the key is shown only once
  } catch (err) {
    console.error(err.status, err.message); // 400 on a wrong or expired code
  }
})();
```

`signup()` rejects when the address is refused (400) or already has an active key
(409). `verify()` rejects (400) on a wrong or expired code; five wrong codes void the
signup, so call `signup()` again.

## CI/CD quality gate

Fail a build when a page regresses below your SEO score threshold:

```js
const { audit } = require("seoscoreapi");

const { score } = await audit(process.env.DEPLOY_URL, process.env.SEO_API_KEY);
if (score < 85) {
  console.error(`SEO score ${score} is below the 85 threshold`);
  process.exit(1);
}
```

See the [SEO Checker API guide](https://seoscoreapi.com/seo-checker-api) for the full CI/CD pattern, or the official [GitHub Action](https://seoscoreapi.com/seo-checks-in-cicd-pipeline).

## Webhook alerts on score drops

```js
await addMonitor("https://example.com", key, {
  frequency: "daily",
  webhookUrl: "https://hooks.slack.com/services/T0/B0/xxxx",
  alertThreshold: 5,
});
```

Slack incoming-webhook URLs are auto-formatted as Block Kit messages; any other https endpoint receives the raw event JSON.

## Core Web Vitals (opt-in)

Audits are fast because they do not wait on Google PageSpeed Insights. Ask for measured
Core Web Vitals when you need them:

```javascript
const result = await audit("https://example.com", key, { cwv: true });
const vitals = result.core_web_vitals;
if (vitals.status === "ok") {
  console.log(vitals.lcp_ms, vitals.inp_ms, vitals.cls, vitals.source); // source: "field" or "lab"
} else if (vitals.pending) {
  console.log("Still measuring; audit this URL again in a minute");
} else {
  console.log("No Core Web Vitals:", vitals.reason);
}
```

The first measurement of a URL adds about 10 seconds (the API waits up to 25); it is
cached for 24 hours, so repeats are instant. It works on every plan and never changes the
score. Without `{ cwv: true }` the block reads `{ status: "not_requested", ... }` with
the metrics set to `null`.

## Accessibility audit and report files

```js
const fs = require("node:fs");
const seo = require("seoscoreapi");

const ada = await seo.accessibilityAudit("https://example.com", API_KEY);
console.log(ada.score, ada.violations.length);

// PDF, Markdown ("md") or CSV. Resolves with a Buffer.
const pdf = await seo.auditExport("https://example.com", API_KEY, { format: "pdf", brandName: "Acme Agency" });
fs.writeFileSync("report.pdf", pdf);
```

ADA audits are on paid plans and have their own monthly allowance, separate from the
audit quota (`usage()` reports `ada_remaining`). `auditExport` counts as one audit; the
white-label options need Pro or Ultra.

## Site crawl

Asynchronous, like Deep Site Audit. Pro and Ultra include crawls; any other plan spends
one Deep Audit credit per crawl.

```js
const job = await seo.crawl("https://example.com", API_KEY, { maxPages: 25 }, {
  onProgress: (j) => console.log(j.status, j.pages_done),
});
console.log(job.result.summary, job.site_map);

// Or drive it yourself:
const started = await seo.startCrawl("https://example.com", API_KEY); // POST /crawl
const status = await seo.getCrawl(started.job_id, API_KEY);           // GET  /crawl/{job_id}
const done = await seo.waitForCrawl(started.job_id, API_KEY, { timeoutMs: 600000 });
```

`waitForCrawl` and `crawl` resolve with the whole completed job (`result`, `site_map`,
`pages_done`) and reject on timeout or if the crawl fails.

## AI citations

Do ChatGPT, Gemini, Perplexity and Claude mention and cite you? A tracker is a brand plus
the prompts buyers type. A check is one prompt on one engine, sampled once.

```js
const starter = await seo.citationStarterPrompts("SEO audit API", API_KEY, {
  brand: "Acme", competitors: ["Rival"], audience: "marketing agencies",
});

const tracker = await seo.createCitationTracker(
  { brand: "Acme", domains: ["acme.com"], prompts: starter.prompts, cadence: "weekly" }, API_KEY);
const run = await seo.runCitationTracker(tracker.id, API_KEY); // waits for the engines
const history = await seo.citationTrackerHistory(tracker.id, API_KEY, { days: 90 });

(await seo.listCitationTrackers(API_KEY)).usage;  // checks_limit, checks_used, checks_available, ...
await seo.citationTopups(API_KEY);                // packs, balance, can_buy
const url = await seo.citationTopupCheckout("500", API_KEY); // Stripe Checkout URL; nothing is charged until it is paid
await seo.citationAutoReload(API_KEY);            // read-only
```

A run needs all of its checks up front (the month's allowance plus any top-up balance);
if that is short the API answers 429 and nothing is spent. Auto-reload can only be turned
on or changed from the dashboard, never with an API key, so this client has no setter.

## Search Console quick wins

```js
const wins = await seo.quickWins({ csv: fs.readFileSync("Queries.csv", "utf8"), exclude_terms: ["acme"] }, API_KEY);
for (const w of wins.quick_wins) console.log(w.query, w.position, w.estimated_extra_clicks);
```

We do not connect to your Search Console: you send the export (or `rows: [...]`).

## Deep Site Audit (Pro/Ultra, or credits)

A deep, AI-assisted audit scoring a URL across 9 dimensions (thousands of catalog
checks plus up to 150 AI checks). It runs asynchronously, so start a job and poll it,
or use `deepAudit` to await the result:

```js
const seo = require("seoscoreapi");

// One call, waits for the result (handles the queue + backpressure for you):
const result = await seo.deepAudit("https://yoursite.com", API_KEY, {
  business_type: "saas",            // tunes which checks apply
}, {
  onProgress: (s) => console.log(s.status, s.queue_position ?? s.progress),
});
console.log(result.scores.lai_score, result.scores.section_scores);

// Or drive the job yourself:
const job = await seo.siteAudit("https://yoursite.com", API_KEY);   // POST /site-audit
const status = await seo.getSiteAudit(job.job_id, API_KEY);         // GET  /site-audit/{job_id}
// status.status → queued | running | completed | failed
//   queued    → { queue_position, eta_seconds }
//   completed → { result }
const done = await seo.waitForSiteAudit(job.job_id, API_KEY, { timeoutMs: 600000 });

await seo.deepAuditUsage(API_KEY);  // GET /deep-audit/usage → { site_audit: { used, remaining }, ... }
```

Deep audits are included on **Pro** ($39/mo, 20/mo) and **Ultra** ($99/mo, 100/mo);
any other key can run them on purchased credits.

Since 1.5.0 the SDK calls the main host, `https://seoscoreapi.com`, like every other
endpoint. To point Deep Audit somewhere else (a proxy, staging, or the legacy
`engine.seoscoreapi.com` host, which still works), pass `baseUrl` in the options of
any Deep Audit call, call `seo.setDeepAuditBaseUrl(url)`, or set
`SEOSCORE_DEEP_AUDIT_URL`. `engineUsage()` is kept as an alias of `deepAuditUsage()`.

Docs: [seoscoreapi.com/docs](https://seoscoreapi.com/docs) (Deep Site Audit section).

## Full Documentation

- API docs: [seoscoreapi.com/docs](https://seoscoreapi.com/docs)
- SEO Monitor API: [seoscoreapi.com/seo-monitor-api](https://seoscoreapi.com/seo-monitor-api)

Part of [SEO Score API](https://seoscoreapi.com) — instant SEO audits via API.

## License

MIT
