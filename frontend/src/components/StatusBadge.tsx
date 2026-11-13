export default function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Verified: "bg-green-50 text-green-700 border-green-100",
    Mismatch: "bg-red-50 text-red-700 border-red-100",
    Completed: "bg-green-50 text-green-700 border-green-100",
    Processing: "bg-blue-50 text-blue-700 border-blue-100",
    "Needs Review": "bg-amber-50 text-amber-700 border-amber-100",
    Failed: "bg-red-50 text-red-700 border-red-100",
    open: "bg-slate-50 text-slate-700 border-slate-100",
  };
  const cls = styles[status] || styles["open"];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status}
    </span>
  );
}
