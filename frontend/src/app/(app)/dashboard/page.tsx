"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

type Account = {
  id: string;
  name: string;
  institution: string;
  account_type: string;
  account_class: "asset" | "liability";
  type_label: string;
  balance: string;
};

type DashboardResponse = {
  total_balance: string;
  net_worth: string;
  total_assets: string;
  total_liabilities: string;
  accounts: Account[];
};

type HistoryPoint = {
  date: string;
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
};

function AccountTypeIcon({ type, accountClass }: { type: string; accountClass: string }) {
  const t = type?.toLowerCase();
  if (accountClass === "liability") {
    if (t?.includes("mortgage")) return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    );
    // credit card / loan
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    );
  }
  if (t?.includes("invest") || t?.includes("brokerage") || t?.includes("retirement")) {
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
  const { authed, ready, logout } = useAuth();
  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dash, setDash] = useState<DashboardResponse | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [syncMsg, setSyncMsg] = useState("");

  async function loadDashboard() {
    const [d, h] = await Promise.all([
      apiFetch<DashboardResponse>("/dashboard/"),
      apiFetch<HistoryPoint[]>("/dashboard/history?days=90").catch(() => [] as HistoryPoint[]),
    ]);
    setDash(d);
    setHistory(h);
  }

  async function syncNow() {
    setSyncStatus("syncing");
    try {
      await apiFetch("/plaid/sync", { method: "POST" });
      await loadDashboard();
      setSyncStatus("done");
      setSyncMsg("Synced successfully");
    } catch (e: any) {
      setSyncStatus("error");
      setSyncMsg(e.message ?? "Sync failed");
    }
  }

  useEffect(() => {
    if (!ready) return;
    if (!authed) { window.location.href = "/login"; return; }

    apiFetch("/users/me").then(setMe).catch((e) => {
      setErr(e.message ?? "Failed to load user");
      logout();
      window.location.href = "/login";
    });

    loadDashboard().catch((e) => {
      setErr(e.message ?? "Failed to load dashboard");
    });
  }, [ready, authed, logout]);

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

      {/* Net worth hero */}
      <div className="bg-white rounded-xl border border-[#c8dcc8] px-8 py-7">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-2">Net Worth</p>
            <div className="text-5xl font-light text-[#0d1f0d] tracking-tight" style={{ fontFamily: "'DM Mono', monospace" }}>
              ${Number(dash?.net_worth ?? dash?.total_balance ?? "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-2 text-xs text-[#8aaa8a]">
              Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
            </p>
          </div>
          {history.length >= 2 && (
            <div className="hidden sm:block w-48 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="nwSpark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1a7a1a" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#1a7a1a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="net_worth" stroke="#1a7a1a" strokeWidth={2} fill="url(#nwSpark)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Net worth trend */}
        {history.length >= 2 && (
          <div className="mt-6 pt-6 border-t border-[#f0f7f0]">
            <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-4">Net worth · last 90 days</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="nwTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a7a1a" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#1a7a1a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#8aaa8a" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    minTickGap={32}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#8aaa8a" }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={(n: number) => (Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n.toFixed(0)}`)}
                  />
                  <Tooltip
                    formatter={(v) => [`$${Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, "Net worth"]}
                    labelFormatter={(d) => new Date(d as string).toLocaleDateString()}
                    contentStyle={{ border: "1px solid #c8dcc8", borderRadius: 8, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="net_worth" stroke="#1a7a1a" strokeWidth={2} fill="url(#nwTrend)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Assets vs Liabilities bar */}
        {dash?.total_assets && (
          <div className="mt-6 pt-6 border-t border-[#f0f7f0]">
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-1">Total Assets</p>
                <p className="text-xl font-light text-[#1a7a1a] font-['DM_Mono',monospace]">
                  +${Number(dash.total_assets).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-1">Total Liabilities</p>
                <p className="text-xl font-light text-[#e5484d] font-['DM_Mono',monospace]">
                  −${Number(dash.total_liabilities).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            {/* Visual ratio bar */}
            {(() => {
              const assets = Number(dash.total_assets);
              const liabilities = Number(dash.total_liabilities);
              const total = assets + liabilities;
              const assetPct = total > 0 ? (assets / total) * 100 : 100;
              return (
                <div className="h-2 rounded-full overflow-hidden bg-[#fde8e8] flex">
                  <div
                    className="h-full bg-[#1a7a1a] rounded-full transition-all duration-700"
                    style={{ width: `${assetPct}%` }}
                  />
                </div>
              );
            })()}
            <div className="flex justify-between mt-1">
              <span className="text-[9px] tracking-widest uppercase text-[#1a7a1a]">Assets</span>
              <span className="text-[9px] tracking-widest uppercase text-[#e5484d]">Liabilities</span>
            </div>
          </div>
        )}
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
            {accounts.map((a) => {
              const isLiability = a.account_class === "liability";
              return (
                <Link
                  key={a.id}
                  href={`/accounts/${a.id}`}
                  className={`group bg-white rounded-xl border px-5 py-5 hover:shadow-sm transition-all duration-150 ${isLiability
                      ? "border-[#fca5a5] hover:border-[#e5484d]"
                      : "border-[#c8dcc8] hover:border-[#1a7a1a]"
                    }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLiability ? "bg-[#fef2f2] text-[#e5484d]" : "bg-[#eaf4ea] text-[#1a7a1a]"
                      }`}>
                      <AccountTypeIcon type={a.account_type} accountClass={a.account_class} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] tracking-widest uppercase font-semibold px-2 py-0.5 rounded-full ${isLiability
                          ? "text-[#e5484d] bg-[#fef2f2]"
                          : "text-[#1a7a1a] bg-[#eaf4ea]"
                        }`}>
                        {isLiability ? "Liability" : "Asset"}
                      </span>
                      <svg
                        className={`w-4 h-4 transition-colors ${isLiability
                            ? "text-[#fca5a5] group-hover:text-[#e5484d]"
                            : "text-[#b0c8b0] group-hover:text-[#1a7a1a]"
                          }`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-[#0d1f0d] mb-0.5">{a.name}</p>
                  <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-4">
                    {a.institution} · {a.type_label || a.account_type}
                  </p>
                  <div className="flex items-end justify-between">
                    <div
                      className={`text-2xl font-light ${isLiability ? "text-[#e5484d]" : "text-[#0d1f0d]"}`}
                      style={{ fontFamily: "'DM Mono', monospace" }}
                    >
                      {isLiability ? "−" : ""}${Number(a.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}