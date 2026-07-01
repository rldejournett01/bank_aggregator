"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch, getErrorMessage } from "@/lib/api";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How am I doing financially?",
  "Where is most of my money going?",
  "Can I afford to save more each month?",
  "What recurring bills can I cut?",
];

export default function AdvisorPage() {
  const { authed, ready } = useAuth();
  const [status, setStatus] = useState<{ enabled: boolean; is_premium: boolean } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready) return;
    if (!authed) { window.location.href = "/login"; return; }
    apiFetch<{ enabled: boolean; is_premium: boolean }>("/advisor/status")
      .then(setStatus)
      .catch((e) => setErr(e.message ?? "Failed to load advisor"));
  }, [ready, authed]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function upgrade() {
    try {
      const res = await apiFetch<{ url: string }>("/billing/checkout", { method: "POST" });
      window.location.href = res.url;
    } catch (e) {
      alert(getErrorMessage(e, "Upgrade is currently unavailable."));
    }
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setErr(null);
    const history = messages;
    setMessages([...history, { role: "user", content: message }]);
    setInput("");
    setBusy(true);
    try {
      const res = await apiFetch<{ reply: string }>("/advisor/chat", {
        method: "POST",
        body: { message, history },
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setErr(getErrorMessage(e, "The advisor couldn't respond."));
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-[#4a7a4a]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1a7a1a] animate-bounce" />
          <span className="text-xs tracking-widest uppercase">Loading advisor…</span>
        </div>
      </div>
    );
  }

  const Header = (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-1">Financial Intelligence</p>
        <h1 className="text-2xl font-light text-[#0d1f0d] tracking-tight">
          AI <span className="font-semibold">advisor</span>
        </h1>
      </div>
      <Link href="/dashboard" className="flex items-center gap-2 text-xs font-medium text-[#4a7a4a] hover:text-[#0d1f0d] transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Dashboard
      </Link>
    </div>
  );

  if (!status.enabled) {
    return (
      <div className="space-y-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {Header}
        <div className="bg-white rounded-xl border border-[#c8dcc8] px-8 py-10 text-center">
          <p className="text-sm text-[#0d1f0d] font-semibold mb-1">The AI advisor isn&apos;t enabled yet</p>
          <p className="text-xs text-[#4a7a4a]">Set <code>ANTHROPIC_API_KEY</code> on the backend to turn it on.</p>
        </div>
      </div>
    );
  }

  if (!status.is_premium) {
    return (
      <div className="space-y-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {Header}
        <div className="bg-white rounded-xl border border-[#c8dcc8] px-8 py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[#eaf4ea] border border-[#b8d8b8] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[#1a7a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-[#0d1f0d] mb-1">Your personal AI financial advisor</p>
          <p className="text-sm text-[#4a7a4a] max-w-md mx-auto mb-6">
            Ask anything about your money — spending, bills, net worth, what to cut — and get answers grounded in your real, connected accounts.
          </p>
          <button
            onClick={upgrade}
            className="px-6 py-3 bg-[#1a7a1a] text-white text-xs font-semibold tracking-widest uppercase rounded hover:bg-[#155e15] transition-colors"
          >
            Upgrade to unlock →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif", height: "calc(100vh - 8rem)" }}>
      {Header}

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white rounded-xl border border-[#c8dcc8] px-6 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <p className="text-sm text-[#4a7a4a] mb-5">Ask your advisor anything about your finances.</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-3 py-2 text-xs text-[#1a7a1a] bg-[#eaf4ea] border border-[#b8d8b8] rounded-full hover:bg-[#d8ecd8] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#1a7a1a] text-white rounded-br-sm"
                    : "bg-[#f0f7f0] text-[#0d1f0d] border border-[#d4e8d4] rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {busy && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-[#f0f7f0] border border-[#d4e8d4] flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#1a7a1a] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {err && (
        <div className="px-4 py-3 rounded bg-[#fef2f2] border border-[#fca5a5] text-xs text-[#991b1b]">{err}</div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex gap-3 items-end"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your spending, bills, net worth…"
          disabled={busy}
          className="flex-1 px-4 py-3 bg-white border border-[#c8dcc8] rounded text-sm text-[#0d1f0d] placeholder:text-[#b0c8b0] focus:outline-none focus:border-[#1a7a1a] focus:ring-1 focus:ring-[#1a7a1a] transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="px-6 py-3 bg-[#1a7a1a] text-white text-xs font-semibold tracking-widest uppercase rounded hover:bg-[#155e15] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </form>

      <p className="text-[10px] text-[#8aaa8a] text-center">
        Informational only — not financial, investment, tax, or legal advice. Responses are AI-generated and may be inaccurate.
      </p>
    </div>
  );
}
