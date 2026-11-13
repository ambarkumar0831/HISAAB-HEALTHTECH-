import { AlertTriangle, Copy, ShieldCheck, FileText } from "lucide-react";

interface AuditSummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: "blue" | "amber" | "green" | "purple";
  subtitle?: string;
}

const colorMap: Record<AuditSummaryCardProps["color"], { bg: string; iconBg: string; text: string; border: string }> = {
  blue: { bg: "bg-misty-blue/35", iconBg: "bg-misty-blue", text: "text-[#376779]", border: "border-misty-blue/70" },
  amber: { bg: "bg-[#fff8ed]", iconBg: "bg-[#f8ead2]", text: "text-[#9b6634]", border: "border-[#f2e3ca]" },
  green: { bg: "bg-sage/35", iconBg: "bg-sage/70", text: "text-deep-sage", border: "border-sage/70" },
  purple: { bg: "bg-lavender/35", iconBg: "bg-lavender/70", text: "text-[#74628f]", border: "border-lavender/70" },
};

export default function AuditSummaryCard({ title, value, icon: Icon, color = "blue", subtitle }: AuditSummaryCardProps) {
  const c = colorMap[color];
  return (
    <div className={`card summary-card ${c.bg} ${c.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{title}</p>
          <p className="mt-2 font-serif text-3xl font-bold tracking-tight text-dark-teal">{value}</p>
          {subtitle && <p className="mt-2 text-xs leading-5 text-slate-500">{subtitle}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.iconBg} ${c.text}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}
