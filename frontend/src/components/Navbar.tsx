import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  History,
  BarChart3,
  ShieldCheck,
  Settings,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "New Audit", href: "/upload", icon: FileText },
  { name: "Audit History", href: "/history", icon: History },
  { name: "Rate Database", href: "/benchmarks", icon: BarChart3 },
  { name: "About", href: "/about", icon: ShieldCheck },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 text-dark-teal backdrop-blur-xl">
      <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-7 xl:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/" className="flex shrink-0 items-center gap-2.5 lg:hidden" onClick={closeMenu}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-deep-sage text-sm font-bold text-white">H</span>
            <span className="font-serif text-lg font-bold tracking-tight">HISAAB</span>
          </Link>
          <div className="hidden items-center gap-2 lg:flex">
            <span className="h-2 w-2 rounded-full bg-deep-sage" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Patient workspace</span>
          </div>
          <span className="hidden h-5 w-px bg-slate-200 lg:block" />
          <span className="hidden truncate text-sm font-medium text-slate-600 sm:inline">Demo account</span>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <Link to="/upload" className="btn-primary !min-h-10 !rounded-xl !px-3.5 !py-2 text-xs sm:!px-4">
            <FileText size={15} />
            <span className="hidden sm:inline">New bill check</span>
            <span className="sm:hidden">New audit</span>
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-dark-teal transition hover:bg-mint-50 lg:hidden"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-sage text-xs font-bold text-dark-teal lg:flex">
            DU
          </div>
        </div>
      </div>
      {menuOpen && (
        <nav aria-label="Workspace navigation" className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden sm:px-7">
          <div className="mx-auto grid max-w-7xl gap-1 sm:grid-cols-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={closeMenu}
                aria-current={location.pathname === item.href ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  location.pathname === item.href
                    ? "bg-sage/60 text-dark-teal"
                    : "text-slate-600 hover:bg-mint-50 hover:text-dark-teal"
                }`}
              >
                <item.icon size={17} />
                {item.name}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
