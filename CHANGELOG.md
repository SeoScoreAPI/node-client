# Changelog

## 1.5.0 (2026-10-02)

- Deep Site Audit calls go to the main host, `https://seoscoreapi.com`
  (`POST /site-audit`, `GET /site-audit/{job_id}`, `GET /deep-audit/usage`), instead
  of `engine.seoscoreapi.com`. The old host still works.
- Base-URL override for Deep Audit: `baseUrl` in any Deep Audit call's options,
  `setDeepAuditBaseUrl(url)` / `getDeepAuditBaseUrl()`, or the `SEOSCORE_DEEP_AUDIT_URL`
  env var.
- New `waitForSiteAudit(jobId, apiKey, wait)`: poll an existing job to completion.
- New `deepAuditUsage(apiKey)`. `engineUsage()` stays as an alias (on the main host it
  now calls `/deep-audit/usage`, since `/usage` there is the per-URL audit allowance).
- HTTP errors from `deepAudit` now carry `err.status`.
- Tests (`npm test`, Node's built-in runner); the published package now ships only
  `index.js`, `index.d.ts`, `README.md` and `CHANGELOG.md`.

## 1.4.0

- Deep Audit: `siteAudit`, `getSiteAudit`, `deepAudit`, `engineUsage` (engine host).

Earlier releases: see the git history of `sdks/node`.
