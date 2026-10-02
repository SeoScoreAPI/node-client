/**
 * SEO Score API - Node.js Client
 * Audit any URL for SEO issues with one function call.
 * https://seoscoreapi.com
 */

const BASE_URL = "https://seoscoreapi.com";
// Legacy dedicated Deep Audit host. Still serves the same endpoints (its quota
// endpoint is plain /usage); pass it to setDeepAuditBaseUrl() if you need it.
const ENGINE_URL = "https://engine.seoscoreapi.com";
const VERSION = "1.5.0";

// Deep Site Audit is served on the main host. Override with
// setDeepAuditBaseUrl(), a per-call `baseUrl`, or SEOSCORE_DEEP_AUDIT_URL.
let deepAuditBaseUrl =
  (typeof process !== "undefined" && process.env && process.env.SEOSCORE_DEEP_AUDIT_URL) || BASE_URL;
const UA = `seoscoreapi-node/${VERSION}`;

async function _fetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  options.headers = { "User-Agent": UA, ...options.headers };
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
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
 * Sign up for a free API key.
 * @param {string} email
 * @returns {Promise<string>} The API key (save it — shown only once)
 */
async function signup(email) {
  const data = await _fetch("/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return data.api_key;
}

/**
 * Run an SEO audit on a URL.
 * @param {string} url - URL to audit
 * @param {string} apiKey - Your API key
 * @returns {Promise<Object>} Audit result with score, grade, checks, priorities
 */
async function audit(url, apiKey) {
  return _fetch(`/audit?url=${encodeURIComponent(url)}`, {
    headers: { "X-API-Key": apiKey },
  });
}

/**
 * Audit multiple URLs (paid plans only).
 * @param {string[]} urls
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function batchAudit(urls, apiKey) {
  return _fetch("/audit/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({ urls }),
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

module.exports = { signup, audit, batchAudit, usage, addMonitor, scoreboardOptOut, compare, competitiveAudit, reportUrl, history, historyDomains, siteAudit, getSiteAudit, waitForSiteAudit, deepAudit, deepAuditUsage, engineUsage, setDeepAuditBaseUrl, getDeepAuditBaseUrl, BASE_URL, ENGINE_URL, VERSION };
