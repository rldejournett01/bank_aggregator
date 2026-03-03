"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
  const [busy, setBusy] = useState<boolean>(false);

  const [categoryData, setCategoryData] = useState<
    { category: string; total: string }[]
  >([]);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");

  const [limit] = useState<number>(50);
  const [offset, setOffset] = useState<number>(0);

  // -------------------------------------------------
  // Load Transactions
  // -------------------------------------------------
  async function load() {
    if (!token || !hasValidAccountId) return;

    setBusy(true);
    setErr(null);

    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (searchText) params.append("search", searchText);

      const res = await apiFetch<AccountTxResponse>(
        `/accounts/${accountId}/transactions?${params.toString()}`,
        { token }
      );

      setData(res);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load transactions");
    } finally {
      setBusy(false);
    }
  }

  // -------------------------------------------------
  // Load Category Summary
  // -------------------------------------------------
  async function loadCategorySummary() {
    if (!token || !hasValidAccountId) return;

    try {
      const res = await apiFetch<
        { category: string; total: string }[]
      >(`/accounts/${accountId}/category-summary`, { token });

      setCategoryData(res);
    } catch (e) {
      console.error("Failed to load category summary", e);
    }
  }

  // -------------------------------------------------
  // Delete Account
  // -------------------------------------------------
  async function deleteAccount() {
    if (!token || !accountId) return;

    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this account and all its transactions?"
    );

    if (!confirmed) return;

    try {
      await apiFetch(`/accounts/${accountId}`, {
        method: "DELETE",
        token,
      });

      window.location.href = "/dashboard";
    } catch (e: any) {
      alert(e.message ?? "Failed to delete account");
    }
  }

  // -------------------------------------------------
  // Effects
  // -------------------------------------------------
  useEffect(() => {
    if (!ready) return;

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!hasValidAccountId) {
      setErr("Invalid account id.");
      return;
    }

    load();
    loadCategorySummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, accountId, offset]);

  // -------------------------------------------------
  // Chart Data (Only Expenses)
  // -------------------------------------------------
  const chartData = categoryData
    .filter((c) => Number(c.total) < 0) // only expenses
    .map((c) => ({
      name: c.category,
      value: Math.abs(Number(c.total)),
    }));

  if (!ready) return <main style={{ padding: 24 }}>Loading...</main>;

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>
            {data?.account?.name ?? "Account"}
          </h1>
          {data?.account && (
            <div style={{ color: "#666", marginTop: 6 }}>
              {data.account.institution} • {data.account.account_type} • Balance: $
              {data.account.balance}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={deleteAccount}
            style={{
              padding: "8px 12px",
              backgroundColor: "#e5484d",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Delete
          </button>

          <a href="/dashboard">Back</a>

          <button
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}
      {busy && <p>Loading…</p>}

      {/* Filters */}
      <div
        style={{
          marginTop: 20,
          padding: 16,
          border: "1px solid #eee",
          borderRadius: 8,
        }}
      >
        <h3>Filters</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <input
            type="text"
            placeholder="Search description..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <button
            onClick={() => {
              setOffset(0);
              load();
              loadCategorySummary();
            }}
          >
            Apply
          </button>
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setSearchText("");
              setOffset(0);
              load();
              loadCategorySummary();
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Category Chart */}
      {chartData.length > 0 && (
        <div
          style={{
            marginTop: 30,
            padding: 20,
            border: "1px solid #eee",
            borderRadius: 10,
          }}
        >
          <h3>Spending by Category</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                />
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Transactions */}
      {data?.transactions?.length === 0 ? (
        <p style={{ marginTop: 20 }}>No transactions found.</p>
      ) : (
        <ul style={{ marginTop: 20, display: "grid", gap: 10 }}>
          {data?.transactions?.map((t) => {
            const amount = Number(t.amount);
            const isExpense = amount < 0;

            return (
              <li
                key={t.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 700 }}>{t.description}</div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: isExpense ? "#e5484d" : "#2e7d32",
                    }}
                  >
                    ${t.amount}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: "#666" }}>
                  {t.transaction_type}
                  {t.created_at &&
                    ` • ${new Date(t.created_at).toLocaleString()}`}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}