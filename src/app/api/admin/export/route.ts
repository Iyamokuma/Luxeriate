import type { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { can, getSession, isStaff } from "@/lib/auth";
import { CHANNEL_LABEL, ENROLLMENT_LABEL, INSTALLMENT_LABEL, type Permission } from "@/lib/constants";
import { formatMonth } from "@/lib/format";
import { ReportDocument } from "@/lib/pdf/report";
import { buildWorkbook, fileResponse } from "@/lib/xlsx";
import { escapeFilter } from "@/lib/utils";
import type { EnrollmentOverview, InstallmentOverview, MonthlyCollection, PaymentOverview, ProcurementRow } from "@/types/db";

const NEED: Record<string, Permission> = {
  customers: "customers.view",
  installments: "payments.view",
  transactions: "payments.view",
  procurement: "procurement.view",
  report: "reports.view",
};

type Paged<T> = (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>;

/** Supabase returns at most 1,000 rows per request, so page through everything. */
async function fetchAll<T>(page: Paged<T>) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") ?? "";
  const format = sp.get("format") === "pdf" ? "pdf" : "xlsx";
  const session = await getSession();
  if (!session || !isStaff(session.profile)) return new Response("Please sign in.", { status: 401 });
  const need = NEED[type];
  if (!need) return new Response("Unknown export.", { status: 400 });
  if (!can(session.profile, need)) return new Response("You don't have permission to export this.", { status: 403 });

  const db = session.supabase;
  const year = Number(sp.get("year")) || new Date().getFullYear();
  const q = escapeFilter(sp.get("q") ?? "");
  const stamp = new Date().toISOString().slice(0, 10);
  const { data: settings } = await db.from("app_settings").select("business_name").eq("id", 1).single();
  const business = settings?.business_name ?? "Luxuriate Foodstuff";

  if (type === "customers") {
    const status = sp.get("status") ?? "";
    const rows = await fetchAll<EnrollmentOverview>((from, to) => {
      let qb = db.from("enrollment_overview").select("*").eq("cycle_year", year);
      if (q) qb = qb.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,customer_code.ilike.%${q}%,email.ilike.%${q}%`);
      if (status === "late") qb = qb.eq("status", "active").gt("late_count", 0);
      else if (status) qb = qb.eq("status", status);
      else qb = qb.neq("status", "cancelled");
      if (sp.get("package")) qb = qb.eq("package_id", sp.get("package")!);
      if (sp.get("point")) qb = qb.eq("collection_point_id", sp.get("point")!);
      return qb.order("created_at").range(from, to);
    });
    const buf = await buildWorkbook(`Customers ${year}`, [
      {
        name: `Customers ${year}`,
        columns: [
          { header: "Customer ID", key: "customer_code", width: 18 },
          { header: "Name", key: "full_name", width: 26 },
          { header: "Phone", key: "phone", width: 15 },
          { header: "WhatsApp", key: "whatsapp", width: 15 },
          { header: "Email", key: "email", width: 28 },
          { header: "State", key: "state", width: 14 },
          { header: "LGA", key: "lga", width: 16 },
          { header: "Address", key: "address", width: 32 },
          { header: "Package", key: "package_name", width: 16 },
          { header: "Status", key: "status_label", width: 16 },
          { header: "Months paid", key: "paid_count", format: "number", width: 12 },
          { header: "Of", key: "duration_months", format: "number", width: 6 },
          { header: "Paid", key: "paid_kobo", format: "naira", width: 14 },
          { header: "Outstanding", key: "outstanding_kobo", format: "naira", width: 14 },
          { header: "Months late", key: "late_count", format: "number", width: 11 },
          { header: "Collection point", key: "collection_point_name", width: 18 },
          { header: "Referral code", key: "referral_code", width: 16 },
          { header: "Referred by", key: "referred_by_code", width: 16 },
          { header: "Registered", key: "created_at", format: "date", width: 13 },
          { header: "Package status", key: "fulfilment_status", width: 18 },
        ],
        rows: rows.map((r) => ({ ...r, status_label: ENROLLMENT_LABEL[r.status], fulfilment_status: r.fulfilment_status.replace(/_/g, " ") })),
      },
    ]);
    return fileResponse(buf, `customers-${year}-${stamp}.xlsx`, "xlsx");
  }

  if (type === "installments") {
    const state = sp.get("state") ?? "";
    const rows = await fetchAll<InstallmentOverview>((from, to) => {
      let qb = db.from("installment_overview").select("*").eq("cycle_year", year).not("enrollment_status", "in", "(cancelled,pending_payment)");
      if (state === "paid") qb = qb.eq("state", "paid");
      else if (state === "unpaid") qb = qb.in("state", ["due", "upcoming"]);
      else if (state === "late") qb = qb.eq("state", "late");
      else if (state === "completed") qb = qb.eq("enrollment_status", "completed");
      if (sp.get("month")) qb = qb.eq("period_month", sp.get("month")!);
      if (sp.get("package")) qb = qb.eq("package_id", sp.get("package")!);
      if (q) qb = qb.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,customer_code.ilike.%${q}%`);
      return qb.order("period_month").order("full_name").range(from, to);
    });
    const buf = await buildWorkbook(`Contributions ${year}`, [
      {
        name: "Contributions",
        columns: [
          { header: "Customer ID", key: "customer_code", width: 18 },
          { header: "Name", key: "full_name", width: 26 },
          { header: "Phone", key: "phone", width: 15 },
          { header: "Package", key: "package_name", width: 16 },
          { header: "Month", key: "month", width: 14 },
          { header: "Due date", key: "due_date", format: "date", width: 13 },
          { header: "Amount", key: "amount_kobo", format: "naira", width: 13 },
          { header: "Status", key: "state_label", width: 11 },
          { header: "Paid on", key: "paid_at", format: "date", width: 13 },
        ],
        rows: rows.map((r) => ({ ...r, month: formatMonth(r.period_month), state_label: INSTALLMENT_LABEL[r.state] })),
      },
    ]);
    return fileResponse(buf, `contributions-${year}-${stamp}.xlsx`, "xlsx");
  }

  if (type === "transactions") {
    const status = sp.get("status") || "success";
    const rows = await fetchAll<PaymentOverview>((from, to) => {
      let qb = db.from("payment_overview").select("*").eq("cycle_year", year);
      if (status !== "all") qb = qb.eq("status", status);
      if (sp.get("review") === "1") qb = qb.eq("needs_review", true);
      if (sp.get("package")) qb = qb.eq("package_id", sp.get("package")!);
      if (q) qb = qb.or(`full_name.ilike.%${q}%,customer_code.ilike.%${q}%,reference.ilike.%${q}%,receipt_number.ilike.%${q}%`);
      return qb.order("created_at").range(from, to);
    });
    const buf = await buildWorkbook(`Transactions ${year}`, [
      {
        name: "Transactions",
        columns: [
          { header: "Date", key: "date", format: "datetime", width: 18 },
          { header: "Receipt", key: "receipt_number", width: 17 },
          { header: "Reference", key: "reference", width: 24 },
          { header: "Customer ID", key: "customer_code", width: 18 },
          { header: "Name", key: "full_name", width: 26 },
          { header: "Package", key: "package_name", width: 16 },
          { header: "Months", key: "months_label", width: 24 },
          { header: "Registration fee", key: "registration_kobo", format: "naira", width: 15 },
          { header: "Contribution", key: "contribution_kobo", format: "naira", width: 14 },
          { header: "Total", key: "amount_kobo", format: "naira", width: 13 },
          { header: "Paystack fee", key: "fees_kobo", format: "naira", width: 13 },
          { header: "Method", key: "method", width: 14 },
          { header: "Status", key: "status", width: 10 },
          { header: "Needs review", key: "review", width: 12 },
        ],
        rows: rows.map((r) => ({
          ...r,
          date: r.paid_at ?? r.created_at,
          method: (CHANNEL_LABEL[r.channel ?? ""] ?? r.channel ?? "") + (r.provider === "manual" ? " (offline)" : ""),
          review: r.needs_review ? "Yes" : "",
        })),
        totals: {
          date: "Total",
          registration_kobo: rows.reduce((s, r) => s + Number(r.registration_kobo), 0),
          contribution_kobo: rows.reduce((s, r) => s + Number(r.contribution_kobo), 0),
          amount_kobo: rows.filter((r) => r.status === "success").reduce((s, r) => s + Number(r.amount_kobo), 0),
        },
      },
    ]);
    return fileResponse(buf, `transactions-${year}-${stamp}.xlsx`, "xlsx");
  }

  if (type === "procurement") {
    const statuses = sp.get("scope") === "completed" ? ["completed"] : ["active", "completed"];
    const { data } = await db.rpc("procurement_totals", { p_cycle_year: year, p_statuses: statuses });
    const rows = (data ?? []) as ProcurementRow[];
    const subtitle = `${year} cycle · ${statuses.length === 1 ? "completed customers only" : "all contributing customers"}`;
    if (format === "pdf") {
      const buf = await renderToBuffer(
        ReportDocument({
          businessName: business,
          title: "Procurement list",
          subtitle,
          stats: [
            { label: "Items", value: rows.length },
            { label: "Packages", value: new Set(rows.flatMap((r) => r.breakdown.map((b) => b.package))).size },
          ],
          sections: [
            {
              heading: "Buying list",
              columns: [
                { label: "Item", width: 3 },
                { label: "Total", width: 1.4, align: "right" },
                { label: "Unit", width: 1 },
                { label: "Customers", width: 1, align: "right" },
                { label: "By package", width: 4 },
              ],
              rows: rows.map((r) => [
                r.item_name,
                Number(r.total_quantity).toLocaleString("en-NG"),
                r.unit,
                Number(r.customers).toLocaleString("en-NG"),
                r.breakdown.map((b) => `${b.package} ${b.customers}×${Number(b.per_customer)}`).join(", "),
              ]),
            },
          ],
        }),
      );
      return fileResponse(buf, `procurement-${year}-${stamp}.pdf`, "pdf");
    }
    const packages = [...new Set(rows.flatMap((r) => r.breakdown.map((b) => b.package)))];
    const buf = await buildWorkbook(`Procurement ${year}`, [
      {
        name: "Buying list",
        columns: [
          { header: "Item", key: "item_name", width: 26 },
          { header: "Total quantity", key: "total_quantity", format: "number", width: 15 },
          { header: "Unit", key: "unit", width: 10 },
          { header: "Customers", key: "customers", format: "number", width: 11 },
          ...packages.map((p) => ({ header: p, key: `p:${p}`, format: "number" as const, width: Math.max(12, p.length + 2) })),
        ],
        rows: rows.map((r) => ({
          ...r,
          total_quantity: Number(r.total_quantity),
          ...Object.fromEntries(r.breakdown.map((b) => [`p:${b.package}`, Number(b.quantity)])),
        })),
      },
    ]);
    return fileResponse(buf, `procurement-${year}-${stamp}.xlsx`, "xlsx");
  }

  // report
  const cal = Number(sp.get("cal")) || new Date().getFullYear();
  const [{ data: monthly }, { data: balances }] = await Promise.all([
    db.rpc("report_monthly_collections", { p_year: cal }),
    db.rpc("report_package_balances", { p_cycle_year: year }),
  ]);
  const completed = await fetchAll<EnrollmentOverview>((from, to) =>
    db.from("enrollment_overview").select("*").eq("cycle_year", year).eq("status", "completed").order("completed_at").range(from, to),
  );
  const months = (monthly ?? []) as MonthlyCollection[];
  type B = { package_name: string; customers: number; completed: number; late_customers: number; expected_kobo: number; collected_kobo: number; outstanding_kobo: number; registration_fees_kobo: number };
  const bal = (balances ?? []) as B[];
  const sum = (k: keyof B) => bal.reduce((s, r) => s + Number(r[k]), 0);

  if (format === "pdf") {
    const buf = await renderToBuffer(
      ReportDocument({
        businessName: business,
        title: "Collections report",
        subtitle: `Collections in ${cal} · balances for the ${year} cycle`,
        stats: [
          { label: `Contributions ${cal}`, value: { kobo: months.reduce((s, m) => s + Number(m.contributions_kobo), 0) } },
          { label: `Registration fees ${cal}`, value: { kobo: months.reduce((s, m) => s + Number(m.registration_fees_kobo), 0) } },
          { label: `Outstanding ${year}`, value: { kobo: sum("outstanding_kobo") } },
          { label: `Completed ${year}`, value: `${sum("completed")} of ${sum("customers")}` },
        ],
        sections: [
          {
            heading: `Monthly collections, ${cal}`,
            columns: [{ label: "Month", width: 2 }, { label: "Contributions", width: 2, align: "right" }, { label: "Registration", width: 2, align: "right" }, { label: "Payments", width: 1, align: "right" }],
            rows: months.map((m) => [formatMonth(m.month), { kobo: Number(m.contributions_kobo) }, { kobo: Number(m.registration_fees_kobo) }, Number(m.payments_count)]),
            totals: ["Total", { kobo: months.reduce((s, m) => s + Number(m.contributions_kobo), 0) }, { kobo: months.reduce((s, m) => s + Number(m.registration_fees_kobo), 0) }, months.reduce((s, m) => s + Number(m.payments_count), 0)],
          },
          {
            heading: `Outstanding balances by package, ${year}`,
            columns: [
              { label: "Package", width: 2 },
              { label: "Customers", width: 1, align: "right" },
              { label: "Behind", width: 1, align: "right" },
              { label: "Collected", width: 2, align: "right" },
              { label: "Outstanding", width: 2, align: "right" },
            ],
            rows: bal.map((b) => [b.package_name, Number(b.customers), Number(b.late_customers), { kobo: Number(b.collected_kobo) }, { kobo: Number(b.outstanding_kobo) }]),
            totals: ["Total", sum("customers"), sum("late_customers"), { kobo: sum("collected_kobo") }, { kobo: sum("outstanding_kobo") }],
          },
          {
            heading: `Completed customers, ${year}`,
            columns: [{ label: "Customer ID", width: 2 }, { label: "Name", width: 3 }, { label: "Package", width: 2 }, { label: "Completed", width: 2 }],
            rows: completed.map((e) => [e.customer_code ?? "", e.full_name, e.package_name, e.completed_at ? new Date(e.completed_at).toLocaleDateString("en-GB") : ""]),
          },
        ],
      }),
    );
    return fileResponse(buf, `report-${year}-${stamp}.pdf`, "pdf");
  }

  const buf = await buildWorkbook(`Report ${year}`, [
    {
      name: `Collections ${cal}`,
      columns: [
        { header: "Month", key: "label", width: 16 },
        { header: "Contributions", key: "contributions_kobo", format: "naira", width: 16 },
        { header: "Registration fees", key: "registration_fees_kobo", format: "naira", width: 17 },
        { header: "Total", key: "total_kobo", format: "naira", width: 14 },
        { header: "Payments", key: "payments_count", format: "number", width: 11 },
      ],
      rows: months.map((m) => ({ ...m, label: formatMonth(m.month) })),
      totals: {
        label: "Total",
        contributions_kobo: months.reduce((s, m) => s + Number(m.contributions_kobo), 0),
        registration_fees_kobo: months.reduce((s, m) => s + Number(m.registration_fees_kobo), 0),
        total_kobo: months.reduce((s, m) => s + Number(m.total_kobo), 0),
        payments_count: months.reduce((s, m) => s + Number(m.payments_count), 0),
      },
    },
    {
      name: `Balances ${year}`,
      columns: [
        { header: "Package", key: "package_name", width: 18 },
        { header: "Customers", key: "customers", format: "number", width: 11 },
        { header: "Completed", key: "completed", format: "number", width: 11 },
        { header: "Behind", key: "late_customers", format: "number", width: 9 },
        { header: "Expected", key: "expected_kobo", format: "naira", width: 15 },
        { header: "Collected", key: "collected_kobo", format: "naira", width: 15 },
        { header: "Outstanding", key: "outstanding_kobo", format: "naira", width: 15 },
        { header: "Registration fees", key: "registration_fees_kobo", format: "naira", width: 17 },
      ],
      rows: bal,
      totals: {
        package_name: "Total",
        customers: sum("customers"),
        completed: sum("completed"),
        late_customers: sum("late_customers"),
        expected_kobo: sum("expected_kobo"),
        collected_kobo: sum("collected_kobo"),
        outstanding_kobo: sum("outstanding_kobo"),
        registration_fees_kobo: sum("registration_fees_kobo"),
      },
    },
    {
      name: `Completed ${year}`,
      columns: [
        { header: "Customer ID", key: "customer_code", width: 18 },
        { header: "Name", key: "full_name", width: 26 },
        { header: "Phone", key: "phone", width: 15 },
        { header: "Package", key: "package_name", width: 16 },
        { header: "Collection point", key: "collection_point_name", width: 18 },
        { header: "Completed", key: "completed_at", format: "date", width: 13 },
        { header: "Package status", key: "fulfilment", width: 18 },
        { header: "Savings return", key: "savings_return_kobo", format: "naira", width: 14 },
        { header: "Savings status", key: "savings_return_status", width: 14 },
      ],
      rows: completed.map((e) => ({ ...e, fulfilment: e.fulfilment_status.replace(/_/g, " ") })),
    },
  ]);
  return fileResponse(buf, `report-${year}-${stamp}.xlsx`, "xlsx");
}
