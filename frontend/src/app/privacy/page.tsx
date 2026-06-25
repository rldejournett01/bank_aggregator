import Link from "next/link";

export const metadata = { title: "Privacy Policy · Cashism" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f7faf7] font-['DM_Sans',sans-serif]">
      <header className="border-b border-[#d4e8d4] px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#1a7a1a] inline-block" />
          <span className="text-sm font-semibold tracking-widest uppercase text-[#0d1f0d]">Cashism</span>
        </Link>
        <Link href="/terms" className="text-[11px] tracking-widest uppercase text-[#4a7a4a] hover:text-[#0d1f0d]">Terms</Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 text-[#1f2d1f]">
        <div className="mb-6 px-4 py-3 rounded border border-[#f5d68a] bg-[#fefce8] text-xs text-[#7a5b0d]">
          <strong>Template.</strong> This is a starting-point privacy policy. Have a fintech/privacy attorney review and tailor it before you launch publicly.
        </div>

        <h1 className="text-3xl font-light text-[#0d1f0d] mb-2">Privacy <span className="font-semibold">Policy</span></h1>
        <p className="text-xs text-[#8aaa8a] mb-8">Last updated: [date]</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">What Cashism is</h2>
            <p>Cashism is a read-only personal finance aggregator. We help you connect your financial accounts and see a consolidated view of your money. <strong>We never move, hold, or transfer funds.</strong></p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">Information we collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account info</strong> you provide: your email and a securely hashed password.</li>
              <li><strong>Financial data via Plaid</strong>, with your consent: account names, types, balances, and transactions from the institutions you connect.</li>
              <li><strong>We never receive or store your bank login credentials.</strong> Those are handled directly by Plaid.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">How we use it</h2>
            <p>Only to provide the service you ask for: the consolidated dashboard, spending and cash-flow analysis, and — if you use it — the AI advisor. <strong>We do not sell your data, share it for advertising, or use it for any unrelated purpose.</strong></p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">Service providers</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Plaid</strong> — connects your accounts and retrieves your financial data. See Plaid&apos;s <a href="https://plaid.com/legal/#end-user-privacy-policy" target="_blank" rel="noreferrer" className="text-[#1a7a1a] font-semibold">End User Privacy Policy</a>.</li>
              <li><strong>Stripe</strong> — processes subscription payments. We never see your full card details.</li>
              <li><strong>Anthropic</strong> — powers the optional AI advisor. When you ask the advisor a question, relevant summaries of your financial data are sent to Anthropic&apos;s API to generate a response. Anthropic does not train its models on this API data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">Security</h2>
            <p>Data is transmitted over encrypted connections. Plaid access tokens are encrypted at rest, and access to your data is scoped to your account. No system is perfectly secure, but we apply industry-standard safeguards.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">Your rights & controls</h2>
            <p>From <Link href="/settings" className="text-[#1a7a1a] font-semibold">Settings</Link> you can at any time:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li><strong>Export</strong> a complete copy of your data (JSON).</li>
              <li><strong>Disconnect</strong> any institution — this revokes Plaid&apos;s access and deletes that institution&apos;s data.</li>
              <li><strong>Delete your account</strong> and erase all associated data permanently.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">Data retention</h2>
            <p>We keep your data until you delete it. Disconnecting an institution removes its data promptly; deleting your account removes everything.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">Children</h2>
            <p>Cashism is not directed to anyone under 18, and we do not knowingly collect their data.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">Contact</h2>
            <p>Questions or data requests: [privacy@yourdomain.com].</p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-[#d4e8d4] text-xs text-[#8aaa8a]">
          <Link href="/" className="text-[#1a7a1a] font-semibold">← Back to Cashism</Link>
        </div>
      </main>
    </div>
  );
}
