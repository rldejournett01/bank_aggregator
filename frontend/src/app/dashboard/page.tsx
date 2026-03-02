"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

type Account = {
  id: string;
  name: string;
  institution: string;
  account_type: string;
  balance: string | number;
};

type DashboardResponse = {
  total_balance: string | number;
  accounts: Account[];
};

export default function DashboardPage() {
  const { token, ready, logout } = useAuth();

  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const [dash, setDash] = useState<DashboardResponse | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>("");

  async function loadDashboard(t: string) {
    const d = await apiFetch<DashboardResponse>("/dashboard", { token: t });
    setDash(d);
  }

  async function syncNow() {
    if (!token) return;
    setSyncStatus("Syncing...");
    try {
      await apiFetch("/plaid/sync", { method: "POST", token });
      await loadDashboard(token);
      setSyncStatus("Synced ✅");
    } catch (e: any) {
      setSyncStatus(e.message ?? "Sync failed");
    }
  }

  useEffect(() => {
    if (!ready) return;

    if (!token) {
      window.location.href = "/login";
      return;
    }

    // Load profile
    apiFetch("/users/me", { token })
      .then(setMe)
      .catch((e) => {
        setErr(e.message ?? "Failed to load user");
        logout();
        window.location.href = "/login";
      });

    // Load dashboard data
    loadDashboard(token).catch((e: any) => {
      console.error("Failed to load dashboard:", e);
      // Keep the page usable even if dashboard endpoint fails
      setDash({ total_balance: 0, accounts: [] });
    });
  }, [ready, token, logout]);

  if (!ready) return <main style={{ padding: 24 }}>Loading...</main>;

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Dashboard</h1>
          {me ? (
            <p style={{ marginTop: 6, color: "#666" }}>Signed in as {me.email}</p>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/connect">Connect bank</a>
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

      {err ? <p style={{ marginTop: 12, color: "crimson" }}>{err}</p> : null}

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={syncNow} style={{ padding: "10px 14px" }}>
          Sync Now
        </button>
        {syncStatus ? <span>{syncStatus}</span> : null}
      </div>

      {!dash ? (
        <p style={{ marginTop: 12 }}>Loading dashboard…</p>
      ) : (
        <section style={{ marginTop: 18 }}>
          <div style={{ color: "#666", fontSize: 14 }}>Total balance</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>
            ${dash.total_balance}
          </div>

          <h2 style={{ marginTop: 18, fontSize: 18, fontWeight: 800 }}>
            Accounts
          </h2>

          {dash.accounts?.length ? (
            <ul style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {dash.accounts.map((a) => (
                <li
                  key={a.id}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                    {a.institution} • {a.account_type}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 18 }}>
                    ${a.balance}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ marginTop: 10, color: "#666" }}>
              No accounts yet. Click <b>Sync Now</b>.
            </p>
          )}
        </section>
      )}
    </main>
  );
}