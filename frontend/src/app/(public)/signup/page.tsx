"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function SignupPage() {
  const { setAuthed } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      // Signup logs the user straight in (sets auth cookies).
      await apiFetch<{ message: string }>("/auth/signup", {
        method: "POST",
        body: { email, password },
      });
      setAuthed(true);
      setSuccess(true);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setMsg(err.message ?? "Signup failed");
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
          Create account
        </span>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">

          {success ? (
            /* Success state */
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#eaf4ea] border border-[#b8d8b8] flex items-center justify-center mx-auto mb-6">
                <svg className="w-5 h-5 text-[#1a7a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[#0d1f0d] mb-2">Account created</h2>
              <p className="text-sm text-[#4a7a4a] mb-8">You're all set. Sign in to get started.</p>
              <Link
                href="/login"
                className="px-6 py-3 bg-[#1a7a1a] text-white text-xs font-semibold tracking-widest uppercase rounded hover:bg-[#155e15] transition-colors duration-200"
              >
                Go to login →
              </Link>
            </div>
          ) : (
            <>
              {/* Heading */}
              <div className="mb-10">
                <p className="text-[10px] tracking-widest uppercase text-[#4a7a4a] mb-3">Get started free</p>
                <h1 className="text-3xl font-light text-[#0d1f0d] tracking-tight">
                  Create your<br />
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
                  <p className="mt-1.5 text-[10px] text-[#8aaa8a]">Minimum 8 characters recommended</p>
                </div>

                {msg && (
                  <div className="px-4 py-3 rounded bg-[#fef2f2] border border-[#fca5a5] text-xs text-[#991b1b]">
                    {msg}
                  </div>
                )}

                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 accent-[#1a7a1a]"
                  />
                  <span className="text-[11px] text-[#4a7a4a] leading-relaxed">
                    I am at least 18 years old and agree to the{" "}
                    <a href="/terms" target="_blank" className="text-[#1a7a1a] font-semibold hover:underline">Terms of Service</a>{" "}
                    and{" "}
                    <a href="/privacy" target="_blank" className="text-[#1a7a1a] font-semibold hover:underline">Privacy Policy</a>,
                    and I consent to connecting my financial accounts via Plaid for a read-only consolidated view.
                  </span>
                </label>

                <button
                  onClick={submit}
                  disabled={busy || !agreed}
                  className="w-full py-3 bg-[#1a7a1a] text-white text-xs font-semibold tracking-widest uppercase rounded hover:bg-[#155e15] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 mt-2"
                >
                  {busy ? "Creating account..." : "Create account →"}
                </button>
              </div>

              {/* Divider */}
              <div className="mt-8 pt-8 border-t border-[#d4e8d4]">
                <p className="text-xs text-[#8aaa8a]">
                  Already have an account?{" "}
                  <Link href="/login" className="text-[#1a7a1a] font-semibold hover:text-[#0d1f0d] transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}

        </div>
      </main>

      {/* Footer note */}
      <div className="px-8 py-4 border-t border-[#d4e8d4] flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#1a7a1a]" />
        <span className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">
          Encrypted in transit · Bank credentials never stored — secured by Plaid
        </span>
      </div>

    </div>
  );
}