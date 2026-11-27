import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Download, Gift, Mail, MapPin, MessageCircle, Phone, ShieldAlert } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Progress } from "@/components/ui/progress";
import { Table, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { CancelEnrollmentButton, CollectionPointSelect, EditCustomerButton, RecordPaymentButton } from "@/components/admin/customer-actions";
import { MonthGrid } from "@/components/dashboard/month-grid";
import { FulfilmentTracker } from "@/components/dashboard/fulfilment-tracker";
import { Timeline } from "@/components/dashboard/timeline";
import { can, requireStaff } from "@/lib/auth";
import { CHANNEL_LABEL, ENROLLMENT_LABEL } from "@/lib/constants";
import { formatDate, formatDateTime, naira, percent, whatsappLink } from "@/lib/format";
import type { EnrollmentEvent, EnrollmentOverview, InstallmentOverview, PaymentOverview, Profile } from "@/types/db";

export const metadata: Metadata = { title: "Customer" };

export default function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <CustomerContent params={params} />
    </Suspense>
  );
}

const statusTone = { active: "forest", pending_payment: "tide", completed: "ink", cancelled: "neutral" } as const;

async function CustomerContent({ params }: { params: PageProps<"/admin/customers/[id]">["params"] }) {
  const { id } = await params;
  const session = await requireStaff("customers.view");
  const db = session.supabase;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: e } = await db.from("enrollment_overview").select("*").eq("id", id).maybeSingle<EnrollmentOverview>();
  if (!e) notFound();

  const [inst, pays, events, profile, others, referred, points] = await Promise.all([
    db.from("installment_overview").select("*").eq("enrollment_id", id).order("month_index"),
    db.from("payment_overview").select("*").eq("enrollment_id", id).order("created_at", { ascending: false }),
    db.from("enrollment_events").select("*").eq("enrollment_id", id).order("created_at", { ascending: false }).limit(12),
    db.from("profiles").select("*").eq("id", e.user_id).single<Profile>(),
    db.from("enrollment_overview").select("id, package_name, cycle_year, status").eq("user_id", e.user_id).neq("id", id),
    db.from("enrollment_overview").select("id, full_name, package_name, status").eq("referred_by_enrollment_id", id),
    db.from("collection_points").select("id, name").eq("is_active", true).order("sort_order"),
  ]);

  const installments = (inst.data ?? []) as InstallmentOverview[];
  const payments = (pays.data ?? []) as PaymentOverview[];
  const p = profile.data;
  const unpaid = installments.filter((i) => !i.paid_at).length;
  const pct = percent(e.paid_kobo, e.total_kobo);
  const canEdit = can(session.profile, "customers.edit");
  const isOpen = e.status === "active" || e.status === "pending_payment";

  return (
    <div className="space-y-6">
      <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="size-4" /> Customers
      </Link>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={e.full_name} size="lg" />
          <div className="min-w-0">
            <h1 className="font-display text-[1.85rem] font-semibold leading-tight tracking-tight text-ink-900">{e.full_name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge tone={statusTone[e.status]} dot>
                {ENROLLMENT_LABEL[e.status]}
              </Badge>
              {e.late_count > 0 && e.status === "active" && <Badge tone="danger">{e.late_count} month{e.late_count === 1 ? "" : "s"} late</Badge>}
              {e.customer_code && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sand py-0.5 pl-3 pr-0.5 font-mono text-xs text-ink-700">
                  {e.customer_code}
                  <CopyButton value={e.customer_code} iconOnly variant="ghost" className="size-6" label="Copy customer ID" />
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {e.whatsapp || e.phone ? (
            <Button asChild variant="secondary" size="sm">
              <a href={whatsappLink(e.whatsapp ?? e.phone)} target="_blank" rel="noreferrer">
                <MessageCircle className="text-[#25D366]" /> WhatsApp
              </a>
            </Button>
          ) : null}
          {e.phone && (
            <Button asChild variant="secondary" size="sm">
              <a href={`tel:${e.phone}`}>
                <Phone /> Call
              </a>
            </Button>
          )}
          <Button asChild variant="secondary" size="sm">
            <a href={`mailto:${e.email}`}>
              <Mail /> Email
            </a>
          </Button>
          {isOpen && can(session.profile, "payments.record") && (
            <RecordPaymentButton
              enrollmentId={e.id}
              monthlyKobo={e.monthly_amount_kobo}
              remainingMonths={unpaid}
              registrationKobo={e.registration_paid_at ? 0 : e.registration_fee_kobo}
            />
          )}
          {isOpen && can(session.profile, "customers.cancel") && <CancelEnrollmentButton enrollmentId={e.id} name={e.full_name} />}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardContent className="grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-sm text-ink-500">Paid so far</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">{naira(e.paid_kobo)}</p>
                <p className="tnum text-xs text-ink-400">of {naira(e.total_kobo)}</p>
              </div>
              <div>
                <p className="text-sm text-ink-500">Months paid</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
                  {e.paid_count} <span className="text-base font-normal text-ink-400">/ {e.duration_months}</span>
                </p>
                <Progress value={pct} size="sm" className="mt-2" />
              </div>
              <div>
                <p className="text-sm text-ink-500">Outstanding</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">{naira(e.outstanding_kobo)}</p>
                <p className="text-xs text-ink-400">{e.next_due_date ? `Next due ${formatDate(e.next_due_date)}` : "Nothing due"}</p>
              </div>
              {e.credit_kobo > 0 && (
                <p className="rounded-xl bg-tide-50 px-3 py-2 text-sm text-tide-700 sm:col-span-3">
                  {naira(e.credit_kobo)} is held as credit and will be applied to the next month.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthGrid installments={installments} compact />
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Payments</CardTitle>
              <p className="text-sm text-ink-500">Registration fees and contributions are recorded on separate lines.</p>
            </CardHeader>
            <CardContent className="px-0 pb-0 sm:px-0">
              {payments.length === 0 ? (
                <p className="px-6 pb-8 text-sm text-ink-500">No payment attempts yet.</p>
              ) : (
                <TableWrap>
                  <Table>
                    <THead>
                      <tr>
                        <TH>Date</TH>
                        <TH>Covers</TH>
                        <TH>Registration</TH>
                        <TH>Contribution</TH>
                        <TH>Method</TH>
                        <TH>Status</TH>
                        <TH className="w-10" />
                      </tr>
                    </THead>
                    <tbody>
                      {payments.map((pay) => (
                        <TR key={pay.id}>
                          <TD className="text-ink-900">{formatDateTime(pay.paid_at ?? pay.created_at)}</TD>
                          <TD>{pay.months_label ?? "—"}</TD>
                          <TD className="tnum">{pay.registration_kobo ? naira(pay.registration_kobo) : "—"}</TD>
                          <TD className="tnum font-semibold text-ink-900">{pay.contribution_kobo ? naira(pay.contribution_kobo) : "—"}</TD>
                          <TD>
                            {CHANNEL_LABEL[pay.channel ?? ""] ?? pay.channel ?? "—"}
                            {pay.provider === "manual" && <Badge tone="tide" size="sm" className="ml-1.5">Offline</Badge>}
                          </TD>
                          <TD>
                            <Badge tone={pay.status === "success" ? "forest" : pay.status === "pending" ? "neutral" : "danger"} size="sm" dot>
                              {pay.status === "success" ? "Paid" : pay.status === "pending" ? "Started" : pay.status === "abandoned" ? "Abandoned" : "Failed"}
                            </Badge>
                            {pay.needs_review && <ShieldAlert className="ml-1.5 inline size-4 text-ember-600" aria-label="Needs review" />}
                          </TD>
                          <TD>
                            {pay.status === "success" && (
                              <Button asChild variant="ghost" size="icon-sm" aria-label="Download receipt">
                                <a href={`/api/receipts/${pay.id}?team=1`} target="_blank" rel="noreferrer">
                                  <Download />
                                </a>
                              </Button>
                            )}
                          </TD>
                        </TR>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              )}
            </CardContent>
          </Card>

          {e.status === "completed" && (
            <Card>
              <CardHeader>
                <CardTitle>Package status</CardTitle>
              </CardHeader>
              <CardContent className="pt-7">
                <FulfilmentTracker enrollment={e} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Contact</CardTitle>
              {canEdit && p && (
                <EditCustomerButton
                  userId={p.id}
                  initial={{
                    full_name: p.full_name,
                    phone: p.phone ?? "",
                    whatsapp: p.whatsapp ?? "",
                    address: p.address ?? "",
                    state: p.state ?? "",
                    lga: p.lga ?? "",
                    emergency_contact_name: p.emergency_contact_name ?? "",
                    emergency_contact_phone: p.emergency_contact_phone ?? "",
                  }}
                />
              )}
            </CardHeader>
            <CardContent>
              <dl className="space-y-3.5 text-sm">
                <Info label="Email" value={e.email} />
                <Info label="Phone" value={e.phone} />
                <Info label="WhatsApp" value={e.whatsapp} />
                <Info label="Address" value={[e.address, e.lga, e.state].filter(Boolean).join(", ")} />
                <Info label="Emergency contact" value={p?.emergency_contact_name ? `${p.emergency_contact_name} · ${p.emergency_contact_phone ?? ""}` : null} />
                <Info label="Registered" value={formatDateTime(e.created_at)} />
                {e.activated_at && <Info label="Activated" value={formatDateTime(e.activated_at)} />}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{e.package_name}</CardTitle>
              <p className="tnum text-sm text-ink-500">
                {naira(e.monthly_amount_kobo)} × {e.duration_months} months · {e.cycle_year}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-400">
                  <MapPin className="size-3.5" /> Collection point
                </p>
                {canEdit && isOpen ? (
                  <CollectionPointSelect enrollmentId={e.id} value={e.collection_point_id} points={points.data ?? []} />
                ) : (
                  <p className="text-ink-800">{e.collection_point_name ?? "—"}</p>
                )}
              </div>
              {e.savings_return_kobo > 0 && (
                <div className="flex items-start gap-3 rounded-2xl bg-leaf-50 p-3.5 ring-1 ring-inset ring-leaf-100">
                  <Gift className="mt-0.5 size-4 shrink-0 text-leaf-700" />
                  <div>
                    <p className="font-semibold text-ink-900">Savings return {naira(e.savings_return_kobo)}</p>
                    <p className="text-xs text-ink-600">
                      {e.savings_return_status === "paid"
                        ? `Paid ${formatDate(e.savings_return_paid_at)}${e.savings_return_reference ? ` · ${e.savings_return_reference}` : ""}`
                        : e.savings_return_status === "pending"
                          ? "Due now"
                          : "Due after completion"}
                    </p>
                  </div>
                </div>
              )}
              {e.cancelled_at && <p className="rounded-xl bg-sand p-3 text-ink-600">Cancelled {formatDate(e.cancelled_at)}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Referrals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Info label="Their code" value={e.referral_code} mono />
              <Info label="Referred by" value={e.referred_by_code} mono />
              <div>
                <p className="text-xs font-medium text-ink-400">People they referred</p>
                {(referred.data ?? []).length === 0 ? (
                  <p className="mt-0.5 text-ink-500">None yet</p>
                ) : (
                  <ul className="mt-1.5 space-y-1">
                    {(referred.data ?? []).map((r) => (
                      <li key={r.id}>
                        <Link href={`/admin/customers/${r.id}`} className="font-medium text-forest-700 hover:underline">
                          {r.full_name}
                        </Link>{" "}
                        <span className="text-ink-400">· {r.package_name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          {(others.data ?? []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Other packages</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {(others.data ?? []).map((o) => (
                    <li key={o.id} className="flex items-center justify-between">
                      <Link href={`/admin/customers/${o.id}`} className="font-medium text-forest-700 hover:underline">
                        {o.package_name} {o.cycle_year}
                      </Link>
                      <Badge tone={statusTone[o.status as keyof typeof statusTone]} size="sm">
                        {ENROLLMENT_LABEL[o.status as keyof typeof ENROLLMENT_LABEL]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {(events.data ?? []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline events={(events.data ?? []) as EnrollmentEvent[]} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink-400">{label}</dt>
      <dd className={mono ? "mt-0.5 font-mono text-ink-800" : "mt-0.5 text-ink-800"}>{value || "—"}</dd>
    </div>
  );
}
