import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  FileClock,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Settings() {
  const { session, signOut } = useAuth();
  const [signOutError, setSignOutError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();
  const user = session?.user;
  const fullName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const email = user?.email || "";
  const displayName = fullName || email || "Patient account";
  const emailVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at);
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" })
    : "—";

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
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-deep-sage">Account</p>
        <h1 className="mt-2 font-serif text-3xl text-dark-teal sm:text-4xl">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Review your account details, privacy information, and sign-in session.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-7">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-dark-teal">{displayName}</h2>
            <p className="mt-1 truncate text-sm text-slate-500">{email || "No email address available"}</p>
          </div>
          <span
            className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
              emailVerified ? "bg-[#edf5ef] text-deep-sage" : "bg-amber-50 text-amber-800"
            }`}
          >
            {emailVerified ? <CheckCircle2 size={14} /> : <Mail size={14} />}
            {emailVerified ? "Email verified" : "Email not verified"}
          </span>
        </div>

        <div className="grid gap-x-8 sm:grid-cols-2 sm:gap-y-0 sm:px-7">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-0">
            <p className="text-xs font-medium text-slate-500">Email address</p>
            <p className="mt-1 break-all text-sm font-medium text-dark-teal">{email || "Not provided"}</p>
          </div>
          <div className="border-b border-slate-100 px-5 py-4 sm:px-0">
            <p className="text-xs font-medium text-slate-500">Full name</p>
            <p className="mt-1 text-sm font-medium text-dark-teal">{fullName || "Not provided"}</p>
          </div>
          <div className="px-5 py-4 sm:col-span-2 sm:px-0">
            <p className="text-xs font-medium text-slate-500">Member since</p>
            <p className="mt-1 text-sm font-medium text-dark-teal">{memberSince}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#edf5ef] text-deep-sage">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-dark-teal">Data &amp; privacy</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Your audit records are scoped to your account. Uploaded bills and generated PDFs are stored on this
              prototype&apos;s backend filesystem, not Supabase Storage.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col justify-between gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
            <LockKeyhole size={14} className="mt-0.5 shrink-0 text-slate-400" />
            This is not a production health-record storage service. Use synthetic data only.
          </p>
          <Link
            to="/history"
            className="group inline-flex w-fit shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-deep-sage transition hover:bg-[#f3f7f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-sage"
          >
            <FileClock size={16} />
            Manage audits
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-7">
        <div>
          <h2 className="text-base font-semibold text-dark-teal">Sign out</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            End your session on this device. You can sign in again whenever you return.
          </p>
          {signOutError && (
            <p role="alert" className="mt-3 text-sm text-rose-700">
              {signOutError}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          className="mt-5 inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-wait disabled:opacity-60 sm:mt-0"
        >
          {signingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </section>
    </div>
  );
}
