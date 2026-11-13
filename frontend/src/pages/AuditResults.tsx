import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { auditApi } from "../services/api";
import type { AuditDetailOut, AuditFinding, BillItemOut } from "../types";
import StatusBadge from "../components/StatusBadge";

const formatMoney = (value: number | null | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(value);

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const findingLabels: Record<string, string> = {
  ARITHMETIC: "Arithmetic",
  DUPLICATE: "Possible duplicate",
  BENCHMARK: "Benchmark",
  DATE_CHECK: "Date check",
  UNCLEAR_CHARGE: "Unclear charge",
};

const questionForFinding = (findingType: string) => {
  const questions: Record<string, string> = {
    ARITHMETIC: "Could you help me understand how this line amount was calculated?",
    DUPLICATE: "Are these entries for separate services? Could you share the dates or details?",
    BENCHMARK: "Could you confirm which rate or package applies to this service?",
    DATE_CHECK: "Could you confirm the date and billing period for this entry?",
    UNCLEAR_CHARGE: "Could you provide an itemized description of this charge?",
  };
  return questions[findingType] || "Could you help me understand this item in my bill?";
};

export default function AuditResults() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<AuditDetailOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"report" | "appeal" | null>(null);
  const [rerunning, setRerunning] = useState(false);

  const loadAudit = useCallback(async () => {
    if (!id) {
      setLoadError("No audit was selected.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      setAudit(await auditApi.get(id));
    } catch (requestError: unknown) {
      setLoadError(requestError instanceof Error ? requestError.message : "Could not load this audit.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const downloadFile = async (type: "report" | "appeal") => {
    if (!audit) return;
    setActionError(null);
    setDownloading(type);
    try {
      const file = type === "report" ? await auditApi.report(audit.id) : await auditApi.appeal(audit.id);
      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `hisaab_${type === "report" ? "audit" : "appeal"}_${audit.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (downloadError: unknown) {
      setActionError(downloadError instanceof Error ? downloadError.message : "Could not download the file.");
    } finally {
      setDownloading(null);
    }
  };

  const rerunAudit = async () => {
    if (!audit || rerunning) return;
    setActionError(null);
    setRerunning(true);
    try {
      await auditApi.analyze(audit.id);
      setAudit(await auditApi.get(audit.id));
    } catch (rerunError: unknown) {
      setActionError(rerunError instanceof Error ? rerunError.message : "Could not rerun this review.");
    } finally {
      setRerunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-deep-sage" />
        <p className="text-sm text-slate-500">Loading your review…</p>
      </div>
    );
  }

  if (loadError || !audit) {
    return (
      <div className="mx-auto max-w-xl rounded-[1.7rem] border border-[#e4ece5] bg-white px-6 py-12 text-center shadow-sm">
        <p className="font-serif text-xl font-bold text-dark-teal">We couldn&apos;t open this review</p>
        <p role="alert" className="mt-2 text-sm text-slate-600">{loadError || "Audit not found."}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => void loadAudit()} className="btn-outline justify-center">
            <RefreshCw size={15} /> Try again
          </button>
          <Link to="/dashboard" className="btn-primary justify-center">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const items = audit.bill_items || [];
  const findings = audit.findings || [];
  const counts = findings.reduce<Record<string, number>>((accumulator, finding) => {
    accumulator[finding.finding_type] = (accumulator[finding.finding_type] || 0) + 1;
    return accumulator;
  }, {});
  const totalDifference =
    audit.original_total != null && audit.calculated_total != null
      ? Math.abs(audit.original_total - audit.calculated_total)
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-[1.8rem] border border-[#e4ece5] bg-white p-5 shadow-[0_18px_55px_-46px_rgba(18,59,59,0.5)] sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-deep-sage transition hover:text-dark-teal">
              <ArrowLeft size={14} /> Back to dashboard
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-3xl font-bold tracking-tight text-dark-teal sm:text-4xl">Your bill review</h1>
              <StatusBadge status={findings.length > 0 ? "Needs Review" : "Completed"} />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {audit.hospital_name || "Hospital"} <span className="mx-1.5 text-slate-300">·</span>
              Bill <span className="font-mono text-deep-sage">{audit.bill_number || "—"}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void downloadFile("report")}
              disabled={downloading !== null}
              className="btn-outline min-h-10 justify-center text-xs disabled:cursor-wait disabled:opacity-60"
            >
              <Download size={15} />
              {downloading === "report" ? "Preparing…" : "Download report"}
            </button>
            <button
              type="button"
              onClick={() => void downloadFile("appeal")}
              disabled={downloading !== null}
              className="btn-primary min-h-10 justify-center text-xs disabled:cursor-wait disabled:opacity-60"
            >
              <Mail size={15} />
              {downloading === "appeal" ? "Preparing…" : "Draft questions PDF"}
            </button>
          </div>
        </div>
        <p className="mt-5 rounded-xl border border-[#e7eee7] bg-[#f7faf6] px-4 py-3 text-xs leading-5 text-slate-600">
          These automated checks are prompts to verify—not proof of an error or wrongdoing. Compare extracted details with the original bill.
        </p>
      </header>

      {actionError && (
        <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Review summary">
        <div className="rounded-[1.4rem] border border-[#e4ece5] bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">Total shown on bill</p>
          <p className="mt-2 font-serif text-2xl font-bold text-dark-teal">{formatMoney(audit.original_total)}</p>
        </div>
        <div className="rounded-[1.4rem] border border-[#e4ece5] bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">Calculated from line items</p>
          <p className="mt-2 font-serif text-2xl font-bold text-dark-teal">{formatMoney(audit.calculated_total)}</p>
        </div>
        <div className={`rounded-[1.4rem] border p-5 ${totalDifference != null && totalDifference > 0.01 ? "border-amber-100 bg-amber-50/70" : "border-[#e4ece5] bg-white"}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">Difference to understand</p>
          <p className="mt-2 font-serif text-2xl font-bold text-dark-teal">{formatMoney(totalDifference)}</p>
        </div>
        <div className={`rounded-[1.4rem] border p-5 ${findings.length > 0 ? "border-[#dfeae0] bg-[#f3f8f2]" : "border-[#e4ece5] bg-white"}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">Review prompts</p>
          <p className="mt-2 font-serif text-2xl font-bold text-dark-teal">{findings.length}</p>
        </div>
      </section>

      {totalDifference != null && (
        <p className="-mt-3 px-1 text-[11px] leading-5 text-slate-500">
          The calculated amount uses quantities and unit prices that could be extracted. Tax, discounts, or other charges may explain a difference; check the original bill before drawing conclusions.
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
        <section className="min-w-0 rounded-[1.7rem] border border-[#e4ece5] bg-white p-5 shadow-[0_18px_55px_-48px_rgba(18,59,59,0.45)] sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf4ed] text-deep-sage">
              <FileText size={19} />
            </span>
            <div>
              <h2 className="font-serif text-xl font-bold text-dark-teal">Extracted bill items</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Review the extracted amounts against the original document. “Not compared” means details were missing for that calculation.
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-[#e8eee8]">
            <table className="w-full min-w-[690px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e8eee8] bg-[#f7faf6] text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">Item</th>
                  <th className="px-3 py-3 text-right">Qty</th>
                  <th className="px-3 py-3 text-right">Unit price</th>
                  <th className="px-3 py-3 text-right">Billed</th>
                  <th className="px-3 py-3 text-right">Qty × price</th>
                  <th className="px-3 py-3 text-right">Check</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: BillItemOut) => {
                  const mismatch =
                    item.billed_total != null &&
                    item.expected_total != null &&
                    Math.abs(item.billed_total - item.expected_total) > 0.01;
                  const status = item.is_flagged || mismatch
                    ? "Check total"
                    : item.expected_total == null
                      ? "Not compared"
                      : "Matches";
                  const statusStyle = status === "Check total"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : status === "Matches"
                      ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-600";

                  return (
                    <tr key={item.id} className="border-b border-[#edf1ed] last:border-0">
                      <td className="max-w-[240px] px-3 py-3 font-medium text-slate-800">
                        <span className="block truncate">{item.description || "Unidentified item"}</span>
                        {item.category && <span className="mt-0.5 block text-[10px] font-normal text-slate-500">{item.category}</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600">{item.quantity ?? "—"}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{formatMoney(item.unit_price)}</td>
                      <td className="px-3 py-3 text-right font-medium text-slate-700">{formatMoney(item.billed_total)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{formatMoney(item.expected_total)}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusStyle}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                      No bill items were extracted. Try rerunning the review or check the source document.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-[1.7rem] border border-[#e4ece5] bg-white p-5 shadow-[0_18px_55px_-48px_rgba(18,59,59,0.45)] sm:p-6">
            <div className="flex items-center gap-2.5">
              <ShieldAlert size={18} className="text-deep-sage" />
              <h2 className="font-serif text-xl font-bold text-dark-teal">Review prompts</h2>
            </div>

            {findings.length > 0 ? (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(findingLabels).map(([type, label]) => (
                    <span key={type} className="rounded-full bg-[#f3f6f2] px-2.5 py-1 text-[10px] font-medium text-slate-600">
                      {label}: {counts[type] || 0}
                    </span>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  {findings.map((finding: AuditFinding) => (
                    <article key={finding.id} className="rounded-2xl border border-[#e8eee8] bg-[#fcfdfb] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-deep-sage">
                            {findingLabels[finding.finding_type] || "Review"}
                          </span>
                          <h3 className="mt-1 text-sm font-semibold leading-5 text-dark-teal">{finding.title}</h3>
                        </div>
                        <StatusBadge status={finding.severity || "MEDIUM"} />
                      </div>
                      {finding.description && (
                        <p className="mt-2 text-xs leading-5 text-slate-600">{finding.description}</p>
                      )}
                      {finding.estimated_difference != null && (
                        <p className="mt-2 text-xs font-semibold text-slate-700">
                          Amount to clarify: {formatMoney(finding.estimated_difference)}
                        </p>
                      )}
                      <div className="mt-3 rounded-xl bg-[#f1f6f1] p-3">
                        <p className="flex items-start gap-2 text-[11px] leading-5 text-slate-700">
                          <MessageCircle size={14} className="mt-0.5 shrink-0 text-deep-sage" />
                          <span><strong>One way to ask:</strong> {questionForFinding(finding.finding_type)}</span>
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-[#dce7dc] bg-[#f8faf7] p-5">
                <p className="text-sm font-semibold text-dark-teal">No review prompts were raised</p>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  This does not guarantee every bill detail is correct. Compare the extracted items with the original bill.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => void rerunAudit()}
              disabled={rerunning}
              className="btn-outline mt-5 min-h-10 w-full justify-center text-xs disabled:cursor-wait disabled:opacity-60"
            >
              {rerunning ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {rerunning ? "Checking again…" : "Rerun checks"}
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-[1.7rem] border border-[#e4ece5] bg-[#f5f8f4] p-5 sm:p-6">
        <h2 className="font-serif text-lg font-bold text-dark-teal">Review details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Extraction method</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{audit.extraction_method || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Processing status</p>
            <div className="mt-1"><StatusBadge status={audit.status} /></div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Created</p>
            <p className="mt-1 text-sm text-slate-700">{formatDate(audit.created_at)}</p>
          </div>
        </div>
        <p className="mt-5 border-t border-[#e2eae1] pt-4 text-[11px] leading-5 text-slate-500">
          Automated extraction can miss or misread details. Confirm all amounts and descriptions against the original bill before contacting your provider.
        </p>
      </section>
    </div>
  );
}
