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
| `signup(email)` | Starts signup: the API emails a 6-digit code. It does not return a key (known issue: this call resolves with `undefined`). Finish at [seoscoreapi.com](https://seoscoreapi.com/#signup) or with `POST /verify` |
| `audit(url, apiKey)` | Run an SEO audit on a URL |
| `batchAudit(urls, apiKey)` | Audit up to 10 URLs in one call (paid) |
| `compare(urls, apiKey)` | Compare 2–5 URLs with a structured diff (Basic+) |
| `competitiveAudit(url, competitorUrl, keyword, apiKey)` | Head-to-head audit with gap score (Pro+) |
| `history(url, apiKey, opts)` | Full audit timeseries for a URL (Starter+) |
| `historyDomains(apiKey)` | Every audited domain with latest score and 30-day trend (Starter+) |
| `usage(apiKey)` | Check usage and limits |
| `addMonitor(url, apiKey, opts)` | Set up score monitoring with optional Slack/webhook alerts (paid) |
| `scoreboardOptOut(apiKey, optOut)` | Opt in or out of the public scoreboard |
| `reportUrl(domain)` | Get a shareable report URL |

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
- SEO Audit API: [seoscoreapi.com/seo-audit-api](https://seoscoreapi.com/seo-audit-api)
- SEO Monitor API: [seoscoreapi.com/seo-monitor-api](https://seoscoreapi.com/seo-monitor-api)

Part of [SEO Score API](https://seoscoreapi.com) — instant SEO audits via API.

## License

MIT
