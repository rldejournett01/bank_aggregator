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
      const res = await apiFetch<AccountTxResponse>(
        `/accounts/${accountId}/transactions?limit=${limit}&offset=${offset}`,
        { token }
      );
      setData(res);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load account transactions");
    } finally {
      setBusy(false);
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