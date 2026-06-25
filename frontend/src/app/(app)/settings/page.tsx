"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

type Me = { id: string; email: string; created_at: string; is_premium: boolean };
type LinkedItem = {
  id: string;
  item_id: string;
  institution_name?: string | null;
  last_synced_at?: string | null;
  created_at?: string;
};

function Card({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-[#c8dcc8] px-8 py-7">
      <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-0.5">{label}</p>
      <h2 className="text-lg font-semibold text-[#0d1f0d] mb-5">{title}</h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { authed, ready, logout } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [linked, setLinked] = useState<LinkedItem[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // password form
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  // delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState("");

  async function load() {
    const [m, l] = await Promise.all([
      apiFetch<Me>("/users/me"),
      apiFetch<LinkedItem[]>("/plaid/linked").catch(() => [] as LinkedItem[]),
    ]);
    setMe(m);
    setLinked(l);
  }

  useEffect(() => {
    if (!ready) return;
    if (!authed) { window.location.href = "/login"; return; }
    load().catch((e) => setMsg({ kind: "err", text: e.message ?? "Failed to load settings" }));
  }, [ready, authed]);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPw !== confirmPw) { setMsg({ kind: "err", text: "New passwords do not match" }); return; }
    if (newPw.length < 8) { setMsg({ kind: "err", text: "New password must be at least 8 characters" }); return; }
    setPwBusy(true);
    try {
      await apiFetch("/auth/change-password", { method: "POST", body: { current_password: curPw, new_password: newPw } });
      setCurPw(""); setNewPw(""); setConfirmPw("");
      setMsg({ kind: "ok", text: "Password changed. Other devices have been signed out." });
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message ?? "Could not change password" });
    } finally {
      setPwBusy(false);
    }
  }

  async function signOutEverywhere() {
    try { await apiFetch("/auth/logout-all", { method: "POST" }); } catch {}
    window.location.href = "/login";
  }

  async function disconnect(item: LinkedItem) {
    const name = item.institution_name ?? "this institution";
    if (!window.confirm(`Disconnect ${name}? Its accounts and transactions will be removed and Plaid access revoked.`)) return;
    try {
      await apiFetch(`/plaid/linked/${encodeURIComponent(item.item_id)}`, { method: "DELETE" });
      setMsg({ kind: "ok", text: `${name} disconnected.` });
      await load();
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message ?? "Could not disconnect" });
    }
  }

  async function exportData() {
    try {
      const data = await apiFetch<unknown>("/users/me/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cashism-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message ?? "Export failed" });
    }
  }

  async function manageBilling() {
    try {
      const res = await apiFetch<{ url: string }>("/billing/portal", { method: "POST" });
      window.location.href = res.url;
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message ?? "Billing portal unavailable" });
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") return;
    try {
      await apiFetch("/users/me", { method: "DELETE" });
      await logout();
      window.location.href = "/login";
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message ?? "Could not delete account" });
    }
  }

  if (!ready || !me) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-[#4a7a4a]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1a7a1a] animate-bounce" />
          <span className="text-xs tracking-widest uppercase">Loading settings…</span>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full px-3 py-2 bg-[#f7faf7] border border-[#c8dcc8] rounded text-sm text-[#0d1f0d] focus:outline-none focus:border-[#1a7a1a] focus:ring-1 focus:ring-[#1a7a1a] transition-colors";

  return (
    <div className="space-y-6 max-w-3xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-1">Account</p>
          <h1 className="text-2xl font-light text-[#0d1f0d] tracking-tight">
            <span className="font-semibold">Settings</span>
          </h1>
        </div>
        <Link href="/dashboard" className="flex items-center gap-2 text-xs font-medium text-[#4a7a4a] hover:text-[#0d1f0d] transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </Link>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded border text-xs ${msg.kind === "err"
          ? "bg-[#fef2f2] border-[#fca5a5] text-[#991b1b]"
          : "bg-[#eaf4ea] border-[#b8d8b8] text-[#1a7a1a]"}`}>
          {msg.text}
        </div>
      )}

      {/* Profile */}
      <Card label="Profile" title="Your account">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-1">Email</p>
            <p className="text-[#0d1f0d]">{me.email}</p>
          </div>
          <div>
            <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-1">Member since</p>
            <p className="text-[#0d1f0d]">{new Date(me.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-1">Plan</p>
            <p className="text-[#0d1f0d]">{me.is_premium ? "Premium" : "Free"}</p>
          </div>
        </div>
        {me.is_premium && (
          <button onClick={manageBilling} className="mt-5 px-4 py-2 bg-white border border-[#c8dcc8] rounded text-xs font-semibold tracking-widest uppercase text-[#1a7a1a] hover:bg-[#eaf4ea] transition-colors">
            Manage billing
          </button>
        )}
      </Card>

      {/* Security */}
      <Card label="Security" title="Password & sessions">
        <form onSubmit={changePassword} className="space-y-3 max-w-sm">
          <input type="password" placeholder="Current password" value={curPw} onChange={(e) => setCurPw(e.target.value)} className={inputCls} autoComplete="current-password" />
          <input type="password" placeholder="New password (min 8 chars)" value={newPw} onChange={(e) => setNewPw(e.target.value)} className={inputCls} autoComplete="new-password" />
          <input type="password" placeholder="Confirm new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className={inputCls} autoComplete="new-password" />
          <button type="submit" disabled={pwBusy || !curPw || !newPw} className="px-4 py-2 bg-[#1a7a1a] text-white text-xs font-semibold tracking-widest uppercase rounded hover:bg-[#155e15] disabled:opacity-50 transition-colors">
            {pwBusy ? "Updating…" : "Change password"}
          </button>
        </form>
        <div className="mt-5 pt-5 border-t border-[#f0f7f0]">
          <button onClick={signOutEverywhere} className="text-xs font-semibold text-[#4a7a4a] hover:text-[#0d1f0d] transition-colors">
            Sign out of all devices →
          </button>
          <p className="text-[10px] text-[#8aaa8a] mt-1">Revokes every active session, including this one.</p>
        </div>
      </Card>

      {/* Connected institutions */}
      <Card label="Connections" title="Linked institutions">
        {linked.length === 0 ? (
          <p className="text-sm text-[#4a7a4a]">
            No banks connected. <Link href="/connect" className="text-[#1a7a1a] font-semibold">Connect one →</Link>
          </p>
        ) : (
          <div className="space-y-3">
            {linked.map((x) => (
              <div key={x.id} className="flex items-center gap-4 py-2 border-b border-[#f0f7f0] last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0d1f0d]">{x.institution_name ?? "Institution"}</p>
                  <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mt-0.5">
                    {x.last_synced_at ? `Last synced ${new Date(x.last_synced_at).toLocaleString()}` : "Not synced yet"}
                  </p>
                </div>
                <button onClick={() => disconnect(x)} className="px-3 py-1.5 rounded border border-[#fca5a5] text-xs font-semibold text-[#991b1b] hover:bg-[#fef2f2] transition-colors">
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-[#8aaa8a] mt-4">
          Disconnecting revokes Plaid&apos;s access to that bank and removes its accounts and transactions from Cashism.
        </p>
      </Card>

      {/* Data & privacy */}
      <Card label="Data & Privacy" title="Your data, your control">
        <div className="flex flex-wrap gap-3 mb-5">
          <button onClick={exportData} className="px-4 py-2 bg-white border border-[#c8dcc8] rounded text-xs font-semibold tracking-widest uppercase text-[#1a7a1a] hover:bg-[#eaf4ea] transition-colors">
            Export my data
          </button>
          <Link href="/privacy" className="px-4 py-2 bg-white border border-[#c8dcc8] rounded text-xs font-semibold tracking-widest uppercase text-[#4a7a4a] hover:bg-[#f0f7f0] transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="px-4 py-2 bg-white border border-[#c8dcc8] rounded text-xs font-semibold tracking-widest uppercase text-[#4a7a4a] hover:bg-[#f0f7f0] transition-colors">
            Terms of Service
          </Link>
        </div>
        <p className="text-[10px] text-[#8aaa8a]">
          Cashism is a read-only aggregator: we never move money and never sell your data. Export gives you a full copy in JSON.
        </p>
      </Card>

      {/* Danger zone */}
      <section className="bg-white rounded-xl border border-[#fca5a5] px-8 py-7">
        <p className="text-[10px] tracking-widest uppercase text-[#e5484d] mb-0.5">Danger zone</p>
        <h2 className="text-lg font-semibold text-[#0d1f0d] mb-2">Delete account</h2>
        <p className="text-sm text-[#4a7a4a] mb-4">
          Permanently deletes your account, disconnects all banks, and erases every account, transaction, and history record. This cannot be undone.
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder='Type DELETE to confirm'
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            className="px-3 py-2 bg-[#fef2f2] border border-[#fca5a5] rounded text-sm text-[#0d1f0d] focus:outline-none focus:border-[#e5484d] w-56"
          />
          <button
            onClick={deleteAccount}
            disabled={deleteConfirm !== "DELETE"}
            className="px-4 py-2 bg-[#e5484d] text-white text-xs font-semibold tracking-widest uppercase rounded hover:bg-[#c93b40] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Delete my account
          </button>
        </div>
      </section>
    </div>
  );
}
