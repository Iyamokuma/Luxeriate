/**
 * Database test-suite. Runs every migration and the seed against an
 * in-memory Postgres (PGlite) with a minimal stand-in for Supabase's auth
 * schema, then exercises the full money flow and the row level security.
 *
 *   pnpm test:db
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const root = join(__dirname, "..", "supabase");

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz default now()
  );
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;
`;

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (err) {
    console.log(`  \x1b[31m✗ ${name}\x1b[0m`);
    throw err;
  }
}

async function main() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);

  const migrations = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const file of migrations) {
    await db.exec(readFileSync(join(root, "migrations", file), "utf8"));
  }
  await db.exec(readFileSync(join(root, "seed.sql"), "utf8"));
  console.log(`\nApplied ${migrations.length} migrations and seed.\n`);

  const as = async (role: "anon" | "authenticated" | "service_role" | "postgres", sub?: string) => {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub ?? ""}', false); select set_config('request.jwt.claim.role', '${role === "postgres" ? "" : role}', false);`);
    if (role !== "postgres") await db.exec(`set role ${role}`);
  };
  const one = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
    (await db.query<T>(sql, params)).rows[0];
  const all = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
    (await db.query<T>(sql, params)).rows;

  // --- users -------------------------------------------------------------
  await as("postgres");
  const mkUser = async (email: string, name: string) =>
    (await one<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
      [email, JSON.stringify({ full_name: name, role: "owner" })],
    ))!.id;
  const owner = await mkUser("owner@example.com", "Adaeze Okafor");
  const staff = await mkUser("staff@example.com", "Bola Staff");
  const funmi = await mkUser("funmi@example.com", "Funmi Adeyemi");
  const tunde = await mkUser("tunde@example.com", "Tunde Bakare");
  await db.query(`update public.profiles set role = 'owner' where id = $1`, [owner]);
  await db.query(`update public.profiles set role = 'staff', permissions = '{payments.view}' where id = $1`, [staff]);

  const pkg = async (slug: string) =>
    (await one<{ id: string }>(`select id from public.packages where slug = $1 and cycle_year = 2027`, [slug]))!.id;
  const lekki = "00000000-0000-4000-8000-000000000101";

  console.log("Sign-up and payments");

  await test("profile is created for new auth users, role metadata ignored", async () => {
    const p = await one<{ role: string; full_name: string }>(`select role, full_name from public.profiles where id = $1`, [funmi]);
    assert.equal(p!.role, "customer");
    assert.equal(p!.full_name, "Funmi Adeyemi");
  });

  let funmiEnrollment = "";
  await test("create_enrollment builds a 12-month schedule", async () => {
    await as("service_role");
    funmiEnrollment = (await one<{ id: string }>(`select public.create_enrollment($1, $2, $3) as id`, [funmi, await pkg("diamond-pro"), lekki]))!.id;
    const rows = await all<{ month_index: number; due_date: string }>(
      `select month_index, due_date::text from public.installments where enrollment_id = $1 order by month_index`, [funmiEnrollment]);
    assert.equal(rows.length, 12);
    assert.equal(rows[0].due_date, "2027-01-28");
    assert.equal(rows[1].due_date, "2027-02-28");
    assert.equal(rows[11].due_date, "2027-12-28");
  });

  await test("duplicate enrollment on the same package is rejected", async () => {
    await assert.rejects(db.query(`select public.create_enrollment($1, $2, $3)`, [funmi, await pkg("diamond-pro"), lekki]), /ALREADY_ENROLLED/);
  });

  let ref1 = "";
  await test("first payment = ₦3,000 registration + ₦42,500 first month = ₦45,500", async () => {
    const p = await one<{ reference: string; amount_kobo: string; includes_registration: boolean; months: number }>(
      `select * from public.prepare_payment($1, $2, 1)`, [funmiEnrollment, funmi]);
    ref1 = p!.reference;
    assert.equal(Number(p!.amount_kobo), 4_550_000);
    assert.equal(p!.includes_registration, true);
    assert.match(ref1, /^LUX-\d{6}-[A-F0-9]{10}$/);
  });

  await test("prepare_payment refuses someone else's enrollment", async () => {
    await assert.rejects(db.query(`select * from public.prepare_payment($1, $2, 1)`, [funmiEnrollment, tunde]), /ENROLLMENT_NOT_FOUND/);
  });

  await test("finalize activates, splits fee from contribution, issues IDs", async () => {
    const r = (await one<{ r: Record<string, unknown> }>(`select public.finalize_payment($1, 4550000, now(), 'card', 123, 68250) as r`, [ref1]))!.r;
    assert.equal(r.activated, true);
    assert.equal(r.customer_code, "LUX-2027-000001");
    assert.equal(r.referral_code, "FUNMI2027");
    assert.equal(r.months_paid, 1);
    assert.equal(Number(r.balance_kobo), 46_750_000);
    const lines = await all<{ line_type: string; amount_kobo: string }>(
      `select line_type, amount_kobo from public.payment_lines where payment_id = $1 order by line_type`, [r.payment_id]);
    assert.deepEqual(lines.map((l) => [l.line_type, Number(l.amount_kobo)]), [["registration_fee", 300_000], ["contribution", 4_250_000]]);
    assert.match(String(r.receipt_number), /^RCP-\d{4}-000001$/);
  });

  await test("finalize is idempotent (webhook + callback race)", async () => {
    const r = (await one<{ r: Record<string, unknown> }>(`select public.finalize_payment($1, 4550000) as r`, [ref1]))!.r;
    assert.equal(r.processed, false);
    const c = await one<{ n: string }>(`select count(*) n from public.payment_lines where enrollment_id = $1`, [funmiEnrollment]);
    assert.equal(Number(c!.n), 2);
  });

  let tundeEnrollment = "";
  await test("referral code is validated and linked", async () => {
    await as("anon");
    const v = await one<{ referrer_name: string }>(`select * from public.validate_referral_code('funmi2027')`);
    assert.equal(v!.referrer_name, "Funmi A.");
    await as("service_role");
    await assert.rejects(db.query(`select public.create_enrollment($1, $2, $3, 'NOPE2027')`, [tunde, await pkg("gold"), lekki]), /REFERRAL_INVALID/);
    tundeEnrollment = (await one<{ id: string }>(`select public.create_enrollment($1, $2, $3, 'funmi2027') as id`, [tunde, await pkg("gold"), lekki]))!.id;
    const p = await one<{ reference: string; amount_kobo: string }>(`select * from public.prepare_payment($1, $2, 2)`, [tundeEnrollment, tunde]);
    assert.equal(Number(p!.amount_kobo), 300_000 + 2 * 2_250_000);
    const r = (await one<{ r: Record<string, unknown> }>(`select public.finalize_payment($1, $2) as r`, [p!.reference, p!.amount_kobo]))!.r;
    assert.equal(r.customer_code, "LUX-2027-000002");
    assert.equal(r.months_paid, 2);
  });

  await test("paying the remaining 11 months completes the package", async () => {
    const p = await one<{ reference: string; amount_kobo: string; months: number }>(`select * from public.prepare_payment($1, $2, 24)`, [funmiEnrollment, funmi]);
    assert.equal(p!.months, 11);
    assert.equal(Number(p!.amount_kobo), 11 * 4_250_000);
    const r = (await one<{ r: Record<string, unknown> }>(`select public.finalize_payment($1, $2) as r`, [p!.reference, p!.amount_kobo]))!.r;
    assert.equal(r.completed, true);
    assert.equal(Number(r.balance_kobo), 0);
    const e = await one<{ status: string; savings_return_status: string }>(`select status, savings_return_status from public.enrollments where id = $1`, [funmiEnrollment]);
    assert.equal(e!.status, "completed");
    assert.equal(e!.savings_return_status, "pending");
    await assert.rejects(db.query(`select * from public.prepare_payment($1, $2, 1)`, [funmiEnrollment, funmi]), /ENROLLMENT_CLOSED/);
  });

  await test("dedicated-account transfers of any amount are held as credit, then applied", async () => {
    let r = (await one<{ r: Record<string, unknown> }>(`select public.record_external_payment($1, 'DVA-1', 2000000, 'paystack_dva') as r`, [tunde]))!.r;
    assert.equal(r.months_paid, 0);
    assert.equal(r.needs_review, false);
    r = (await one<{ r: Record<string, unknown> }>(`select public.record_external_payment($1, 'DVA-2', 250000, 'paystack_dva') as r`, [tunde]))!.r;
    assert.equal(r.months_paid, 1);
    const e = await one<{ credit_kobo: string }>(`select credit_kobo from public.enrollments where id = $1`, [tundeEnrollment]);
    assert.equal(Number(e!.credit_kobo), 0);
    const sums = await all<{ reference: string; amount: string; lines: string }>(`
      select p.reference, p.amount_kobo amount, sum(l.amount_kobo) lines
      from public.payments p join public.payment_lines l on l.payment_id = p.id
      where p.enrollment_id = $1 group by p.reference, p.amount_kobo`, [tundeEnrollment]);
    for (const s of sums) assert.equal(Number(s.amount), Number(s.lines), `lines balance for ${s.reference}`);
    // a second webhook delivery for the same transfer changes nothing
    r = (await one<{ r: Record<string, unknown> }>(`select public.record_external_payment($1, 'DVA-2', 250000, 'paystack_dva') as r`, [tunde]))!.r;
    assert.equal(r.processed, false);
  });

  console.log("\nRow level security");

  await test("customers see only their own records", async () => {
    await as("authenticated", funmi);
    const e = await all(`select id from public.enrollments`);
    assert.equal(e.length, 1);
    const pays = await all(`select id from public.payment_overview`);
    assert.equal(pays.length, 2);
    const ov = await one<{ paid_count: number; outstanding_kobo: string }>(`select paid_count, outstanding_kobo from public.enrollment_overview`);
    assert.equal(ov!.paid_count, 12);
    assert.equal(Number(ov!.outstanding_kobo), 0);
    const other = await all(`select id from public.profiles where id <> $1`, [funmi]);
    assert.equal(other.length, 0);
  });

  await test("customers can edit contact details but not their role", async () => {
    await db.query(`update public.profiles set phone = '08030000000' where id = $1`, [funmi]);
    await assert.rejects(db.query(`update public.profiles set role = 'owner' where id = $1`, [funmi]), /permission denied/);
    await assert.rejects(db.query(`select * from public.prepare_payment($1, $2, 1)`, [funmiEnrollment, funmi]), /permission denied/);
    await assert.rejects(db.query(`select public.finalize_payment('x', 1)`), /permission denied/);
    await assert.rejects(db.query(`update public.payments set status = 'success'`), /permission denied/);
  });

  await test("customers see their referrals by first name only", async () => {
    const r = await all<{ first_name: string }>(`select * from public.my_referrals()`);
    assert.deepEqual(r.map((x) => x.first_name), ["Tunde"]);
  });

  await test("anonymous visitors can read the catalogue only", async () => {
    await as("anon");
    const p = await all(`select id from public.packages`);
    assert.equal(p.length, 9);
    await assert.rejects(db.query(`select id from public.enrollments`), /permission denied/);
    await assert.rejects(db.query(`select id from public.profiles`), /permission denied/);
  });

  await test("staff permissions are enforced", async () => {
    await as("authenticated", staff);
    const pays = await all<{ full_name: string }>(`select full_name from public.payment_overview`);
    assert.ok(pays.length >= 4);
    assert.ok(pays.every((p) => p.full_name), "payment rows carry customer names");
    await assert.rejects(db.query(`select * from public.procurement_totals(2027)`), /FORBIDDEN/);
    await assert.rejects(db.query(`update public.packages set monthly_amount_kobo = 1`).then((r) => {
      if (r.affectedRows === 0) throw new Error("permission denied (RLS filtered)");
    }), /permission denied/);
    await assert.rejects(db.query(`select public.record_manual_payment($1, 1, 'cash')`, [tundeEnrollment]), /FORBIDDEN/);
  });

  console.log("\nBack office");

  await test("admin overview adds up", async () => {
    await as("authenticated", owner);
    const o = (await one<{ o: Record<string, unknown> }>(`select public.admin_overview(2027) as o`))!.o;
    assert.equal(o.total_customers, 2);
    assert.equal(o.completed_customers, 1);
    assert.equal(o.active_contributors, 1);
    assert.equal(Number(o.registration_fees_kobo), 600_000);
    assert.equal(Number(o.contributions_kobo), 12 * 4_250_000 + 3 * 2_250_000);
    assert.equal(Number(o.outstanding_kobo), 9 * 2_250_000);
  });

  await test("procurement multiplies items by customers", async () => {
    const rows = await all<{ item_name: string; unit: string; total_quantity: string; customers: string }>(`select * from public.procurement_totals(2027)`);
    const rice = rows.find((r) => r.item_name === "Rice (parboiled)")!;
    assert.equal(Number(rice.total_quantity), 100); // 50 kg (Diamond Pro) + 50 kg (Gold)
    assert.equal(Number(rice.customers), 2);
  });

  await test("reports and leaderboard run", async () => {
    const m = await all<{ total_kobo: string }>(`select * from public.report_monthly_collections(extract(year from now())::int)`);
    assert.equal(m.length, 12);
    const total = m.reduce((s, r) => s + Number(r.total_kobo), 0);
    assert.equal(total, 4_550_000 + 11 * 4_250_000 + 4_800_000 + 2_250_000);
    const w = await all<{ total_kobo: string }>(`select * from public.report_collections_window(current_date, 12)`);
    assert.equal(w.length, 12);
    assert.equal(w.reduce((s, r) => s + Number(r.total_kobo), 0), total);
    const b = await all<{ package_name: string; customers: string }>(`select * from public.report_package_balances(2027)`);
    assert.equal(b.length, 9);
    const l = await all<{ referral_code: string; referred_count: string }>(`select * from public.referral_leaderboard(2027)`);
    assert.equal(l[0].referral_code, "FUNMI2027");
    assert.equal(Number(l[0].referred_count), 1);
  });

  await test("fulfilment moves completed packages and logs it", async () => {
    const r = await all<{ email: string }>(`select * from public.set_fulfilment_status($1::uuid[], 'preparing')`, [[funmiEnrollment, tundeEnrollment]]);
    assert.equal(r.length, 1); // Tunde is not completed yet
    assert.equal(r[0].email, "funmi@example.com");
    await assert.rejects(db.query(`select * from public.set_fulfilment_status($1::uuid[], 'collection_scheduled')`, [[funmiEnrollment]]), /SCHEDULE_REQUIRED/);
    const s = await all(`select * from public.set_fulfilment_status($1::uuid[], 'collection_scheduled', now() + interval '3 days', 'Bring a bag')`, [[funmiEnrollment]]);
    assert.equal(s.length, 1);
    const again = await all(`select * from public.set_fulfilment_status($1::uuid[], 'collection_scheduled', now() + interval '3 days')`, [[funmiEnrollment]]);
    assert.equal(again.length, 0, "no duplicate notifications when status is unchanged");
    const log = await all(`select summary from public.activity_log where action = 'fulfilment.update'`);
    assert.equal(log.length, 2);
  });

  await test("savings return is marked paid once", async () => {
    const r = (await one<{ r: Record<string, unknown> }>(`select public.mark_savings_return_paid($1, 'TRF-889') as r`, [funmiEnrollment]))!.r;
    assert.equal(Number(r.savings_return_kobo), 3_000_000);
    await assert.rejects(db.query(`select public.mark_savings_return_paid($1)`, [funmiEnrollment]), /SAVINGS_NOT_PENDING/);
  });

  await test("owner can record an offline payment with a note", async () => {
    await assert.rejects(db.query(`select public.record_manual_payment($1, 1, '')`, [tundeEnrollment]), /NOTE_REQUIRED/);
    const r = (await one<{ r: Record<string, unknown> }>(`select public.record_manual_payment($1, 1, 'Paid cash at Lekki hub') as r`, [tundeEnrollment]))!.r;
    assert.equal(r.months_paid, 1);
    const log = await one<{ actor_name: string }>(`select actor_name from public.activity_log where action = 'payment.manual'`);
    assert.equal(log!.actor_name, "Adaeze Okafor");
  });

  await test("installment states and reminder candidates", async () => {
    const states = await all<{ state: string }>(`select state from public.installment_overview where enrollment_id = $1 order by month_index`, [tundeEnrollment]);
    assert.equal(states.filter((s) => s.state === "paid").length, 4);
    await as("service_role");
    await all(`select * from public.reminder_candidates()`);
  });

  console.log(`\n\x1b[32m${passed} database tests passed.\x1b[0m\n`);
  await db.close();
}

main().catch((err) => {
  console.error("\n", err);
  process.exit(1);
});
