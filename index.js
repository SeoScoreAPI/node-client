/**
 * SEO Score API - Node.js Client
 * Audit any URL for SEO issues with one function call.
 * https://seoscoreapi.com
 */

const BASE_URL = "https://seoscoreapi.com";
const VERSION = "1.1.0";
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
 * @param {string} url
 * @param {string} apiKey
 * @param {string} [frequency="daily"]
 * @returns {Promise<Object>}
 */
async function addMonitor(url, apiKey, frequency = "daily") {
  return _fetch("/monitors", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({ url, frequency }),
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
 * Get shareable report URL for a domain.
 * @param {string} domain
 * @returns {string}
 */
function reportUrl(domain) {
  return `${BASE_URL}/report/${domain}`;
}

module.exports = { signup, audit, batchAudit, usage, addMonitor, scoreboardOptOut, reportUrl };
