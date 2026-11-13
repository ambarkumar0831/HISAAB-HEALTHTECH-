import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  History,
  BarChart3,
  ShieldCheck,
  Settings,
} from "lucide-react";

const navItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "New Audit", href: "/upload", icon: FileText },
  { name: "Audit History", href: "/history", icon: History },
  { name: "Rate Database", href: "/benchmarks", icon: BarChart3 },
  { name: "About HISAAB", href: "/about", icon: ShieldCheck },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-[#e4ece6] bg-[#f2f8f3] lg:flex">
      <div className="flex min-h-0 w-full flex-col">
        <div className="px-6 pb-6 pt-7">
          <Link to="/" className="inline-flex items-center gap-3 rounded-xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-dark-teal text-lg font-bold text-white shadow-sm">₹</span>
            <span>
              <span className="block font-serif text-lg font-bold tracking-tight text-dark-teal">HISAAB</span>
              <span className="block text-[10px] font-medium tracking-wide text-slate-500">Clarity for every line</span>
            </span>
          </Link>
        </div>

        <div className="px-6 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</div>
        <nav aria-label="Workspace navigation" className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-white text-dark-teal shadow-[0_6px_20px_-16px_rgba(18,59,59,0.5)] ring-1 ring-[#e2ece4]"
                    : "text-slate-600 hover:bg-white/70 hover:text-dark-teal"
                }`}
              >
                <item.icon className={`h-[18px] w-[18px] transition-colors ${isActive ? "text-deep-sage" : "text-slate-400 group-hover:text-deep-sage"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-deep-sage" />
              <span className="text-xs font-semibold text-dark-teal">Demo workspace</span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">Use sample data to explore the bill review flow.</p>
            <Link to="/demo-audit" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-deep-sage hover:text-dark-teal">
              Explore a sample <span aria-hidden="true">→</span>
            </Link>
          </div>
          <p className="px-2 pt-4 text-[10px] leading-4 text-slate-400">Bill flags are prompts to verify, not accusations.</p>
        </div>
      </div>
    </aside>
  );
}
