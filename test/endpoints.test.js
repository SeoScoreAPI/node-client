"use strict";
// Endpoint wrappers added in 1.6.0. No network: global fetch is replaced.
const test = require("node:test");
const assert = require("node:assert/strict");

const seo = require("..");

const B = "https://seoscoreapi.com";

function res(payload = {}, status = 200, { text, bytes } = {}) {
  return {
    ok: status < 400,
    status,
    headers: { get: () => null },
    json: async () => payload,
    text: async () => text ?? JSON.stringify(payload),
    arrayBuffer: async () => Uint8Array.from(bytes ?? []).buffer,
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

const q = (params) => `?${new URLSearchParams(params).toString()}`;

// [name, call, expected URL]
const GETS = [
  ["accessibilityAudit", () => seo.accessibilityAudit("https://e.com", "k"), `/audit/accessibility${q({ url: "https://e.com" })}`],
  ["accessibilityAudit include", () => seo.accessibilityAudit("https://e.com", "k", { include: "trackers" }),
    `/audit/accessibility${q({ url: "https://e.com", include: "trackers" })}`],
  ["aiReadability", () => seo.aiReadability("https://e.com", "k"), `/ai-readability${q({ url: "https://e.com" })}`],
  ["trackers", () => seo.trackers("https://e.com", "k"), `/trackers${q({ url: "https://e.com" })}`],
  ["conversion", () => seo.conversion("https://e.com", "k"), `/conversion${q({ url: "https://e.com" })}`],
  ["conversion pageType", () => seo.conversion("https://e.com", "k", { pageType: "saas" }),
    `/conversion${q({ url: "https://e.com", page_type: "saas" })}`],
  ["backlinks", () => seo.backlinks("e.com", "k", { limit: 10 }), `/backlinks${q({ domain: "e.com", limit: 10 })}`],
  ["geoAudit", () => seo.geoAudit("https://e.com", "k"), `/geo/audit${q({ url: "https://e.com" })}`],
  ["geoMonitorHistory", () => seo.geoMonitorHistory(7, "k", { page: 2 }), `/geo/monitor/7/history${q({ page: 2, per_page: 20 })}`],
  ["getCrawl", () => seo.getCrawl("abc", "k"), "/crawl/abc"],
  ["citationStarterPrompts", () => seo.citationStarterPrompts("CRM", "k", { brand: "Acme", competitors: ["A", "B"], useCases: "x, y", limit: 15 }),
    `/citations/prompts/starter${q({ topic: "CRM", brand: "Acme", competitors: "A,B", use_cases: "x, y", limit: 15 })}`],
  ["citationSuggestPrompts", () => seo.citationSuggestPrompts("e.com", "k"), `/citations/prompts/suggest${q({ domain: "e.com" })}`],
  ["listCitationTrackers", () => seo.listCitationTrackers("k"), "/citations/trackers"],
  ["getCitationTracker", () => seo.getCitationTracker(3, "k"), "/citations/trackers/3"],
  ["getCitationRun", () => seo.getCitationRun(9, "k"), "/citations/runs/9"],
  ["citationTrackerHistory", () => seo.citationTrackerHistory(3, "k", { days: 30 }), `/citations/trackers/3/history${q({ days: 30 })}`],
  ["citationTopups", () => seo.citationTopups("k"), "/citations/topups"],
  ["citationAutoReload", () => seo.citationAutoReload("k"), "/citations/auto-reload"],
];

for (const [name, call, url] of GETS) {
  test(`GET ${name}`, async () => {
    const calls = mockFetch(res({ ok: 1 }));
    assert.deepEqual(await call(), { ok: 1 });
    assert.equal(calls[0].url, B + url);
    assert.equal(calls[0].options.method, undefined);
    assert.equal(calls[0].options.headers["X-API-Key"], "k");
    assert.equal(calls[0].options.headers["User-Agent"], `seoscoreapi-node/${seo.VERSION}`);
  });
}

// [name, call, method, path, expected body]
const SENDS = [
  ["removeMonitor", () => seo.removeMonitor("https://e.com", "k"), "DELETE", "/monitors", { url: "https://e.com" }],
  ["geoBrandProbe", () => seo.geoBrandProbe({ brand: "Acme", domain: "acme.com", prompts: ["p"], runs_per_prompt: 2 }, "k"),
    "POST", "/geo/brand-probe", { brand: "Acme", domain: "acme.com", prompts: ["p"], runs_per_prompt: 2 }],
  ["addGeoMonitor", () => seo.addGeoMonitor("https://e.com", "k"), "POST", "/geo/monitor",
    { url: "https://e.com", frequency: "weekly", alert_threshold: -5 }],
  ["addGeoMonitor webhook", () => seo.addGeoMonitor("https://e.com", "k", { frequency: "daily", webhookUrl: "https://h.example/x" }),
    "POST", "/geo/monitor", { url: "https://e.com", frequency: "daily", alert_threshold: -5, webhook_url: "https://h.example/x" }],
  ["removeGeoMonitor", () => seo.removeGeoMonitor("https://e.com", "k"), "DELETE", "/geo/monitor", { url: "https://e.com" }],
  ["startCrawl", () => seo.startCrawl("https://e.com", "k"), "POST", "/crawl", { url: "https://e.com" }],
  ["startCrawl maxPages", () => seo.startCrawl("https://e.com", "k", { maxPages: 10 }), "POST", "/crawl", { url: "https://e.com", max_pages: 10 }],
  ["quickWins", () => seo.quickWins({ rows: [{ query: "q", position: 11.4 }], limit: 5 }, "k"), "POST", "/quick-wins",
    { rows: [{ query: "q", position: 11.4 }], limit: 5 }],
  ["createCitationTracker", () => seo.createCitationTracker({ brand: "Acme", starter: { topic: "CRM" } }, "k"),
    "POST", "/citations/trackers", { brand: "Acme", starter: { topic: "CRM" } }],
  ["updateCitationTracker", () => seo.updateCitationTracker(3, { cadence: "monthly" }, "k"), "PATCH", "/citations/trackers/3", { cadence: "monthly" }],
  ["deleteCitationTracker", () => seo.deleteCitationTracker(3, "k"), "DELETE", "/citations/trackers/3", undefined],
  ["runCitationTracker", () => seo.runCitationTracker(3, "k"), "POST", "/citations/trackers/3/run", undefined],
  ["citationCheck", () => seo.citationCheck({ brand: "Acme", prompt: "best crm" }, "k"), "POST", "/citations/check", { brand: "Acme", prompt: "best crm" }],
];

for (const [name, call, method, path, body] of SENDS) {
  test(`${method} ${name}`, async () => {
    const calls = mockFetch(res({ ok: 1 }));
    assert.deepEqual(await call(), { ok: 1 });
    assert.equal(calls[0].url, B + path);
    assert.equal(calls[0].options.method, method);
    assert.equal(calls[0].options.headers["X-API-Key"], "k");
    if (body === undefined) assert.equal(calls[0].options.body, undefined);
    else assert.deepEqual(JSON.parse(calls[0].options.body), body);
  });
}

test("auditExport resolves with a Buffer and sends white-label params", async () => {
  const calls = mockFetch(res({}, 200, { bytes: [0x25, 0x50, 0x44, 0x46] }));
  const buf = await seo.auditExport("https://e.com", "k", { brandName: "Acme", brandColor: "#112233" });
  assert.ok(Buffer.isBuffer(buf));
  assert.equal(buf.toString("latin1"), "%PDF");
  assert.equal(calls[0].url, `${B}/audit/export${q({ url: "https://e.com", format: "pdf", brand_name: "Acme", brand_color: "#112233" })}`);
});

test("auditExport takes md and csv", async () => {
  const calls = mockFetch(res({}, 200, { bytes: [35] }));
  await seo.auditExport("https://e.com", "k", { format: "csv" });
  assert.match(calls[0].url, /format=csv/);
});

test("generateLlmsTxt resolves with text; the key is optional", async () => {
  let calls = mockFetch(res({}, 200, { text: "# Example\n" }));
  assert.equal(await seo.generateLlmsTxt("e.com"), "# Example\n");
  assert.equal(calls[0].url, `${B}/llms-generator?domain=e.com`);
  assert.equal(calls[0].options.headers["X-API-Key"], undefined);
  calls = mockFetch(res({}, 200, { text: "x" }));
  await seo.generateLlmsTxt("e.com", "k");
  assert.equal(calls[0].options.headers["X-API-Key"], "k");
});

test("listMonitors and listGeoMonitors unwrap the list", async () => {
  let calls = mockFetch(res({ monitors: [{ id: 1 }] }));
  assert.deepEqual(await seo.listMonitors("k"), [{ id: 1 }]);
  assert.equal(calls[0].url, `${B}/monitors`);
  calls = mockFetch(res({ monitors: [{ id: 2 }] }));
  assert.deepEqual(await seo.listGeoMonitors("k"), [{ id: 2 }]);
  assert.equal(calls[0].url, `${B}/geo/monitors`);
});

test("citationTopupCheckout resolves with the checkout URL", async () => {
  const calls = mockFetch(res({ url: "https://checkout.stripe.com/c/x" }));
  assert.equal(await seo.citationTopupCheckout(500, "k"), "https://checkout.stripe.com/c/x");
  assert.equal(calls[0].url, `${B}/citations/topups/checkout`);
  assert.deepEqual(JSON.parse(calls[0].options.body), { pack: "500" });
});

test("auto-reload is read-only: no setter is exported", () => {
  assert.deepEqual(Object.keys(seo).filter((k) => /autoreload/i.test(k)), ["citationAutoReload"]);
});

test("quickWins needs rows or csv", async () => {
  await assert.rejects(seo.quickWins({ limit: 5 }, "k"), /rows .* or csv/);
});

test("errors carry the API detail and status", async () => {
  mockFetch(res({ detail: "GEO features require a Basic plan" }, 403));
  await assert.rejects(seo.geoAudit("https://e.com", "k"), (e) => e.status === 403 && /Basic plan/.test(e.message));
});

test("waitForCrawl polls until completed and returns the job", async () => {
  mockFetch([
    res({ status: "queued", pages_done: 0 }),
    res({ status: "running", pages_done: 4 }),
    res({ status: "completed", site_map: "m", result: { summary: {} } }),
  ]);
  const seen = [];
  const job = await seo.waitForCrawl("abc", "k", { pollIntervalMs: 1, onProgress: (s) => seen.push(s.status) });
  assert.deepEqual(job.result, { summary: {} });
  assert.equal(job.site_map, "m");
  assert.deepEqual(seen, ["queued", "running", "completed"]);
});

test("waitForCrawl rejects on failure and on timeout", async () => {
  mockFetch(res({ status: "failed", error: "boom" }));
  await assert.rejects(seo.waitForCrawl("abc", "k"), /boom/);
  mockFetch(res({ status: "running" }));
  await assert.rejects(seo.waitForCrawl("abc", "k", { timeoutMs: -1 }), /Timed out/);
});

test("crawl starts then polls the job", async () => {
  const calls = mockFetch([res({ job_id: "abc", status: "queued" }), res({ status: "completed", result: { ok: 1 } })]);
  const job = await seo.crawl("https://e.com", "k", { maxPages: 5 }, { pollIntervalMs: 1 });
  assert.deepEqual(job.result, { ok: 1 });
  assert.deepEqual(JSON.parse(calls[0].options.body), { url: "https://e.com", max_pages: 5 });
  assert.equal(calls[1].url, `${B}/crawl/abc`);
});

// --- signup is two steps: POST /signup emails a code, POST /verify returns the key

test("signup resolves with the verification response, not a key", async () => {
  const payload = { status: "verification_required", message: "Check your email for a 6-digit verification code." };
  const calls = mockFetch(res(payload));
  assert.deepEqual(await seo.signup("you@example.com"), payload);
  assert.equal(calls[0].url, `${B}/signup`);
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), { email: "you@example.com" });
  assert.equal(calls[0].options.headers["X-API-Key"], undefined);
});

test("signup passes through a response that carries a key", async () => {
  mockFetch(res({ api_key: "ssa_x", tier: "free" }));
  assert.equal((await seo.signup("you@example.com")).api_key, "ssa_x");
});

test("signup rejects when the email already has a key", async () => {
  mockFetch(res({ detail: "Email already has an active key (prefix: ssa_abc...)" }, 409));
  await assert.rejects(seo.signup("you@example.com"), (err) => err.status === 409 && /active key/.test(err.message));
});

test("verify resolves with the API key", async () => {
  const calls = mockFetch(res({ api_key: "ssa_live_key", tier: "free", limits: {} }));
  assert.equal(await seo.verify("you@example.com", " 012345 "), "ssa_live_key");
  assert.equal(calls[0].url, `${B}/verify`);
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), { email: "you@example.com", code: "012345" });
});

test("verify accepts a numeric code", async () => {
  const calls = mockFetch(res({ api_key: "k" }));
  await seo.verify("you@example.com", 123456);
  assert.equal(JSON.parse(calls[0].options.body).code, "123456");
});

test("verify rejects on a bad code with the API's reason", async () => {
  mockFetch(res({ detail: "Invalid verification code. 4 attempts remaining." }, 400));
  await assert.rejects(
    seo.verify("you@example.com", "000000"),
    (err) => err.status === 400 && /Invalid verification code/.test(err.message),
  );
});

test("every exported function is declared in index.d.ts", () => {
  const dts = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "index.d.ts"), "utf8");
  for (const [name, value] of Object.entries(seo)) {
    if (typeof value === "function") assert.match(dts, new RegExp(`export function ${name}\\(`), name);
  }
});

// --- Core Web Vitals opt-in (1.7.0) ---

test("audit does not ask for Core Web Vitals by default", async () => {
  const calls = mockFetch(res({ score: 90 }));
  assert.deepEqual(await seo.audit("https://e.com", "k"), { score: 90 });
  assert.equal(calls[0].url, `${B}/audit?url=${encodeURIComponent("https://e.com")}`);
  assert.equal(calls[0].options.headers["X-API-Key"], "k");
  await seo.audit("https://e.com", "k", {});
  await seo.audit("https://e.com", "k", { cwv: false });
  assert.equal(calls[1].url, calls[0].url);
  assert.equal(calls[2].url, calls[0].url);
});

test("audit with { cwv: true } sends cwv=true", async () => {
  const calls = mockFetch(res({ score: 90, core_web_vitals: { status: "ok", lcp_ms: 1800 } }));
  const out = await seo.audit("https://e.com/?a=1&b=2", "k", { cwv: true });
  assert.equal(out.core_web_vitals.lcp_ms, 1800);
  assert.equal(calls[0].url, `${B}/audit?url=${encodeURIComponent("https://e.com/?a=1&b=2")}&cwv=true`);
});

test("batchAudit sends cwv only when asked", async () => {
  const calls = mockFetch(res({ count: 1, results: [] }));
  await seo.batchAudit(["https://a.com"], "k");
  await seo.batchAudit(["https://a.com"], "k", { cwv: true });
  assert.equal(calls[0].url, `${B}/audit/batch`);
  assert.deepEqual(JSON.parse(calls[0].options.body), { urls: ["https://a.com"] });
  assert.deepEqual(JSON.parse(calls[1].options.body), { urls: ["https://a.com"], cwv: true });
});
