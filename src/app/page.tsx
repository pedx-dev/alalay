"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "~/components/Navbar";
import { useDatabase } from "~/hooks/useDatabase";
import { SESSION_USER_ID_KEY, SESSION_USER_ROLE_KEY, type UserRole } from "~/lib/db";

const routeByRole: Record<UserRole, string> = {
  ADMIN: "/dashboard/admin",
  COUNCILOR: "/dashboard/councilor",
  TEACHER: "/dashboard/teacher",
};

const detectRoleFromUsername = (rawUsername: string): UserRole | null => {
  const value = rawUsername.toLowerCase();
  if (value.endsWith("@admin")) return "ADMIN";
  if (value.endsWith("@conci")) return "COUNCILOR";
  if (value.endsWith("@edu")) return "TEACHER";
  return null;
};

export default function HomePage() {
  const router = useRouter();
  const { db } = useDatabase();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const resetAuthForm = () => {
    setUsername("");
    setPassword("");
    setAuthError("");
  };

  const openAuth = () => {
    setShowAuthModal(true);
    setAuthError("");
  };

  const submitAuth = () => {
    if (!db) return;

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const usernameRole = detectRoleFromUsername(normalizedUsername);

    if (!normalizedUsername || !normalizedPassword) {
      setAuthError("Username and password are required.");
      return;
    }

    if (!usernameRole) {
      setAuthError("Username must end with @admin, @conci, or @edu.");
      return;
    }

    const matchedUser = db.users.find(
      (user) =>
        user.username.toLowerCase() === normalizedUsername &&
        user.password === normalizedPassword &&
        user.role === usernameRole,
    );

    if (!matchedUser) {
      setAuthError("Invalid credentials for the username role.");
      return;
    }

    if (matchedUser.status !== "ACTIVE") {
      setAuthError("This account is currently disabled.");
      return;
    }

    localStorage.setItem(SESSION_USER_ID_KEY, matchedUser.id);
    localStorage.setItem(SESSION_USER_ROLE_KEY, matchedUser.role);

    setShowAuthModal(false);
    resetAuthForm();
    router.push(routeByRole[matchedUser.role]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 text-slate-900">
      <Navbar onSignIn={openAuth} />

      <section id="home" className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-400/20 to-cyan-400/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 blur-3xl" />
        
        <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/40 backdrop-blur-xl shadow-2xl">
          <div className="grid gap-12 p-8 lg:grid-cols-[1.4fr_1fr] lg:p-16">
            <div className="flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 w-fit rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 px-4 py-2 mb-6">
                <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                <p className="text-xs font-black uppercase tracking-widest text-blue-900">Welcome to ALALAY</p>
              </div>
              
              <h1 className="text-5xl font-black leading-tight bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 bg-clip-text text-transparent sm:text-6xl">Student Guidance & Records System</h1>
              
              <p className="mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed">A comprehensive platform unifying Admin, Councilor, and Teacher workflows. Manage student records, grade submissions, guidance logs, and disciplinary tracking all in one place.</p>

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={openAuth}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-4 text-sm font-black uppercase tracking-wider text-white transition hover:shadow-lg hover:shadow-blue-500/50 hover:-translate-y-0.5"
                >
                  🔐 Sign In Now
                </button>
              </div>

              <p className="mt-8 text-sm text-slate-500 leading-relaxed"><strong>Demo:</strong> admin@admin / admin123 or conci@conci / conci123</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-blue-200/50 bg-gradient-to-br from-blue-50 to-cyan-50 p-6 hover:shadow-lg transition">
                <div className="text-2xl mb-3">👨‍💼</div>
                <p className="font-black text-slate-900">Admin (@admin)</p>
                <p className="text-sm text-slate-600 mt-2">Manage staff accounts, system controls, and audit logs</p>
              </div>
              <div className="rounded-2xl border border-teal-200/50 bg-gradient-to-br from-teal-50 to-cyan-50 p-6 hover:shadow-lg transition">
                <div className="text-2xl mb-3">👩‍🎓</div>
                <p className="font-black text-slate-900">Councilor (@conci)</p>
                <p className="text-sm text-slate-600 mt-2">Student lifecycle, enrollment, and guidance records</p>
              </div>
              <div className="rounded-2xl border border-purple-200/50 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 hover:shadow-lg transition">
                <div className="text-2xl mb-3">🎓</div>
                <p className="font-black text-slate-900">Teacher (@edu)</p>
                <p className="text-sm text-slate-600 mt-2">Class rosters, grade management, and student tracking</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-black text-slate-900">Portal Overview</h2>
          <p className="mt-2 text-slate-600">Three specialized workspaces collaborating through one database</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Admin",
              shortcut: "@admin",
              body: "Create and manage staff, lock or unlock accounts, and review audit logs.",
              theme: "border-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-lg",
              icon: "👨‍💼"
            },
            {
              title: "Councilor",
              shortcut: "@conci",
              body: "Manage student profile, assignment, grade visibility, and case history.",
              theme: "border-teal-200/50 bg-gradient-to-br from-teal-50 to-cyan-50 hover:shadow-lg",
              icon: "👩‍🎓"
            },
            {
              title: "Teacher",
              shortcut: "@edu",
              body: "Use section cards and drill down to roster and grade entry modals.",
              theme: "border-indigo-200/50 bg-gradient-to-br from-indigo-50 to-blue-50 hover:shadow-lg",
              icon: "🎓"
            },
          ].map((item) => (
            <article
              key={item.shortcut}
              className={`rounded-2xl border p-6 transition ${item.theme}`}
            >
              <div className="text-3xl mb-3">{item.icon}</div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-600">{item.shortcut}</p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">{item.title}</h3>
              <p className="mt-3 text-sm text-slate-700 leading-relaxed">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-black text-slate-900">Platform Features</h2>
          <p className="mt-2 text-slate-600">Built for seamless collaboration and data accuracy</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { emoji: "💾", label: "Single Database", desc: "Unified JSON storage" },
            { emoji: "📊", label: "9-Subject Grading", desc: "Prelim/Midterm/Finals GWA" },
            { emoji: "📋", label: "Status Tracking", desc: "Active/Disabled/Dropout" },
            { emoji: "🔄", label: "Real-time Sync", desc: "Instant visibility" },
          ].map((feature) => (
            <div
              key={feature.label}
              className="rounded-xl border border-blue-200/50 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 text-center hover:shadow-md transition"
            >
              <div className="text-3xl">{feature.emoji}</div>
              <p className="mt-3 text-sm font-black text-slate-900">{feature.label}</p>
              <p className="mt-1 text-xs text-slate-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6">
        <div className="rounded-2xl border border-blue-200/50 bg-gradient-to-r from-blue-50 to-cyan-50 p-8 text-center">
          <p className="text-sm text-slate-700">
            <span className="font-black">📞 Support:</span> Guidance Office Ops Team — ext. 104
          </p>
          <p className="mt-2 text-xs text-slate-600">
            This system prototype demonstrates role-based workflows for student management and record tracking.
          </p>
        </div>
      </section>

      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowAuthModal(false);
              resetAuthForm();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/95 backdrop-blur-xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 px-3 py-1 mb-3">
                  <span className="text-xs font-black uppercase tracking-widest text-blue-900">🔐 Secure Access</span>
                </div>
                <h2 className="text-3xl font-black bg-gradient-to-r from-slate-900 to-blue-800 bg-clip-text text-transparent">Sign In</h2>
                <p className="mt-2 text-sm text-slate-600">Enter your role-specific credentials</p>
              </div>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  resetAuthForm();
                }}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-lg font-semibold text-slate-500 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  👤 Username
                </label>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitAuth()}
                  placeholder="admin@admin, conci@conci, or teacher@edu"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  🔑 Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitAuth()}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              <div className="rounded-lg border border-blue-200/50 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 text-xs text-slate-700">
                <p className="font-bold mb-2">💡 Role Detection:</p>
                <p>Username ending determines access:</p>
                <ul className="mt-2 space-y-1 font-semibold">
                  <li>• <span className="text-amber-700">@admin</span> → Admin Portal</li>
                  <li>• <span className="text-teal-700">@conci</span> → Councilor Portal</li>
                  <li>• <span className="text-indigo-700">@edu</span> → Teacher Portal</li>
                </ul>
              </div>

              {authError && (
                <div className="rounded-lg border border-red-300/50 bg-gradient-to-br from-red-50 to-rose-50 px-4 py-3 text-sm font-semibold text-red-700">
                  <p className="flex items-center gap-2">⚠️ {authError}</p>
                </div>
              )}

              <button
                onClick={submitAuth}
                disabled={!db}
                className="w-full mt-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/30"
              >
                {!db ? '⏳ Loading...' : '✓ Continue'}
              </button>
            </div>

            <p className="mt-6 text-center text-xs text-slate-500">
              Demo: <span className="font-semibold">admin@admin</span> / <span className="font-semibold">admin123</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
