"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch, getErrorMessage } from "@/lib/api";
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    ReferenceLine,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type BillItem = { name: string; amount: number; frequency: string; category: string | null };
type IncomeItem = { source: string; amount: number; frequency: string };
type BillsData = {
    monthly_bills_total: number; annual_bills_total: number;
    stable_income_monthly: number; surplus_deficit: number;
    bills: BillItem[]; income_sources: IncomeItem[];
};
type LiquidityData = {
    current_ratio: number | null; cash_buffer_months: number | null;
    total_liquid: number; total_monthly_obligations: number;
    solvency_score: number; solvency_label: string; insights: string[];
};
type DebtItem = { account_name: string; balance: number; account_type: string; estimated_monthly_payment: number | null };
type DebtData = {
    total_debt: number; debt_to_income_ratio: number | null;
    monthly_debt_payments: number; payoff_months_estimate: number | null;
    items: DebtItem[]; insights: string[];
};
type ProfitPeriod = { period: string; income: number; expenses: number; net: number; savings_rate: number | null };
type ProfitData = {
    avg_monthly_net: number; avg_savings_rate: number | null; trend: string;
    periods: ProfitPeriod[]; insights: string[];
};
type ForecastPoint = {
    label: string; months_out: number; projected_balance: number;
    projected_savings_accumulated: number; scenario_low: number; scenario_high: number;
};
type ForecastData = {
    monthly_surplus: number; annual_surplus: number;
    points: ForecastPoint[]; assumptions: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtK = (n: number) =>
    Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

function ScoreRing({ score, label }: { score: number; label: string }) {
    const r = 36;
    const circ = 2 * Math.PI * r;
    const filled = (score / 100) * circ;
    const color = score >= 70 ? "#1a7a1a" : score >= 40 ? "#b5860d" : "#e5484d";
    return (
        <div className="flex flex-col items-center gap-1">
            <svg width="88" height="88" viewBox="0 0 88 88">
                <circle cx="44" cy="44" r={r} fill="none" stroke="#e8f2e8" strokeWidth="7" />
                <circle
                    cx="44" cy="44" r={r} fill="none"
                    stroke={color} strokeWidth="7"
                    strokeDasharray={`${filled} ${circ - filled}`}
                    strokeLinecap="round"
                    transform="rotate(-90 44 44)"
                    style={{ transition: "stroke-dasharray 1s ease" }}
                />
                <text x="44" y="49" textAnchor="middle" fontSize="18" fontWeight="600" fill={color}
                    fontFamily="'DM Mono', monospace">{score}</text>
            </svg>
            <span className="text-[10px] tracking-widest uppercase font-semibold" style={{ color }}>{label}</span>
        </div>
    );
}

function SurplusGauge({ surplus, income }: { surplus: number; income: number }) {
    const pct = income > 0 ? Math.min(Math.max((surplus / income) * 100, -100), 100) : 0;
    const isPositive = surplus >= 0;
    return (
        <div className="w-full">
            <div className="flex justify-between text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-2">
                <span>Below water</span>
                <span>Above water</span>
            </div>
            <div className="relative h-3 bg-[#f0f7f0] rounded-full overflow-hidden border border-[#d4e8d4]">
                <div className="absolute inset-y-0 left-1/2 w-px bg-[#c8dcc8]" />
                <div
                    className="absolute inset-y-0 rounded-full transition-all duration-700"
                    style={{
                        background: isPositive ? "#1a7a1a" : "#e5484d",
                        left: isPositive ? "50%" : `${50 + pct / 2}%`,
                        right: isPositive ? `${50 - pct / 2}%` : "50%",
                    }}
                />
            </div>
            <div className="mt-2 text-center">
                <span
                    className="text-sm font-semibold font-['DM_Mono',monospace]"
                    style={{ color: isPositive ? "#1a7a1a" : "#e5484d" }}
                >
                    {isPositive ? "+" : ""}${fmt(surplus)}/mo
                </span>
                <span className="text-[10px] text-[#8aaa8a] ml-2">
                    {isPositive ? "above water" : "below water"}
                </span>
            </div>
        </div>
    );
}

function PremiumGate({ feature, onUpgrade }: { feature: string; onUpgrade?: () => void }) {
    return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl"
            style={{ background: "rgba(247,250,247,0.85)", backdropFilter: "blur(6px)" }}>
            <div className="text-center px-8">
                <div className="w-10 h-10 rounded-full bg-[#eaf4ea] border border-[#b8d8b8] flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-[#1a7a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <p className="text-sm font-semibold text-[#0d1f0d] mb-1">{feature}</p>
                <p className="text-xs text-[#4a7a4a] mb-4">Upgrade to Cashism Premium to unlock this insight.</p>
                <button
                    onClick={onUpgrade}
                    className="px-5 py-2 bg-[#1a7a1a] text-white text-xs font-semibold tracking-widest uppercase rounded hover:bg-[#155e15] transition-colors"
                >
                    Upgrade →
                </button>
            </div>
        </div>
    );
}

function InsightPill({ text }: { text: string }) {
    return (
        <div className="flex items-start gap-2.5 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1a7a1a] mt-1.5 flex-shrink-0" />
            <span className="text-xs text-[#4a7a4a] leading-relaxed">{text}</span>
        </div>
    );
}

function SectionHeader({ label, title, free }: { label: string; title: string; free?: boolean }) {
    return (
        <div className="flex items-center justify-between mb-5">
            <div>
                <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-0.5">{label}</p>
                <h2 className="text-lg font-semibold text-[#0d1f0d]">{title}</h2>
            </div>
            {free !== undefined && (
                <span className={`text-[9px] tracking-widest uppercase font-semibold px-2.5 py-1 rounded-full border ${free
                        ? "text-[#1a7a1a] border-[#b8d8b8] bg-[#eaf4ea]"
                        : "text-[#b5860d] border-[#f5d68a] bg-[#fefce8]"
                    }`}>
                    {free ? "Free" : "Premium"}
                </span>
            )}
        </div>
    );
}

type ChartTooltipProps = {
    active?: boolean;
    label?: string | number;
    payload?: Array<{ name?: string; value?: number; color?: string }>;
};

const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-[#c8dcc8] rounded-lg px-3 py-2 text-xs shadow-sm">
            <p className="font-semibold text-[#0d1f0d] mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={`${p.name}-${i}`} style={{ color: p.color }}>{p.name}: {fmtK(p.value ?? 0)}</p>
            ))}
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalysisPage() {
    const { authed, ready } = useAuth();

    const [bills, setBills] = useState<BillsData | null>(null);
    const [liquidity, setLiquidity] = useState<LiquidityData | null>(null);
    const [debt, setDebt] = useState<DebtData | null>(null);
    const [profit, setProfit] = useState<ProfitData | null>(null);
    const [forecast, setForecast] = useState<ForecastData | null>(null);

    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"overview" | "deep" | "forecast">("overview");
    const [activeForecastIdx, setActiveForecastIdx] = useState(0);

    useEffect(() => {
        if (!ready) return;
        if (!authed) { window.location.href = "/login"; return; }

        async function load() {
            setLoading(true);
            try {
                const [b, l] = await Promise.all([
                    apiFetch<BillsData>("/analysis/bills"),
                    apiFetch<LiquidityData>("/analysis/liquidity"),
                ]);
                setBills(b);
                setLiquidity(l);

                // Read premium status from the user profile
                const meData = await apiFetch<{ is_premium: boolean }>("/users/me");
                setIsPremium(meData.is_premium);

                if (meData.is_premium) {
                    const [d, p, f] = await Promise.all([
                        apiFetch<DebtData>("/analysis/debt"),
                        apiFetch<ProfitData>("/analysis/profitability"),
                        apiFetch<ForecastData>("/analysis/forecast"),
                    ]);
                    setDebt(d);
                    setProfit(p);
                    setForecast(f);
                }
            } catch (e) {
                console.error("Analysis load failed:", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [ready, authed]);

    // Handle return from Stripe Checkout: confirm the session, then refresh.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("checkout") !== "success") return;
        const sid = params.get("session_id");
        const finish = () => {
            window.history.replaceState({}, "", "/analysis");
            window.location.reload();
        };
        if (sid) {
            apiFetch(`/billing/verify?session_id=${encodeURIComponent(sid)}`, { method: "POST" })
                .catch(() => {})
                .finally(finish);
        } else {
            finish();
        }
    }, []);

    async function upgrade() {
        try {
            const res = await apiFetch<{ url: string }>("/billing/checkout", { method: "POST" });
            window.location.href = res.url;
        } catch (e) {
            alert(getErrorMessage(e, "Upgrade is currently unavailable."));
        }
    }

    if (!ready || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-3 text-[#4a7a4a]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1a7a1a] animate-bounce" />
                    <span className="text-xs tracking-widest uppercase">Analyzing your finances…</span>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "deep", label: "Deep Analysis" },
        { id: "forecast", label: "Forecast" },
    ] as const;

    return (
        <div className="space-y-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>

            {/* Page header */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-1">Financial Intelligence</p>
                    <h1 className="text-2xl font-light text-[#0d1f0d] tracking-tight">
                        Your <span className="font-semibold">analysis</span>
                    </h1>
                </div>
                <Link href="/dashboard" className="flex items-center gap-2 text-xs font-medium text-[#4a7a4a] hover:text-[#0d1f0d] transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Dashboard
                </Link>
            </div>

            {/* Tab bar */}
            <div className="flex gap-0 border-b border-[#d4e8d4]">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-5 py-3 text-xs font-semibold tracking-widest uppercase transition-colors border-b-2 -mb-px ${activeTab === tab.id
                                ? "text-[#1a7a1a] border-[#1a7a1a]"
                                : "text-[#8aaa8a] border-transparent hover:text-[#4a7a4a]"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
            {activeTab === "overview" && (
                <div className="space-y-6">

                    {/* Water level hero */}
                    {bills && (
                        <div className="bg-white rounded-xl border border-[#c8dcc8] px-8 py-7">
                            <SectionHeader label="Free · Cash Flow" title="Above or below water?" free={true} />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">

                                {/* Income vs Bills */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Stable Income</p>
                                            <p className="text-2xl font-light text-[#1a7a1a] font-['DM_Mono',monospace] mt-0.5">
                                                ${fmt(bills.stable_income_monthly)}<span className="text-sm text-[#8aaa8a]">/mo</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Monthly Bills</p>
                                            <p className="text-2xl font-light text-[#e5484d] font-['DM_Mono',monospace] mt-0.5">
                                                ${fmt(bills.monthly_bills_total)}<span className="text-sm text-[#8aaa8a]">/mo</span>
                                            </p>
                                        </div>
                                    </div>
                                    <SurplusGauge surplus={bills.surplus_deficit} income={bills.stable_income_monthly} />
                                </div>

                                {/* Bills breakdown */}
                                <div className="md:col-span-2">
                                    <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-3">Detected recurring bills</p>
                                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                        {bills.bills.length === 0 ? (
                                            <p className="text-xs text-[#8aaa8a]">No recurring bills detected yet.</p>
                                        ) : bills.bills.map((b, i) => (
                                            <div key={`${b.name}-${i}`} className="flex items-center justify-between py-2 border-b border-[#f0f7f0] last:border-0">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#c8dcc8]" />
                                                    <span className="text-xs text-[#0d1f0d]">{b.name}</span>
                                                    {b.category && (
                                                        <span className="text-[9px] tracking-widest uppercase text-[#8aaa8a] bg-[#f0f7f0] px-1.5 py-0.5 rounded">
                                                            {b.category}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs font-semibold text-[#e5484d] font-['DM_Mono',monospace]">
                                                    −${fmt(b.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-[#d4e8d4] flex justify-between">
                                        <span className="text-xs text-[#4a7a4a]">Annual bills estimate</span>
                                        <span className="text-xs font-semibold font-['DM_Mono',monospace] text-[#0d1f0d]">
                                            ${fmt(bills.annual_bills_total)}/yr
                                        </span>
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* Liquidity & Solvency */}
                    {liquidity && (
                        <div className="bg-white rounded-xl border border-[#c8dcc8] px-8 py-7">
                            <SectionHeader label="Free · Financial Health" title="Liquidity & Solvency" free={true} />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

                                <div className="flex flex-col items-center gap-4">
                                    <ScoreRing score={liquidity.solvency_score} label={liquidity.solvency_label} />
                                    <div className="w-full space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Liquid assets</span>
                                            <span className="text-xs font-semibold font-['DM_Mono',monospace] text-[#0d1f0d]">
                                                ${fmt(liquidity.total_liquid)}
                                            </span>
                                        </div>
                                        {liquidity.cash_buffer_months !== null && (
                                            <div className="flex justify-between">
                                                <span className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Cash runway</span>
                                                <span className="text-xs font-semibold font-['DM_Mono',monospace] text-[#0d1f0d]">
                                                    {liquidity.cash_buffer_months} mo
                                                </span>
                                            </div>
                                        )}
                                        {liquidity.current_ratio !== null && (
                                            <div className="flex justify-between">
                                                <span className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Current ratio</span>
                                                <span className="text-xs font-semibold font-['DM_Mono',monospace] text-[#0d1f0d]">
                                                    {liquidity.current_ratio}×
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-3">Insights</p>
                                    <div className="divide-y divide-[#f0f7f0]">
                                        {liquidity.insights.map((ins, i) => <InsightPill key={i} text={ins} />)}
                                        {liquidity.insights.length === 0 && (
                                            <p className="text-xs text-[#8aaa8a]">No insights available yet.</p>
                                        )}
                                    </div>

                                    {/* Cash buffer bar */}
                                    {liquidity.cash_buffer_months !== null && (
                                        <div className="mt-6">
                                            <div className="flex justify-between text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-2">
                                                <span>0 months</span>
                                                <span>Target: 6 months</span>
                                            </div>
                                            <div className="h-2.5 bg-[#f0f7f0] rounded-full overflow-hidden border border-[#d4e8d4]">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${Math.min((liquidity.cash_buffer_months / 6) * 100, 100)}%`,
                                                        background: liquidity.cash_buffer_months >= 6 ? "#1a7a1a"
                                                            : liquidity.cash_buffer_months >= 3 ? "#4aaa4a" : "#b5860d",
                                                    }}
                                                />
                                            </div>
                                            <p className="mt-1 text-[10px] text-[#8aaa8a]">
                                                {liquidity.cash_buffer_months} of 6 recommended months covered
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            )}

            {/* ── DEEP ANALYSIS TAB ────────────────────────────────────────────── */}
            {activeTab === "deep" && (
                <div className="space-y-6">

                    {/* Debt Management */}
                    <div className="relative bg-white rounded-xl border border-[#c8dcc8] px-8 py-7 overflow-hidden">
                        {!isPremium && <PremiumGate feature="Debt Management" onUpgrade={upgrade} />}
                        <SectionHeader label="Premium · Obligations" title="Debt Management" free={false} />
                        {debt ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Total debt</p>
                                        <p className="text-3xl font-light text-[#e5484d] font-['DM_Mono',monospace] mt-1">
                                            ${fmt(debt.total_debt)}
                                        </p>
                                    </div>
                                    {debt.debt_to_income_ratio !== null && (
                                        <div>
                                            <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Debt-to-income</p>
                                            <p className="text-xl font-semibold text-[#0d1f0d] font-['DM_Mono',monospace] mt-0.5">
                                                {(debt.debt_to_income_ratio * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                    )}
                                    {debt.payoff_months_estimate && (
                                        <div>
                                            <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Est. payoff</p>
                                            <p className="text-xl font-semibold text-[#0d1f0d] font-['DM_Mono',monospace] mt-0.5">
                                                {debt.payoff_months_estimate} months
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="md:col-span-2 space-y-4">
                                    <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Debt accounts</p>
                                    {debt.items.map((d, i) => (
                                        <div key={`${d.account_name}-${i}`} className="flex items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-xs font-medium text-[#0d1f0d] truncate">{d.account_name}</span>
                                                    <span className="text-xs font-semibold font-['DM_Mono',monospace] text-[#e5484d] ml-2">${fmt(d.balance)}</span>
                                                </div>
                                                <div className="h-1.5 bg-[#f0f7f0] rounded-full">
                                                    <div
                                                        className="h-full rounded-full bg-[#e5484d] opacity-70"
                                                        style={{ width: `${Math.min((d.balance / debt.total_debt) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-3 border-t border-[#d4e8d4] divide-y divide-[#f0f7f0]">
                                        {debt.insights.map((ins, i) => <InsightPill key={i} text={ins} />)}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-40" />
                        )}
                    </div>

                    {/* Profitability & Growth */}
                    <div className="relative bg-white rounded-xl border border-[#c8dcc8] px-8 py-7 overflow-hidden">
                        {!isPremium && <PremiumGate feature="Profitability & Growth" onUpgrade={upgrade} />}
                        <SectionHeader label="Premium · Trajectory" title="Profitability & Growth" free={false} />
                        {profit ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Avg monthly net</p>
                                        <p className={`text-2xl font-light font-['DM_Mono',monospace] mt-1 ${profit.avg_monthly_net >= 0 ? "text-[#1a7a1a]" : "text-[#e5484d]"}`}>
                                            {profit.avg_monthly_net >= 0 ? "+" : ""}${fmt(profit.avg_monthly_net)}
                                        </p>
                                    </div>
                                    {profit.avg_savings_rate !== null && (
                                        <div>
                                            <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Avg savings rate</p>
                                            <p className="text-2xl font-light text-[#0d1f0d] font-['DM_Mono',monospace] mt-1">
                                                {(profit.avg_savings_rate * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Trend</p>
                                        <p className={`text-2xl font-light mt-1 capitalize ${profit.trend === "improving" ? "text-[#1a7a1a]"
                                                : profit.trend === "declining" ? "text-[#e5484d]" : "text-[#0d1f0d]"
                                            }`}>
                                            {profit.trend === "improving" ? "↑" : profit.trend === "declining" ? "↓" : "→"} {profit.trend}
                                        </p>
                                    </div>
                                </div>

                                {profit.periods.length > 0 && (
                                    <div className="h-52">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={profit.periods} barGap={2}>
                                                <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#8aaa8a" }} axisLine={false} tickLine={false} />
                                                <YAxis tickFormatter={fmtK} tick={{ fontSize: 9, fill: "#8aaa8a" }} axisLine={false} tickLine={false} width={40} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <ReferenceLine y={0} stroke="#d4e8d4" />
                                                <Bar dataKey="income" name="Income" fill="#b8d8b8" radius={[2, 2, 0, 0]} />
                                                <Bar dataKey="expenses" name="Expenses" fill="#fca5a5" radius={[2, 2, 0, 0]} />
                                                <Bar dataKey="net" name="Net" radius={[2, 2, 0, 0]}>
                                                    {profit.periods.map((p, i) => (
                                                        <Cell key={i} fill={p.net >= 0 ? "#1a7a1a" : "#e5484d"} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                <div className="divide-y divide-[#f0f7f0]">
                                    {profit.insights.map((ins, i) => <InsightPill key={i} text={ins} />)}
                                </div>
                            </div>
                        ) : (
                            <div className="h-64" />
                        )}
                    </div>

                </div>
            )}

            {/* ── FORECAST TAB ──────────────────────────────────────────────────── */}
            {activeTab === "forecast" && (
                <div className="space-y-6">
                    <div className="relative bg-white rounded-xl border border-[#c8dcc8] px-8 py-7 overflow-hidden">
                        {!isPremium && <PremiumGate feature="Financial Forecast" onUpgrade={upgrade} />}
                        <SectionHeader label="Premium · Projection" title="Where will you be?" free={false} />

                        {forecast ? (
                            <div className="space-y-8">

                                {/* Surplus headline */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Monthly surplus</p>
                                        <p className={`text-3xl font-light font-['DM_Mono',monospace] mt-1 ${forecast.monthly_surplus >= 0 ? "text-[#1a7a1a]" : "text-[#e5484d]"}`}>
                                            {forecast.monthly_surplus >= 0 ? "+" : ""}${fmt(forecast.monthly_surplus)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Annual surplus</p>
                                        <p className={`text-3xl font-light font-['DM_Mono',monospace] mt-1 ${forecast.annual_surplus >= 0 ? "text-[#1a7a1a]" : "text-[#e5484d]"}`}>
                                            {forecast.annual_surplus >= 0 ? "+" : ""}${fmt(forecast.annual_surplus)}
                                        </p>
                                    </div>
                                </div>

                                {/* Horizon selector */}
                                <div>
                                    <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-3">Select horizon</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {forecast.points.map((pt, i) => (
                                            <button
                                                key={pt.label}
                                                onClick={() => setActiveForecastIdx(i)}
                                                className={`px-4 py-2 rounded text-xs font-semibold tracking-widest uppercase transition-colors ${activeForecastIdx === i
                                                        ? "bg-[#1a7a1a] text-white"
                                                        : "bg-[#f0f7f0] text-[#4a7a4a] hover:bg-[#eaf4ea] border border-[#d4e8d4]"
                                                    }`}
                                            >
                                                {pt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Active horizon card */}
                                {forecast.points[activeForecastIdx] && (() => {
                                    const pt = forecast.points[activeForecastIdx];
                                    const isPos = pt.projected_balance >= 0;
                                    return (
                                        <div className="bg-[#f7faf7] rounded-xl border border-[#d4e8d4] px-6 py-6">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div>
                                                    <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Projected balance</p>
                                                    <p className={`text-4xl font-light font-['DM_Mono',monospace] mt-1 ${isPos ? "text-[#1a7a1a]" : "text-[#e5484d]"}`}>
                                                        ${fmt(pt.projected_balance)}
                                                    </p>
                                                    <p className="text-[10px] text-[#8aaa8a] mt-1">in {pt.label}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Savings accumulated</p>
                                                    <p className="text-2xl font-light text-[#0d1f0d] font-['DM_Mono',monospace] mt-1">
                                                        ${fmt(pt.projected_savings_accumulated)}
                                                    </p>
                                                </div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Conservative</p>
                                                        <p className="text-lg font-light text-[#4a7a4a] font-['DM_Mono',monospace]">${fmt(pt.scenario_low)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a]">Optimistic</p>
                                                        <p className="text-lg font-light text-[#1a7a1a] font-['DM_Mono',monospace]">${fmt(pt.scenario_high)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Scenario range bar */}
                                            <div className="mt-6">
                                                <div className="flex justify-between text-[10px] text-[#8aaa8a] mb-1.5">
                                                    <span>Conservative: ${fmtK(pt.scenario_low)}</span>
                                                    <span>Optimistic: ${fmtK(pt.scenario_high)}</span>
                                                </div>
                                                <div className="h-2 bg-[#e8f2e8] rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            marginLeft: "0%",
                                                            width: "100%",
                                                            background: "linear-gradient(90deg, #b8d8b8, #1a7a1a)",
                                                        }}
                                                    />
                                                </div>
                                                <div
                                                    className="w-3 h-3 rounded-full bg-[#0d1f0d] border-2 border-white shadow-sm -mt-2.5 transition-all duration-300"
                                                    style={{
                                                        marginLeft: `calc(${Math.min(
                                                            ((pt.projected_balance - pt.scenario_low) /
                                                                Math.max(pt.scenario_high - pt.scenario_low, 1)) * 100, 100
                                                        )}% - 6px)`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* All horizons mini chart */}
                                <div className="h-48">
                                    <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-3">All horizons — projected balance</p>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={forecast.points}>
                                            <defs>
                                                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#1a7a1a" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#1a7a1a" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#8aaa8a" }} axisLine={false} tickLine={false} />
                                            <YAxis tickFormatter={fmtK} tick={{ fontSize: 9, fill: "#8aaa8a" }} axisLine={false} tickLine={false} width={44} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone" dataKey="projected_balance" name="Projected"
                                                stroke="#1a7a1a" strokeWidth={2} fill="url(#forecastGrad)"
                                                dot={{ r: 4, fill: "#1a7a1a", strokeWidth: 0 }}
                                            />
                                            <Area
                                                type="monotone" dataKey="scenario_low" name="Low"
                                                stroke="#b8d8b8" strokeWidth={1} fill="none" strokeDasharray="4 2"
                                            />
                                            <Area
                                                type="monotone" dataKey="scenario_high" name="High"
                                                stroke="#4aaa4a" strokeWidth={1} fill="none" strokeDasharray="4 2"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Assumptions */}
                                <div className="pt-4 border-t border-[#d4e8d4]">
                                    <p className="text-[10px] tracking-widest uppercase text-[#8aaa8a] mb-3">Assumptions</p>
                                    <div className="divide-y divide-[#f0f7f0]">
                                        {forecast.assumptions.map((a, i) => <InsightPill key={i} text={a} />)}
                                    </div>
                                </div>

                            </div>
                        ) : (
                            <div className="h-96" />
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}