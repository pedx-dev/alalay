"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SESSION_USER_ID_KEY, SESSION_USER_ROLE_KEY } from "~/lib/db";

type NavbarProps = {
  onSignIn?: () => void;
  mode?: "landing" | "dashboard";
};

const THEME_KEY = "alalay_theme";

export default function Navbar({ onSignIn, mode = "landing" }: NavbarProps) {
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const nextTheme = stored === "dark" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
  }, []);

  const setAppTheme = (nextTheme: "light" | "dark") => {
    setTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="block">
          <p className="text-2xl font-black tracking-wide bg-gradient-to-r from-slate-900 to-blue-800 bg-clip-text text-transparent">ALALAY</p>
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            Student Records & Guidance
          </p>
        </Link>

        {mode === "landing" && (
          <div className="flex items-center gap-6 text-sm font-semibold">
            <Link href="/#home" className="text-slate-600 hover:text-blue-600 transition dark:text-slate-300 dark:hover:text-blue-400">
              Home
            </Link>
            <Link href="/#about" className="text-slate-600 hover:text-blue-600 transition dark:text-slate-300 dark:hover:text-blue-400">
              Portals
            </Link>
            <Link href="/#features" className="text-slate-600 hover:text-blue-600 transition dark:text-slate-300 dark:hover:text-blue-400">
              Features
            </Link>
          </div>
        )}

        <div className="relative flex items-center gap-2">
          {mode === "landing" ? (
            <button
              onClick={onSignIn}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-2 text-sm font-black text-white transition hover:shadow-lg hover:shadow-blue-500/30"
            >
              Sign In
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowSettings((open) => !open)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                ⚙️ Settings
              </button>
              <button
                onClick={() => {
                  const shouldContinue = window.confirm("Do you want to log out? Click OK to continue or Cancel to stay.");
                  if (!shouldContinue) return;
                  setShowSettings(false);
                  localStorage.removeItem(SESSION_USER_ID_KEY);
                  localStorage.removeItem(SESSION_USER_ROLE_KEY);
                  router.push("/");
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                🚪 Logout
              </button>

              {showSettings && (
                <div className="absolute right-0 top-12 w-56 rounded-xl border border-slate-300 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs font-black uppercase tracking-tight text-slate-500 dark:text-slate-400">
                    Appearance Settings
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setAppTheme("light")}
                      className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                        theme === "light"
                          ? "bg-blue-600 text-white"
                          : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200"
                      }`}
                    >
                      ☀️ Light
                    </button>
                    <button
                      onClick={() => setAppTheme("dark")}
                      className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                        theme === "dark"
                          ? "bg-blue-600 text-white dark:bg-blue-600 dark:text-white"
                          : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200"
                      }`}
                    >
                      🌙 Dark
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
