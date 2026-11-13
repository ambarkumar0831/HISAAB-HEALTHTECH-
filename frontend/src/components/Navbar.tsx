import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LayoutDashboard,
  FileText,
  History,
  BarChart3,
  ShieldCheck,
  Settings,
  Menu,
  X,
  LogOut,
  Loader2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const { session, signOut } = useAuth();
  const user = session?.user;
  const fullName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const displayName = fullName || user?.email || "Patient account";
  const initials = (fullName || user?.email || "PA")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const closeMenu = () => setMenuOpen(false);
  const closeAccountMenu = () => setAccountMenuOpen(false);

  useEffect(() => {
    if (!accountMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !accountMenuRef.current?.contains(event.target)) {
        closeAccountMenu();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAccountMenu();
        accountButtonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSignOutError("");
    setSigningOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

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
          <span className="hidden max-w-[220px] truncate text-sm font-medium text-slate-600 sm:inline">{displayName}</span>
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
          <div className="relative" ref={accountMenuRef}>
            <button
              ref={accountButtonRef}
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="group relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white bg-sage text-xs font-bold text-dark-teal shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-deep-sage/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-sage focus-visible:ring-offset-2"
              aria-label="Open account menu"
              aria-expanded={accountMenuOpen}
              aria-controls="account-menu"
              title={displayName}
            >
              {initials}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-white text-slate-500 shadow-sm transition group-hover:text-deep-sage">
                <ChevronDown size={10} aria-hidden="true" />
              </span>
            </button>
            {accountMenuOpen && (
              <div
                id="account-menu"
                aria-label="Account menu"
                className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_60px_-24px_rgba(15,45,43,0.35)]"
              >
                <div className="bg-gradient-to-br from-mint-50 to-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-deep-sage">Your account</p>
                  <div className="mt-3 flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage text-sm font-bold text-dark-teal ring-4 ring-white">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-dark-teal">{displayName}</p>
                      <p className="truncate text-xs text-slate-500">{user?.email || "Signed-in account"}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 p-2">
                  <Link
                    to="/settings"
                    onClick={closeAccountMenu}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-mint-50 hover:text-dark-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-sage"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Settings size={16} />
                    </span>
                    <span className="flex-1">Account settings</span>
                  </Link>
                  <Link
                    to="/history"
                    onClick={closeAccountMenu}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-mint-50 hover:text-dark-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-sage"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <History size={16} />
                    </span>
                    <span className="flex-1">Audit history</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    disabled={signingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-wait disabled:opacity-70"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                      {signingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                    </span>
                    <span className="flex-1">{signingOut ? "Signing out…" : "Sign out"}</span>
                  </button>
                </div>
                <div className="border-t border-slate-100 px-4 py-2.5">
                  <p className="text-[10px] text-slate-400">Your session stays active until you sign out.</p>
                </div>
              </div>
            )}
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
      {signOutError && (
        <p role="alert" className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700 sm:px-7">
          {signOutError}
        </p>
      )}
    </header>
  );
}
