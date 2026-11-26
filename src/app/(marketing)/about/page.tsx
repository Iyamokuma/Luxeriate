import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoFull } from "@/components/ui/logo";
import { PantryStage } from "@/components/three/pantry-stage";
import { getCatalog, getCollectionPoints, getPublicSettings } from "@/lib/data/catalog";
import { monthName, naira, whatsappLink } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Luxuriate Foodstuff is the monthly foodstuff contribution plan from Luxuriate International Mart Limited: choose a package, pay monthly, collect it all together.",
};

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

function addMonths(iso: string, n: number) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

export default async function AboutPage() {
  const [{ packages }, points, s] = await Promise.all([getCatalog(), getCollectionPoints(), getPublicSettings()]);
  const featured = packages.find((p) => p.badge?.toLowerCase().includes("popular")) ?? packages[Math.floor(packages.length / 2)];
  const months = featured
    ? Array.from({ length: featured.duration_months }, (_, i) => monthName(addMonths(featured.start_month, i)))
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const cheapest = packages.reduce((m, p) => Math.min(m, p.monthly_amount_kobo), Infinity);
  const duration = packages[0]?.duration_months ?? 12;

  const facts = [
    packages.length > 0 && { value: String(packages.length), label: "packages to choose from" },
    { value: String(duration), label: "monthly payments, then collection" },
    packages.length > 0 && { value: naira(cheapest), label: "a month, for the smallest package" },
    points.length > 0 && { value: String(points.length), label: points.length === 1 ? "collection hub" : "collection hubs" },
  ].filter(Boolean) as { value: string; label: string }[];

  const contact = [
    s.whatsapp_number && { label: "WhatsApp", value: s.whatsapp_number, href: whatsappLink(s.whatsapp_number) },
    s.support_phone && { label: "Phone", value: s.support_phone, href: `tel:${s.support_phone}` },
    s.support_email && { label: "Email", value: s.support_email, href: `mailto:${s.support_email}` },
  ].filter(Boolean) as { label: string; value: string; href: string }[];

  return (
    <>
      {/* ─── Hero: the package, filling month by month ───────────── */}
      <section data-dark className="relative isolate -mt-[4.5rem] overflow-hidden bg-night pt-[4.5rem] text-cream">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(70%_24%_at_50%_78%,rgb(233_199_107/0.2)_0%,rgb(233_199_107/0)_70%)] lg:bg-[radial-gradient(36%_50%_at_76%_50%,rgb(233_199_107/0.22)_0%,rgb(233_199_107/0)_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(50%_60%_at_6%_0%,rgb(207_158_41/0.10)_0%,rgb(207_158_41/0)_70%)]" />
          <div className="grid-lines absolute inset-0 opacity-50 invert [mask-image:radial-gradient(ellipse_70%_65%_at_40%_40%,black_20%,transparent_75%)]" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(to_bottom,rgb(19_17_14/0)_0%,rgb(58_51_42/0.55)_42%,rgb(216_206_188/0.92)_82%,var(--color-paper)_100%)]" />
        </div>
        <div className="relative mx-auto max-w-[77.5rem] px-4 sm:px-6 lg:px-8">
          <div className="relative grid lg:min-h-[44rem] lg:grid-cols-[minmax(0,34rem)_1fr]">
            <div className="relative z-10 pb-4 pt-12 sm:pt-16 lg:pb-36 lg:pt-24">
              <p className="inline-flex animate-fade-up items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 font-mono text-[0.65rem] font-medium uppercase tracking-[0.14em] text-ink-200 ring-1 ring-inset ring-white/10">
                <span className="size-1.5 rounded-full bg-honey-400 shadow-[0_0_10px_2px_rgb(221_179_67/0.6)]" />
                About Luxuriate
              </p>
              <h1 className="mt-8 animate-fade-up text-[clamp(2.6rem,4.4vw,3.9rem)] font-extrabold leading-[1.02] tracking-[-0.045em] text-[#f7f1e5] [animation-delay:80ms]">
                <span className="block">A full pantry,</span>
                <span className="block bg-[linear-gradient(100deg,#f3dea3_0%,#ddb343_50%,#cf9e29_100%)] bg-clip-text pb-1 text-transparent">
                  one month <span className="whitespace-nowrap">at a time.</span>
                </span>
              </h1>
              <p className="mt-7 max-w-[30rem] animate-fade-up text-[1.0625rem] leading-[1.7] text-ink-300 [animation-delay:160ms] sm:text-lg sm:leading-[1.65]">
                Luxuriate Foodstuff is the foodstuff contribution plan from Luxuriate International Mart Limited. You choose a package, spread its cost across the year, and collect everything together, with every payment
                recorded, verified and receipted along the way.
              </p>
              <div className="mt-9 flex animate-fade-up flex-wrap items-center gap-x-7 gap-y-4 [animation-delay:240ms]">
                <Button asChild variant="light" size="lg" className="h-[3.25rem] rounded-xl px-6 text-ink-950">
                  <Link href="/#packages">
                    See the packages <ArrowRight />
                  </Link>
                </Button>
                <Link href="#promise" className="group text-[0.9375rem] font-semibold text-cream">
                  <span className="border-b border-white/30 pb-0.5 transition-colors group-hover:border-cream">What we promise</span>
                </Link>
              </div>
            </div>

            <div className="relative h-[clamp(29rem,124vw,38rem)] lg:h-auto">
              <PantryStage
                className="absolute inset-x-[-1rem] inset-y-0 sm:inset-x-0 lg:-right-20 lg:bottom-16 lg:left-[-2rem] lg:top-4"
                months={months}
                monthlyKobo={featured?.monthly_amount_kobo ?? 0}
                packageName={featured ? `${featured.name} package` : "Your package"}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Why ────────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto grid max-w-[77.5rem] gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,30rem)_1fr] lg:gap-24 lg:px-8">
          <div>
            <Label index="01" text="Why we do this" />
            <h2 className="mt-5 text-[clamp(2.1rem,3.8vw,3.1rem)] font-bold leading-[1.04] tracking-[-0.045em] text-ink-950">
              Buying a year&apos;s foodstuff at once is hard. Saving towards it shouldn&apos;t be.
            </h2>
          </div>
          <div className="space-y-6 text-[1.0625rem] leading-[1.75] text-ink-600 lg:pt-12">
            <p>
              Food prices rarely wait for payday, and putting aside enough for a full stock of rice, beans, oil and the rest in
              one go is out of reach for most homes. Contributing a little every month makes it possible.
            </p>
            <p>
              Contribution schemes have long run on trust, WhatsApp messages and handwritten lists. That works until a payment
              goes missing, or nobody is quite sure who has paid for which month.
            </p>
            <p className="text-ink-900">
              Luxuriate keeps the trust and replaces the guesswork: a clear price for every package, a record of every naira,
              and a dashboard that shows each customer exactly where they stand.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Promise ────────────────────────────────────────────── */}
      <section id="promise" className="scroll-mt-16 border-y border-ink-900/[0.06] bg-cream py-24 sm:py-32">
        <div className="mx-auto max-w-[77.5rem] px-4 sm:px-6 lg:px-8">
          <Label index="02" text="What we promise" />
          <h2 className="mt-5 max-w-2xl text-[clamp(2.1rem,3.8vw,3.1rem)] font-bold leading-[1.04] tracking-[-0.045em] text-ink-950">
            Four things you can hold us to.
          </h2>
          <ol className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                t: "Every naira accounted for",
                d: "Each payment is checked directly with Paystack before it counts, gets its own numbered receipt, and the registration fee is always kept apart from your contributions.",
              },
              {
                t: "No surprises in the box",
                d: "Every package lists each item and its quantity before you pay anything. Where a package includes a savings return, it is shown on its own.",
              },
              {
                t: "Reminders, not chasing",
                d: "An email arrives before each due date. You can pay ahead whenever you like, by card, bank transfer or USSD, from any phone.",
              },
              {
                t: "Collection close to home",
                d: "You pick a collection point when you join, and we tell you as your package is prepared, ready and scheduled for collection.",
              },
            ].map((p, i) => (
              <li key={p.t} className="border-t border-ink-900/15 pt-5">
                <p className="font-mono text-[0.6875rem] text-honey-600">{String(i + 1).padStart(2, "0")}</p>
                <p className="mt-3 text-[1.125rem] font-bold tracking-[-0.02em] text-ink-950">{p.t}</p>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-500">{p.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── In numbers ─────────────────────────────────────────── */}
      {facts.length > 0 && (
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-[77.5rem] px-4 sm:px-6 lg:px-8">
            <dl className={cn("grid gap-px overflow-hidden rounded-[1.5rem] bg-ink-900/[0.08] ring-1 ring-ink-900/[0.08]", facts.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3")}>
              {facts.map((f) => (
                <div key={f.label} className="flex flex-col-reverse bg-paper p-7 sm:p-8">
                  <dt className="mt-3 text-[0.9375rem] text-ink-500">{f.label}</dt>
                  <dd className="font-mono text-[2.5rem] font-medium leading-none tracking-[-0.05em] text-ink-950">{f.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 font-mono text-[0.6875rem] text-ink-400">
              {WORDS[duration] ?? duration} payments, one collection. Figures update with the current cycle.
            </p>
          </div>
        </section>
      )}

      {/* ─── The company ────────────────────────────────────────── */}
      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative mx-auto grid max-w-[77.5rem] gap-12 overflow-hidden rounded-[2rem] bg-night-2 p-8 text-cream shadow-[0_50px_90px_-50px_rgb(10_8_5/0.9)] sm:p-14 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:p-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_70%_at_18%_50%,rgb(233_199_107/0.16)_0%,transparent_70%)]"
          />
          <div className="relative flex justify-center lg:justify-start">
            <LogoFull tone="light" className="h-36 sm:h-44" />
          </div>
          <div className="relative">
            <Label index="03" text="The company" dark />
            <h2 className="mt-5 text-[clamp(1.9rem,3.2vw,2.6rem)] font-bold leading-[1.08] tracking-[-0.04em] text-[#f7f1e5]">
              Luxuriate International Mart Limited
            </h2>
            <p className="mt-4 max-w-md text-[1.0625rem] leading-[1.7] text-ink-300">
              Questions about a package, a payment or collection? Reply to any of our emails, or reach us directly.
            </p>
            {(contact.length > 0 || s.office_address) && (
              <dl className="mt-8 max-w-md space-y-3 text-[0.9375rem]">
                {contact.map((c) => (
                  <div key={c.label} className="flex items-baseline gap-2">
                    <dt className="text-ink-400">{c.label}</dt>
                    <span className="leader" style={{ borderColor: "rgb(255 255 255 / 0.14)" }} />
                    <dd>
                      <a href={c.href} className="font-medium text-cream transition-colors hover:text-honey-300">
                        {c.value}
                      </a>
                    </dd>
                  </div>
                ))}
                {s.office_address && <p className="pt-1 leading-relaxed text-ink-300">{s.office_address}</p>}
              </dl>
            )}
            <div className="mt-9">
              <Button asChild variant="light" size="lg" className="h-[3.25rem] rounded-xl px-6 text-ink-950">
                <Link href="/#packages">
                  Choose a package <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Label({ index, text, dark }: { index: string; text: string; dark?: boolean }) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.16em]",
        dark ? "text-ink-300" : "text-ink-500",
      )}
    >
      <span className={dark ? "text-honey-400" : "text-honey-600"}>{index}</span>
      <span className={cn("h-px w-6", dark ? "bg-white/25" : "bg-ink-900/20")} />
      {text}
    </p>
  );
}
