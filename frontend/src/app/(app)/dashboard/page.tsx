"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

type Account = {
  id: string;
  name: string;
  institution: string;
  account_type: string;
  balance: string;
};

type DashboardResponse = {
  total_balance: string;
  accounts: Account[];
};

function AccountTypeIcon({ type }: { type: string }) {
  const t = type?.toLowerCase();
  if (t?.includes("invest") || t?.includes("brokerage")) {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    );
  }
  if (t?.includes("savings")) {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

export default function DashboardPage() {
  const { token, ready, logout } = useAuth();
  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dash, setDash] = useState<DashboardResponse | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [syncMsg, setSyncMsg] = useState("");

  async function loadDashboard(t: string) {
    const d = await apiFetch<DashboardResponse>("/dashboard/", { token: t });
    setDash(d);
  }

  async function syncNow() {
    if (!token) return;
    setSyncStatus("syncing");
    try {
      await apiFetch("/plaid/sync", { method: "POST", token });
      await loadDashboard(token);
      setSyncStatus("done");
      setSyncMsg("Synced successfully");
    } catch (e: any) {
      setSyncStatus("error");
      setSyncMsg(e.message ?? "Sync failed");
    }
  }

  useEffect(() => {
    if (!ready) return;
    if (!token) { window.location.href = "/login"; return; }

    apiFetch("/users/me", { token }).then(setMe).catch((e) => {
      setErr(e.message ?? "Failed to load user");
      logout();
      window.location.href = "/login";
    });

    loadDashboard(token).catch((e) => {
      setErr(e.message ?? "Failed to load dashboard");
    });
  }, [ready, token, logout]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-[#4a7a4a]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1a7a1a] animate-bounce" />
          <span className="text-xs tracking-widest uppercase">Loading</span>
        </div>
      </div>
    );
  }

  const accounts = dash?.accounts ?? [];
  const totalBalance = dash?.total_balance ?? "0";

  return (
    <div className="space-y-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-1">Overview</p>
          <h1 className="text-2xl font-light text-[#0d1f0d] tracking-tight">
            {me?.email
              ? <>Good morning, <span className="font-semibold">{me.email.split("@")[0]}</span></>
              : "Dashboard"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={syncNow}
            disabled={syncStatus === "syncing"}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#c8dcc8] rounded text-xs font-semibold tracking-widest uppercase text-[#1a7a1a] hover:bg-[#eaf4ea] disabled:opacity-50 transition-colors duration-150"
          >
            <svg
              className={`w-3.5 h-3.5 ${syncStatus === "syncing" ? "animate-spin" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncStatus === "syncing" ? "Syncing..." : "Sync"}
          </button>
          <Link
            href="/connect"
            className="flex items-center gap-2 px-4 py-2 bg-[#1a7a1a] rounded text-xs font-semibold tracking-widest uppercase text-white hover:bg-[#155e15] transition-colors duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Connect bank
          </Link>
        </div>
      </div>

      {/* Sync status */}
      {syncStatus !== "idle" && syncMsg && (
        <div className={`px-4 py-3 rounded border text-xs ${syncStatus === "error"
            ? "bg-[#fef2f2] border-[#fca5a5] text-[#991b1b]"
            : "bg-[#eaf4ea] border-[#b8d8b8] text-[#1a7a1a]"
          }`}>
          {syncMsg}
        </div>
      )}

      {err && (
        <div className="px-4 py-3 rounded bg-[#fef2f2] border border-[#fca5a5] text-xs text-[#991b1b]">
          {err}
        </div>
      )}

      {/* Total balance hero */}
      <div className="bg-white rounded-xl border border-[#c8dcc8] px-8 py-7">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-2">Total balance</p>
            <div className="text-5xl font-light text-[#0d1f0d] tracking-tight" style={{ fontFamily: "'DM Mono', monospace" }}>
              ${Number(totalBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-2 text-xs text-[#8aaa8a]">
              Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="hidden sm:flex items-end gap-1 h-16 opacity-60">
            {[50, 65, 55, 70, 60, 80, 72, 88, 76, 95].map((h, i) => (
              <div
                key={i}
                className="w-2 rounded-sm"
                style={{
                  height: `${h}%`,
                  background: i === 9 ? "#1a7a1a" : `rgba(26,122,26,${0.12 + i * 0.08})`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Accounts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Accounts</p>
          <span className="text-[10px] tracking-widest uppercase text-[#b0c8b0]">{accounts.length} total</span>
        </div>

        {!dash ? (
          <div className="py-12 text-center text-xs text-[#8aaa8a] tracking-widest uppercase">
            Loading accounts…
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-[#c8dcc8] px-8 py-12 text-center">
            <p className="text-sm text-[#4a7a4a] mb-4">No accounts yet.</p>
            <Link
              href="/connect"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a7a1a] text-white text-xs font-semibold tracking-widest uppercase rounded hover:bg-[#155e15] transition-colors"
            >
              Connect your first bank
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((a) => (
              <Link
                key={a.id}
                href={`/accounts/${a.id}`}
                className="group bg-white rounded-xl border border-[#c8dcc8] px-5 py-5 hover:border-[#1a7a1a] hover:shadow-sm transition-all duration-150"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#eaf4ea] flex items-center justify-center text-[#1a7a1a]">
                    <AccountTypeIcon type={a.account_type} />
                  </div>
                  <svg
                    className="w-4 h-4 text-[#b0c8b0] group-hover:text-[#1a7a1a] transition-colors"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-[#0d1f0d] mb-0.5">{a.name}</p>
                <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-4">
                  {a.institution} · {a.account_type}
                </p>
                <div
                  className="text-2xl font-light text-[#0d1f0d]"
                  style={{ fontFamily: "'DM Mono', monospace" }}
                >
                  ${Number(a.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}