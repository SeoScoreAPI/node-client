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

/** Sign up for a free API key. Returns the key (shown only once). */
export function signup(email: string): Promise<string>;

/** Run an SEO audit on a URL. */
export function audit(url: string, apiKey: string): Promise<ApiResult>;

/** Audit multiple URLs (paid plans only). */
export function batchAudit(urls: string[], apiKey: string): Promise<ApiResult>;

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
