import Link from "next/link";
import { ArrowRight, Check, Copy, Download, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PackagesButton, PackagesTrigger } from "@/components/marketing/package-browser";
import { DashboardMockup } from "@/components/marketing/dashboard-mockup";
import { HeroStage } from "@/components/three/hero-stage";
import { Monogram3D } from "@/components/three/monogram-3d";
import { PantryStage } from "@/components/three/pantry-stage";
import { THEME_STYLES } from "@/lib/constants";
import { getCatalog, getCollectionPoints } from "@/lib/data/catalog";
import { monthName, naira, nairaShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PackageWithItems } from "@/types/db";

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
const word = (n: number) => WORDS[n] ?? String(n);

function addMonths(iso: string, n: number) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

export default async function HomePage() {
  const [{ year, packages }, points] = await Promise.all([getCatalog(), getCollectionPoints()]);
  const cheapest = packages.reduce((m, p) => Math.min(m, p.monthly_amount_kobo), Infinity);
  const fee = packages[0]?.registration_fee_kobo ?? 300_000;
  const months = packages[0]?.duration_months ?? 12;
  const anyOpen = packages.some((p) => p.is_open);
  const featured = packages.find((p) => p.badge?.toLowerCase().includes("popular")) ?? packages[Math.floor(packages.length / 2)];
  const cycle = year ? String(year) : "New";
  const boxMonths = featured
    ? Array.from({ length: featured.duration_months }, (_, i) => monthName(addMonths(featured.start_month, i)))
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative isolate -mt-[4.5rem] overflow-hidden pt-[4.5rem]">
        <HeroBackdrop />
        <div className="relative mx-auto max-w-[77.5rem] px-4 sm:px-6 lg:px-8">
          <div className="relative grid lg:min-h-[46rem] lg:grid-cols-[minmax(0,34rem)_1fr]">
            <div className="relative z-10 pb-6 pt-12 sm:pt-16 lg:pb-32 lg:pt-20">
              <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-ink-900/[0.07] bg-white/75 px-3 py-1.5 font-mono text-[0.65rem] font-medium uppercase tracking-[0.14em] text-ink-600 shadow-[0_1px_2px_rgb(30_26_22/0.04)] backdrop-blur">
                <span className="size-1.5 rounded-full bg-honey-500" />
                {cycle} cycle · {anyOpen ? "Registration open" : "Opening soon"}
              </p>
              <h1 className="mt-8 animate-fade-up text-[clamp(2.6rem,3.95vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.045em] text-ink-950 [animation-delay:80ms]">
                <span className="block">Save Monthly.</span>
                <span className="block">Shop Smart.</span>
                <span className="mt-1 block text-forest-700">
                  Receive Your Foodstuff Package<span className="text-honey-500">.</span>
                </span>
              </h1>
              <p className="mt-7 max-w-[29rem] animate-fade-up text-[1.0625rem] leading-[1.7] text-ink-600 [animation-delay:160ms] sm:text-lg sm:leading-[1.65]">
                Choose a package, pay a little each month through Paystack, and collect a full year&apos;s foodstuff in one go.
                Every naira is tracked, receipted and verified.
              </p>
              <div className="mt-9 flex animate-fade-up flex-wrap items-center gap-x-7 gap-y-4 [animation-delay:240ms]">
                <PackagesButton className="h-[3.25rem] rounded-xl px-6">
                  Choose a package <ArrowRight />
                </PackagesButton>
                <Link href="#who-we-are" className="group text-[0.9375rem] font-semibold text-ink-800">
                  <span className="border-b border-ink-900/25 pb-0.5 transition-colors group-hover:border-ink-900">Who we are</span>
                </Link>
              </div>
              {packages.length > 0 && (
                <dl className="mt-14 grid max-w-[27rem] animate-fade-up grid-cols-3 gap-6 [animation-delay:320ms]">
                  {[
                    ["Monthly from", naira(cheapest)],
                    ["Registration", `${naira(fee)} once`],
                    ["Payments", `${months} monthly`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-ink-400">{k}</dt>
                      <dd className="mt-2 text-[0.9375rem] font-bold tracking-[-0.01em] text-ink-900">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            <div className="relative mb-6 h-[clamp(29rem,116vw,38rem)] lg:mb-0 lg:h-auto">
              <HeroStage className="absolute -left-[8em] top-1/2 h-[64em] w-[78em] -translate-y-1/2 animate-[fade-in_1.2s_var(--ease-out-soft)_both] text-[clamp(8px,1.02vw,15px)] lg:-left-[3em] lg:top-[50%]">
                <DashboardMockup />
              </HeroStage>
              <p className="sr-only">
                A preview of the customer dashboard: the next payment date, how much has been paid, progress through the twelve
                months and recent receipts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Who we are ───────────────────────────────────────── */}
      <section id="who-we-are" className="scroll-mt-16 py-24 sm:py-32">
        <div className="mx-auto grid max-w-[77.5rem] gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_1fr] lg:gap-24 lg:px-8">
          <div>
            <SectionLabel index="01" label="Who we are" />
            <h2 className="mt-5 text-[clamp(2.25rem,4.4vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.045em] text-ink-950">
              We help homes stock up on foodstuff, <span className="text-forest-700">one month at a time.</span>
            </h2>
            <p className="mt-6 max-w-xl text-[1.0625rem] leading-[1.75] text-ink-600">
              Luxuriate Foodstuff is the contribution plan from Luxuriate International Mart Limited. Instead of finding a large sum
              at once, you choose a package, pay a fixed amount every month, and collect the whole package together when your
              contributions are complete.
            </p>
            <Link href="/about" className="group mt-8 inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-ink-900">
              <span className="border-b border-ink-900/25 pb-0.5 transition-colors group-hover:border-ink-900">More about us</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <dl className="divide-y divide-ink-900/[0.08] self-end border-y border-ink-900/[0.08]">
            {[
              ["Every naira accounted for", "Each payment is checked with Paystack before it counts, and every one gets a numbered receipt."],
              ["No surprises in the box", "Every package lists each item and quantity before you pay anything."],
              [
                "Collection close to home",
                points.length > 0
                  ? `Collect at the point you choose when you join. We have ${points.length} across the country.`
                  : "Collect at the point you choose when you join, once your package is ready.",
              ],
            ].map(([t, d], i) => (
              <div key={t} className="grid grid-cols-[2.5rem_1fr] py-5">
                <dt className="pt-0.5 font-mono text-[0.6875rem] text-honey-600">{String(i + 1).padStart(2, "0")}</dt>
                <dd>
                  <p className="text-[1rem] font-semibold text-ink-950">{t}</p>
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-500">{d}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ─── Watch a package come together ────────────────────── */}
      <section id="see-it" data-dark className="relative isolate scroll-mt-16 overflow-hidden bg-night text-cream">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(70%_24%_at_50%_80%,rgb(233_199_107/0.2)_0%,transparent_70%)] lg:bg-[radial-gradient(36%_55%_at_74%_50%,rgb(233_199_107/0.22)_0%,transparent_70%)]" />
          <div className="grid-lines absolute inset-0 opacity-40 invert [mask-image:radial-gradient(ellipse_70%_65%_at_40%_45%,black_20%,transparent_75%)]" />
        </div>
        <div className="mx-auto grid max-w-[77.5rem] px-4 sm:px-6 lg:min-h-[40rem] lg:grid-cols-[minmax(0,30rem)_1fr] lg:px-8">
          <div className="relative z-10 py-20 sm:py-24 lg:py-32">
            <SectionLabel dark index="02" label="See it come together" />
            <h2 className="mt-5 text-[clamp(2.25rem,4.4vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.045em] text-[#f7f1e5]">
              Every payment adds to your box.
            </h2>
            <p className="mt-6 text-[1.0625rem] leading-[1.75] text-ink-300">
              Each month you pay, another part of your package is set aside for you. After the twelfth payment the box is complete,
              packed and ready at your collection point.
            </p>
            <p className="mt-6 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-400">Drag the box to turn it</p>
          </div>
          <div className="relative h-[clamp(29rem,124vw,38rem)] lg:h-auto">
            <PantryStage
              className="absolute inset-x-[-1rem] inset-y-0 sm:inset-x-0 lg:-right-20 lg:bottom-6 lg:left-[-2rem] lg:top-6"
              months={boxMonths}
              monthlyKobo={featured?.monthly_amount_kobo ?? 0}
              packageName={featured ? `${featured.name} package` : "Your package"}
            />
          </div>
        </div>
      </section>

      {/* ─── View our packages ────────────────────────────────── */}
      <section id="packages" className="scroll-mt-16 py-24 sm:py-32">
        <div className="mx-auto max-w-[77.5rem] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <SectionLabel index="03" label="Our packages" />
              <h2 className="mt-5 text-[clamp(2.25rem,4.6vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.045em] text-ink-950">
                {packages.length > 0 ? (
                  <>
                    {word(packages.length)} packages.
                    <br />
                    <span className="text-ink-400">One for every kitchen.</span>
                  </>
                ) : (
                  <>Packages are on their way.</>
                )}
              </h2>
              <p className="mt-5 max-w-xl text-[1.0625rem] leading-[1.7] text-ink-500">
                {packages.length > 0
                  ? `From ${naira(cheapest)} a month, each with a one-time ${naira(fee)} registration. Open any package to see what's in it and exactly how to join.`
                  : "The new cycle's packages will be listed here shortly."}
              </p>
            </div>
            {packages.length > 0 && (
              <PackagesButton className="h-[3.25rem] w-full rounded-xl px-6 sm:w-auto">
                View our packages <ArrowRight />
              </PackagesButton>
            )}
          </div>

          {packages.length > 0 && (
            <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((p) => (
                <li key={p.id}>
                  <PackagesTrigger
                    slug={p.slug}
                    className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-ink-900/[0.07] bg-white p-5 text-left shadow-[0_1px_2px_rgb(30_26_22/0.03)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgb(60_40_10/0.35)]"
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span aria-hidden className={cn("size-2 rounded-full", (THEME_STYLES[p.theme] ?? THEME_STYLES.oat).dot)} />
                        <span className="text-[1rem] font-bold tracking-[-0.02em] text-ink-950">{p.name}</span>
                        {p.badge && (
                          <span className="rounded-full bg-ink-950 px-2 py-0.5 font-mono text-[0.5rem] font-medium uppercase tracking-[0.14em] text-cream">
                            {p.badge}
                          </span>
                        )}
                      </span>
                      <span className="mt-2 block font-mono text-[1.5rem] font-medium leading-none tracking-[-0.05em] text-ink-950">
                        {naira(p.monthly_amount_kobo)}
                        <span className="ml-1 font-sans text-[0.75rem] font-normal tracking-normal text-ink-400">/ month</span>
                      </span>
                      <span className="mt-2 block text-[0.75rem] text-ink-500">
                        {p.package_items.length} items
                        {p.savings_return_kobo > 0 ? ` · ${naira(p.savings_return_kobo)} savings return` : ""}
                      </span>
                    </span>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-900/[0.05] text-ink-700 transition-colors group-hover:bg-ink-950 group-hover:text-cream">
                      <ArrowRight className="size-4" />
                    </span>
                  </PackagesTrigger>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────── */}
      <section id="how-it-works" data-dark className="relative isolate scroll-mt-16 overflow-hidden bg-night py-24 text-cream sm:py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(45%_60%_at_92%_0%,rgb(207_158_41/0.12)_0%,transparent_70%),radial-gradient(40%_50%_at_0%_100%,rgb(207_158_41/0.08)_0%,transparent_70%)]"
        />
        <div className="mx-auto max-w-[77.5rem] px-4 sm:px-6 lg:px-8">
          <SectionHead
            dark
            index="04"
            label="How it works"
            title={
              <>
                {word(months)} payments.
                <br />
                <span className="text-honey-300">One full pantry.</span>
              </>
            }
            aside="No WhatsApp screenshots or handwritten lists. The website keeps the record, Paystack handles the money, and you can see exactly where you stand at any time."
          />
          {featured && <YearStrip pkg={featured} fee={fee} />}
        </div>
      </section>

      {/* ─── Dashboard ────────────────────────────────────────── */}
      <section id="dashboard" className="scroll-mt-16 py-24 sm:py-32">
        <div className="mx-auto grid max-w-[77.5rem] gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-20 lg:px-8">
          <div>
            <SectionLabel index="05" label="Your dashboard" />
            <h2 className="mt-5 text-[clamp(2.25rem,4.2vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.045em] text-ink-950">
              Always know where you stand.
            </h2>
            <p className="mt-5 text-[1.0625rem] leading-[1.7] text-ink-500">
              Sign in from any phone to see what you&apos;ve paid, what&apos;s due next and how close you are to collection day.
            </p>
            <dl className="mt-10 divide-y divide-ink-900/[0.07] border-y border-ink-900/[0.07]">
              {[
                ["Month by month", "Every month marked paid, due or upcoming, with the exact amount."],
                ["Receipts on demand", "A numbered PDF receipt for every payment, whenever you need it."],
                ["Collection updates", "An email as your package is prepared, ready and scheduled for collection."],
                ["Your referral code", "Share it with friends and family and see who joined with it."],
              ].map(([t, d], i) => (
                <div key={t} className="grid grid-cols-[2.25rem_1fr] py-4">
                  <dt className="pt-0.5 font-mono text-[0.6875rem] text-ink-300">{String(i + 1).padStart(2, "0")}</dt>
                  <dd>
                    <p className="text-[0.9375rem] font-semibold text-ink-900">{t}</p>
                    <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-500">{d}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <DashboardFragments points={points.length} />
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-16 border-t border-ink-900/[0.06] bg-cream py-24 sm:py-32">
        <div className="mx-auto grid max-w-[77.5rem] gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-20 lg:px-8">
          <div>
            <SectionLabel index="06" label="Questions" />
            <h2 className="mt-5 text-[clamp(2.25rem,4.2vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.045em] text-ink-950">Good to know.</h2>
            <p className="mt-5 max-w-sm text-[1.0625rem] leading-[1.7] text-ink-500">
              Can&apos;t find what you need? Reply to any of our emails and a person on our team will get back to you.
            </p>
          </div>
          <Accordion type="single" collapsible className="border-t border-ink-900/[0.08]">
            {[
              {
                q: "Is my money safe?",
                a: "Every payment goes straight from you into Luxuriate's own Paystack account, then to the business bank account. The website checks each payment directly with Paystack before marking it as paid, so a screenshot or forwarded alert can never credit an account.",
              },
              {
                q: "How do I pay each month?",
                a: "Sign in, tap Pay now and choose card, bank transfer or USSD on Paystack's secure checkout. You get an email receipt straight away, and you can download a PDF receipt from your dashboard at any time.",
              },
              {
                q: "What does the registration fee cover?",
                a: `It's a one-time ${naira(fee)} fee paid together with your first month. It's recorded separately from your contributions, so your balance always shows exactly what's going towards your package.`,
              },
              {
                q: "Can I pay for more than one month at once?",
                a: "Yes. From your dashboard you can pay ahead for as many months as you like, and each month is marked as paid straight away.",
              },
              {
                q: "What is a savings return?",
                a: "Some packages include a savings return: a cash amount paid back to you after you complete all your contributions. It's always shown on its own, separate from the food items.",
              },
              {
                q: "When and where do I collect my package?",
                a: "After your final payment we buy and pack your foodstuff and email you as it moves from Preparing to Ready to Collection scheduled. You collect it at the collection point you chose when you registered.",
              },
              {
                q: "What if I miss a month?",
                a: "You'll get a friendly reminder, and you can catch up at any time from your dashboard. Our terms and conditions explain the details.",
              },
            ].map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ─── Closing ──────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="relative mx-auto grid max-w-[77.5rem] overflow-hidden rounded-[2rem] bg-night-2 text-cream shadow-[0_50px_90px_-50px_rgb(2_16_9/0.9)] lg:grid-cols-[1.15fr_1fr]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_70%_at_78%_50%,rgb(233_199_107/0.2)_0%,transparent_70%),radial-gradient(50%_80%_at_0%_0%,rgb(207_158_41/0.08)_0%,transparent_70%)]"
          />
          <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-50 invert [mask-image:linear-gradient(90deg,transparent,black_60%)]" />
          <div className="relative p-8 sm:p-14 lg:p-16">
            <SectionLabel dark index="07" label={`${cycle} cycle`} />
            <h2 className="mt-5 max-w-lg text-[clamp(2.25rem,4.4vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.045em] text-[#f7f1e5]">
              Start with {naira(fee)} and your first month.
            </h2>
            <p className="mt-5 max-w-md text-[1.0625rem] leading-[1.7] text-ink-300">
              Registration takes about five minutes on your phone. Your customer ID arrives by email as soon as your first payment
              is confirmed.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
              <PackagesButton variant="light" className="h-[3.25rem] rounded-xl px-6 text-ink-950">
                Choose a package <ArrowRight />
              </PackagesButton>
              <Link href="/login" className="group text-[0.9375rem] font-semibold text-cream">
                <span className="border-b border-white/30 pb-0.5 transition-colors group-hover:border-cream">I already have an account</span>
              </Link>
            </div>
          </div>
          <div className="relative min-h-[20rem] sm:min-h-[24rem]">
            <div aria-hidden className="absolute bottom-[12%] left-1/2 h-8 w-[46%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(0_0_0/0.45),transparent)] blur-[2px]" />
            <Monogram3D tone="light" className="absolute inset-0" />
            <p className="pointer-events-none absolute bottom-5 right-6 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink-500">
              Drag to turn
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── Pieces ──────────────────────────────────────────────── */

function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(55%_60%_at_18%_12%,#f8ead0_0%,rgb(248_234_208/0)_70%),radial-gradient(45%_55%_at_8%_100%,#f4efe4_0%,rgb(244_239_228/0)_70%)]" />
      <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(ellipse_70%_70%_at_30%_40%,black_25%,transparent_78%)]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-paper" />
    </div>
  );
}

function SectionLabel({ index, label, className, dark }: { index: string; label: string; className?: string; dark?: boolean }) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.16em]",
        dark ? "text-ink-300" : "text-ink-500",
        className,
      )}
    >
      <span className={dark ? "text-honey-400" : "text-honey-600"}>{index}</span>
      <span className={cn("h-px w-6", dark ? "bg-white/25" : "bg-ink-900/20")} />
      {label}
    </p>
  );
}

function SectionHead({
  index,
  label,
  title,
  aside,
  dark,
}: {
  index: string;
  label: string;
  title: React.ReactNode;
  aside: string;
  dark?: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,24rem)] lg:items-end lg:gap-16">
      <div>
        <SectionLabel dark={dark} index={index} label={label} />
        <h2
          className={cn(
            "mt-5 text-[clamp(2.25rem,4.6vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.045em]",
            dark ? "text-[#f7f1e5]" : "text-ink-950",
          )}
        >
          {title}
        </h2>
      </div>
      <p className={cn("text-[1.0625rem] leading-[1.7] lg:pb-1.5", dark ? "text-ink-300" : "text-ink-500")}>{aside}</p>
    </div>
  );
}

/** A real package's year, laid out month by month with the four steps above it. */
function YearStrip({ pkg, fee }: { pkg: PackageWithItems; fee: number }) {
  const n = pkg.duration_months;
  const monthsList = Array.from({ length: n }, (_, i) => addMonths(pkg.start_month, i));
  const steps = [
    { n: "01", t: "Choose", d: "Compare the packages and see every item and quantity before you commit." },
    { n: "02", t: "Register", d: `A short form, then ${naira(fee)} plus your first month together on Paystack. Your customer ID arrives by email.` },
    { n: "03", t: "Pay monthly", d: "An email reminder three days before each due date. Pay ahead whenever you like; every payment is receipted." },
    { n: "04", t: "Collect", d: "After your last payment we buy and pack your foodstuff, keep you posted, and you collect at your chosen hub." },
  ];

  return (
    <div className="mt-16">
      <p className="text-sm text-ink-400">
        Example: <span className="font-semibold text-cream">{pkg.name}</span> at {naira(pkg.monthly_amount_kobo)} a month
      </p>

      {/* desktop: the four steps, then one continuous year beneath them */}
      <div className="mt-6 hidden lg:block">
        <ol className="grid grid-cols-4 gap-8">
          {steps.map((s) => (
            <li key={s.n}>
              <StepHead step={s} />
            </li>
          ))}
        </ol>

        <div
          className="mt-14 grid grid-cols-[1.4fr_repeat(var(--n),minmax(0,1fr))_1.4fr] gap-x-1.5"
          style={{ "--n": n } as React.CSSProperties}
        >
          {/* step markers over the strip */}
          <Marker label="01" />
          <Marker label="02" />
          <div className="relative mb-3 flex items-end justify-center" style={{ gridColumn: `span ${n - 1}` }}>
            <span className="absolute inset-x-1 bottom-1 h-2 rounded-t-md border-x border-t border-white/15" />
            <span className="relative mb-2.5 bg-night px-2 font-mono text-[0.625rem] text-honey-400">03 · every month</span>
          </div>
          <Marker label="04" />

          {/* cells */}
          <div className="flex h-28 flex-col justify-between rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-inset ring-white/10">
            <ShoppingBasket className="size-4 text-ink-400" />
            <div>
              <p className="text-[0.8125rem] font-semibold text-cream">{pkg.name}</p>
              <p className="font-mono text-[0.6875rem] text-ink-400">{pkg.package_items.length} items</p>
            </div>
          </div>
          {monthsList.map((m, i) => (
            <div
              key={m}
              className={cn(
                "flex h-28 flex-col justify-between rounded-2xl p-2.5 ring-1 ring-inset",
                i === 0 ? "bg-honey-400/[0.14] ring-honey-400/30" : "bg-white/[0.05] ring-white/[0.08]",
              )}
            >
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.1em] text-ink-400">{monthName(m)}</span>
              <div>
                <span
                  className={cn("block h-1 rounded-full", i === 0 ? "bg-honey-400" : "bg-honey-400/60")}
                  style={{ width: `${Math.round(((i + 1) / n) * 100)}%` }}
                />
                <p className="mt-2 font-mono text-[0.6875rem] font-medium tracking-[-0.02em] text-cream">
                  {nairaShort(pkg.monthly_amount_kobo + (i === 0 ? fee : 0))}
                </p>
              </div>
            </div>
          ))}
          <div className="flex h-28 flex-col justify-between rounded-2xl bg-[linear-gradient(140deg,#f3dea3,#ddb343)] p-3.5 text-ink-950 shadow-[0_20px_40px_-20px_rgb(221_179_67/0.6)]">
            <Check className="size-4 text-forest-800" strokeWidth={2.5} />
            <div>
              <p className="text-[0.8125rem] font-bold">Collection</p>
              <p className="font-mono text-[0.6875rem] text-ink-700">after month {n}</p>
            </div>
          </div>
        </div>
        <p className="mt-4 text-right font-mono text-[0.6875rem] text-ink-400">
          Month 1 includes the {naira(fee)} registration fee · contributions total {naira(pkg.monthly_amount_kobo * n)}
        </p>
      </div>

      {/* phones and tablets: steps, then the months */}
      <div className="mt-6 lg:hidden">
        <ol className="grid gap-6 sm:grid-cols-2">
          {steps.map((s) => (
            <li key={s.n}>
              <StepHead step={s} />
            </li>
          ))}
        </ol>
        <div className="mt-8 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {monthsList.map((m, i) => (
            <div
              key={m}
              className={cn(
                "rounded-xl p-2.5 ring-1 ring-inset",
                i === 0 ? "bg-honey-400/[0.14] ring-honey-400/30" : "bg-white/[0.05] ring-white/[0.08]",
              )}
            >
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.1em] text-ink-400">{monthName(m)}</span>
              <p className="mt-1.5 font-mono text-[0.75rem] font-medium text-cream">{nairaShort(pkg.monthly_amount_kobo + (i === 0 ? fee : 0))}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-[0.6875rem] text-ink-400">Month 1 includes the {naira(fee)} registration fee.</p>
      </div>
    </div>
  );
}

function StepHead({ step }: { step: { n: string; t: string; d: string } }) {
  return (
    <div className="border-t border-white/15 pt-4">
      <p className="font-mono text-[0.6875rem] text-honey-400">{step.n}</p>
      <p className="mt-2 text-[1.0625rem] font-bold tracking-[-0.02em] text-cream">{step.t}</p>
      <p className="mt-1.5 max-w-[22rem] pr-2 text-[0.875rem] leading-relaxed text-ink-300">{step.d}</p>
    </div>
  );
}

function Marker({ label }: { label: string }) {
  return (
    <div className="mb-3 flex items-end justify-center">
      <span className="font-mono text-[0.625rem] text-honey-400">{label}</span>
    </div>
  );
}

/** Pieces of the real customer dashboard, at full size. */
function DashboardFragments({ points }: { points: number }) {
  return (
    <div className="grid items-start gap-4 sm:grid-cols-2 lg:gap-5">
      {/* receipt */}
      <div className="relative rounded-[1.25rem] border border-ink-900/[0.07] bg-white p-6 shadow-[0_30px_60px_-40px_rgb(60_40_10/0.35)] sm:mt-8 sm:p-7">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-ink-400">Receipt</p>
          <span className="rounded-full bg-forest-50 px-2.5 py-1 text-[0.6875rem] font-semibold text-forest-700">Paid</span>
        </div>
        <p className="mt-2 font-mono text-[0.8125rem] text-ink-600">RCP-2027-004812</p>
        <p className="mt-7 font-mono text-[2.5rem] font-medium leading-none tracking-[-0.04em] text-ink-950">₦22,500</p>
        <p className="mt-2 text-[0.8125rem] text-ink-500">Month 7 of 12 · July 2027</p>
        <div className="my-6 border-t border-dashed border-ink-900/15" />
        <dl className="space-y-3 text-[0.8125rem]">
          {[
            ["Customer ID", "LUX-2027-000184"],
            ["Package", "Gold"],
            ["Covers", "Month 7"],
            ["Paid with", "Bank transfer"],
            ["Confirmed", "28 Jul 2027, 09:14"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-2">
              <dt className="text-ink-500">{k}</dt>
              <span className="leader" />
              <dd className="font-mono text-[0.75rem] text-ink-900">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 rounded-xl bg-paper p-3.5">
          <div className="flex justify-between font-mono text-[0.6875rem] text-ink-500">
            <span>7 of 12 paid</span>
            <span>₦157,500</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-900/[0.07]">
            <div className="h-full w-[58%] rounded-full bg-forest-700" />
          </div>
        </div>
        <div className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl bg-ink-950 text-[0.875rem] font-semibold text-cream">
          <Download className="size-4" /> Download PDF
        </div>
        {/* perforation */}
        <div aria-hidden className="absolute inset-x-6 -bottom-[5px] flex justify-between">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className="size-2.5 rounded-full bg-paper" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:gap-5">
      {/* fulfilment */}
      <div className="rounded-[1.25rem] border border-ink-900/[0.07] bg-white p-6 shadow-[0_30px_60px_-40px_rgb(60_40_10/0.3)]">
        <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-ink-400">Your package</p>
        <ol className="mt-5 space-y-0">
          {[
            ["Preparing", "Mon 6 Dec", "done"],
            ["Ready", "Thu 9 Dec", "done"],
            ["Collection scheduled", "Sat 11 Dec, 10:00 · Lekki hub", "now"],
            ["Collected", "", "next"],
          ].map(([t, d, s], i, all) => (
            <li key={t} className="relative flex gap-3.5 pb-5 last:pb-0">
              {i < all.length - 1 && (
                <span className={cn("absolute left-[9px] top-6 h-[calc(100%-1.25rem)] w-px", s === "done" ? "bg-forest-600" : "bg-ink-900/10")} />
              )}
              <span
                className={cn(
                  "relative mt-0.5 flex size-[1.125rem] shrink-0 items-center justify-center rounded-full",
                  s === "done" && "bg-forest-700 text-cream",
                  s === "now" && "bg-honey-100 ring-[5px] ring-honey-100/60",
                  s === "next" && "border border-ink-900/15 bg-white",
                )}
              >
                {s === "done" && <Check className="size-2.5" strokeWidth={3.5} />}
                {s === "now" && <span className="size-2 rounded-full bg-honey-500" />}
              </span>
              <div className="min-w-0">
                <p className={cn("text-[0.875rem] font-semibold", s === "next" ? "text-ink-400" : "text-ink-900")}>{t}</p>
                {d && <p className="mt-0.5 text-[0.75rem] text-ink-500">{d}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* referral */}
      <div className="rounded-[1.25rem] border border-ink-900/[0.07] bg-forest-700 p-6 text-cream shadow-[0_30px_60px_-40px_rgb(1_40_18/0.6)]">
        <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-forest-200">Your referral code</p>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white/[0.08] px-4 py-3 ring-1 ring-inset ring-white/10">
          <span className="font-mono text-[1.125rem] font-medium tracking-[0.06em]">ADAEZE2027</span>
          <Copy className="size-4 text-forest-200" />
        </div>
        <div className="mt-5 flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {["TO", "BK", "IA"].map((x, i) => (
              <span
                key={x}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-[0.625rem] font-bold tracking-tight ring-2 ring-forest-700",
                  ["bg-honey-300 text-ink-900", "bg-cream text-forest-800", "bg-clay-300 text-ink-900"][i],
                )}
              >
                {x}
              </span>
            ))}
          </div>
          <p className="text-[0.8125rem] text-forest-100">3 friends joined with your code</p>
        </div>
        {points > 0 && <p className="mt-5 border-t border-white/10 pt-4 text-[0.75rem] text-forest-200">Collect at any of our {points} hubs</p>}
      </div>
      </div>
    </div>
  );
}
