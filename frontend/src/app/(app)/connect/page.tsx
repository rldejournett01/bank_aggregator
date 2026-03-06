"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePlaidLink } from "react-plaid-link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

type LinkTokenResponse = { link_token: string };

type LinkedItem = {
  id: string;
  item_id: string;
  institution_name?: string | null;
  institution_id?: string | null;
  created_at?: string;
};

export default function ConnectPage() {
  const { token, ready } = useAuth();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [linked, setLinked] = useState<LinkedItem[]>([]);

  async function loadLinked() {
    if (!token) return;
    const items = await apiFetch<LinkedItem[]>("/plaid/linked", { token });
    setLinked(items);
  }

  useEffect(() => {
    if (!ready) return;
    if (!token) { window.location.href = "/login"; return; }

    (async () => {
      setStatus("loading");
      const res = await apiFetch<LinkTokenResponse>("/plaid/link-token", { method: "POST", token });
      setLinkToken(res.link_token);
      setStatus("idle");
      await loadLinked();
    })().catch((e: any) => {
      setStatus("error");
      setStatusMsg(e.message ?? "Failed to create link token");
    });
  }, [ready, token]);

  const onSuccess = useMemo(
    () => async (public_token: string, metadata: any) => {
      if (!token) return;
      const institution_id = metadata?.institution?.institution_id ?? null;
      const institution_name = metadata?.institution?.name ?? null;
      setStatus("loading");
      setStatusMsg("Securing connection...");
      try {
        await apiFetch("/plaid/exchange", {
          method: "POST",
          token,
          body: { public_token, institution_id, institution_name },
        });
        setStatus("success");
        setStatusMsg(`${institution_name ?? "Bank"} connected successfully`);
        await loadLinked();
      } catch (e: any) {
        setStatus("error");
        setStatusMsg(e.message ?? "Connection failed");
      }
    },
    [token]
  );

  const { open, ready: plaidReady } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess,
    onExit: (err) => {
      if (err) {
        setStatus("error");
        setStatusMsg(err.display_message || err.error_message || "Exited");
      }
    },
  });

  return (
    <div className="space-y-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-1">Plaid Integration</p>
          <h1 className="text-2xl font-light text-[#0d1f0d] tracking-tight">
            Connect a <span className="font-semibold">bank</span>
          </h1>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xs font-medium text-[#4a7a4a] hover:text-[#0d1f0d] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </Link>
      </div>

      {/* Connect card */}
      <div className="bg-white rounded-xl border border-[#c8dcc8] px-8 py-8">
        <div className="flex items-start gap-6">
          <div className="w-12 h-12 rounded-xl bg-[#eaf4ea] border border-[#b8d8b8] flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#1a7a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">Secure bank connection</h2>
            <p className="text-sm text-[#4a7a4a] leading-relaxed mb-6">
              Connect via Plaid. Your credentials are never stored in this app — only a secure token is saved.
            </p>

            {/* Status message */}
            {statusMsg && (
              <div className={`mb-4 px-4 py-3 rounded border text-xs ${status === "error"
                  ? "bg-[#fef2f2] border-[#fca5a5] text-[#991b1b]"
                  : "bg-[#eaf4ea] border-[#b8d8b8] text-[#1a7a1a]"
                }`}>
                {statusMsg}
              </div>
            )}

            <button
              onClick={() => open()}
              disabled={!plaidReady || !linkToken || status === "loading"}
              className="flex items-center gap-2 px-6 py-3 bg-[#1a7a1a] text-white text-xs font-semibold tracking-widest uppercase rounded hover:bg-[#155e15] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {status === "loading" ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Preparing...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  {linkToken ? "Open Plaid Link" : "Loading..."}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Linked institutions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Linked institutions</p>
          <span className="text-[10px] tracking-widest uppercase text-[#b0c8b0]">{linked.length} connected</span>
        </div>

        {linked.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-[#c8dcc8] px-8 py-10 text-center">
            <p className="text-sm text-[#4a7a4a]">None yet. Connect your first bank above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {linked.map((x) => (
              <div
                key={x.id}
                className="bg-white rounded-xl border border-[#c8dcc8] px-6 py-4 flex items-center gap-4"
              >
                <div className="w-8 h-8 rounded-lg bg-[#eaf4ea] flex items-center justify-center text-[#1a7a1a] flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0d1f0d]">
                    {x.institution_name ?? "Institution"}
                  </p>
                  <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mt-0.5 truncate">
                    ID: {x.item_id}
                  </p>
                </div>
                {x.created_at && (
                  <span className="text-[10px] text-[#b0c8b0] flex-shrink-0">
                    {new Date(x.created_at).toLocaleDateString()}
                  </span>
                )}
                <div className="w-2 h-2 rounded-full bg-[#1a7a1a] flex-shrink-0" title="Connected" />
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}