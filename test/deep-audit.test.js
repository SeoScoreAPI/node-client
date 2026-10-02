"use strict";
// Deep Site Audit client tests. No network: global fetch is replaced.
const test = require("node:test");
const assert = require("node:assert/strict");

delete process.env.SEOSCORE_DEEP_AUDIT_URL;
const seo = require("..");

function res(payload = {}, status = 200, headers = {}) {
  return {
    ok: status < 400,
    status,
    headers: { get: (k) => headers[k.toLowerCase()] ?? null },
    json: async () => payload,
  };
}

function mockFetch(responses) {
  const calls = [];
  const queue = Array.isArray(responses) ? [...responses] : null;
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return queue ? queue.shift() : responses;
  };
  return calls;
}

test.afterEach(() => seo.setDeepAuditBaseUrl());

test("defaults to the main host", () => {
  assert.equal(seo.getDeepAuditBaseUrl(), "https://seoscoreapi.com");
  assert.equal(seo.VERSION, "1.5.0");
});

test("siteAudit posts to /site-audit on the main host", async () => {
  const calls = mockFetch(res({ job_id: "abc", status: "queued" }));
  const job = await seo.siteAudit("https://example.com", "k", { business_type: "saas" });
  assert.equal(job.job_id, "abc");
  assert.equal(calls[0].url, "https://seoscoreapi.com/site-audit");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers["X-API-Key"], "k");
  assert.deepEqual(JSON.parse(calls[0].options.body), { url: "https://example.com", business_type: "saas" });
});

test("per-call baseUrl override is used and not sent", async () => {
  const calls = mockFetch(res({ job_id: "x" }));
  await seo.siteAudit("https://example.com", "k", { baseUrl: "http://localhost:9000/" });
  assert.equal(calls[0].url, "http://localhost:9000/site-audit");
  assert.deepEqual(JSON.parse(calls[0].options.body), { url: "https://example.com" });
});

test("setDeepAuditBaseUrl changes the host", async () => {
  seo.setDeepAuditBaseUrl("https://staging.example");
  const calls = mockFetch(res({ status: "running" }));
  await seo.getSiteAudit("abc", "k");
  assert.equal(calls[0].url, "https://staging.example/site-audit/abc");
});

test("deepAuditUsage uses /deep-audit/usage on the main host", async () => {
  const calls = mockFetch(res({ tier: "pro" }));
  assert.deepEqual(await seo.deepAuditUsage("k"), { tier: "pro" });
  assert.equal(calls[0].url, "https://seoscoreapi.com/deep-audit/usage");
});

test("engineUsage alias uses /usage on the legacy engine host", async () => {
  const calls = mockFetch(res({}));
  await seo.engineUsage("k", { baseUrl: seo.ENGINE_URL });
  assert.equal(calls[0].url, "https://engine.seoscoreapi.com/usage");
});

test("waitForSiteAudit polls until completed", async () => {
  mockFetch([
    res({ status: "queued", eta_seconds: 0.001 }),
    res({ status: "running", progress: 50 }),
    res({ status: "completed", result: { scores: { lai_score: 3.2 } } }),
  ]);
  const seen = [];
  const result = await seo.waitForSiteAudit("abc", "k", { pollIntervalMs: 1, onProgress: (s) => seen.push(s.status) });
  assert.deepEqual(result, { scores: { lai_score: 3.2 } });
  assert.deepEqual(seen, ["queued", "running", "completed"]);
});

test("waitForSiteAudit rejects on failure", async () => {
  mockFetch(res({ status: "failed", error: "boom" }));
  await assert.rejects(seo.waitForSiteAudit("abc", "k"), /boom/);
});

test("waitForSiteAudit times out", async () => {
  mockFetch(res({ status: "running" }));
  await assert.rejects(seo.waitForSiteAudit("abc", "k", { timeoutMs: -1 }), /Timed out/);
});

test("deepAudit retries 429 then polls the job", async () => {
  const calls = mockFetch([
    res({}, 429, { "retry-after": "0.001" }),
    res({ job_id: "abc", status: "queued" }),
    res({ status: "completed", result: { ok: 1 } }),
  ]);
  assert.deepEqual(await seo.deepAudit("https://example.com", "k", {}, { pollIntervalMs: 1 }), { ok: 1 });
  assert.equal(calls.length, 3);
  assert.equal(calls[2].url, "https://seoscoreapi.com/site-audit/abc");
});

test("HTTP errors carry the API detail and status", async () => {
  mockFetch(res({ detail: "No Deep Audit credits left" }, 402));
  await assert.rejects(seo.siteAudit("https://example.com", "k"), (e) => e.status === 402 && /credits/.test(e.message));
});
