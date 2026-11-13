import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Trash2, Search, Loader2, AlertTriangle } from "lucide-react";
import { auditApi } from "../services/api";
import type { AuditOut } from "../types";
import StatusBadge from "../components/StatusBadge";

export default function History() {
  const [audits, setAudits] = useState<AuditOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    auditApi.list().then(setAudits).finally(() => setLoading(false));
  }, []);

  const filtered = audits.filter(
    (a) =>
      (a.hospital_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.bill_number || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this audit and its files?")) return;
    try {
      await auditApi.delete(id);
      setAudits((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      alert(e.message || "Delete failed");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-dark-teal">Audit History</h1>
          <p className="text-slate-600 mt-1">View and manage your previous bill audits.</p>
        </div>
        <div className="relative w-64 md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search hospital or bill number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-deep-sage outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-deep-sage" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No audits found.</p>
          <Link to="/upload" className="mt-4 btn-primary">
            Start a New Audit
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-500 border-b border-slate-100">
                <th className="px-6 py-4 font-medium">Hospital</th>
                <th className="px-6 py-4 font-medium">Bill Number</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a: AuditOut) => (
                <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {a.hospital_name || "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                    {a.bill_number || "—"}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600 font-medium">
                    {a.original_total != null ? `₹${a.original_total}` : "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{a.bill_date || "—"}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/audit/${a.id}`}
                      className="text-deep-sage text-sm font-medium hover:underline flex items-center gap-1"
                    >
                      View <FileText size={14} />
                    </Link>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="ml-4 text-red-500 text-sm hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
