/**
 * SEO Score API - Node.js Client
 * Audit any URL for SEO issues with one function call.
 * https://seoscoreapi.com
 */

const BASE_URL = "https://seoscoreapi.com";
// Legacy dedicated Deep Audit host. Still serves the same endpoints (its quota
// endpoint is plain /usage); pass it to setDeepAuditBaseUrl() if you need it.
const ENGINE_URL = "https://engine.seoscoreapi.com";
const VERSION = "1.7.1";

// Deep Site Audit is served on the main host. Override with
// setDeepAuditBaseUrl(), a per-call `baseUrl`, or SEOSCORE_DEEP_AUDIT_URL.
let deepAuditBaseUrl =
  (typeof process !== "undefined" && process.env && process.env.SEOSCORE_DEEP_AUDIT_URL) || BASE_URL;
const UA = `seoscoreapi-node/${VERSION}`;

async function _fetch(path, options = {}, as = "json") {
  const url = `${BASE_URL}${path}`;
  options.headers = { "User-Agent": UA, ...options.headers };
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.detail || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (as === "text") return res.text();
  if (as === "buffer") return Buffer.from(await res.arrayBuffer());
  return res.json();
}

// Query string from an object, skipping unset values. Arrays become the
// comma-separated string the API takes.
function _qs(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    q.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  const out = q.toString();
  return out ? `?${out}` : "";
}

function _get(path, apiKey, params = {}, as = "json") {
  return _fetch(`${path}${_qs(params)}`, { headers: apiKey ? { "X-API-Key": apiKey } : {} }, as);
}

function _send(method, path, apiKey, body) {
  const options = { method, headers: { "X-API-Key": apiKey } };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  return _fetch(path, options);
}

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function _deepBase(baseUrl) {
  return String(baseUrl || deepAuditBaseUrl).replace(/\/+$/, "");
}

function _usagePath(base) {
  // Main host: /deep-audit/usage (its /usage is the per-URL allowance).
  // Legacy engine host: /usage.
  return base.replace(/^[a-z]+:\/\//i, "").startsWith("engine.") ? "/usage" : "/deep-audit/usage";
}

async function _engineFetch(path, options = {}, raw = false, baseUrl) {
  const url = `${_deepBase(baseUrl)}${path}`;
  options.headers = { "User-Agent": UA, ...options.headers };
  const res = await fetch(url, options);
  if (raw) return res;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.detail || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Start signup for a free API key. The API emails a 6-digit code to `email`.
 * No key is issued yet: pass the code to verify() to get it. The code expires
 * after 10 minutes. Rejects on a refused address (400) or an email that
 * already has an active key (409).
 * @param {string} email
 * @returns {Promise<Object>} The API's response, normally
 *   `{ status: "verification_required", message: "..." }`
 */
function signup(email) {
  return _fetch("/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

/**
 * Finish signup: exchange the emailed 6-digit code for the API key.
 * Rejects (status 400, the reason as the message) on a wrong or expired code,
 * or when there is no pending signup for `email`. Five wrong codes void the
 * signup, so call signup() again after that.
 * @param {string} email
 * @param {string|number} code - The 6-digit code from the email
 * @returns {Promise<string>} The API key (save it, it is shown only once)
 */
async function verify(email, code) {
  const data = await _fetch("/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code: String(code).trim() }),
  });
  return data.api_key;
}

/**
 * Run an SEO audit on a URL.
 * @param {string} url - URL to audit
 * @param {string} apiKey - Your API key
 * @returns {Promise<Object>} Audit result with score, grade, checks, priorities
 */
async function audit(url, apiKey, opts = {}) {
  const cwv = opts && opts.cwv === true ? "&cwv=true" : "";
  return _fetch(`/audit?url=${encodeURIComponent(url)}${cwv}`, {
    headers: { "X-API-Key": apiKey },
  });
}

/**
 * Audit multiple URLs (paid plans only).
 * @param {string[]} urls
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function batchAudit(urls, apiKey, opts = {}) {
  const body = opts && opts.cwv === true ? { urls, cwv: true } : { urls };
  return _fetch("/audit/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify(body),
  });
}

/**
 * Check your API usage and limits.
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function usage(apiKey) {
  return _fetch("/usage", { headers: { "X-API-Key": apiKey } });
}

/**
 * Set up score monitoring for a URL (paid plans only).
 *
 * `webhookUrl` (optional) receives a POST whenever the score drops by
 * `alertThreshold` points or more. Slack incoming-webhook URLs are
 * auto-formatted as Block Kit messages; any other https endpoint
 * receives the raw event JSON.
 *
 * @param {string} url
 * @param {string} apiKey
 * @param {Object|string} [opts] - options object, or legacy `frequency` string
 * @param {string} [opts.frequency="daily"] - "daily" or "weekly"
 * @param {string} [opts.webhookUrl] - https URL to POST alerts to
 * @param {number} [opts.alertThreshold=5] - point drop that triggers an alert
 * @returns {Promise<Object>}
 */
async function addMonitor(url, apiKey, opts = {}) {
  // Backwards compat: addMonitor(url, apiKey, "weekly")
  if (typeof opts === "string") opts = { frequency: opts };
  const body = {
    url,
    frequency: opts.frequency || "daily",
    alert_threshold: opts.alertThreshold ?? 5,
  };
  if (opts.webhookUrl) body.webhook_url = opts.webhookUrl;
  return _fetch("/monitors", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify(body),
  });
}

/**
 * List your active monitors.
 * @param {string} apiKey
 * @returns {Promise<Array>}
 */
async function listMonitors(apiKey) {
  const data = await _get("/monitors", apiKey);
  return data.monitors;
}

/**
 * Remove a score monitor (DELETE /monitors).
 * @param {string} url
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function removeMonitor(url, apiKey) {
  return _send("DELETE", "/monitors", apiKey, { url });
}

/**
 * Opt in or out of the public SEO scoreboard.
 * @param {string} apiKey
 * @param {boolean} [optOut=true] - true to hide, false to show
 * @returns {Promise<Object>}
 */
async function scoreboardOptOut(apiKey, optOut = true) {
  return _fetch(`/scoreboard/opt-out?opt_out=${optOut}`, {
    method: "PUT",
    headers: { "X-API-Key": apiKey },
  });
}

/**
 * Compare 2–5 URLs side by side with a structured diff (Basic plan or higher).
 *
 * Returns each URL's score and category breakdown plus a `diff` object
 * describing who is ahead and by how much, per category and per URL pair.
 *
 * @param {string[]} urls - 2 to 5 URLs
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function compare(urls, apiKey) {
  return _fetch("/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({ urls }),
  });
}

/**
 * Run a head-to-head competitive audit (Pro plan or higher).
 * @param {string} url - Your page URL
 * @param {string} competitorUrl - Competitor's page URL
 * @param {string} keyword - Target keyword to compare on
 * @param {string} apiKey - Your API key
 * @returns {Promise<Object>} Gap score, per-check diffs, and action items
 */
async function competitiveAudit(url, competitorUrl, keyword, apiKey) {
  return _fetch("/audit/competitive", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({ url, competitor_url: competitorUrl, keyword }),
  });
}

/**
 * Get shareable report URL for a domain.
 * @param {string} domain
 * @returns {string}
 */
function reportUrl(domain) {
  return `${BASE_URL}/report/${domain}`;
}

/**
 * Get historical audit scores and trend summary for a URL (Starter plan or higher).
 * @param {string} url
 * @param {string} apiKey
 * @param {Object} [opts]
 * @param {number} [opts.limit=100] - Max number of points to return (1–1000)
 * @param {number} [opts.since] - UNIX timestamp lower bound (inclusive)
 * @returns {Promise<Object>} timeseries + summary
 */
async function history(url, apiKey, opts = {}) {
  const params = new URLSearchParams({ url, limit: String(opts.limit ?? 100) });
  if (opts.since !== undefined) params.set("since", String(opts.since));
  return _fetch(`/history?${params.toString()}`, { headers: { "X-API-Key": apiKey } });
}

/**
 * List every domain audited by this key with latest score and 30-day trend (Starter plan or higher).
 * @param {string} apiKey
 * @returns {Promise<Array>} list of {domain, latest_score, latest_grade, trend_30d, ...}
 */
async function historyDomains(apiKey) {
  const data = await _fetch("/history/domains", { headers: { "X-API-Key": apiKey } });
  return data.domains;
}

// --- Accessibility, exports and single-page analyses -------------------------

/**
 * Run an ADA / WCAG 2.1 AA accessibility audit (paid plans only).
 *
 * Returns the compliance score and grade, lawsuit risk, `violations` (WCAG 2.1
 * AA failures), `best_practices`, `needs_review` and `priorities`. ADA audits
 * have their own monthly allowance (`ada_monthly`), separate from the audit
 * quota; `usage()` reports `ada_remaining`. A 429 is not counted.
 *
 * @param {string} url
 * @param {string} apiKey
 * @param {Object} [opts]
 * @param {string} [opts.include] - "trackers" adds the tracker and pixel inventory
 * @returns {Promise<Object>}
 */
async function accessibilityAudit(url, apiKey, opts = {}) {
  return _get("/audit/accessibility", apiKey, { url, include: opts.include });
}

/**
 * Run an audit and download it as a report file (PDF, Markdown or CSV).
 *
 * Same audit, usage and plan gating as `audit()` (it counts as one audit).
 * White-label (Pro and Ultra): `brandName`, `brandColor` (#rrggbb) and
 * `logoUrl` (https PNG/JPEG/WebP, max 300 KB); on other plans they return 403.
 *
 * @param {string} url
 * @param {string} apiKey
 * @param {Object} [opts]
 * @param {string} [opts.format="pdf"] - "pdf", "md" or "csv"
 * @param {string} [opts.brandName]
 * @param {string} [opts.brandColor]
 * @param {string} [opts.logoUrl]
 * @returns {Promise<Buffer>} the file's bytes, e.g. fs.writeFileSync("report.pdf", buf)
 */
async function auditExport(url, apiKey, opts = {}) {
  return _get("/audit/export", apiKey, {
    url,
    format: opts.format || "pdf",
    brand_name: opts.brandName,
    brand_color: opts.brandColor,
    logo_url: opts.logoUrl,
  }, "buffer");
}

/**
 * Score how well a page can be consumed by AI/LLM systems. Counts as one audit.
 * @param {string} url
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function aiReadability(url, apiKey) {
  return _get("/ai-readability", apiKey, { url });
}

/**
 * List the third-party trackers and pixels a page loads, including pixels a tag
 * manager injects. Counts as one audit; a page that can't be loaded returns 422
 * and is not counted.
 * @param {string} url
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function trackers(url, apiKey) {
  return _get("/trackers", apiKey, { url });
}

/**
 * Score how well a page turns a visitor into a lead or a sale (headline, cta,
 * trust, forms, objections). Counts as one audit. Free keys get the scores and
 * the first two priorities; paid plans the full list.
 * @param {string} url
 * @param {string} apiKey
 * @param {Object} [opts]
 * @param {string} [opts.pageType] - local_service | ecommerce | saas | general (detected when omitted)
 * @returns {Promise<Object>}
 */
async function conversion(url, apiKey, opts = {}) {
  return _get("/conversion", apiKey, { url, page_type: opts.pageType });
}

/**
 * Find the page-2 quick wins in your own Search Console data. Nothing is
 * fetched from Search Console and nothing is stored. Works on every plan;
 * counts as one audit.
 *
 * @param {Object} data - sent to the API as-is. Either `rows`
 *   ([{query, page, clicks, impressions, position}]) or `csv` (the Performance
 *   export as text), plus optional `min_impressions`, `target_position`,
 *   `limit`, `exclude_terms`, `ctr_curve`.
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function quickWins(data, apiKey) {
  if (!data || (data.rows === undefined && data.csv === undefined)) {
    throw new Error("Pass rows (an array of objects) or csv (the export as text)");
  }
  return _send("POST", "/quick-wins", apiKey, data);
}

/**
 * Observed backlinks for a domain (Basic plan or higher). An audit-fed sample,
 * not a comprehensive backlink index: see `data_caveat` in the response.
 * @param {string} domain
 * @param {string} apiKey
 * @param {Object} [opts]
 * @param {number} [opts.limit=50] - Max sample rows (1–500)
 * @returns {Promise<Object>}
 */
async function backlinks(domain, apiKey, opts = {}) {
  return _get("/backlinks", apiKey, { domain, limit: opts.limit ?? 50 });
}

/**
 * Generate an llms.txt file for a domain. Works without a key (basic version);
 * a key on the Basic plan or higher returns the curated version.
 * @param {string} domain
 * @param {string} [apiKey]
 * @returns {Promise<string>} the file's text
 */
async function generateLlmsTxt(domain, apiKey) {
  return _get("/llms-generator", apiKey, { domain }, "text");
}

// --- GEO (Basic plan or higher) ---------------------------------------------

/**
 * Run a GEO (Generative Engine Optimization) audit: how visible the page is to
 * LLMs. Basic plan or higher; uses the plan's monthly GEO allowance.
 * @param {string} url
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function geoAudit(url, apiKey) {
  return _get("/geo/audit", apiKey, { url });
}

/**
 * Probe LLMs to measure how often your brand is mentioned in AI responses
 * (Basic plan or higher).
 * @param {Object} probe - { brand, domain, prompts, models?, runs_per_prompt? } (sent as-is)
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function geoBrandProbe(probe, apiKey) {
  return _send("POST", "/geo/brand-probe", apiKey, probe);
}

/**
 * Create a GEO monitor for a URL (Basic plan or higher).
 * @param {string} url
 * @param {string} apiKey
 * @param {Object} [opts]
 * @param {string} [opts.frequency="weekly"] - "daily" or "weekly" (the Basic plan runs weekly)
 * @param {number} [opts.alertThreshold=-5]
 * @param {string} [opts.webhookUrl]
 * @returns {Promise<Object>}
 */
async function addGeoMonitor(url, apiKey, opts = {}) {
  const body = {
    url,
    frequency: opts.frequency || "weekly",
    alert_threshold: opts.alertThreshold ?? -5,
  };
  if (opts.webhookUrl) body.webhook_url = opts.webhookUrl;
  return _send("POST", "/geo/monitor", apiKey, body);
}

/**
 * Remove a GEO monitor (DELETE /geo/monitor).
 * @param {string} url
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function removeGeoMonitor(url, apiKey) {
  return _send("DELETE", "/geo/monitor", apiKey, { url });
}

/**
 * List your active GEO monitors.
 * @param {string} apiKey
 * @returns {Promise<Array>}
 */
async function listGeoMonitors(apiKey) {
  const data = await _get("/geo/monitors", apiKey);
  return data.monitors;
}

/**
 * Score history for a GEO monitor.
 * @param {number} monitorId
 * @param {string} apiKey
 * @param {Object} [opts] - { page=1, perPage=20 (1–100) }
 * @returns {Promise<Object>}
 */
async function geoMonitorHistory(monitorId, apiKey, opts = {}) {
  return _get(`/geo/monitor/${encodeURIComponent(monitorId)}/history`, apiKey, {
    page: opts.page ?? 1,
    per_page: opts.perPage ?? 20,
  });
}

// --- Site crawl (Pro/Ultra, or a Deep Audit credit) -------------------------

/**
 * Start a multi-page crawl of one site. Asynchronous: returns a job you poll
 * with getCrawl() or waitForCrawl(). A failed crawl is not counted.
 * @param {string} url - where to start
 * @param {string} apiKey
 * @param {Object} [opts]
 * @param {number} [opts.maxPages] - fewer pages than your plan's cap (1–100)
 * @returns {Promise<{job_id: string, status: string, max_pages: number, poll: string, site_map: string}>}
 */
async function startCrawl(url, apiKey, opts = {}) {
  const body = { url };
  if (opts.maxPages !== undefined) body.max_pages = opts.maxPages;
  return _send("POST", "/crawl", apiKey, body);
}

/**
 * Poll a site crawl. Only the key that started a crawl can read it.
 * @param {string} jobId
 * @param {string} apiKey
 * @returns {Promise<Object>} { job_id, status, pages_done, site_map, result?, error? }
 */
async function getCrawl(jobId, apiKey) {
  return _get(`/crawl/${encodeURIComponent(jobId)}`, apiKey);
}

/**
 * Poll an existing crawl until it finishes.
 * @param {string} jobId
 * @param {string} apiKey
 * @param {Object} [wait] - { pollIntervalMs=5000, timeoutMs=600000, onProgress }
 * @returns {Promise<Object>} the completed job (result, site_map, pages_done, ...)
 */
async function waitForCrawl(jobId, apiKey, wait = {}) {
  const { pollIntervalMs = 5000, timeoutMs = 600000, onProgress } = wait;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for crawl to complete");
    const job = await getCrawl(jobId, apiKey);
    if (onProgress) onProgress(job);
    if (job.status === "completed") return job;
    if (job.status === "failed") throw new Error(job.error || "Crawl failed");
    await _sleep(pollIntervalMs);
  }
}

/**
 * Start a site crawl and wait for it to finish.
 * @param {string} url
 * @param {string} apiKey
 * @param {Object} [opts] - { maxPages }
 * @param {Object} [wait] - { pollIntervalMs=5000, timeoutMs=600000, onProgress }
 * @returns {Promise<Object>} the completed job (see waitForCrawl)
 */
async function crawl(url, apiKey, opts = {}, wait = {}) {
  const job = await startCrawl(url, apiKey, opts);
  return waitForCrawl(job.job_id, apiKey, wait);
}

// --- AI citations (Starter plan or higher) ----------------------------------
//
// A check is one prompt on one engine, sampled once. Every plan has a monthly
// allowance of checks; top-up checks are spent only after it.

/**
 * A starter set of prompts to track, built from fixed templates. Works on
 * every plan, is not metered and spends no AI check.
 * @param {string} topic - what you sell, as a buyer would type it
 * @param {string} apiKey
 * @param {Object} [opts] - brand, competitors (array or comma-separated, up to 5),
 *   audience, features, useCases (up to 6 each), perCategory (1–10), limit (1–60)
 * @returns {Promise<Object>} { prompts, categories, items, ... }
 */
async function citationStarterPrompts(topic, apiKey, opts = {}) {
  return _get("/citations/prompts/starter", apiKey, {
    topic,
    brand: opts.brand,
    competitors: opts.competitors,
    audience: opts.audience,
    features: opts.features,
    use_cases: opts.useCases,
    per_category: opts.perCategory,
    limit: opts.limit,
  });
}

/**
 * Suggest prompts to track, read off what the site says it does.
 * @param {string} domain
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function citationSuggestPrompts(domain, apiKey) {
  return _get("/citations/prompts/suggest", apiKey, { domain });
}

/**
 * Track a brand's visibility in AI answers (Starter plan or higher).
 * @param {Object} tracker - sent as-is: { brand, domains, prompts, competitors,
 *   engines, samples, cadence, webhook_url }. With no prompts yet, leave
 *   `prompts` out and send `starter: { topic, audience }`.
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function createCitationTracker(tracker, apiKey) {
  return _send("POST", "/citations/trackers", apiKey, tracker);
}

/**
 * List this key's citation trackers.
 * @param {string} apiKey
 * @returns {Promise<{trackers: Array, usage: Object}>} `usage` has the month's
 *   checks, the top-up balance and `checks_available`
 */
async function listCitationTrackers(apiKey) {
  return _get("/citations/trackers", apiKey);
}

/**
 * Read one citation tracker.
 * @param {number} trackerId
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function getCitationTracker(trackerId, apiKey) {
  return _get(`/citations/trackers/${encodeURIComponent(trackerId)}`, apiKey);
}

/**
 * Edit a tracker's prompts, engines, competitors, samples, cadence or
 * webhook_url (only the fields you send change).
 * @param {number} trackerId
 * @param {Object} fields - sent as-is
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function updateCitationTracker(trackerId, fields, apiKey) {
  return _send("PATCH", `/citations/trackers/${encodeURIComponent(trackerId)}`, apiKey, fields);
}

/**
 * Stop tracking a brand. Run history is kept until its retention expires.
 * @param {number} trackerId
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function deleteCitationTracker(trackerId, apiKey) {
  return _send("DELETE", `/citations/trackers/${encodeURIComponent(trackerId)}`, apiKey);
}

/**
 * Run a tracker now and return the run summary. Every prompt x engine x sample
 * counts as one check. A run needs all of its checks up front (the month's
 * remaining allowance plus any top-up balance); if that is short it is refused
 * with 429 and nothing is spent. The request stays open while the engines answer.
 * @param {number} trackerId
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function runCitationTracker(trackerId, apiKey) {
  return _send("POST", `/citations/trackers/${encodeURIComponent(trackerId)}/run`, apiKey);
}

/**
 * Run status plus every per-prompt, per-engine result.
 * @param {number} runId
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function getCitationRun(runId, apiKey) {
  return _get(`/citations/runs/${encodeURIComponent(runId)}`, apiKey);
}

/**
 * Timeseries of mention rate, citation rate, share of voice and average position.
 * @param {number} trackerId
 * @param {string} apiKey
 * @param {Object} [opts] - { days=90 (1–365) }
 * @returns {Promise<Object>}
 */
async function citationTrackerHistory(trackerId, apiKey, opts = {}) {
  return _get(`/citations/trackers/${encodeURIComponent(trackerId)}/history`, apiKey, { days: opts.days ?? 90 });
}

/**
 * One-off citation check: no tracker, metered per check (paid plans only).
 * @param {Object} check - sent as-is: { brand, prompt, domains, engines, samples, competitors }
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function citationCheck(check, apiKey) {
  return _send("POST", "/citations/check", apiKey, check);
}

/**
 * Top-up packs for AI citation checks and this account's balance.
 * @param {string} apiKey
 * @returns {Promise<Object>} { packs, can_buy, balance, next_expiry, monthly, checks_available, grants }
 */
async function citationTopups(apiKey) {
  return _get("/citations/topups", apiKey);
}

/**
 * Start a one-time Stripe Checkout for top-up checks (paid plans only). Nothing
 * is charged by this call; the checks are added when the payment completes.
 * @param {string|number} pack - the `key` of one of citationTopups().packs ("500" or "2000" checks)
 * @param {string} apiKey
 * @returns {Promise<string>} the checkout URL to open
 */
async function citationTopupCheckout(pack, apiKey) {
  const data = await _send("POST", "/citations/topups/checkout", apiKey, { pack: String(pack) });
  return data.url;
}

/**
 * Read the auto-reload setting for AI citation checks and this month's use.
 * Read-only by design: auto-reload can only be turned on or changed from the
 * dashboard (signed in), never with an API key, because turning it on
 * authorizes charges. There is no setter in this client.
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function citationAutoReload(apiKey) {
  return _get("/citations/auto-reload", apiKey);
}

// --- Deep Site Audit (Pro/Ultra, or credits) --------------------------------

/**
 * Point Deep Audit calls at another host (proxy, staging, or the legacy
 * engine.seoscoreapi.com). Pass nothing to reset to https://seoscoreapi.com.
 * @param {string} [url]
 */
function setDeepAuditBaseUrl(url) {
  deepAuditBaseUrl = url || BASE_URL;
}

/** @returns {string} the current Deep Audit base URL */
function getDeepAuditBaseUrl() {
  return _deepBase();
}

function _splitOpts(opts = {}) {
  const { baseUrl, ...body } = opts;
  return { baseUrl, body };
}

/**
 * Start a Deep Site Audit. Asynchronous: returns a job you poll.
 * @param {string} url - URL to audit
 * @param {string} apiKey - Your API key (Pro/Ultra, or one with Deep Audit credits)
 * @param {Object} [opts] - business_type, is_local, webhook_url (sent as-is); baseUrl (not sent)
 * @returns {Promise<{job_id: string, status: string, poll: string}>}
 */
async function siteAudit(url, apiKey, opts = {}) {
  const { baseUrl, body } = _splitOpts(opts);
  return _engineFetch("/site-audit", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({ url, ...body }),
  }, false, baseUrl);
}

/**
 * Poll a Deep Site Audit job.
 * @param {string} jobId
 * @param {string} apiKey
 * @param {{baseUrl?: string}} [opts]
 * @returns {Promise<Object>} { status, progress, queue_position?, eta_seconds?, result?, error? }
 */
async function getSiteAudit(jobId, apiKey, opts = {}) {
  return _engineFetch(`/site-audit/${encodeURIComponent(jobId)}`, {
    headers: { "X-API-Key": apiKey },
  }, false, opts.baseUrl);
}

/**
 * Poll an existing Deep Site Audit job until it finishes.
 * @param {string} jobId
 * @param {string} apiKey
 * @param {Object} [wait] - { pollIntervalMs=5000, timeoutMs=600000, onProgress, baseUrl }
 * @returns {Promise<Object>} the completed audit result
 */
async function waitForSiteAudit(jobId, apiKey, wait = {}) {
  const { pollIntervalMs = 5000, timeoutMs = 600000, onProgress, baseUrl } = wait;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for audit to complete");
    const s = await getSiteAudit(jobId, apiKey, { baseUrl });
    if (onProgress) onProgress(s);
    if (s.status === "completed") return s.result;
    if (s.status === "failed") throw new Error(s.error || "Audit failed");
    const waitMs = s.status === "queued" && s.eta_seconds
      ? Math.min(s.eta_seconds * 1000, 15000)
      : pollIntervalMs;
    await _sleep(waitMs);
  }
}

/**
 * Start a Deep Site Audit and wait for the result. Retries the submit on queue
 * backpressure (429 + Retry-After) and honors the server's ETA between polls.
 * @param {string} url
 * @param {string} apiKey
 * @param {Object} [opts] - business_type, is_local, webhook_url (sent as-is); baseUrl (not sent)
 * @param {Object} [wait] - { pollIntervalMs=5000, timeoutMs=600000, onProgress }
 * @returns {Promise<Object>} the completed audit result (scores, sections, findings, coverage)
 */
async function deepAudit(url, apiKey, opts = {}, wait = {}) {
  const { baseUrl, body } = _splitOpts(opts);
  const { pollIntervalMs = 5000, timeoutMs = 600000, onProgress } = wait;
  const deadline = Date.now() + timeoutMs;
  let job;
  for (;;) {
    const res = await _engineFetch("/site-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({ url, ...body }),
    }, true, baseUrl);
    if (res.status === 429) {
      const retry = (Number(res.headers.get("retry-after")) || 5) * 1000;
      if (Date.now() + retry > deadline) throw new Error("Timed out waiting for queue capacity");
      await _sleep(retry);
      continue;
    }
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      const err = new Error(b.detail || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    job = await res.json();
    break;
  }
  return waitForSiteAudit(job.job_id, apiKey, {
    pollIntervalMs,
    timeoutMs: Math.max(deadline - Date.now(), 0),
    onProgress,
    baseUrl,
  });
}

/**
 * Deep Site Audits used/remaining this month for this key.
 * @param {string} apiKey
 * @param {{baseUrl?: string}} [opts]
 * @returns {Promise<Object>} { tier, site_audit: { used, remaining }, ... }
 */
async function deepAuditUsage(apiKey, opts = {}) {
  const base = _deepBase(opts.baseUrl);
  return _engineFetch(_usagePath(base), { headers: { "X-API-Key": apiKey } }, false, base);
}

/** @deprecated Use deepAuditUsage(). Kept for 1.4 callers. */
async function engineUsage(apiKey, opts = {}) {
  return deepAuditUsage(apiKey, opts);
}

module.exports = {
  signup, verify, audit, batchAudit, usage, addMonitor, listMonitors, removeMonitor, scoreboardOptOut, compare, competitiveAudit, reportUrl, history, historyDomains,
  accessibilityAudit, auditExport, aiReadability, trackers, conversion, quickWins, backlinks, generateLlmsTxt,
  geoAudit, geoBrandProbe, addGeoMonitor, removeGeoMonitor, listGeoMonitors, geoMonitorHistory,
  startCrawl, getCrawl, waitForCrawl, crawl,
  citationStarterPrompts, citationSuggestPrompts, createCitationTracker, listCitationTrackers, getCitationTracker, updateCitationTracker, deleteCitationTracker, runCitationTracker, getCitationRun, citationTrackerHistory, citationCheck, citationTopups, citationTopupCheckout, citationAutoReload,
  siteAudit, getSiteAudit, waitForSiteAudit, deepAudit, deepAuditUsage, engineUsage, setDeepAuditBaseUrl, getDeepAuditBaseUrl, BASE_URL, ENGINE_URL, VERSION,
};
