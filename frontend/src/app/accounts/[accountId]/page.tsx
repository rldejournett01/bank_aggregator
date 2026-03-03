"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

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

  // In Next.js App Router, useParams() returns route segments
  const accountId = useMemo(() => {
    const raw = params?.accountId;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw)) return raw[0];
    return "";
  }, [params]);

  const [data, setData] = useState<AccountTxResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  // 🔹 Filter state
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");

  // Basic pagination (limit/offset). Later: cursor pagination
  const [limit] = useState<number>(50);
  const [offset, setOffset] = useState<number>(0);

  // Simple guard: don't call the API with empty/undefined
  const hasValidAccountId = accountId && accountId !== "undefined";

  async function load() {
    if (!token) return;
    if (!hasValidAccountId) return;

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
      setErr(e.message ?? "Failed to load account transactions");
    } finally {
      setBusy(false);
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

      // Redirect to dashboard after deletion
      window.location.href = "/dashboard";
    } catch (e: any) {
      alert(e.message ?? "Failed to delete account");
    }
  }

  useEffect(() => {
    // Wait until auth loads token from localStorage
    if (!ready) return;

    // If not logged in, go to login
    if (!token) {
      window.location.href = "/login";
      return;
    }

    // If accountId is bad, show a friendly error instead of calling the API
    if (!hasValidAccountId) {
      setErr("Invalid account id (the link you clicked did not include an id). Go back and try again.");
      return;
    }

    load().catch((e) => console.error("Account detail load failed:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, accountId, offset]);

  if (!ready) return <main style={{ padding: 24 }}>Loading...</main>;

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>
            {data?.account?.name ?? "Account"}
            <button
              onClick={deleteAccount}
              style={{
                padding: "10px 12px",
                backgroundColor: "#e5484d",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Delete Account
            </button>
          </h1>

          {data?.account ? (
            <div style={{ color: "#666", marginTop: 6 }}>
              {data.account.institution} • {data.account.account_type} • Balance: $
              {data.account.balance}
            </div>
          ) : (
            <div style={{ color: "#666", marginTop: 6 }}>
              Account id: {accountId || "(missing)"}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/dashboard">Back</a>
          <button
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
            style={{ padding: "10px 12px" }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Error */}
      {err ? <p style={{ marginTop: 12, color: "crimson" }}>{err}</p> : null}

      {/* Loading */}
      {busy && !data ? <p style={{ marginTop: 12 }}>Loading transactions…</p> : null}

      {/* Content */}
      {data ? (
        <>
          {/* Pagination */}
          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              style={{ padding: "10px 12px" }}
            >
              Prev
            </button>

            <button
              disabled={data.pagination.returned < limit}
              onClick={() => setOffset((o) => o + limit)}
              style={{ padding: "10px 12px" }}
            >
              Next
            </button>

            <span style={{ color: "#666" }}>
              Showing {data.pagination.returned} (offset {offset})
            </span>
          </div>

          {/* -------------------------------------------------
    Filters
------------------------------------------------- */}
          <div
            style={{
              marginTop: 20,
              padding: 16,
              border: "1px solid #eee",
              borderRadius: 8,
              display: "grid",
              gap: 12,
            }}
          >
            <h3 style={{ margin: 0 }}>Filters</h3>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div>
                <label style={{ fontSize: 12 }}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 12 }}>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 12 }}>Search</label>
                <input
                  type="text"
                  placeholder="Search description..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
                <button
                  onClick={() => {
                    setOffset(0); // reset pagination
                    load();
                  }}
                  style={{ padding: "8px 12px" }}
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
                  }}
                  style={{ padding: "8px 12px" }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <h2 style={{ marginTop: 18, fontSize: 18, fontWeight: 800 }}>
            Transactions
          </h2>

          {data.transactions.length === 0 ? (
            <p style={{ marginTop: 10, color: "#666" }}>
              No transactions found for this account.
            </p>
          ) : (
            <ul style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {data.transactions.map((t) => (
                <li
                  key={t.id}
                  style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 800 }}>{t.description}</div>
                    <div style={{ fontWeight: 800 }}>${t.amount}</div>
                  </div>

                  <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                    {t.transaction_type}
                    {t.created_at ? ` • ${new Date(t.created_at).toLocaleString()}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </main>
  );
}