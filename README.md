# seoscoreapi

Node.js client for [SEO Score API](https://seoscoreapi.com) — audit any URL for SEO issues with one function call.

## Install

```bash
npm install seoscoreapi
```

## Quick Start

```javascript
const { signup, audit } = require("seoscoreapi");

// Get a free API key (2 audits/day)
const key = await signup("you@example.com");

// Audit any URL
const result = await audit("https://example.com", key);
console.log(`Score: ${result.score}/100 (${result.grade})`);

result.priorities.forEach(p =>
  console.log(`  [${p.severity}] ${p.issue}`)
);
```

## API

| Function | Description |
|----------|-------------|
| `signup(email)` | Get a free API key |
| `audit(url, apiKey)` | Run SEO audit |
| `batchAudit(urls, apiKey)` | Audit multiple URLs (paid) |
| `usage(apiKey)` | Check usage/limits |
| `addMonitor(url, apiKey)` | Set up monitoring (paid) |
| `scoreboardOptOut(apiKey)` | Opt in/out of public scoreboard |
| `reportUrl(domain)` | Get shareable report URL |

## Links

- [Website & Demo](https://seoscoreapi.com)
- [API Docs](https://seoscoreapi.com/docs)
- [GitHub Action](https://github.com/SeoScoreAPI/seo-audit-action)
