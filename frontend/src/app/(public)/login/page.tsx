"use client";

import { useState } from "react";
import Link from "next/link";
import { apiForm } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type TokenResponse = { access_token: string; token_type: string };

export default function LoginPage() {
  const { setToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await apiForm<TokenResponse>("/auth/login", {
        username: email,
        password: password,
      });
      setToken(res.access_token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setMsg(err.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7faf7] font-['DM_Sans',sans-serif] flex flex-col">

      {/* Top bar */}
      <header className="border-b border-[#d4e8d4] px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#1a7a1a] inline-block" />
          <span className="text-sm font-semibold tracking-widest uppercase text-[#0d1f0d]">Cashism</span>
        </Link>
        <span className="text-[11px] tracking-widest uppercase text-[#8aaa8a]">
          Secure login
        </span>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">

          {/* Heading */}
          <div className="mb-10">
            <p className="text-[10px] tracking-widest uppercase text-[#4a7a4a] mb-3">Welcome back</p>
            <h1 className="text-3xl font-light text-[#0d1f0d] tracking-tight">
              Sign in to your<br />
              <span className="font-semibold">account</span>
            </h1>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-widest uppercase text-[#4a7a4a] mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-[#c8dcc8] rounded text-sm text-[#0d1f0d] placeholder:text-[#b0c8b0] focus:outline-none focus:border-[#1a7a1a] focus:ring-1 focus:ring-[#1a7a1a] transition-colors font-['DM_Mono',monospace]"
              />
            </div>

            <div>
              <label className="block text-[10px] tracking-widest uppercase text-[#4a7a4a] mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-[#c8dcc8] rounded text-sm text-[#0d1f0d] placeholder:text-[#b0c8b0] focus:outline-none focus:border-[#1a7a1a] focus:ring-1 focus:ring-[#1a7a1a] transition-colors font-['DM_Mono',monospace]"
              />
            </div>

            {msg && (
              <div className="px-4 py-3 rounded bg-[#fef2f2] border border-[#fca5a5] text-xs text-[#991b1b]">
                {msg}
              </div>
            )}

            <button
              onClick={submit}
              disabled={busy}
              className="w-full py-3 bg-[#1a7a1a] text-white text-xs font-semibold tracking-widest uppercase rounded hover:bg-[#155e15] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 mt-2"
            >
              {busy ? "Signing in..." : "Sign in →"}
            </button>
          </div>

          {/* Divider */}
          <div className="mt-8 pt-8 border-t border-[#d4e8d4]">
            <p className="text-xs text-[#8aaa8a]">
              Don't have an account?{" "}
              <Link href="/signup" className="text-[#1a7a1a] font-semibold hover:text-[#0d1f0d] transition-colors">
                Create one
              </Link>
            </p>
          </div>

        </div>
      </main>

      {/* Footer note */}
      <div className="px-8 py-4 border-t border-[#d4e8d4] flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#1a7a1a]" />
        <span className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">
          256-bit encrypted · SOC 2 compliant
        </span>
      </div>

    </div>
  );
}