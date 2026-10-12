# Changelog

## 1.7.1 (2026-10-09)

Package metadata only: the repository and issue links point at the public
`SeoScoreAPI` repositories. No code changes.

## 1.7.0 (2026-10-07)

Core Web Vitals are now opt-in on the API, so audits no longer wait on Google
PageSpeed Insights unless you ask:

- `audit(url, apiKey, { cwv: true })`: measured LCP, INP, CLS, FCP and TTFB under
  `core_web_vitals` in the same response. The first measurement of a URL adds about
  10 seconds; it is cached for 24 hours.
- `batchAudit(urls, apiKey, { cwv: true })`: the same for every URL in the batch.
- Without it, `core_web_vitals.status` is `"not_requested"` (metrics `null`), unless a
  measurement of that URL is already cached, which is returned as before.
- Types: `AuditOptions` and `CoreWebVitals`.
- Nothing else changed; existing calls behave as they did, only faster.

## 1.6.1 (2026-10-07)

Fixes signup, which has been a two-step flow on the API for some time:

- `signup(email)` no longer resolves with `undefined`. It resolves with the API's
  response (`{ status: "verification_required", message: ... }`) instead of a key.
  `POST /signup` does not issue a key any more. Typed as `SignupResult`.
- New `verify(email, code)`: sends the emailed 6-digit code to `POST /verify` and
  resolves with the API key. Rejects (status 400) on a wrong or expired code.
- README: the two-step signup, with an example.

## 1.6.0 (2026-10-06)

Catches the client up with the API. New functions (all typed in `index.d.ts`):

- Accessibility and reports: `accessibilityAudit` (`GET /audit/accessibility`),
  `auditExport` (`GET /audit/export`, resolves with the PDF / Markdown / CSV as a `Buffer`).
- Single-page analyses: `aiReadability`, `trackers`, `conversion`, `quickWins`
  (`POST /quick-wins`), `backlinks`, `generateLlmsTxt` (resolves with text; key optional).
- GEO: `geoAudit`, `geoBrandProbe`, `addGeoMonitor`, `removeGeoMonitor`,
  `listGeoMonitors`, `geoMonitorHistory`.
- Site crawl: `startCrawl`, `getCrawl`, `waitForCrawl`, `crawl` (start and wait).
- AI citations: `citationStarterPrompts`, `citationSuggestPrompts`,
  `createCitationTracker`, `listCitationTrackers`, `getCitationTracker`,
  `updateCitationTracker`, `deleteCitationTracker`, `runCitationTracker`,
  `getCitationRun`, `citationTrackerHistory`, `citationCheck`, `citationTopups`,
  `citationTopupCheckout` (resolves with the Stripe Checkout URL), `citationAutoReload`
  (read-only: the API has no way to turn auto-reload on, and neither does this client).
- `listMonitors` and `removeMonitor` (`GET` / `DELETE /monitors`).
- Errors from every call now carry `err.status` (previously only the Deep Audit calls).
- Tests for all of the above (`test/endpoints.test.js`).

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
