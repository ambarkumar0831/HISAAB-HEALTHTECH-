import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { User, Bell, ShieldCheck, LogOut, RotateCcw } from "lucide-react";

export default function Settings() {
  const [user, setUser] = useState<any>({
    id: "demo-user",
    email: "demo@example.com",
    user_metadata: { full_name: "Demo User" },
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Demo mode: simulate a logged-in user
    setUser({
      id: "demo-user",
      email: "demo@example.com",
      user_metadata: { full_name: "Demo User" },
    });
  }, []);

  const handleLogout = async () => {
    navigate("/login");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 px-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-dark-teal">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your account and preferences.</p>
      </div>

      <div className="card">
        <h2 className="font-serif text-lg text-dark-teal mb-6">Account</h2>
        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 last:border-0">
            <div>
              <p className="font-medium text-slate-800">Email</p>
              <p className="text-sm text-slate-500">{user?.email || "—"}</p>
            </div>
            <Link to="#" className="text-deep-sage text-sm font-medium hover:underline">
              Edit
            </Link>
          </div>
          <div className="flex items-center justify-between p-4 border-b border-slate-100 last:border-0">
            <div>
              <p className="font-medium text-slate-800">Full Name</p>
              <p className="text-sm text-slate-500">{user?.user_metadata?.full_name || "—"}</p>
            </div>
            <Link to="#" className="text-deep-sage text-sm font-medium hover:underline">
              Edit
            </Link>
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-slate-800">Member Since</p>
              <p className="text-sm text-slate-500">Nov 2026</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-serif text-lg text-dark-teal mb-6">Data &amp; Privacy</h2>
        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 last:border-0">
            <div>
              <p className="font-medium text-slate-800">Data Retention</p>
              <p className="text-sm text-slate-500">
                Audits are stored until you delete them. Uploaded bills are temporary.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => navigate("/history")}
              className="flex items-center gap-3 w-full px-4 py-3 text-left text-deep-sage font-medium hover:bg-slate-50 rounded-lg"
            >
              <RotateCcw size={16} /> Manage Audits
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-red-50 border-red-100">
        <div className="flex items-start gap-4 p-6">
          <LogOut size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-800 mb-1">Delete Account</h3>
            <p className="text-sm text-red-700 mb-3">
              Permanently delete your account and all associated audits. This cannot be undone.
            </p>
            <button
              onClick={handleLogout}
              className="text-sm text-red-700 hover:underline font-medium"
            >
              Sign out (Demo)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
