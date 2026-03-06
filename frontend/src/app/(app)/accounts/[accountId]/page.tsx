"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Account = {
  id: string;
  name: string;
  institution: string;
  account_type: string;
  balance: string;
};

type Transaction = {
  id: string;
  amount: string;
  description: string;
  transaction_type: string;
  external_id?: string | null;
  created_at?: string | null;
};

type AccountTxResponse = {
  account: Account;
  transactions: Transaction[];
  pagination: { limit: number; offset: number; returned: number };
};

// Green monochrome palette for the pie chart
const CHART_COLORS = [
  "#1a7a1a", "#2d8a2d", "#3d9a3d", "#4aaa4a",
  "#5aba5a", "#70c870", "#90d890", "#b0e8b0",
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-[#c8dcc8] rounded-lg px-3 py-2 text-xs shadow-sm">
        <p className="font-semibold text-[#0d1f0d]">{payload[0].name}</p>
        <p className="text-[#1a7a1a] font-mono">${payload[0].value.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

export default function AccountDetailPage() {
  const { token, ready, logout } = useAuth();
  const params = useParams();

  const accountId = useMemo(() => {
    const raw = params?.accountId;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw)) return raw[0];
    return "";
  }, [params]);

  const hasValidAccountId = accountId && accountId !== "undefined";

  const [data, setData] = useState<AccountTxResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [categoryData, setCategoryData] = useState<{ category: string; total: string }[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchText, setSearchText] = useState("");
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  async function load() {
    if (!token || !hasValidAccountId) return;
    setBusy(true);
    setErr(null);
    try {
      const p = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (startDate) p.append("start_date", startDate);
      if (endDate) p.append("end_date", endDate);
      if (searchText) p.append("search", searchText);
      const res = await apiFetch<AccountTxResponse>(
        `/accounts/${accountId}/transactions?${p.toString()}`,
        { token }
      );
      setData(res);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load transactions");
    } finally {
      setBusy(false);
    }
  }

  async function loadCategorySummary() {
    if (!token || !hasValidAccountId) return;
    try {
      const res = await apiFetch<{ category: string; total: string }[]>(
        `/accounts/${accountId}/category-summary`,
        { token }
      );
      setCategoryData(res);
    } catch (e) {
      console.error("Failed to load category summary", e);
    }
  }

  async function deleteAccount() {
    if (!token || !accountId) return;
    if (!window.confirm("Permanently delete this account and all its transactions?")) return;
    try {
      await apiFetch(`/accounts/${accountId}`, { method: "DELETE", token });
      window.location.href = "/dashboard";
    } catch (e: any) {
      alert(e.message ?? "Failed to delete account");
    }
  }

  useEffect(() => {
    if (!ready) return;
    if (!token) { window.location.href = "/login"; return; }
    if (!hasValidAccountId) { setErr("Invalid account id."); return; }
    load();
    loadCategorySummary();
  }, [ready, token, accountId, offset]);

  const chartData = categoryData
    .filter((c) => Number(c.total) < 0)
    .map((c) => ({ name: c.category, value: Math.abs(Number(c.total)) }));

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

  const account = data?.account;
  const transactions = data?.transactions ?? [];

  return (
    <div className="space-y-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-1">Account detail</p>
          <h1 className="text-2xl font-light text-[#0d1f0d] tracking-tight">
            {account?.name
              ? <><span className="font-semibold">{account.name}</span></>
              : "Account"}
          </h1>
          {account && (
            <p className="mt-1 text-xs text-[#8aaa8a]">
              {account.institution} · {account.account_type}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-medium text-[#4a7a4a] hover:text-[#0d1f0d] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
          <button
            onClick={deleteAccount}
            className="px-3 py-2 rounded border border-[#fca5a5] text-xs font-semibold text-[#991b1b] hover:bg-[#fef2f2] transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {err && (
        <div className="px-4 py-3 rounded bg-[#fef2f2] border border-[#fca5a5] text-xs text-[#991b1b]">{err}</div>
      )}

      {/* Balance hero */}
      {account && (
        <div className="bg-white rounded-xl border border-[#c8dcc8] px-8 py-6">
          <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-2">Current balance</p>
          <div className="text-4xl font-light text-[#0d1f0d]" style={{ fontFamily: "'DM Mono', monospace" }}>
            ${Number(account.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#c8dcc8] px-6 py-5">
        <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-4">Filter transactions</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-[9px] tracking-widest uppercase text-[#8aaa8a] mb-1.5">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-[#f7faf7] border border-[#c8dcc8] rounded text-xs text-[#0d1f0d] focus:outline-none focus:border-[#1a7a1a] focus:ring-1 focus:ring-[#1a7a1a] transition-colors"
            />
          </div>
          <div>
            <label className="block text-[9px] tracking-widest uppercase text-[#8aaa8a] mb-1.5">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 bg-[#f7faf7] border border-[#c8dcc8] rounded text-xs text-[#0d1f0d] focus:outline-none focus:border-[#1a7a1a] focus:ring-1 focus:ring-[#1a7a1a] transition-colors"
            />
          </div>
          <div className="flex-1 min-w-48">
            <label className="block text-[9px] tracking-widest uppercase text-[#8aaa8a] mb-1.5">Search</label>
            <input
              type="text"
              placeholder="Description..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full px-3 py-2 bg-[#f7faf7] border border-[#c8dcc8] rounded text-xs text-[#0d1f0d] placeholder:text-[#b0c8b0] focus:outline-none focus:border-[#1a7a1a] focus:ring-1 focus:ring-[#1a7a1a] transition-colors"
            />
          </div>
          <button
            onClick={() => { setOffset(0); load(); loadCategorySummary(); }}
            className="px-4 py-2 bg-[#1a7a1a] text-white text-xs font-semibold tracking-widest uppercase rounded hover:bg-[#155e15] transition-colors"
          >
            Apply
          </button>
          <button
            onClick={() => {
              setStartDate(""); setEndDate(""); setSearchText(""); setOffset(0);
              load(); loadCategorySummary();
            }}
            className="px-4 py-2 bg-white border border-[#c8dcc8] text-xs font-semibold tracking-widest uppercase text-[#4a7a4a] rounded hover:bg-[#f0f7f0] transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-[#c8dcc8] px-6 py-6">
          <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-6">Spending by category</p>
          <div className="w-full h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3">
            {chartData.map((c, i) => (
              <div key={c.name} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="text-[10px] text-[#4a7a4a]">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Transactions</p>
          {busy && (
            <span className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Loading…</span>
          )}
        </div>

        {transactions.length === 0 && !busy ? (
          <div className="bg-white rounded-xl border border-dashed border-[#c8dcc8] px-8 py-10 text-center">
            <p className="text-sm text-[#4a7a4a]">No transactions found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#c8dcc8] overflow-hidden">
            {transactions.map((t, i) => {
              const amount = Number(t.amount);
              const isExpense = amount < 0;
              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between px-6 py-4 ${i !== transactions.length - 1 ? "border-b border-[#f0f7f0]" : ""
                    }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isExpense ? "bg-[#fef2f2]" : "bg-[#eaf4ea]"
                      }`}>
                      <svg
                        className={`w-3.5 h-3.5 ${isExpense ? "text-[#e5484d]" : "text-[#1a7a1a]"}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        {isExpense
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        }
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0d1f0d] truncate">{t.description}</p>
                      <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mt-0.5">
                        {t.transaction_type}
                        {t.created_at && ` · ${new Date(t.created_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`text-sm font-semibold flex-shrink-0 ml-4 ${isExpense ? "text-[#e5484d]" : "text-[#1a7a1a]"
                      }`}
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {isExpense ? "-" : "+"}${Math.abs(amount).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {(data?.pagination?.returned ?? 0) > 0 && (
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 text-xs font-semibold tracking-widest uppercase text-[#4a7a4a] border border-[#c8dcc8] rounded hover:bg-[#f0f7f0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            <span className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">
              {offset + 1}–{offset + (data?.pagination?.returned ?? 0)}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={(data?.pagination?.returned ?? 0) < limit}
              className="px-4 py-2 text-xs font-semibold tracking-widest uppercase text-[#4a7a4a] border border-[#c8dcc8] rounded hover:bg-[#f0f7f0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>

    </div>
  );
}