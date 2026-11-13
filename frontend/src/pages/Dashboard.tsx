import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Clock,
  AlertTriangle,
  Calculator,
  Copy,
  BarChart3,
  Search,
  ArrowRight,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { auditApi } from "../services/api";
import type { AuditOut, DashboardStats } from "../types";
import AuditSummaryCard from "../components/AuditSummaryCard";
import StatusBadge from "../components/StatusBadge";
import { formatRupees, sampleBillLinesToVerify, sampleBillTotal } from "../data/sampleBill";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [search, setSearch] = useState("");

  const loadStats = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      setStats(await auditApi.stats());
    } catch (requestError: unknown) {
      setStats(null);
      setApiError(
        requestError instanceof Error ? requestError.message : "Could not load your saved bill checks.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const recentAudits = (stats?.recent_audits ?? []).filter((audit: AuditOut) =>
    [audit.hospital_name, audit.bill_number, audit.bill_date, audit.status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const findingsToReview = [
    { label: "Arithmetic prompts", count: stats?.arithmetic_discrepancies, icon: Calculator },
    { label: "Similar entries", count: stats?.duplicate_entries, icon: Copy },
    { label: "Benchmark comparisons", count: stats?.benchmark_discrepancies, icon: BarChart3 },
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-deep-sage">Patient workspace</p>
          <h1 className="mt-2 text-3xl font-serif tracking-tight text-dark-teal sm:text-4xl">A clearer view of your bill checks.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review saved checks, or explore the fictional sample before starting your own.
          </p>
        </div>
        <Link to="/upload" className="btn-primary shrink-0">
          New bill check <ArrowRight size={16} />
        </Link>
      </header>

      {apiError && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-[#f1d7cf] bg-[#fff7f3] p-4 text-sm text-[#884e3e] sm:flex-row sm:items-center sm:justify-between">
          <p>{apiError}</p>
          <button type="button" onClick={() => void loadStats()} className="btn-outline !min-h-10 !px-3 !py-2 text-xs">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      <section aria-label="Fictional sample bill" className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="relative isolate overflow-hidden rounded-[1.65rem] bg-dark-teal p-6 text-white shadow-[0_24px_70px_-42px_rgba(18,59,59,0.8)] sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 -z-10 h-64 w-64 rounded-full bg-[#a7cbb0]/25 blur-3xl" />
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#e4f0e5]">
            <FileText size={13} /> Fictional sample · not your data
          </div>
          <h2 className="mt-5 max-w-lg font-serif text-3xl leading-tight tracking-tight text-white sm:text-4xl">
            See how a careful review works.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-white/75">
            This example uses synthetic line items only. No OCR or live analysis has run on this sample.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.07] p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Sample total</p>
              <p className="mt-1 font-serif text-xl font-bold">{formatRupees(sampleBillTotal)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.07] p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Arithmetic</p>
              <p className="mt-1 text-sm font-semibold">Line items add up</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.07] p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Lines to verify</p>
              <p className="mt-1 font-serif text-xl font-bold">{sampleBillLinesToVerify}</p>
            </div>
          </div>
          <Link to="/sample" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#e7f276] px-4 py-2.5 text-xs font-bold text-dark-teal transition hover:-translate-y-0.5 hover:bg-[#d9e85c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-dark-teal">
            Explore sample review <ArrowRight size={15} />
          </Link>
        </div>

        <div className="rounded-[1.65rem] border border-[#e5ece6] bg-white/90 p-5 shadow-[0_18px_50px_-40px_rgba(18,59,59,0.5)] sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff1e2] text-[#98653b]">
              <HelpCircle size={19} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#98653b]">One possible pattern</p>
              <h3 className="mt-1 font-serif text-xl text-dark-teal">Two matching lab-panel lines</h3>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            The synthetic sample includes two entries dated 12 May 2025 for ₹4,800 each. Similar entries can be appropriate; check whether both tests were ordered and performed.
          </p>
          <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
            No rate comparison was applied to this sample. A reference is useful only when its published schedule and applicability conditions fit the service.
          </p>
        </div>
      </section>

      <section aria-label="Your saved bill checks" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-deep-sage">Your saved reviews</p>
            <h2 className="mt-1 font-serif text-2xl tracking-tight text-dark-teal">Workspace overview</h2>
          </div>
          {!loading && !apiError && <p className="text-xs text-slate-500">Counts reflect saved checks from your account.</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AuditSummaryCard
          title="Total Audits"
          value={loading ? "—" : stats?.total_audits ?? "—"}
          icon={FileText}
          color="blue"
          subtitle="Saved bill checks"
        />
        <AuditSummaryCard
          title="Items to review"
          value={loading ? "—" : stats?.total_findings ?? "—"}
          icon={AlertTriangle}
          color="amber"
          subtitle="Prompts across saved checks"
        />
        <AuditSummaryCard
          title="Arithmetic flags"
          value={loading ? "—" : stats?.arithmetic_discrepancies ?? "—"}
          icon={Calculator}
          color="green"
          subtitle="Possible calculations to verify"
        />
        <AuditSummaryCard
          title="Benchmark flags"
          value={loading ? "—" : stats?.benchmark_discrepancies ?? "—"}
          icon={BarChart3}
          color="purple"
          subtitle="Reference comparisons to review"
        />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="card min-w-0 !p-5 sm:!p-6" aria-labelledby="recent-audits-title">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="recent-audits-title" className="flex items-center gap-2 font-serif text-xl text-dark-teal">
              <Clock size={18} /> Recent bill checks
            </h2>
            <label className="relative block w-full sm:max-w-[250px]">
              <span className="sr-only">Search saved bill checks</span>
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search saved checks"
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-dark-teal placeholder:text-slate-400 focus:border-deep-sage focus:outline-none focus:ring-2 focus:ring-deep-sage/20"
              />
            </label>
          </div>
          {loading ? (
            <p role="status" className="py-8 text-center text-sm text-slate-500">Loading saved checks…</p>
          ) : apiError ? (
            <p className="py-8 text-center text-sm text-slate-500">Saved checks are unavailable until the API connection is restored.</p>
          ) : recentAudits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-[#fbfcf9] px-5 py-10 text-center">
              <p className="font-medium text-dark-teal">{search ? "No saved checks match that search." : "No saved bill checks yet."}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {search ? "Try another hospital, bill number, or date." : "Start with a synthetic sample, or upload a bill when ready."}
              </p>
              {!search && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Link to="/sample" className="btn-outline !min-h-10 !px-3 !py-2 text-xs">Explore sample</Link>
                  <Link to="/upload" className="btn-primary !min-h-10 !px-3 !py-2 text-xs">New bill check</Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="pb-3 pr-3 font-medium">Hospital</th>
                    <th className="pb-3 pr-3 font-medium">Bill date</th>
                    <th className="pb-3 pr-3 text-right font-medium">Amount</th>
                    <th className="pb-3 pr-3 font-medium">Status</th>
                    <th className="pb-3 text-right font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAudits.map((a: AuditOut) => (
                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 pr-3 font-medium text-slate-800">{a.hospital_name || "Not identified"}</td>
                      <td className="py-4 pr-3 text-slate-600">{a.bill_date || "—"}</td>
                      <td className="py-4 pr-3 text-right font-medium text-slate-600">
                        {a.original_total != null ? `₹${a.original_total}` : "—"}
                      </td>
                      <td className="py-4 pr-3">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="py-4 text-right">
                        <Link
                          to={`/audit/${a.id}`}
                          className="text-deep-sage text-xs font-medium hover:underline"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card !p-5 sm:!p-6" aria-labelledby="review-counts-title">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-deep-sage">Patient-first review</p>
          <h2 id="review-counts-title" className="mt-1 font-serif text-xl text-dark-teal">Prompts in saved checks</h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            A prompt means a detail may be worth verifying. It is not a finding of wrongdoing.
          </p>
          <div className="mt-5 space-y-2.5">
            {findingsToReview.map(({ label, count, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-[#fbfcf9] p-3.5">
                <span className="flex items-center gap-2.5 text-xs font-medium text-slate-700">
                  <Icon size={16} className="text-deep-sage" /> {label}
                </span>
                <span className="min-w-7 rounded-full bg-white px-2 py-1 text-center text-xs font-bold text-dark-teal ring-1 ring-slate-100">
                  {loading ? "—" : count ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
