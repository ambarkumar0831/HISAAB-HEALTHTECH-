import { useEffect, useState } from "react";
import { BarChart3, Plus, Loader2, AlertTriangle } from "lucide-react";
import { benchmarkApi } from "../services/api";
import type { BenchmarkRateOut } from "../types";
import { useAuth } from "../contexts/AuthContext";

export default function Benchmarks() {
  const { session } = useAuth();
  const isAdmin = session?.user.app_metadata?.hisaab_role === "admin";
  const [benchmarks, setBenchmarks] = useState<BenchmarkRateOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    service_name: "",
    category: "",
    rate: "",
    source_name: "",
    source_url: "",
    location: "",
    applicability_notes: "",
    effective_from: "",
  });

  useEffect(() => {
    benchmarkApi.list().then(setBenchmarks).catch(setError).finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await benchmarkApi.create({ ...form, rate: parseFloat(form.rate) });
      setBenchmarks([...benchmarks, created]);
      setOpen(false);
      setForm({
        service_name: "", category: "", rate: "", source_name: "", source_url: "", location: "", applicability_notes: "", effective_from: "",
      });
    } catch (e: any) {
      setError(e.message || "Failed to add benchmark");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-dark-teal">Rate Database</h1>
          <p className="text-slate-600 mt-1">
            Published benchmark rates used for comparison. Admin can add or update rates.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Add Rate
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-100">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-deep-sage" />
        </div>
      ) : benchmarks.length === 0 ? (
        <div className="text-center py-20">
          <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No benchmark rates configured yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-500 border-b border-slate-100">
                <th className="px-6 py-4 font-medium">Service</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium text-right">Rate</th>
                <th className="px-6 py-4 font-medium">Source</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium text-right">Effective From</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((b) => (
                <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-800">{b.service_name}</td>
                  <td className="px-6 py-4 text-slate-600">{b.category || "—"}</td>
                  <td className="px-6 py-4 text-right text-slate-600 font-medium">
                    ₹{b.rate?.toFixed(2) || "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">{b.source_name || "—"}</td>
                  <td className="px-6 py-4 text-slate-600">{b.location || "—"}</td>
                  <td className="px-6 py-4 text-right text-slate-600 text-xs">
                    {b.effective_from || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-serif text-lg text-dark-teal mb-4">Add Benchmark Rate</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Service Name</label>
                <input
                  required
                  value={form.service_name}
                  onChange={(e) => setForm({ ...form, service_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-deep-sage outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-deep-sage outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rate (₹)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-deep-sage outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Source Name</label>
                <input
                  value={form.source_name}
                  onChange={(e) => setForm({ ...form, source_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-deep-sage outline-none"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button type="submit" className="flex-1 btn-primary py-2">
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 btn-outline text-sm py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
