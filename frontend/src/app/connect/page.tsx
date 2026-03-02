"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

type LinkTokenResponse = {
  link_token: string;
};

type LinkedItem = {
  id: string;
  item_id: string;
  institution_name?: string | null;
  institution_id?: string | null;
  created_at?: string;
};

export default function ConnectPage() {
  const { token, ready } = useAuth();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [linked, setLinked] = useState<LinkedItem[]>([]);

  // Backend GET /plaid/linked returns a LIST (response_model=list[LinkedAccountOut])
  async function loadLinked() {
    if (!token) return;
    const items = await apiFetch<LinkedItem[]>("/plaid/linked", { token });
    setLinked(items);
  }

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      window.location.href = "/login";
      return;
    }

    (async () => {
      setStatus("Preparing Plaid Link...");
      const res = await apiFetch<LinkTokenResponse>("/plaid/link-token", {
        method: "POST",
        token,
      });
      setLinkToken(res.link_token);
      setStatus("");
      await loadLinked();
    })().catch((e: any) => {
      console.error("Connect page init failed:", e);
      setStatus(e.message ?? "Failed to create link token");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token]);

  const onSuccess = useMemo(
    () => async (public_token: string) => {
      if (!token) return;
      try {
        setStatus("Link successful. Securing connection...");
        await apiFetch("/plaid/exchange", {
          method: "POST",
          token,
          body: { public_token },
        });
        setStatus("Bank connected ✅");
        await loadLinked();
      } catch (e: any) {
        console.error("Exchange failed:", e);
        setStatus(e.message ?? "Failed to exchange token");
      }
    },
    [token]
  );

  const { open, ready: plaidReady } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess,
    onExit: (err) => {
      if (err) {
        setStatus(err.display_message || err.error_message || "Plaid exited");
      } else {
        setStatus("");
      }
    },
  });

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Connect your bank</h1>
        <a href="/dashboard">Back to dashboard</a>
      </div>

      <p style={{ marginTop: 10, color: "#666" }}>
        Securely connect accounts via Plaid. Your credentials are never stored in
        this app.
      </p>

      <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
        <button
          onClick={() => open()}
          disabled={!plaidReady || !linkToken}
          style={{ padding: "10px 14px" }}
        >
          {linkToken ? "Open Plaid Link" : "Loading..."}
        </button>
        {status ? <div style={{ paddingTop: 10 }}>{status}</div> : null}
      </div>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Linked institutions</h2>
        {linked.length === 0 ? (
          <p style={{ marginTop: 8, color: "#666" }}>
            None yet. Connect your first bank above.
          </p>
        ) : (
          <ul style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {linked.map((x) => (
              <li
                key={x.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {x.institution_name ?? "Institution"}
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  Item: {x.item_id}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}