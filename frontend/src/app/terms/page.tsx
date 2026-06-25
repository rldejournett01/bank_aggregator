import Link from "next/link";

export const metadata = { title: "Terms of Service · Cashism" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f7faf7] font-['DM_Sans',sans-serif]">
      <header className="border-b border-[#d4e8d4] px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#1a7a1a] inline-block" />
          <span className="text-sm font-semibold tracking-widest uppercase text-[#0d1f0d]">Cashism</span>
        </Link>
        <Link href="/privacy" className="text-[11px] tracking-widest uppercase text-[#4a7a4a] hover:text-[#0d1f0d]">Privacy</Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 text-[#1f2d1f]">
        <div className="mb-6 px-4 py-3 rounded border border-[#f5d68a] bg-[#fefce8] text-xs text-[#7a5b0d]">
          <strong>Template.</strong> This is a starting-point Terms of Service. Have a fintech attorney review and tailor it before you launch publicly.
        </div>

        <h1 className="text-3xl font-light text-[#0d1f0d] mb-2">Terms of <span className="font-semibold">Service</span></h1>
        <p className="text-xs text-[#8aaa8a] mb-8">Last updated: [date]</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">1. The service</h2>
            <p>Cashism is a read-only personal finance aggregator. It lets you connect financial accounts (via Plaid) to view a consolidated picture of your money, with analytics and an optional AI advisor. <strong>Cashism is not a bank, money transmitter, broker, or lender, and never moves, holds, or transfers your funds.</strong></p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">2. Not financial advice</h2>
            <p>All content, analytics, forecasts, and AI advisor responses are for <strong>informational purposes only</strong> and are not financial, investment, tax, accounting, or legal advice. Figures may be incomplete or inaccurate. You are responsible for your own financial decisions; consult a qualified professional before acting.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">3. Eligibility</h2>
            <p>You must be at least 18 years old and able to form a binding contract to use Cashism.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">4. Your account</h2>
            <p>You are responsible for keeping your login credentials secure and for activity under your account. Notify us promptly of any unauthorized use.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">5. Connecting accounts via Plaid</h2>
            <p>By connecting an institution you authorize Plaid and Cashism to access read-only financial data from that institution on your behalf. Your use of Plaid is also governed by Plaid&apos;s end-user terms and privacy policy. You can disconnect any institution at any time in Settings.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">6. Subscriptions</h2>
            <p>Premium features are billed through Stripe on a recurring basis. You can manage or cancel your subscription from Settings; cancellation takes effect at the end of the current billing period unless stated otherwise.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">7. Acceptable use</h2>
            <p>Don&apos;t misuse the service: no unauthorized access, scraping, reverse engineering, or using Cashism to violate any law or another person&apos;s rights.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">8. Disclaimers & liability</h2>
            <p>The service is provided &quot;as is&quot; without warranties of any kind. To the maximum extent permitted by law, Cashism is not liable for indirect, incidental, or consequential damages, or for decisions made based on information in the service.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">9. Termination</h2>
            <p>You may delete your account at any time in Settings. We may suspend or terminate access for violations of these terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">10. Changes</h2>
            <p>We may update these terms; we&apos;ll post the updated version with a new date and, where appropriate, notify you.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0d1f0d] mb-1">11. Contact</h2>
            <p>[support@yourdomain.com]</p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-[#d4e8d4] text-xs text-[#8aaa8a]">
          <Link href="/" className="text-[#1a7a1a] font-semibold">← Back to Cashism</Link>
        </div>
      </main>
    </div>
  );
}
