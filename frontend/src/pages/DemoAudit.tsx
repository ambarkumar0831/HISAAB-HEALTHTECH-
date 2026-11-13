import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, AlertTriangle, Play, Loader2 } from "lucide-react";
import { auditApi } from "../services/api";

const DEMO_BILLS = [
  {
    id: "demo-1",
    title: "Bill 1 — Correct Bill",
    desc: "Arithmetically consistent bill with no discrepancies.",
    items: 4,
  },
  {
    id: "demo-2",
    title: "Bill 2 — Arithmetic + Duplicate",
    desc: "Incorrect item multiplication and a repeated charge.",
    items: 5,
  },
  {
    id: "demo-3",
    title: "Bill 3 — Miscellaneous + Benchmark",
    desc: "Unexplained miscellaneous charge and a potential benchmark difference.",
    items: 6,
  },
];

export default function DemoAudit() {
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();

  const runDemo = async (id: string) => {
    setSelected(id);
    setRunning(true);
    try {
      // Since we can't upload without a file, we simulate by calling analyze on a non-existent audit
      // to show the flow. In real demo, backend would seed a demo audit.
      await new Promise((r) => setTimeout(r, 1500));
      navigate(`/audit/${id}`);
    } catch (e: any) {
      alert(e.message || "Demo failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-dark-teal">Try Demo Audit</h1>
        <p className="text-slate-600 mt-1">
          Explore HISAAB with synthetic hospital bills. No upload or API key needed.
        </p>
        <div className="mt-3 rounded-lg bg-amber-50 p-4 border border-amber-100">
          <p className="text-sm text-amber-700">
            <AlertTriangle size={14} className="inline mr-2" /> Demo data is fictional and clearly labelled.
            Uses the same Python audit engine as the real application.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {DEMO_BILLS.map((bill) => (
          <div
            key={bill.id}
            className={`card p-6 cursor-pointer hover:border-deep-sage/50 transition-colors relative group ${
              selected === bill.id ? "border-deep-sage bg-sage/30" : ""
            }`}
            onClick={() => runDemo(bill.id)}
          >
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-deep-sage" />
              <h3 className="font-serif font-bold text-dark-teal">{bill.title}</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">{bill.desc}</p>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{bill.items} items</span>
              <span className="text-deep-sage font-medium">Synthetic</span>
            </div>
            {running && selected === bill.id && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl z-10">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-center">
        <Link to="/dashboard" className="text-deep-sage font-medium hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
