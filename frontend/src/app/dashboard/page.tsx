"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

export default function DashboardPage() {
  const { token, ready, logout } = useAuth();
  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {

    if(!ready) return; //wait until token is loaded from storage

    if (!token) {
      window.location.href = "/login";
      return;
    }
    
    apiFetch("/users/me", { token })
      .then(setMe)
      .catch((e) => {
        // If token is invalid/expired, log out and redirect
        setErr(e.message ?? "Failed to load user");
        logout();
        window.location.href = "/login";
      });
  }, [ready, token, logout]);

  if (!ready) return <main style={{ padding: 24 }}>Loading...</main>;

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Dashboard</h1>
        <button
          onClick={() => {
            logout();
            window.location.href = "/login";
          }}
        >
          Logout
        </button>
      </div>

      {err ? <p style={{ marginTop: 12, color: "crimson" }}>{err}</p> : null}
      {!me ? (
        <p style={{ marginTop: 12 }}>Loading...</p>
      ) : (
        <div style={{ marginTop: 16 }}>
          <p>Logged in as: {me.email}</p>
          <p>User id: {me.id}</p>
          <p style={{ marginTop: 16 }}>
            Next: <a href="/connect">Connect your bank</a>
          </p>
        </div>
      )}
    </main>
  );
}