import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  FileText,
  Mail,
  RefreshCw,
  Edit3,
  Download,
  ShieldAlert,
  Banknote,
  Clock,
  Loader2,
} from "lucide-react";
import { auditApi } from "../services/api";
import type { AuditDetailOut, AuditFinding, BillItemOut } from "../types";
import StatusBadge from "../components/StatusBadge";

export default function AuditResults() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<AuditDetailOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    auditApi.get(id).then(setAudit).catch(setError).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-deep-sage mb-3" />
        <p className="text-slate-500">Loading audit...</p>
      </div>
    );
  }
  if (error || !audit) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600">{error || "Audit not found"}</p>
        <Link to="/dashboard" className="mt-4 btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const items = audit.bill_items || [];
  const findings = audit.findings || [];

  const confirmedArith = findings.filter((f) => f.finding_type === "ARITHMETIC").length;
  const duplicates = findings.filter((f) => f.finding_type === "DUPLICATE").length;
  const benchmarks = findings.filter((f) => f.finding_type === "BENCHMARK").length;
  const unclear = findings.filter((f) => f.finding_type === "UNCLEAR_CHARGE").length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <Link to="/dashboard" className="text-sm text-deep-sage hover:underline mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-serif font-bold text-dark-teal">Audit Results</h1>
          <p className="text-slate-600 mt-1">
            Bill <span className="font-mono text-deep-sage">{audit.bill_number || "—"}</span> •{" "}
            {audit.hospital_name || "Hospital"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={auditApi.report(audit.id)}
            className="btn-outline flex items-center gap-2 text-sm"
          >
            <Download size={16} /> Download PDF
          </Link>
          <Link
            to={auditApi.appeal(audit.id)}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Mail size={16} /> Appeal Letter
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-100">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Billed</p>
          <p className="text-2xl font-serif font-bold text-dark-teal mt-1">
            ₹{audit.original_total?.toFixed(2) || "—"}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Calculated</p>
          <p className="text-2xl font-serif font-bold text-dark-teal mt-1">
            ₹{audit.calculated_total?.toFixed(2) || "—"}
          </p>
        </div>
        <div className="card p-5 bg-red-50 border-red-100">
          <p className="text-xs font-medium text-red-700 uppercase tracking-wider">Arithmetic Issues</p>
          <p className="text-2xl font-serif font-bold text-red-700 mt-1">{confirmedArith}</p>
        </div>
        <div className="card p-5 bg-amber-50 border-amber-100">
          <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Possible Duplicates</p>
          <p className="text-2xl font-serif font-bold text-amber-700 mt-1">{duplicates}</p>
        </div>
      </div>

      {/* Findings */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-serif font-bold text-dark-teal mb-2 flex items-center gap-2">
            <FileText size={18} /> Bill Items
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-slate-100">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium text-right">Qty</th>
                  <th className="px-4 py-3 font-medium text-right">Unit Price</th>
                  <th className="px-4 py-3 font-medium text-right">Billed</th>
                  <th className="px-4 py-3 font-medium text-right">Expected</th>
                  <th className="px-4 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: BillItemOut) => {
                  const billed = it.billed_total ?? 0;
                  const expected = it.expected_total ?? 0;
                  const mismatch = Math.abs(billed - expected) > 0.01;
                  return (
                    <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {it.description || "Unidentified item"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {it.quantity?.toString() || "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {it.unit_price != null ? `₹${it.unit_price}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 font-medium">
                        {billed != null ? `₹${billed}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {expected != null ? `₹${expected}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge status={mismatch ? "Mismatch" : "Verified"} />
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No items extracted.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-serif font-bold text-dark-teal mb-2 flex items-center gap-2">
            <ShieldAlert size={18} /> Findings
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white border border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase">Arithmetic</p>
              <p className="text-xl font-bold text-red-600">{confirmedArith}</p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase">Duplicates</p>
              <p className="text-xl font-bold text-amber-600">{duplicates}</p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase">Benchmark</p>
              <p className="text-xl font-bold text-purple-600">{benchmarks}</p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase">Unclear</p>
              <p className="text-xl font-bold text-slate-600">{unclear}</p>
            </div>
          </div>

          <div className="space-y-3">
            {findings.length > 0 ? (
              findings.map((f: AuditFinding) => (
                <div key={f.id} className="p-4 rounded-lg bg-white border border-slate-100 shadow-sm">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-semibold text-dark-teal text-sm">{f.title}</h4>
                    <StatusBadge status={f.severity || "MEDIUM"} />
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {f.description || ""}
                  </p>
                  {f.estimated_difference != null && (
                    <p className="text-xs mt-2 text-deep-sage font-medium">
                      Estimated difference: ₹{f.estimated_difference}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-500 border border-dashed rounded-xl">
                No findings. The bill looks consistent.
              </div>
            )}
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            className="mt-2 w-full btn-outline text-sm py-2"
          >
            <RefreshCw size={16} /> Re-run Audit
          </button>
        </div>
      </div>

      {/* Extraction info */}
      <div className="card p-6 bg-misty-blue/30 border-misty-blue/50">
        <h3 className="font-serif text-lg text-dark-teal mb-3">Extraction Details</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 uppercase">Method</p>
            <p className="font-mono text-xs bg-white px-2 py-1 rounded text-deep-sage">
              {audit.extraction_method}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Status</p>
            <StatusBadge status={audit.status} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Date</p>
            <p className="text-slate-600">{audit.created_at || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
