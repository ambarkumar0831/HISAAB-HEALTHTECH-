import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  TrendingUp,
  Search,
  User,
  Bell,
  ArrowRight,
} from "lucide-react";
import { auditApi } from "../services/api";
import type { AuditOut } from "../types";
import AuditSummaryCard from "../components/AuditSummaryCard";
import StatusBadge from "../components/StatusBadge";

export default function Dashboard() {
  const [stats, setStats] = useState<any>({
    total_audits: 0,
    total_findings: 0,
    arithmetic_discrepancies: 0,
    duplicate_entries: 0,
    benchmark_discrepancies: 0,
    recent_audits: [],
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    auditApi.stats().then(setStats).finally(() => setLoading(false));
  }, []);

  const handleDemo = () => {
    navigate("/demo-audit");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-dark-teal">Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Here&apos;s your hospital bill audit overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search audits..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-deep-sage outline-none"
            />
          </div>
          <Link to="/upload" className="btn-primary hidden sm:flex items-center gap-2">
            New Audit <ArrowRight size={16} />
          </Link>
          <button
            onClick={handleDemo}
            className="btn-outline hidden sm:flex items-center gap-2 text-sm"
          >
            Try Demo
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <AuditSummaryCard
          title="Total Audits"
          value={stats.total_audits}
          icon={FileText}
          color="blue"
          subtitle="Bills uploaded and audited"
        />
        <AuditSummaryCard
          title="Total Findings"
          value={stats.total_findings}
          icon={AlertTriangle}
          color="amber"
          subtitle="Flags across all audits"
        />
        <AuditSummaryCard
          title="Arithmetic Issues"
          value={stats.arithmetic_discrepancies}
          icon={CheckCircle2}
          color="green"
          subtitle="Confirmed calculation mismatches"
        />
        <AuditSummaryCard
          title="Potential Savings"
          value={`₹${Math.round(stats.benchmark_discrepancies * 500)}`}
          icon={Banknote}
          color="purple"
          subtitle="Indicative benchmark differences"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent audits */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-serif font-bold text-dark-teal mb-4 flex items-center gap-2">
            <Clock size={18} /> Recent Audits
          </h2>
          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : stats.recent_audits.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <p>No audits yet.</p>
              <button
                onClick={handleDemo}
                className="mt-4 text-deep-sage font-medium hover:underline"
              >
                Try a demo audit
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="pb-3 font-medium">Hospital</th>
                    <th className="pb-3 font-medium">Bill Date</th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_audits.map((a: AuditOut) => (
                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 font-medium">{a.hospital_name || "—"}</td>
                      <td className="py-4 text-slate-600">{a.bill_date || "—"}</td>
                      <td className="py-4 text-right text-slate-600 font-medium">
                        {a.original_total != null ? `₹${a.original_total}` : "—"}
                      </td>
                      <td className="py-4">
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
        </div>

        {/* Audit overview */}
        <div className="card space-y-6">
          <h2 className="text-lg font-serif font-bold text-dark-teal">Audit Overview</h2>
          <div className="space-y-4">
            {[
              { label: "Arithmetic Verification", status: stats.arithmetic_discrepancies > 0 ? "Needs Review" : "Passed", type: "arith" },
              { label: "Duplicate Charge Review", status: stats.duplicate_entries > 0 ? "Needs Review" : "Passed", type: "dup" },
              { label: "Benchmark Comparison", status: stats.benchmark_discrepancies > 0 ? "Potential Issue" : "Passed", type: "bench" },
              { label: "Date Validation", status: "Passed", type: "date" },
              { label: "Unclear Charges", status: "Needs Manual Review", type: "unclear" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.label}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
