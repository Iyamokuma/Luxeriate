"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleCheck,
  CircleX,
  Gift,
  Lock,
  MapPin,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/app/(auth)/auth-form";
import { useCheckout } from "@/components/payments/checkout";
import { STATES, lgasFor } from "@/lib/data/nigeria";
import { THEME_STYLES } from "@/lib/constants";
import { contributionPeriod, formatMonth, naira } from "@/lib/format";
import { qtyLabel } from "@/lib/quantity";
import { accountSchema, detailsSchema, fieldErrors } from "@/lib/validation";
import { cn } from "@/lib/utils";
import type { CollectionPoint, PackageWithItems } from "@/types/db";
import { checkReferral, registerAndPay } from "../actions";
import { ArcsMotif } from "@/components/ui/logo";

type Values = {
  full_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  state: string;
  lga: string;
  collection_point_id: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  referral_code: string;
};

type Account = Omit<Values, "collection_point_id" | "referral_code"> | null;

const STEPS = ["Your details", "Review", "Secure & pay"];

export function JoinWizard({
  pkg,
  points,
  account,
  catchUpMonths,
}: {
  pkg: PackageWithItems;
  points: CollectionPoint[];
  account: Account;
  catchUpMonths: number;
}) {
  const draftKey = `lux:join:${pkg.slug}`;
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(() => ({
    full_name: account?.full_name ?? "",
    email: account?.email ?? "",
    phone: account?.phone ?? "",
    whatsapp: account?.whatsapp ?? "",
    address: account?.address ?? "",
    state: account?.state ?? "",
    lga: account?.lga ?? "",
    collection_point_id: points.length === 1 ? points[0].id : "",
    emergency_contact_name: account?.emergency_contact_name ?? "",
    emergency_contact_phone: account?.emergency_contact_phone ?? "",
    referral_code: "",
  }));
  const [sameWhatsapp, setSameWhatsapp] = useState(!account?.whatsapp || account.whatsapp === account.phone);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [months, setMonths] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [exists, setExists] = useState(false);
  const [referral, setReferral] = useState<{ state: "idle" | "checking" | "valid" | "invalid"; referrer?: string }>({ state: "idle" });
  const [summaryOpen, setSummaryOpen] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const { checkout, dialog } = useCheckout({ onCancelHref: "/dashboard" });

  const theme = THEME_STYLES[pkg.theme] ?? THEME_STYLES.oat;
  const lgas = useMemo(() => lgasFor(values.state), [values.state]);
  const point = points.find((p) => p.id === values.collection_point_id);
  const todayKobo = pkg.registration_fee_kobo + pkg.monthly_amount_kobo * months;

  // Restore / persist a draft of the (non-sensitive) details
  useEffect(() => {
    if (account) return;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<Values>;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValues((v) => ({ ...v, ...draft }));
      }
    } catch {}
  }, [account, draftKey]);

  useEffect(() => {
    if (account) return;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(values));
    } catch {}
  }, [values, account, draftKey]);

  // Live referral check
  useEffect(() => {
    const code = values.referral_code.trim();
    if (code.length < 4) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReferral({ state: "idle" });
      return;
    }
    setReferral({ state: "checking" });
    const t = setTimeout(async () => {
      const r = await checkReferral(code);
      setReferral(r.valid ? { state: "valid", referrer: r.referrer } : { state: "invalid" });
    }, 450);
    return () => clearTimeout(t);
  }, [values.referral_code]);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.value;
    setValues((prev) => {
      const next = { ...prev, [k]: v };
      if (k === "state") next.lga = "";
      if (k === "phone" && sameWhatsapp) next.whatsapp = v;
      return next;
    });
    if (errors[k]) setErrors((er) => ({ ...er, [k]: "" }));
  };

  const goTo = (s: number) => {
    setStep(s);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const validateDetails = () => {
    const r = detailsSchema.safeParse({ ...values, whatsapp: sameWhatsapp ? values.phone : values.whatsapp });
    if (!r.success) {
      const fe = fieldErrors(r.error);
      setErrors(fe);
      const first = Object.keys(fe)[0];
      document.getElementById(first)?.focus({ preventScroll: false });
      return false;
    }
    if (referral.state === "invalid") {
      setErrors({ referral_code: "We couldn't find that code. Check it, or leave it empty." });
      document.getElementById("referral_code")?.focus();
      return false;
    }
    setErrors({});
    return true;
  };

  const submit = async () => {
    const fe: Record<string, string> = {};
    if (!account) {
      const a = accountSchema.safeParse({ password, confirm_password: confirm });
      if (!a.success) Object.assign(fe, fieldErrors(a.error));
    }
    if (!acceptTerms) fe.accept_terms = "Please accept the terms and conditions to continue";
    if (Object.keys(fe).length) {
      setErrors(fe);
      return;
    }
    setSubmitting(true);
    try {
      const res = await registerAndPay({
        packageId: pkg.id,
        details: { ...values, whatsapp: sameWhatsapp ? values.phone : values.whatsapp },
        account: account ? undefined : { password, confirm_password: confirm },
        acceptTerms,
        months,
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setExists(Boolean(res.exists));
        if (typeof res.step === "number" && res.step !== step) goTo(res.step);
        toast.error(res.error);
        return;
      }
      try {
        sessionStorage.removeItem(draftKey);
      } catch {}
      await checkout(res.payment);
    } catch {
      toast.error("Something went wrong. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const summary = (
    <div className="card overflow-hidden">
      <div className={cn("relative overflow-hidden px-6 pb-6 pt-5", theme.card, theme.dark ? "text-cream" : "")}>
        <ArcsMotif className={cn("absolute -right-6 -top-10 h-36", theme.dark ? "text-honey-300/40" : "text-honey-400/35")} />
        <p className={cn("eyebrow relative", theme.dark ? "text-honey-300" : "text-forest-600")}>{pkg.cycle_year} package</p>
        <p className={cn("relative mt-1 font-display text-2xl font-semibold", theme.dark ? "text-cream" : "text-ink-900")}>{pkg.name}</p>
        <p className={cn("tnum relative mt-1 text-sm", theme.dark ? "text-forest-100/80" : "text-ink-500")}>
          {naira(pkg.monthly_amount_kobo)} / month · {contributionPeriod(pkg.start_month, pkg.duration_months)}
        </p>
      </div>
      <div className="space-y-3 p-6 text-[0.9375rem]">
        <Line label="Registration (one-time)" value={naira(pkg.registration_fee_kobo)} />
        <Line
          label={months === 1 ? `${formatMonth(pkg.start_month)} contribution` : `${months} months' contributions`}
          value={naira(pkg.monthly_amount_kobo * months)}
        />
        <div className="h-px bg-line" />
        <div className="flex items-baseline justify-between">
          <span className="font-semibold text-ink-900">Pay today</span>
          <span className="tnum font-display text-2xl font-semibold text-ink-900">{naira(todayKobo)}</span>
        </div>
        <p className="tnum text-[0.8125rem] text-ink-500">
          Then {naira(pkg.monthly_amount_kobo)} a month for the remaining {pkg.duration_months - months} month
          {pkg.duration_months - months === 1 ? "" : "s"}.
        </p>
        {pkg.savings_return_kobo > 0 && (
          <p className="flex items-center gap-2 rounded-xl bg-honey-50 px-3 py-2.5 text-[0.8125rem] font-medium text-honey-700">
            <Gift className="size-4 shrink-0" /> Includes a {naira(pkg.savings_return_kobo)} savings return
          </p>
        )}
      </div>
      <div className="flex items-center justify-center gap-1.5 border-t border-line bg-sand/50 px-6 py-3 text-xs text-ink-500">
        <ShieldCheck className="size-3.5 text-forest-600" /> Card, bank transfer or USSD via Paystack
      </div>
    </div>
  );

  return (
    <div ref={topRef} className="mx-auto max-w-6xl scroll-mt-4 px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      {dialog}
      <Link href={`/packages/${pkg.slug}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="size-4" /> {pkg.name} package
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
        {account ? `Join ${pkg.name}` : "Create your account"}
      </h1>
      <p className="mt-2 text-ink-500">
        {account ? "Confirm your details and make your first payment." : "It takes about five minutes. You'll pay on the last step."}
      </p>

      {/* Stepper */}
      <ol className="mt-8 flex items-center gap-2 sm:gap-3" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              disabled={i > step}
              onClick={() => i < step && goTo(i)}
              className="group flex items-center gap-2.5 disabled:cursor-default"
              aria-current={i === step ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300",
                  i < step && "bg-forest-700 text-cream",
                  i === step && "bg-forest-700 text-cream ring-4 ring-forest-500/15",
                  i > step && "border border-line-strong bg-cream text-ink-400",
                )}
              >
                {i < step ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("hidden text-sm font-semibold sm:block", i <= step ? "text-ink-900" : "text-ink-400")}>{label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <span className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                <span
                  className="absolute inset-y-0 left-0 bg-forest-600 transition-[width] duration-500 ease-[var(--ease-out-soft)]"
                  style={{ width: i < step ? "100%" : "0%" }}
                />
              </span>
            )}
          </li>
        ))}
      </ol>

      {/* Mobile summary */}
      <div className="mt-6 lg:hidden">
        <button
          type="button"
          onClick={() => setSummaryOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-2xl border border-line bg-cream px-5 py-3.5 shadow-soft"
        >
          <span className="text-sm text-ink-600">
            {pkg.name} · <span className="font-semibold text-ink-900">Pay today {naira(todayKobo)}</span>
          </span>
          <ChevronDown className={cn("size-4 text-ink-400 transition-transform", summaryOpen && "rotate-180")} />
        </button>
        {summaryOpen && <div className="mt-3 animate-scale-in">{summary}</div>}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:gap-10">
        <div className="min-w-0">
          {/* STEP 1 — details */}
          {step === 0 && (
            <form
              noValidate
              className="card animate-fade-in"
              onSubmit={(e) => {
                e.preventDefault();
                if (validateDetails()) goTo(1);
              }}
            >
              <Section title="About you" first>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Full name" htmlFor="full_name" error={errors.full_name} className="sm:col-span-2">
                    <Input id="full_name" autoComplete="name" value={values.full_name} onChange={set("full_name")} aria-invalid={!!errors.full_name} placeholder="Funmilayo Adeyemi" />
                  </Field>
                  <Field
                    label="Email address"
                    htmlFor="email"
                    error={errors.email}
                    hint={account ? "This is the email on your account." : "Receipts and reminders go here."}
                    className="sm:col-span-2"
                  >
                    <Input id="email" type="email" inputMode="email" autoComplete="email" value={values.email} onChange={set("email")} disabled={!!account} aria-invalid={!!errors.email} placeholder="you@example.com" />
                  </Field>
                  {exists && (
                    <p className="-mt-2 rounded-xl bg-honey-50 px-4 py-3 text-sm text-honey-700 sm:col-span-2">
                      Already registered?{" "}
                      <Link className="font-semibold underline" href={`/login?next=/join/${pkg.slug}`}>
                        Log in to continue
                      </Link>
                    </p>
                  )}
                  <Field label="Phone number" htmlFor="phone" error={errors.phone}>
                    <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={values.phone} onChange={set("phone")} aria-invalid={!!errors.phone} placeholder="0803 123 4567" />
                  </Field>
                  <Field label="WhatsApp number" htmlFor="whatsapp" error={sameWhatsapp ? undefined : errors.whatsapp}>
                    <Input
                      id="whatsapp"
                      type="tel"
                      inputMode="tel"
                      value={sameWhatsapp ? values.phone : values.whatsapp}
                      onChange={set("whatsapp")}
                      disabled={sameWhatsapp}
                      aria-invalid={!sameWhatsapp && !!errors.whatsapp}
                      placeholder="0803 123 4567"
                    />
                  </Field>
                  <label className="-mt-2 flex cursor-pointer items-center gap-2.5 text-sm text-ink-600 sm:col-span-2">
                    <Checkbox checked={sameWhatsapp} onCheckedChange={(c) => setSameWhatsapp(c === true)} />
                    My WhatsApp number is the same as my phone number
                  </label>
                </div>
              </Section>

              <Section title="Where you live">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Home address" htmlFor="address" error={errors.address} className="sm:col-span-2">
                    <Input id="address" autoComplete="street-address" value={values.address} onChange={set("address")} aria-invalid={!!errors.address} placeholder="House number, street, area" />
                  </Field>
                  <Field label="State" htmlFor="state" error={errors.state}>
                    <NativeSelect id="state" value={values.state} onChange={set("state")} aria-invalid={!!errors.state}>
                      <option value="">Select state</option>
                      {STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field label="LGA" htmlFor="lga" error={errors.lga}>
                    <NativeSelect id="lga" value={values.lga} onChange={set("lga")} disabled={!values.state} aria-invalid={!!errors.lga}>
                      <option value="">{values.state ? "Select LGA" : "Choose a state first"}</option>
                      {lgas.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
              </Section>

              <Section title="Preferred collection point" description="Where you'll pick up your package at the end of the cycle.">
                <div role="radiogroup" aria-label="Collection point" className="grid gap-3 sm:grid-cols-2" id="collection_point_id" tabIndex={-1}>
                  {points.map((p) => {
                    const active = values.collection_point_id === p.id;
                    return (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={active}
                        key={p.id}
                        onClick={() => {
                          setValues((v) => ({ ...v, collection_point_id: p.id }));
                          setErrors((er) => ({ ...er, collection_point_id: "" }));
                        }}
                        className={cn(
                          "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                          active ? "border-forest-600 bg-forest-50 ring-4 ring-forest-500/10" : "border-line-strong bg-white hover:border-ink-300",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition",
                            active ? "border-forest-600 bg-forest-600" : "border-ink-200",
                          )}
                        >
                          {active && <span className="size-2 rounded-full bg-cream" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink-900">{p.name}</span>
                          <span className="mt-0.5 flex items-start gap-1 text-[0.8125rem] text-ink-500">
                            <MapPin className="mt-0.5 size-3 shrink-0" /> {p.address}
                            {p.state ? `, ${p.state}` : ""}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errors.collection_point_id && <p className="mt-2 text-[0.8125rem] font-medium text-danger-600">{errors.collection_point_id}</p>}
              </Section>

              <Section title="Emergency contact" description="Someone we can reach if we can't get hold of you.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Name" htmlFor="emergency_contact_name" error={errors.emergency_contact_name}>
                    <Input id="emergency_contact_name" value={values.emergency_contact_name} onChange={set("emergency_contact_name")} aria-invalid={!!errors.emergency_contact_name} />
                  </Field>
                  <Field label="Phone number" htmlFor="emergency_contact_phone" error={errors.emergency_contact_phone}>
                    <Input id="emergency_contact_phone" type="tel" inputMode="tel" value={values.emergency_contact_phone} onChange={set("emergency_contact_phone")} aria-invalid={!!errors.emergency_contact_phone} />
                  </Field>
                </div>
              </Section>

              <Section title="Referral code" description="Did someone recommend us? Enter their code.">
                <Field htmlFor="referral_code" error={errors.referral_code} optional label="Code">
                  <Input
                    id="referral_code"
                    value={values.referral_code}
                    onChange={set("referral_code")}
                    className="uppercase placeholder:normal-case"
                    placeholder="e.g. FUNMI2027"
                    autoCapitalize="characters"
                    aria-invalid={!!errors.referral_code}
                    suffix={
                      referral.state === "checking" ? (
                        <span className="px-2 text-ink-400"><Spinner /></span>
                      ) : referral.state === "valid" ? (
                        <CircleCheck className="mr-2 size-5 text-forest-600" />
                      ) : referral.state === "invalid" ? (
                        <CircleX className="mr-2 size-5 text-danger-500" />
                      ) : null
                    }
                  />
                </Field>
                {referral.state === "valid" && (
                  <p className="mt-2 animate-fade-in text-sm font-medium text-forest-700">Referred by {referral.referrer}. Welcome!</p>
                )}
                {referral.state === "invalid" && !errors.referral_code && (
                  <p className="mt-2 animate-fade-in text-sm text-danger-600">We couldn&apos;t find that code.</p>
                )}
              </Section>

              <div className="flex justify-end border-t border-line px-6 py-5 sm:px-8">
                <Button type="submit" size="lg">
                  Continue <ArrowRight />
                </Button>
              </div>
            </form>
          )}

          {/* STEP 2 — review */}
          {step === 1 && (
            <div className="card animate-fade-in">
              <Section title="Your package" first>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-semibold text-ink-900">{pkg.name}</p>
                    <p className="tnum text-sm text-ink-500">
                      {pkg.package_items.length} food items · {naira(pkg.monthly_amount_kobo)} for {pkg.duration_months} months ·{" "}
                      {naira(pkg.monthly_amount_kobo * pkg.duration_months)} in total
                    </p>
                  </div>
                </div>
                <ul className="mt-4 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
                  {pkg.package_items.map((it) => (
                    <li key={it.id} className="flex items-end">
                      <span className="text-ink-600">{it.name}</span>
                      <span className="leader" />
                      <span className="tnum font-semibold text-ink-800">{qtyLabel(it.quantity, it.unit)}</span>
                    </li>
                  ))}
                </ul>
                {pkg.savings_return_kobo > 0 && (
                  <p className="mt-4 flex items-center gap-2 text-sm font-medium text-clay-600">
                    <Gift className="size-4" /> Plus a {naira(pkg.savings_return_kobo)} savings return, paid separately after your final month.
                  </p>
                )}
              </Section>

              {catchUpMonths > 1 && (
                <Section title="How much would you like to pay today?" description={`This cycle started in ${formatMonth(pkg.start_month)}, so ${catchUpMonths} months are already due.`}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[1, catchUpMonths].map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setMonths(m)}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition-all",
                          months === m ? "border-forest-600 bg-forest-50 ring-4 ring-forest-500/10" : "border-line-strong bg-white hover:border-ink-300",
                        )}
                      >
                        <p className="font-semibold text-ink-900">{m === 1 ? "First month only" : `Catch up all ${m} months`}</p>
                        <p className="tnum mt-1 font-display text-xl font-semibold text-ink-900">
                          {naira(pkg.registration_fee_kobo + pkg.monthly_amount_kobo * m)}
                        </p>
                        <p className="mt-1 text-xs text-ink-500">
                          {m === 1 ? "You can pay the other due months from your dashboard." : "You'll be fully up to date."}
                        </p>
                      </button>
                    ))}
                  </div>
                </Section>
              )}

              <Section title="Your details">
                <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
                  <Review label="Name" value={values.full_name} />
                  <Review label="Email" value={values.email} />
                  <Review label="Phone" value={values.phone} />
                  <Review label="WhatsApp" value={sameWhatsapp ? values.phone : values.whatsapp} />
                  <Review label="Address" value={`${values.address}, ${values.lga}, ${values.state}`} />
                  <Review label="Collection point" value={point ? `${point.name}, ${point.address}` : "—"} />
                  <Review label="Emergency contact" value={`${values.emergency_contact_name} · ${values.emergency_contact_phone}`} />
                  {values.referral_code && <Review label="Referral code" value={`${values.referral_code.toUpperCase()}${referral.referrer ? ` (${referral.referrer})` : ""}`} />}
                </dl>
                <Button variant="ghost" size="sm" className="mt-4 -ml-3" onClick={() => goTo(0)}>
                  <Pencil /> Edit details
                </Button>
              </Section>

              <div className="flex items-center justify-between border-t border-line px-6 py-5 sm:px-8">
                <Button variant="ghost" onClick={() => goTo(0)}>
                  <ArrowLeft /> Back
                </Button>
                <Button size="lg" onClick={() => goTo(2)}>
                  Continue <ArrowRight />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 — secure & pay */}
          {step === 2 && (
            <form
              noValidate
              className="card animate-fade-in"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              {!account && (
                <Section title="Choose a password" description={`You'll log in with ${values.email} to pay monthly and download receipts.`} first>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters.">
                      <PasswordInput
                        id="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setErrors((er) => ({ ...er, password: "" }));
                        }}
                        aria-invalid={!!errors.password}
                      />
                    </Field>
                    <Field label="Confirm password" htmlFor="confirm_password" error={errors.confirm_password}>
                      <PasswordInput
                        id="confirm_password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => {
                          setConfirm(e.target.value);
                          setErrors((er) => ({ ...er, confirm_password: "" }));
                        }}
                        aria-invalid={!!errors.confirm_password}
                      />
                    </Field>
                  </div>
                  <PasswordMeter value={password} />
                </Section>
              )}

              <Section title="Terms and conditions" first={!!account}>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-paper p-4">
                  <Checkbox
                    className="mt-0.5"
                    checked={acceptTerms}
                    onCheckedChange={(c) => {
                      setAcceptTerms(c === true);
                      setErrors((er) => ({ ...er, accept_terms: "" }));
                    }}
                    aria-invalid={!!errors.accept_terms}
                  />
                  <span className="text-sm leading-relaxed text-ink-700">
                    I have read and accept the{" "}
                    <Link href="/terms" target="_blank" className="font-semibold text-forest-700 underline underline-offset-2">
                      terms and conditions
                    </Link>
                    , including what happens if I miss a payment or leave early.
                  </span>
                </label>
                {errors.accept_terms && <p className="mt-2 text-[0.8125rem] font-medium text-danger-600">{errors.accept_terms}</p>}
              </Section>

              <div className="space-y-4 border-t border-line px-6 py-6 sm:px-8">
                <Button type="submit" size="lg" block loading={submitting} className="h-14 text-base">
                  <Lock /> Pay {naira(todayKobo)} securely
                </Button>
                <p className="text-center text-xs leading-relaxed text-ink-500">
                  Paystack&apos;s secure checkout opens next. Pay by card, bank transfer or USSD. Your account is activated the moment
                  the payment is confirmed.
                </p>
                <Button type="button" variant="ghost" className="mx-auto flex" onClick={() => goTo(1)}>
                  <ArrowLeft /> Back
                </Button>
              </div>
            </form>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-6">{summary}</div>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, description, first, children }: { title: string; description?: string; first?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("px-6 py-6 sm:px-8 sm:py-7", !first && "border-t border-line")}>
      <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-ink-800">{value || "—"}</dd>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink-500">{label}</span>
      <span className="tnum font-semibold text-ink-900">{value}</span>
    </div>
  );
}

function PasswordMeter({ value }: { value: string }) {
  const score = [value.length >= 8, /[A-Z]/.test(value) && /[a-z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value) || value.length >= 12].filter(Boolean).length;
  if (!value) return null;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-danger-500", "bg-danger-500", "bg-honey-400", "bg-forest-400", "bg-forest-600"];
  return (
    <div className="mt-3 flex items-center gap-3">
      <div className="flex flex-1 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i < score ? colors[score] : "bg-ink-100")} />
        ))}
      </div>
      <span className="w-16 text-right text-xs font-medium text-ink-500">{labels[value.length < 8 ? 0 : score]}</span>
    </div>
  );
}
