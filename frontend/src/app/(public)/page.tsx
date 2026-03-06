"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f7faf7] font-['DM_Sans',sans-serif]">

      {/* Navbar */}
      <header className="border-b border-[#d4e8d4]">
        <nav className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1a7a1a] inline-block" />
            <span className="text-sm font-semibold tracking-widest uppercase text-[#0d1f0d]">
              Cashism
            </span>
          </div>

          <div className="hidden md:flex items-center gap-10 text-xs font-medium tracking-widest uppercase text-[#4a7a4a]">
            <Link href="#" className="hover:text-[#0d1f0d] transition-colors duration-200">Product</Link>
            <Link href="#" className="hover:text-[#0d1f0d] transition-colors duration-200">Features</Link>
            <Link href="#" className="hover:text-[#0d1f0d] transition-colors duration-200">Company</Link>
          </div>

          <Link
            href="/login"
            className="text-xs font-semibold tracking-widest uppercase text-[#1a7a1a] hover:text-[#0d1f0d] transition-colors duration-200"
          >
            Log in →
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-8 pt-28 pb-24 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div>
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full border border-[#b8d8b8] bg-[#eaf4ea] text-[10px] font-semibold tracking-widest uppercase text-[#2d6e2d]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2d6e2d] animate-pulse" />
            Bank Aggregator
          </div>

          <h1
            className="text-5xl font-light leading-[1.1] tracking-tight text-[#0d1f0d]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Every account.<br />
            <span className="font-semibold text-[#1a7a1a]">One view.</span>
          </h1>

          <p className="mt-6 text-[15px] leading-relaxed text-[#4a7a4a] max-w-sm font-light">
            Connect your banks securely. Track transactions. Understand where your money goes — from a single, quiet dashboard.
          </p>

          <div className="mt-10 flex items-center gap-5">
            <Link
              href="/signup"
              className="px-6 py-3 bg-[#1a7a1a] text-white text-xs font-semibold tracking-widest uppercase rounded hover:bg-[#155e15] transition-colors duration-200"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="text-xs font-semibold tracking-widest uppercase text-[#4a7a4a] hover:text-[#0d1f0d] transition-colors duration-200"
            >
              Sign in →
            </Link>
          </div>
        </div>

        {/* Dashboard Preview Card */}
        <div className="relative">
          <div className="rounded-2xl border border-[#c8dcc8] bg-white shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="px-6 py-4 border-b border-[#e8f2e8] flex items-center justify-between">
              <span className="text-xs font-semibold tracking-widest uppercase text-[#4a7a4a]">Net Worth</span>
              <span className="text-[10px] text-[#8aaa8a] font-mono">↑ 3.2% this month</span>
            </div>
            <div className="px-6 py-6">
              <div className="text-4xl font-light text-[#0d1f0d] tracking-tight font-['DM_Mono',monospace]">
                $84,220<span className="text-xl text-[#8aaa8a]">.49</span>
              </div>

              {/* Sparkline-style bar */}
              <div className="mt-6 flex items-end gap-1 h-12">
                {[40, 55, 45, 60, 50, 72, 65, 80, 70, 88, 78, 95].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${h}%`,
                      background: i === 11 ? "#1a7a1a" : `rgba(26,122,26,${0.15 + i * 0.06})`,
                    }}
                  />
                ))}
              </div>

              {/* Accounts list */}
              <div className="mt-6 space-y-3">
                {[
                  { name: "Chase Checking", amount: "$12,430.00", change: "+$240" },
                  { name: "Fidelity Brokerage", amount: "$58,120.49", change: "+$1,820" },
                  { name: "Apple Savings", amount: "$13,670.00", change: "+$12" },
                ].map((acc) => (
                  <div key={acc.name} className="flex items-center justify-between py-2 border-b border-[#f0f7f0] last:border-0">
                    <span className="text-xs text-[#4a7a4a]">{acc.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[#2d8a2d] font-mono">{acc.change}</span>
                      <span className="text-xs font-medium text-[#0d1f0d] font-['DM_Mono',monospace]">{acc.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating accent */}
          <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-[#eaf4ea] border border-[#c8dcc8] -z-10" />
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-t border-[#d4e8d4] max-w-6xl mx-auto px-8 py-10">
        <div className="grid grid-cols-3 divide-x divide-[#d4e8d4]">
          {[
            { label: "Accounts connected", value: "12,400+" },
            { label: "Transactions tracked", value: "$2.1B+" },
            { label: "Uptime", value: "99.98%" },
          ].map((stat) => (
            <div key={stat.label} className="px-8 first:pl-0 last:pr-0">
              <div className="text-2xl font-light text-[#0d1f0d] font-['DM_Mono',monospace]">{stat.value}</div>
              <div className="mt-1 text-[11px] tracking-widest uppercase text-[#8aaa8a]">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#d4e8d4] mt-16 px-8 py-6 max-w-6xl mx-auto flex items-center justify-between">
        <span className="text-[11px] tracking-widest uppercase text-[#8aaa8a]">© 2026 Cashism</span>
        <span className="text-[11px] tracking-widest uppercase text-[#8aaa8a]">Financial clarity, engineered.</span>
      </footer>

    </div>
  );
}