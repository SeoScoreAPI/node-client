/**
 * SEO Score API — Node.js client type declarations.
 * https://seoscoreapi.com
 */

/** Generic JSON object returned by the API. */
export type ApiResult = Record<string, unknown>;

export interface MonitorOptions {
  /** "daily" or "weekly". Defaults to "daily". */
  frequency?: string;
  /** https URL to POST alerts to (Slack incoming-webhooks are auto-formatted). */
  webhookUrl?: string;
  /** Point drop that triggers an alert. Defaults to 5. */
  alertThreshold?: number;
}

export interface HistoryOptions {
  /** Max number of points to return (1–1000). Defaults to 100. */
  limit?: number;
  /** UNIX timestamp lower bound (inclusive). */
  since?: number;
}

export interface DomainHistory {
  domain: string;
  latest_score: number;
  latest_grade: string;
  trend_30d: number;
  [key: string]: unknown;
}

/** What `POST /signup` answers: a 6-digit code was emailed, no key yet. */
export interface SignupResult {
  /** "verification_required" while the emailed code is outstanding. */
  status: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Start signup for a free API key. The API emails a 6-digit code; no key is
 * issued until the code is passed to `verify()`.
 */
export function signup(email: string): Promise<SignupResult>;

/**
 * Finish signup: exchange the emailed 6-digit code for the API key (shown only
 * once). Rejects with status 400 on a wrong or expired code.
 */
export function verify(email: string, code: string | number): Promise<string>;

/** Run an SEO audit on a URL. */
/** Options for `audit` and `batchAudit`. */
export interface AuditOptions {
  /**
   * Include measured Core Web Vitals (LCP, INP, CLS, FCP, TTFB from Google PageSpeed
   * Insights) under `core_web_vitals`. Default false: the first measurement of a URL
   * adds about 10 seconds; it is then cached for 24 hours.
   */
  cwv?: boolean;
}

/** The `core_web_vitals` object on every audit result. Read `status` first. */
export interface CoreWebVitals {
  /**
   * `not_requested`: the audit did not ask (the default). `ok`: measured.
   * `unavailable`: asked, but PageSpeed failed or was too slow (see `reason`;
   * `pending: true` means it is still measuring, so audit the URL again).
   */
  status: "ok" | "not_requested" | "unavailable";
  lcp_ms: number | null;
  inp_ms: number | null;
  cls: number | null;
  fcp_ms: number | null;
  ttfb_ms: number | null;
  checks: Array<{ name: string; status: "pass" | "warning" | "fail"; value: string; score: number; metric: string }>;
  source?: "field" | "lab";
  strategy?: string;
  reason?: string;
  hint?: string;
  pending?: boolean;
  _cached?: boolean;
  [key: string]: unknown;
}

export function audit(url: string, apiKey: string, opts?: AuditOptions): Promise<ApiResult>;

/** Audit multiple URLs (paid plans only). */
export function batchAudit(urls: string[], apiKey: string, opts?: AuditOptions): Promise<ApiResult>;

/** Check your API usage and limits. */
export function usage(apiKey: string): Promise<ApiResult>;

/**
 * Set up score monitoring for a URL (paid plans only).
 * `opts` may be an options object or a legacy frequency string.
 */
export function addMonitor(
  url: string,
  apiKey: string,
  opts?: MonitorOptions | string
): Promise<ApiResult>;

/** Opt in or out of the public SEO scoreboard. */
export function scoreboardOptOut(
  apiKey: string,
  optOut?: boolean
): Promise<ApiResult>;

/** Compare 2–5 URLs side by side with a structured diff (Basic+). */
export function compare(urls: string[], apiKey: string): Promise<ApiResult>;

/** Run a head-to-head competitive audit (Pro+). */
export function competitiveAudit(
  url: string,
  competitorUrl: string,
  keyword: string,
  apiKey: string
): Promise<ApiResult>;

/** Get the shareable report URL for a domain. */
export function reportUrl(domain: string): string;

/** Get historical audit scores and trend summary for a URL (Starter+). */
export function history(
  url: string,
  apiKey: string,
  opts?: HistoryOptions
): Promise<ApiResult>;

/** List every domain audited by this key with latest score and 30-day trend (Starter+). */
export function historyDomains(apiKey: string): Promise<DomainHistory[]>;

/** List your active monitors. */
export function listMonitors(apiKey: string): Promise<ApiResult[]>;

/** Remove a score monitor (DELETE /monitors). */
export function removeMonitor(url: string, apiKey: string): Promise<ApiResult>;

// --- Accessibility, exports and single-page analyses -------------------------

/** Run an ADA / WCAG 2.1 AA accessibility audit (paid plans; own monthly allowance). */
export function accessibilityAudit(
  url: string,
  apiKey: string,
  opts?: { /** "trackers" adds the tracker and pixel inventory. */ include?: string }
): Promise<ApiResult>;

export interface AuditExportOptions {
  /** "pdf" (default), "md" or "csv". */
  format?: "pdf" | "md" | "csv";
  /** White-label (Pro and Ultra): your agency name. */
  brandName?: string;
  /** White-label (Pro and Ultra): accent colour, #rrggbb. */
  brandColor?: string;
  /** White-label (Pro and Ultra): https URL of a PNG/JPEG/WebP logo, max 300 KB. */
  logoUrl?: string;
}

/** Run an audit and download it as a PDF, Markdown or CSV report. Resolves with the file's bytes. */
export function auditExport(url: string, apiKey: string, opts?: AuditExportOptions): Promise<Buffer>;

/** Score how well a page can be consumed by AI/LLM systems. */
export function aiReadability(url: string, apiKey: string): Promise<ApiResult>;

/** List the third-party trackers and pixels a page loads. */
export function trackers(url: string, apiKey: string): Promise<ApiResult>;

/** Score how well a page turns a visitor into a lead or a sale. */
export function conversion(
  url: string,
  apiKey: string,
  opts?: { /** local_service | ecommerce | saas | general. Detected when omitted. */ pageType?: string }
): Promise<ApiResult>;

export interface QuickWinsData {
  /** Search Console rows: { query, page?, clicks, impressions, position }. */
  rows?: Array<Record<string, unknown>>;
  /** The Performance export as text, with a header row. */
  csv?: string;
  min_impressions?: number;
  /** 1–10. */
  target_position?: number;
  limit?: number;
  exclude_terms?: string[];
  ctr_curve?: Record<string, number>;
}

/** Find the page-2 quick wins in your own Search Console data (every plan). */
export function quickWins(data: QuickWinsData, apiKey: string): Promise<ApiResult>;

/** Observed backlinks for a domain (Basic+). An audit-fed sample, not a full index. */
export function backlinks(domain: string, apiKey: string, opts?: { limit?: number }): Promise<ApiResult>;

/** Generate an llms.txt file for a domain. The key is optional (Basic+ returns the curated version). */
export function generateLlmsTxt(domain: string, apiKey?: string): Promise<string>;

// --- GEO (Basic plan or higher) ---------------------------------------------

/** Run a GEO (Generative Engine Optimization) audit (Basic+). */
export function geoAudit(url: string, apiKey: string): Promise<ApiResult>;

export interface BrandProbe {
  brand: string;
  domain: string;
  prompts: string[];
  models?: string[];
  runs_per_prompt?: number;
}

/** Probe LLMs to measure how often your brand is mentioned in AI responses (Basic+). */
export function geoBrandProbe(probe: BrandProbe, apiKey: string): Promise<ApiResult>;

export interface GeoMonitorOptions {
  /** "daily" or "weekly". Defaults to "weekly". */
  frequency?: string;
  /** Defaults to -5. */
  alertThreshold?: number;
  webhookUrl?: string;
}

/** Create a GEO monitor for a URL (Basic+). */
export function addGeoMonitor(url: string, apiKey: string, opts?: GeoMonitorOptions): Promise<ApiResult>;

/** Remove a GEO monitor. */
export function removeGeoMonitor(url: string, apiKey: string): Promise<ApiResult>;

/** List your active GEO monitors. */
export function listGeoMonitors(apiKey: string): Promise<ApiResult[]>;

/** Score history for a GEO monitor. */
export function geoMonitorHistory(
  monitorId: number,
  apiKey: string,
  opts?: { page?: number; perPage?: number }
): Promise<ApiResult>;

// --- Site crawl (Pro/Ultra, or a Deep Audit credit) -------------------------

export interface CrawlJob {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  url?: string;
  max_pages?: number;
  pages_done?: number;
  /** Shareable page with the site diagram once the crawl has finished. */
  site_map?: string;
  poll?: string;
  /** Present when completed: summary, issues, pages, links. */
  result?: ApiResult;
  /** Present when failed. */
  error?: string;
}

export interface CrawlWaitOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
  onProgress?: (job: CrawlJob) => void;
}

/** Start a multi-page site crawl. Async: returns a job to poll. */
export function startCrawl(url: string, apiKey: string, opts?: { maxPages?: number }): Promise<CrawlJob>;

/** Poll a site crawl. */
export function getCrawl(jobId: string, apiKey: string): Promise<CrawlJob>;

/** Poll an existing crawl until it completes; resolves with the completed job. */
export function waitForCrawl(jobId: string, apiKey: string, wait?: CrawlWaitOptions): Promise<CrawlJob>;

/** Start a site crawl and wait for it to finish. */
export function crawl(
  url: string,
  apiKey: string,
  opts?: { maxPages?: number },
  wait?: CrawlWaitOptions
): Promise<CrawlJob>;

// --- AI citations (Starter plan or higher) ----------------------------------

export interface StarterPromptOptions {
  brand?: string;
  /** Up to 5; array or comma-separated string. */
  competitors?: string[] | string;
  audience?: string;
  /** Up to 6. */
  features?: string[] | string;
  /** Up to 6. */
  useCases?: string[] | string;
  /** 1–10; the API default is 2. */
  perCategory?: number;
  /** 1–60. */
  limit?: number;
}

/** A starter set of prompts to track (fixed templates; not metered). */
export function citationStarterPrompts(
  topic: string,
  apiKey: string,
  opts?: StarterPromptOptions
): Promise<ApiResult>;

/** Suggest prompts to track, read off what the site says it does. */
export function citationSuggestPrompts(domain: string, apiKey: string): Promise<ApiResult>;

export interface CitationTrackerFields {
  domains?: string[];
  prompts?: string[];
  competitors?: string[];
  /** chatgpt | gemini | perplexity | claude */
  engines?: string[];
  samples?: number;
  /** daily | weekly | monthly | manual */
  cadence?: string;
  /** https URL. */
  webhook_url?: string | null;
  [extra: string]: unknown;
}

export interface NewCitationTracker extends CitationTrackerFields {
  brand: string;
  /** Build the prompts from a topic instead of sending `prompts`. */
  starter?: { topic: string; audience?: string; [extra: string]: unknown };
}

/** Track a brand's visibility in AI answers (Starter+). */
export function createCitationTracker(tracker: NewCitationTracker, apiKey: string): Promise<ApiResult>;

/** List this key's citation trackers, with the month's check usage. */
export function listCitationTrackers(apiKey: string): Promise<{ trackers: ApiResult[]; usage: ApiResult }>;

/** Read one citation tracker. */
export function getCitationTracker(trackerId: number, apiKey: string): Promise<ApiResult>;

/** Edit a tracker (only the fields you send change). */
export function updateCitationTracker(
  trackerId: number,
  fields: CitationTrackerFields,
  apiKey: string
): Promise<ApiResult>;

/** Stop tracking a brand. */
export function deleteCitationTracker(trackerId: number, apiKey: string): Promise<ApiResult>;

/** Run a tracker now. Refused with 429 (nothing spent) when the checks available are short. */
export function runCitationTracker(trackerId: number, apiKey: string): Promise<ApiResult>;

/** Run status plus every per-prompt, per-engine result. */
export function getCitationRun(runId: number, apiKey: string): Promise<ApiResult>;

/** Timeseries of mention rate, citation rate, share of voice and average position. */
export function citationTrackerHistory(
  trackerId: number,
  apiKey: string,
  opts?: { /** 1–365, default 90. */ days?: number }
): Promise<ApiResult>;

export interface CitationCheck {
  brand: string;
  prompt: string;
  domains?: string[];
  engines?: string[];
  samples?: number;
  competitors?: string[];
}

/** One-off citation check: no tracker, metered per check (paid plans only). */
export function citationCheck(check: CitationCheck, apiKey: string): Promise<ApiResult>;

/** Top-up packs for AI citation checks and this account's balance. */
export function citationTopups(apiKey: string): Promise<ApiResult>;

/** Start a one-time Stripe Checkout for top-up checks. Resolves with the checkout URL. */
export function citationTopupCheckout(pack: string | number, apiKey: string): Promise<string>;

/**
 * Read the auto-reload setting for AI citation checks. Read-only: it can only be
 * turned on or changed from the dashboard, never with an API key.
 */
export function citationAutoReload(apiKey: string): Promise<ApiResult>;

// --- Deep Site Audit (Pro/Ultra, or credits) --------------------------------

export const BASE_URL: string;
/** Legacy dedicated Deep Audit host (still works). */
export const ENGINE_URL: string;
export const VERSION: string;

/** Point Deep Audit calls at another host; no argument resets to https://seoscoreapi.com. */
export function setDeepAuditBaseUrl(url?: string): void;
export function getDeepAuditBaseUrl(): string;

export interface DeepAuditOptions {
  /** saas | local_service | ecommerce | storefront | blog | publisher — tunes which checks apply. */
  business_type?: string;
  /** Force local-business checks (NAP, LocalBusiness schema). */
  is_local?: boolean;
  /** URL POSTed once when the job completes (no retries; keep polling). */
  webhook_url?: string;
  /** Override the Deep Audit host for this call (not sent to the API). */
  baseUrl?: string;
  [extra: string]: unknown;
}

export interface DeepAuditJob {
  job_id: string;
  status: string;
  poll: string;
}

export interface DeepAuditStatus {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  stage: string | null;
  /** Present while queued. */
  queue_position?: number;
  eta_seconds?: number;
  /** Present when completed. */
  result?: ApiResult;
  /** Present when failed. */
  error?: string;
}

export interface DeepAuditWaitOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
  onProgress?: (status: DeepAuditStatus) => void;
}

export interface DeepAuditUsage {
  tier?: string;
  site_audit?: { used: number; remaining: number };
  [key: string]: unknown;
}

/** Start a Deep Site Audit. Async: returns a job to poll. */
export function siteAudit(url: string, apiKey: string, opts?: DeepAuditOptions): Promise<DeepAuditJob>;

/** Poll a Deep Site Audit job. */
export function getSiteAudit(jobId: string, apiKey: string, opts?: { baseUrl?: string }): Promise<DeepAuditStatus>;

/** Poll an existing job until it completes; resolves with its result. */
export function waitForSiteAudit(
  jobId: string,
  apiKey: string,
  wait?: DeepAuditWaitOptions & { baseUrl?: string }
): Promise<ApiResult>;

/** Start a Deep Site Audit and wait for the result (handles queue backpressure + ETA). */
export function deepAudit(
  url: string,
  apiKey: string,
  opts?: DeepAuditOptions,
  wait?: DeepAuditWaitOptions
): Promise<ApiResult>;

/** Deep Site Audits used/remaining this month (GET /deep-audit/usage). */
export function deepAuditUsage(apiKey: string, opts?: { baseUrl?: string }): Promise<DeepAuditUsage>;

/** @deprecated Use deepAuditUsage(). */
export function engineUsage(apiKey: string, opts?: { baseUrl?: string }): Promise<DeepAuditUsage>;
