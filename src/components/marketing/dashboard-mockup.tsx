import { Bell, CreditCard, Gift, LayoutGrid, Lock, MapPin, Plus, Receipt, UserRound } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/ui/logo";

/**
 * A still of the customer dashboard for the homepage hero. Every size is in em
 * so the whole window scales from one font-size on its root.
 */

const NAV = [
  { icon: LayoutGrid, label: "Overview", active: true },
  { icon: CreditCard, label: "Payments" },
  { icon: Receipt, label: "Receipts" },
  { icon: Gift, label: "Referrals", count: "3" },
  { icon: UserRound, label: "Profile" },
];

const STATS = [
  { label: "Monthly", value: "₦22,500" },
  { label: "Paid so far", value: "₦157,500", accent: true },
  { label: "Remaining", value: "₦112,500" },
  { label: "Collection", value: "Dec 2027" },
];

const RECEIPTS = [
  { month: "Jul 2027", channel: "Transfer", ref: "RCP-2027-004812" },
  { month: "Jun 2027", channel: "Card", ref: "RCP-2027-003977" },
  { month: "May 2027", channel: "USSD", ref: "RCP-2027-003105" },
];

export function DashboardMockup() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[1.15em] border border-[#e6ddcf] bg-cream text-ink-900 shadow-[0_0.1em_0.2em_rgb(20_14_6/0.06),0_2.5em_5em_-1.5em_rgb(10_8_5/0.45),0_1em_2em_-1em_rgb(10_8_5/0.2)]">
      {/* browser chrome */}
      <div className="relative flex h-[2.6em] shrink-0 items-center border-b border-[#ece4d8] bg-[#fbf7f1] px-[1em]">
        <div className="flex gap-[0.42em]">
          <span className="size-[0.62em] rounded-full bg-[#e7dccd]" />
          <span className="size-[0.62em] rounded-full bg-[#e7dccd]" />
          <span className="size-[0.62em] rounded-full bg-[#e7dccd]" />
        </div>
        <div className="absolute left-1/2 flex h-[1.65em] w-[24em] -translate-x-1/2 items-center justify-center gap-[0.45em] rounded-[0.5em] bg-[#f2ebe0] font-mono text-[0.68em] text-ink-400">
          <Lock className="size-[0.95em]" strokeWidth={2.4} />
          luxuriatefoodstuff.com/dashboard
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* sidebar */}
        <aside className="flex w-[13.6em] shrink-0 flex-col border-r border-[#efe7db] bg-[#fdfaf5] px-[1em] pb-[1em] pt-[1.25em]">
          <div className="flex items-center gap-[0.5em] px-[0.35em]">
            <LogoMark className="h-[1.7em]" />
            <Wordmark className="h-[0.62em]" />
          </div>
          <div className="mt-[1.5em] flex h-[2.5em] items-center gap-[0.5em] rounded-[0.7em] bg-ink-950 px-[0.9em] text-[0.78em] font-semibold text-cream shadow-[0_0.5em_1em_-0.5em_rgb(0_0_0/0.5)]">
            <Plus className="size-[1.1em]" strokeWidth={2.6} />
            Make a payment
          </div>
          <nav className="mt-[1.3em] flex flex-col gap-[0.2em]">
            {NAV.map(({ icon: Icon, label, active, count }) => (
              <div
                key={label}
                className={
                  active
                    ? "flex h-[2.3em] items-center gap-[0.65em] rounded-[0.6em] bg-white px-[0.75em] text-[0.8em] font-semibold text-ink-900 shadow-[0_0_0_1px_rgb(30_26_22/0.06),0_0.15em_0.4em_rgb(30_26_22/0.05)]"
                    : "flex h-[2.3em] items-center gap-[0.65em] px-[0.75em] text-[0.8em] font-medium text-ink-500"
                }
              >
                <Icon className="size-[1.15em]" strokeWidth={2} />
                {label}
                {count && (
                  <span className="ml-auto rounded-full bg-honey-100 px-[0.5em] font-mono text-[0.8em] font-medium text-honey-700">{count}</span>
                )}
              </div>
            ))}
          </nav>
          <div className="mt-auto -rotate-[1.5deg] rounded-[0.8em] bg-[#f7e19c] p-[0.85em] shadow-[0_0.6em_1.2em_-0.6em_rgb(120_80_10/0.35)]">
            <p className="text-[0.72em] font-bold text-ink-900">Tip · Pay ahead</p>
            <p className="mt-[0.35em] text-[0.64em] leading-[1.45] text-ink-700">
              Pay two or more months in one go from Payments. Each month gets its own receipt.
            </p>
          </div>
        </aside>

        {/* main */}
        <div className="min-w-0 flex-1 px-[1.7em] pb-[1.4em] pt-[1.35em]">
          <div className="flex items-start justify-between gap-[1em]">
            <div>
              <p className="font-mono text-[0.6em] font-medium uppercase tracking-[0.14em] text-ink-400">Month 7 of 12 · Gold package</p>
              <p className="mt-[0.3em] text-[1.45em] font-bold tracking-[-0.03em] text-ink-950">Good morning, Adaeze</p>
            </div>
            <div className="flex items-center gap-[0.6em]">
              <span className="rounded-full border border-line bg-white px-[0.8em] py-[0.35em] font-mono text-[0.62em] text-ink-500">LUX-2027-000184</span>
              <span className="flex size-[2em] items-center justify-center rounded-full border border-line bg-white text-ink-500">
                <Bell className="size-[0.95em]" />
              </span>
            </div>
          </div>

          {/* next payment */}
          <div className="mt-[1.1em] rounded-[1em] border border-[#f1dc9f] bg-[linear-gradient(120deg,#fae4a6_0%,#fcefcc_55%,#fdf5df_100%)] p-[1.3em] shadow-[inset_0_1px_0_rgb(255_255_255/0.6)]">
            <span className="inline-flex items-center gap-[0.5em] rounded-full bg-white/80 px-[0.75em] py-[0.3em] font-mono text-[0.58em] font-medium uppercase tracking-[0.12em] text-ink-700">
              <span className="size-[0.55em] rounded-full bg-honey-500" />
              Next payment · due in 4 days
            </span>
            <p className="mt-[0.6em] text-[2.15em] font-bold leading-none tracking-[-0.04em] text-ink-950">
              Sunday, <span className="text-forest-700">1 August</span>
            </p>
            <p className="mt-[0.55em] text-[0.74em] text-ink-600">Month 8 of 12 · Card, bank transfer or USSD on Paystack</p>
            <div className="mt-[1.1em] grid grid-cols-4 gap-[1em] border-t border-[#ecd28c]/70 pt-[0.9em]">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="font-mono text-[0.54em] font-medium uppercase tracking-[0.14em] text-ink-500">{s.label}</p>
                  <p className={`mt-[0.3em] font-mono text-[1.1em] font-medium tracking-[-0.02em] ${s.accent ? "text-forest-700" : "text-ink-900"}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* progress */}
          <div className="mt-[0.9em] rounded-[1em] border border-line bg-white p-[1.15em]">
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-[0.56em] font-medium uppercase tracking-[0.14em] text-ink-400">Contribution progress</p>
              <p className="font-mono text-[0.62em] text-ink-400">58%</p>
            </div>
            <p className="mt-[0.35em] text-[0.95em] font-semibold text-ink-900">
              <span className="font-mono font-medium">₦157,500</span> <span className="text-ink-400">of</span>{" "}
              <span className="font-mono font-medium text-ink-500">₦270,000</span>
            </p>
            <div className="mt-[0.7em] grid grid-cols-12 gap-[0.22em]">
              {Array.from({ length: 12 }, (_, i) => (
                <span
                  key={i}
                  className={
                    i < 7
                      ? "h-[0.5em] rounded-full bg-honey-500"
                      : i === 7
                        ? "h-[0.5em] rounded-full bg-honey-200"
                        : "h-[0.5em] rounded-full bg-[#efe8dc]"
                  }
                />
              ))}
            </div>
            <div className="mt-[0.85em] flex gap-[1.4em]">
              {[
                ["7", "Paid", "on time", "bg-forest-50 text-forest-700"],
                ["1", "Due", "1 Aug", "bg-honey-100 text-honey-700"],
                ["4", "Upcoming", "Sep–Dec", "bg-sand text-ink-500"],
              ].map(([n, a, b, tone]) => (
                <div key={a} className="flex items-center gap-[0.5em]">
                  <span className={`flex size-[1.7em] items-center justify-center rounded-[0.45em] font-mono text-[0.72em] font-medium ${tone}`}>{n}</span>
                  <span className="text-[0.62em] leading-tight">
                    <span className="block text-ink-500">{a}</span>
                    <span className="block font-semibold text-ink-800">{b}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* receipts */}
          <div className="mt-[0.9em]">
            <div className="flex items-baseline justify-between">
              <p className="text-[0.8em] font-bold text-ink-900">Recent receipts</p>
              <p className="flex items-center gap-[0.35em] text-[0.6em] text-ink-400">
                <MapPin className="size-[1em]" /> Collecting at Lekki hub
              </p>
            </div>
            <div className="mt-[0.6em] grid grid-cols-3 gap-[0.7em]">
              {RECEIPTS.map((r) => (
                <div key={r.ref} className="rounded-[0.8em] border border-line bg-white p-[0.85em]">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[0.55em] uppercase tracking-[0.12em] text-ink-400">{r.month}</p>
                    <span className="rounded-full bg-forest-50 px-[0.55em] py-[0.15em] text-[0.55em] font-semibold text-forest-700">Paid</span>
                  </div>
                  <p className="mt-[0.4em] font-mono text-[0.95em] font-medium text-ink-900">₦22,500</p>
                  <p className="mt-[0.2em] truncate font-mono text-[0.55em] text-ink-400">
                    {r.channel} · {r.ref}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
