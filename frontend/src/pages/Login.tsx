import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Demo mode: accept any credentials and proceed to dashboard
      await new Promise((r) => setTimeout(r, 800));
      navigate("/dashboard");
    } catch (e: any) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded bg-deep-sage flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
            H
          </div>
          <h2 className="text-2xl font-serif font-bold text-dark-teal">Welcome back</h2>
          <p className="text-slate-600 mt-2">Sign in to access your audits.</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-deep-sage focus:border-transparent outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-deep-sage focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-6">
          Don't have an account?{" "}
          <Link to="/get-started" className="text-deep-sage font-medium hover:underline">
            Create an account
          </Link>
        </p>
        <p className="text-center text-xs text-slate-400 mt-2">
          Demo mode: any email/password works.
        </p>
      </div>
    </div>
  );
}
