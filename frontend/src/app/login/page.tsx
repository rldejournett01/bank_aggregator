"use client";

import { useState } from "react";
import { apiForm } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type TokenResponse = { access_token: string; token_type: string };

export default function LoginPage() {
  const { setToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.SubmitEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await apiForm<TokenResponse>("/auth/login", {
        username: email,      // IMPORTANT: FastAPI expects "username"
        password: password,
      });
      setToken(res.access_token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setMsg(err.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Log in</h1>
      <form onSubmit={submit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10 }}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10 }}
        />
        <button disabled={busy} style={{ padding: 10 }}>
          {busy ? "Signing in..." : "Log in"}
        </button>
      </form>
      {msg ? <p style={{ marginTop: 12 }}>{msg}</p> : null}
      <p style={{ marginTop: 12 }}>
        No account? <a href="/signup">Create one</a>
      </p>
    </main>
  );
}