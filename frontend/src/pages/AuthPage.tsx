import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  FileCheck2,
  Heart,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase, supabaseConfigError } from "../services/supabase";

type AuthPageProps = {
  mode: "login" | "signup";
};

const inputClassName =
  "w-full rounded-2xl border border-[#e4ebe5] bg-[#fbfcfa] py-3.5 pl-11 pr-4 text-sm text-dark-teal outline-none transition placeholder:text-slate-400 hover:border-[#cbdacf] focus:border-deep-sage focus:bg-white focus:ring-4 focus:ring-[#477c69]/10";

export default function AuthPage({ mode }: AuthPageProps) {
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const location = useLocation();
  const {
    recoveryPending,
    authError,
    signInWithPassword,
    clearRecovery,
    clearAuthError,
  } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    (location.state as { notice?: string } | null)?.notice || "",
  );
  const [forgotPassword, setForgotPassword] = useState(false);
  const isRecovery = recoveryPending;
  const locationState = location.state as {
    from?: { pathname?: string };
  } | null;
  const destination = locationState?.from?.pathname;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    clearAuthError();
    const normalizedEmail = email.trim();

    if (!supabase) {
      setError(supabaseConfigError);
      return;
    }

    if ((isSignup || isRecovery) && password !== confirmPassword) {
      setError("Those passwords don’t match yet. Please check and try again.");
      return;
    }

    setLoading(true);
    try {
      if (isRecovery) {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        clearRecovery();
        setNotice("Your password has been updated. Sign in with your new password to continue.");
        navigate("/login", { replace: true });
      } else if (forgotPassword) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (resetError) throw resetError;
        setNotice("If an account exists for this email, a password reset link is on its way.");
      } else if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
          if (signOutError) throw signOutError;
        }

        const safeDestination =
          destination?.startsWith("/") && !destination.startsWith("//")
            ? destination
            : "/dashboard";
        navigate("/login", {
          replace: true,
          state: {
            from: { pathname: safeDestination },
            notice: data.session
              ? "Your account is ready. Sign in with your email and password to continue."
              : "Registration submitted. If email confirmation is enabled, confirm your address before signing in.",
          },
        });
      } else {
        await signInWithPassword(normalizedEmail, password);
        navigate(destination?.startsWith("/") && !destination.startsWith("//") ? destination : "/dashboard", {
          replace: true,
        });
      }
    } catch (submitError) {
      const errorCode =
        typeof submitError === "object" && submitError !== null && "code" in submitError
          ? submitError.code
          : undefined;
      const errorMessage = submitError instanceof Error ? submitError.message : "";

      if (errorCode === "over_email_send_rate_limit" || /email rate limit exceeded/i.test(errorMessage)) {
        setError(
          "Supabase could not send the signup or password-reset email because this project has reached its email limit (2 per hour with the built-in mail service). Wait for the limit to reset, or ask the project owner to configure custom SMTP in Authentication → Emails → SMTP Settings. Retrying now will not help.",
        );
      } else {
        setError(errorMessage || "Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page relative min-h-screen overflow-hidden px-5 pb-10 pt-5 sm:px-8 sm:pt-7">
      <div className="auth-glow auth-glow-mint" aria-hidden="true" />
      <div className="auth-glow auth-glow-lilac" aria-hidden="true" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between">
        <Link
          to="/"
          className="group inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-sage focus-visible:ring-offset-4"
          aria-label="HISAAB home"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-dark-teal text-lg font-bold text-white shadow-[0_8px_24px_-12px_rgba(18,59,59,0.65)] transition-transform group-hover:rotate-[-5deg]">
            ₹
          </span>
          <span>
            <span className="block font-serif text-lg font-bold leading-tight tracking-tight text-dark-teal">HISAAB</span>
            <span className="block text-[10px] font-medium tracking-wide text-slate-500">Bill clarity, with care</span>
          </span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-white/70 hover:text-dark-teal"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Back to home</span>
          <span className="sm:hidden">Home</span>
        </Link>
      </header>

      <main className="relative z-10 mx-auto grid max-w-7xl items-center gap-9 py-9 sm:py-12 lg:min-h-[calc(100vh-108px)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-8">
        <section className="auth-copy mx-auto w-full max-w-xl lg:mx-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/65 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-deep-sage shadow-sm backdrop-blur">
            <Sparkles size={13} />
            A softer way to make sense of the numbers
          </div>
          <h1 className="mt-5 max-w-xl font-serif text-[clamp(2.7rem,5.3vw,4.8rem)] leading-[1.02] tracking-[-0.045em] text-dark-teal">
            A clearer bill can feel like a{" "}
            <span className="auth-title-accent italic">deep breath.</span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-7 text-slate-600 sm:text-base">
            Come in, take your time, and see the details behind each charge. HISAAB helps you find the right questions to ask.
          </p>

          <div className="auth-illustration relative mt-7 overflow-hidden rounded-[1.7rem] border border-white/80 p-4 shadow-[0_28px_75px_-52px_rgba(18,59,59,0.46)] sm:mt-9 sm:p-5">
            <div className="auth-illustration-wash" aria-hidden="true" />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/85 text-deep-sage shadow-sm">
                  <FileCheck2 size={17} />
                </span>
                <div>
                  <p className="text-xs font-bold text-dark-teal">A gentler kind of review</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">Illustrative preview · not a patient record</p>
                </div>
              </div>
              <span className="rounded-full border border-white/80 bg-white/65 px-2.5 py-1 text-[9px] font-bold tracking-[0.12em] text-deep-sage">
                YOUR PACE
              </span>
            </div>

            <div className="relative mt-4 rounded-2xl border border-white/80 bg-white/80 p-3.5 backdrop-blur-md sm:p-4">
              <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400">Sample bill overview</p>
                  <p className="mt-1 font-serif text-lg text-dark-teal">The details, made clearer.</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eaf4ed] text-deep-sage">
                  <Heart size={16} />
                </span>
              </div>
              <div className="space-y-2.5 py-3">
                {[
                  { label: "Room charges", value: "₹18,000", checked: true },
                  { label: "Lab panel", value: "₹4,800", checked: false },
                  { label: "Medicines & supplies", value: "₹6,250", checked: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2.5 text-slate-600">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${item.checked ? "bg-[#eaf4ed] text-deep-sage" : "bg-[#fff2e4] text-[#a06b38]"}`}>
                        {item.checked ? <Check size={11} /> : <Sparkles size={10} />}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-dark-teal">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[10px] text-slate-500">One item to ask about</span>
                <span className="rounded-full bg-[#fff4e8] px-2.5 py-1 text-[9px] font-semibold text-[#95663a]">Worth a closer look</span>
              </div>
            </div>

            <div className="relative mt-3 flex items-center gap-2 text-[10px] leading-5 text-slate-500">
              <ShieldCheck size={14} className="shrink-0 text-deep-sage" />
              A flag is a prompt for your review—not a conclusion.
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-medium text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-deep-sage" /> Calculations checked separately</span>
            <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-deep-sage" /> You choose what to ask</span>
          </div>
        </section>

        <section className="auth-card mx-auto w-full max-w-[490px] rounded-[1.8rem] border border-white/90 bg-white/85 p-5 shadow-[0_32px_100px_-50px_rgba(18,59,59,0.55)] backdrop-blur-xl sm:p-8 lg:p-9">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#edf5ef] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-deep-sage">
              <span className="h-1.5 w-1.5 rounded-full bg-deep-sage" />
              Your patient workspace
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">Preview</span>
          </div>

          <h2 className="mt-6 font-serif text-3xl tracking-tight text-dark-teal sm:text-[2.15rem]">
            {isRecovery
              ? "Choose a new password."
              : forgotPassword
                ? "Reset your password."
                : isSignup
                  ? "Let’s get you started."
                  : "Welcome back."}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isRecovery
              ? "Choose a strong password to secure your HISAAB account."
              : forgotPassword
                ? "Enter the email address linked to your account."
                : isSignup
                  ? "Create your space to explore a clearer view of your bill."
                  : "Sign in with your registered email and password to open your patient dashboard."}
          </p>

          {!isRecovery && !forgotPassword && (
          <div className="mt-6 grid grid-cols-2 rounded-2xl bg-[#f2f5f1] p-1.5" aria-label="Account options">
            <Link
              to="/login"
              aria-current={!isSignup ? "page" : undefined}
              className={`rounded-xl px-3 py-2.5 text-center text-xs font-semibold transition-all ${!isSignup ? "bg-white text-dark-teal shadow-sm" : "text-slate-500 hover:text-dark-teal"}`}
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              aria-current={isSignup ? "page" : undefined}
              className={`rounded-xl px-3 py-2.5 text-center text-xs font-semibold transition-all ${isSignup ? "bg-white text-dark-teal shadow-sm" : "text-slate-500 hover:text-dark-teal"}`}
            >
              Create account
            </Link>
          </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {!isRecovery && (
              <>
                {isSignup && (
                  <div>
                    <label htmlFor="full-name" className="mb-2 block text-xs font-semibold text-slate-700">Your name</label>
                    <div className="relative">
                      <UserRound size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="full-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        className={inputClassName}
                        placeholder="How should we address you?"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="mb-2 block text-xs font-semibold text-slate-700">Email address</label>
                  <div className="relative">
                    <Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      onBlur={(event) => setEmail(event.currentTarget.value.trim())}
                      className={inputClassName}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
              </>
            )}

            {!forgotPassword && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  {isRecovery ? "New password" : "Password"}
                </label>
                {(isSignup || isRecovery) && <span className="text-[10px] text-slate-400">At least 12 characters</span>}
              </div>
              <div className="relative">
                <LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isSignup || isRecovery ? "new-password" : "current-password"}
                  minLength={isSignup || isRecovery ? 12 : undefined}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${inputClassName} pr-12`}
                  placeholder={isRecovery || isSignup ? "Choose a strong password" : "Enter your password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-[#eef4ef] hover:text-dark-teal"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            )}

            {(isSignup || isRecovery) && (
              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-xs font-semibold text-slate-700">Confirm password</label>
                <div className="relative">
                  <LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={12}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={inputClassName}
                    placeholder="Enter it once more"
                  />
                </div>
              </div>
            )}

            {!isSignup && !isRecovery && !forgotPassword && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setNotice("");
                  setForgotPassword(true);
                }}
                className="text-xs font-semibold text-deep-sage transition hover:text-dark-teal"
              >
                Forgot password?
              </button>
            )}

            {error && (
              <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-xs leading-5 text-rose-700">
                {error}
              </p>
            )}
            {authError && (
              <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-xs leading-5 text-rose-700">
                Could not restore your session: {authError}
              </p>
            )}
            {notice && (
              <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-xs leading-5 text-emerald-800">
                {notice}
              </p>
            )}
            {supabaseConfigError && (
              <p role="alert" className="rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800">
                {supabaseConfigError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-dark-teal px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-16px_rgba(18,59,59,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0e3131] hover:shadow-[0_18px_36px_-17px_rgba(18,59,59,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-sage focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
            >
              {loading
                ? "Please wait…"
                : isRecovery
                  ? "Update password"
                  : forgotPassword
                    ? "Send reset link"
                    : isSignup
                      ? "Create my account"
                      : "Sign in to dashboard"}
              {!loading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>

          {(forgotPassword || isRecovery) && (
            <button
              type="button"
              onClick={() => {
                if (isRecovery) clearRecovery();
                setForgotPassword(false);
                setError("");
                setNotice("");
              }}
              className="mt-4 w-full text-center text-xs font-semibold text-deep-sage transition hover:text-dark-teal"
            >
              Return to sign in
            </button>
          )}

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-100" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">A note on this preview</span>
            <span className="h-px flex-1 bg-slate-100" />
          </div>
          <p className="text-center text-[10px] leading-5 text-slate-500">
            Your account is managed by Supabase. Email confirmation may be required before your first sign-in.
          </p>
          <p className="mt-4 text-center text-[10px] text-slate-400">
            Only use synthetic data until your deployment’s privacy and security controls are configured.
          </p>
        </section>
      </main>
    </div>
  );
}
