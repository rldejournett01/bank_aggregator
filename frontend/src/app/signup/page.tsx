"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.SubmitEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await apiFetch<{ message: string }>("/auth/signup", {
        method: "POST",
        body: { email, password },
      });
      setMsg("Account created. You can now log in.");
    } catch (err: any) {
      setMsg(err.message ?? "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Create account</h1>
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
          {busy ? "Creating..." : "Sign up"}
        </button>
      </form>
      {msg ? <p style={{ marginTop: 12 }}>{msg}</p> : null}
      <p style={{ marginTop: 12 }}>
        Already have an account? <a href="/login">Log in</a>
      </p>
    </main>
  );
}