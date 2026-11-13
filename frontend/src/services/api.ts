import type {
  AuditOut,
  AuditDetailOut,
  DashboardStats,
  BenchmarkRateOut,
  AuditResult,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${input}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const auditApi = {
  upload: (file: File, userId = "demo-user") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("user_id", userId);
    return fetch(`${API_BASE}/api/audits/upload`, {
      method: "POST",
      body: fd,
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Upload failed: ${res.status}`);
      }
      return res.json();
    });
  },
  extract: (auditId: string) =>
    request<{ audit_id: string; extraction_method: string; extraction: any; status: string }>(
      `/api/audits/${auditId}/extract`,
      { method: "POST" }
    ),
  analyze: (auditId: string) =>
    request<AuditResult>(`/api/audits/${auditId}/analyze`, { method: "POST" }),
  list: (userId = "demo-user") =>
    request<AuditOut[]>(`/api/audits?user_id=${encodeURIComponent(userId)}`),
  get: (auditId: string, userId = "demo-user") =>
    request<AuditDetailOut>(`/api/audits/${auditId}?user_id=${encodeURIComponent(userId)}`),
  report: (auditId: string, userId = "demo-user") =>
    `${API_BASE}/api/audits/${auditId}/report?user_id=${encodeURIComponent(userId)}`,
  appeal: (auditId: string, userId = "demo-user") =>
    `${API_BASE}/api/audits/${auditId}/appeal?user_id=${encodeURIComponent(userId)}`,
  delete: (auditId: string, userId = "demo-user") =>
    request<{ message: string }>(`/api/audits/${auditId}?user_id=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
  stats: (userId = "demo-user") =>
    request<DashboardStats>(`/api/dashboard/stats?user_id=${encodeURIComponent(userId)}`),
};

export const benchmarkApi = {
  list: () => request<BenchmarkRateOut[]>(`/api/benchmarks`),
  create: (data: any) => request<BenchmarkRateOut>(`/api/benchmarks`, { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<BenchmarkRateOut>(`/api/benchmarks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: string) =>
    request<void>(`/api/benchmarks/${id}`, { method: "DELETE" }),
};
