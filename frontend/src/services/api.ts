import type {
  AuditOut,
  AuditDetailOut,
  DashboardStats,
  BenchmarkRateOut,
  AuditResult,
  BillExtraction,
} from "../types";
import { supabase } from "./supabase";

const API_BASE = import.meta.env.DEV ? "" : import.meta.env.VITE_API_BASE || "";
const API_LOCATION = import.meta.env.DEV
  ? "the local backend through Vite's proxy at http://127.0.0.1:8000"
  : API_BASE || "the same origin";

async function authenticatedFetch(input: string, init: RequestInit = {}) {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add the frontend environment variables and restart Vite.");
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Could not read the current session: ${error.message}`);
  if (!data.session) throw new Error("Please sign in to access your patient workspace.");

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    return await fetch(`${API_BASE}${input}`, { ...init, headers });
  } catch (fetchError) {
    if (fetchError instanceof TypeError) {
      throw new Error(
        `Could not reach the HISAAB API at ${API_LOCATION}. Confirm the backend is running.`,
      );
    }
    throw fetchError;
  }
}

async function responseError(res: Response, action: string): Promise<never> {
  const body = await res.text().catch(() => "");
  let message = body || `${action} failed: ${res.status}`;
  try {
    const parsed: { detail?: string; message?: string } = JSON.parse(body);
    message = parsed.detail || parsed.message || message;
  } catch {
    // Keep the response body as-is when it is not JSON.
  }
  throw new Error(message);
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await authenticatedFetch(input, init);
  if (!res.ok) return responseError(res, "Request");
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function requestFile(input: string): Promise<Blob> {
  const res = await authenticatedFetch(input);
  if (!res.ok) return responseError(res, "Download");
  return res.blob();
}

export const auditApi = {
  upload: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await authenticatedFetch("/api/audits/upload", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) return responseError(res, "Upload");
    return res.json() as Promise<{ audit_id: string; status: string; message: string }>;
  },
  extract: (auditId: string) =>
    request<{ audit_id: string; extraction_method: string; extraction: BillExtraction; status: string }>(
      `/api/audits/${auditId}/extract`,
      { method: "POST" },
    ),
  analyze: (auditId: string) =>
    request<AuditResult>(`/api/audits/${auditId}/analyze`, { method: "POST" }),
  list: () => request<AuditOut[]>("/api/audits"),
  get: (auditId: string) => request<AuditDetailOut>(`/api/audits/${auditId}`),
  report: (auditId: string) => requestFile(`/api/audits/${auditId}/report`),
  appeal: (auditId: string) => requestFile(`/api/audits/${auditId}/appeal`),
  delete: (auditId: string) =>
    request<{ message: string }>(`/api/audits/${auditId}`, { method: "DELETE" }),
  stats: () => request<DashboardStats>("/api/dashboard/stats"),
};

export const benchmarkApi = {
  list: () => request<BenchmarkRateOut[]>("/api/benchmarks"),
  create: (data: unknown) =>
    request<BenchmarkRateOut>("/api/benchmarks", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) =>
    request<BenchmarkRateOut>(`/api/benchmarks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: string) =>
    request<void>(`/api/benchmarks/${id}`, { method: "DELETE" }),
};
