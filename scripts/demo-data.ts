/**
 * Demo data for trying the dashboards before real customers arrive.
 *
 *   pnpm demo:seed      clears earlier demo data, then creates it again
 *   pnpm demo:password  gives every demo account a new password
 *   pnpm demo:clear     removes every trace of it
 *
 * The password is generated on each run and printed once; it is never stored
 * in the repository (set DEMO_PASSWORD to choose one). The demo owner is a
 * real owner account on whatever database .env.local points at.
 *
 * Creates an owner, two staff members and ~36 customers across a finished
 * 2026 cycle and the 2027 cycle that is signing up now, with backdated
 * payments so every state has something to show: on track, due, late,
 * completed, each fulfilment step, savings returns, referrals and failed
 * checkouts.
 *
 * Money goes through the same database functions as real payments
 * (create_enrollment → prepare_payment → finalize_payment), in date order,
 * so the ledger balances exactly as it would in production.
 *
 * Every demo account uses an @luxuriate.test address and every other demo
 * row is tagged, so clearing never touches real data.
 */
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DOMAIN = "luxuriate.test";
const PASSWORD = process.env.DEMO_PASSWORD || `Lux-${randomBytes(9).toString("base64url")}`;
const TAG = "[demo]";
const DEMO = { demo: true };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
const db: SupabaseClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const NOW = new Date();

// ─── time helpers (Lagos is UTC+1 all year) ─────────────────────────────────
function lagos(y: number, m: number, d: number, hh = 12, mm = 0) {
  return new Date(Date.UTC(y, m - 1, d, hh - 1, mm));
}
const addMin = (t: Date, min: number) => new Date(t.getTime() + min * 60_000);
const addDays = (t: Date, days: number) => new Date(t.getTime() + days * 86_400_000);
const notFuture = (t: Date) => (t > NOW ? addMin(NOW, -30) : t);
/** A Lagos wall-clock time `days` ago; "today at 9pm" never lands in the future. */
const daysAgo = (days: number, hh = 12, mm = 0) => {
  const t = addDays(NOW, -days);
  const l = new Date(t.getTime() + 3_600_000);
  return notFuture(lagos(l.getUTCFullYear(), l.getUTCMonth() + 1, l.getUTCDate(), hh, mm));
};
const iso = (t: Date) => t.toISOString();

// deterministic randomness so every seed looks the same
let rngState = 20261126;
function rand() {
  rngState |= 0;
  rngState = (rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
function channel() {
  const r = rand();
  return r < 0.56 ? "card" : r < 0.86 ? "bank_transfer" : r < 0.96 ? "ussd" : "bank";
}
/** Paystack's local fee: 1.5% + ₦100 above ₦2,500, capped at ₦2,000. */
function fee(kobo: number) {
  const f = Math.round(kobo * 0.015) + (kobo >= 250_000 ? 10_000 : 0);
  return Math.min(f, 200_000);
}

// ─── who ────────────────────────────────────────────────────────────────────
type Fulfil = "preparing" | "ready" | "collection_scheduled" | "collected";
type Pay = { at: Date; months: number; extraKobo?: number };
type Attempt = { at: Date; status: "failed" | "abandoned"; response: string };
type Enr = {
  cycle: 2026 | 2027;
  pkg: string;
  cp: number;
  registered: Date;
  pays: Pay[];
  referredBy?: { person: string; cycle: 2026 | 2027 };
  attempts?: Attempt[];
  fulfilment?: { steps: { status: Fulfil; at: Date }[]; scheduledFor?: Date; note?: string };
  savingsPaidAt?: Date;
};
type Person = { key: string; name: string; phone: string; state: string; lga: string; address: string; enr: Enr[] };

/** One payment a month near the 28th, starting with registration + January. */
function monthly(regAt: Date, paidThrough: number, opts: { lumpAt?: { month: number; at: Date }; doubleUp?: number[] } = {}): Pay[] {
  const pays: Pay[] = [{ at: regAt, months: 1 }];
  let m = 2;
  while (m <= paidThrough) {
    if (opts.lumpAt && m === opts.lumpAt.month) {
      pays.push({ at: opts.lumpAt.at, months: paidThrough - m + 1 });
      break;
    }
    const two = opts.doubleUp?.includes(m) && m < paidThrough;
    pays.push({ at: notFuture(lagos(2026, m, between(17, 28), between(8, 21), between(0, 59))), months: two ? 2 : 1 });
    m += two ? 2 : 1;
  }
  return pays;
}

const P = (key: string, name: string, phone: string, state: string, lga: string, address: string, enr: Enr[]): Person => ({
  key, name, phone, state, lga, address, enr,
});

const people: Person[] = [
  // ── 2026 cycle: finished ──────────────────────────────────────────────────
  P("tunde", "Tunde Bakare", "08031234501", "Lagos", "Eti-Osa", "14 Admiralty Road, Lekki Phase 1", [
    {
      cycle: 2026, pkg: "platinum", cp: 0, registered: lagos(2025, 12, 3, 10, 12),
      pays: monthly(lagos(2025, 12, 3, 10, 20), 12, { lumpAt: { month: 7, at: lagos(2026, 7, 25, 18, 4) } }),
      fulfilment: {
        steps: [
          { status: "preparing", at: lagos(2026, 8, 4, 9, 30) },
          { status: "ready", at: lagos(2026, 8, 26, 15, 10) },
          { status: "collection_scheduled", at: lagos(2026, 9, 6, 11, 0) },
          { status: "collected", at: lagos(2026, 9, 12, 11, 40) },
        ],
        scheduledFor: lagos(2026, 9, 12, 11, 0),
      },
      savingsPaidAt: lagos(2026, 9, 15, 13, 0),
    },
  ]),
  P("ngozi", "Ngozi Eze", "08031234502", "Lagos", "Eti-Osa", "7 Fola Osibo Street, Lekki", [
    {
      cycle: 2026, pkg: "gold", cp: 0, registered: lagos(2025, 12, 6, 19, 2),
      pays: monthly(lagos(2025, 12, 6, 19, 9), 12, { lumpAt: { month: 9, at: lagos(2026, 9, 22, 20, 15) } }),
      fulfilment: {
        steps: [
          { status: "preparing", at: lagos(2026, 10, 6, 9, 0) },
          { status: "ready", at: daysAgo(16, 14, 30) },
          { status: "collection_scheduled", at: daysAgo(8, 10, 15) },
        ],
        scheduledFor: addDays(daysAgo(0, 10, 0), 4),
        note: "Please bring your customer ID. Ask for Chidi at the front desk.",
      },
    },
    {
      cycle: 2027, pkg: "gold", cp: 0, registered: daysAgo(55, 9, 41),
      pays: [{ at: daysAgo(55, 9, 47), months: 1 }, { at: daysAgo(25, 20, 3), months: 1 }],
    },
  ]),
  P("halima", "Halima Yusuf", "08031234503", "FCT - Abuja", "Abuja Municipal", "22 Aminu Kano Crescent, Wuse 2", [
    {
      cycle: 2026, pkg: "silver", cp: 4, registered: lagos(2025, 12, 11, 8, 55),
      pays: monthly(lagos(2025, 12, 11, 9, 0), 12, { lumpAt: { month: 10, at: lagos(2026, 10, 26, 12, 30) } }),
      fulfilment: { steps: [{ status: "preparing", at: daysAgo(23, 9, 20) }, { status: "ready", at: daysAgo(5, 16, 0) }] },
    },
  ]),
  P("emeka", "Emeka Obi", "08031234504", "Lagos", "Ikeja", "3 Opebi Road, Ikeja", [
    {
      cycle: 2026, pkg: "bronze", cp: 1, registered: lagos(2025, 12, 18, 13, 5),
      pays: monthly(lagos(2025, 12, 18, 13, 11), 12, { lumpAt: { month: 11, at: daysAgo(12, 17, 45) } }),
      fulfilment: { steps: [{ status: "preparing", at: daysAgo(6, 10, 0) }] },
    },
  ]),
  P("folake", "Folake Adeyemi", "08031234505", "Ogun", "Abeokuta South", "9 Ibara Housing Estate, Abeokuta", [
    {
      cycle: 2026, pkg: "diamond", cp: 2, registered: lagos(2025, 12, 20, 16, 40),
      pays: monthly(lagos(2025, 12, 20, 16, 48), 12, { lumpAt: { month: 11, at: daysAgo(4, 21, 12) } }),
    },
  ]),

  // ── 2026 cycle: still paying ──────────────────────────────────────────────
  P("amara", "Amara Nwosu", "08031234506", "Lagos", "Surulere", "41 Adeniran Ogunsanya Street, Surulere", [
    { cycle: 2026, pkg: "gold", cp: 2, registered: lagos(2025, 12, 14, 11, 20), pays: monthly(lagos(2025, 12, 14, 11, 26), 10) },
    {
      cycle: 2027, pkg: "platinum", cp: 2, registered: daysAgo(16, 19, 30),
      pays: [{ at: daysAgo(16, 19, 36), months: 2 }],
      referredBy: { person: "ngozi", cycle: 2026 },
    },
  ]),
  P("ibrahim", "Ibrahim Musa", "08031234507", "Kaduna", "Kaduna North", "5 Ahmadu Bello Way, Kaduna", [
    { cycle: 2026, pkg: "silver", cp: 4, registered: lagos(2025, 12, 22, 9, 10), pays: monthly(lagos(2025, 12, 22, 9, 18), 11, { doubleUp: [4] }) },
  ]),
  P("chiamaka", "Chiamaka Okeke", "08031234508", "Lagos", "Kosofe", "12 Ogudu Road, Ojota", [
    { cycle: 2026, pkg: "platinum", cp: 1, registered: lagos(2025, 12, 27, 14, 0), pays: monthly(lagos(2025, 12, 27, 14, 6), 9) },
  ]),
  P("seun", "Seun Afolabi", "08031234509", "Oyo", "Ibadan North", "18 Bodija Estate, Ibadan", [
    { cycle: 2026, pkg: "bronze", cp: 3, registered: lagos(2026, 1, 4, 10, 30), pays: monthly(lagos(2026, 1, 4, 10, 37), 7) },
  ]),
  P("blessing", "Blessing Etim", "08031234510", "Rivers", "Port Harcourt", "27 Aba Road, Port Harcourt", [
    {
      cycle: 2026, pkg: "gold", cp: 0, registered: lagos(2025, 12, 21, 18, 0),
      pays: [...monthly(lagos(2025, 12, 21, 18, 8), 10), { at: daysAgo(3, 15, 22), months: 1, extraKobo: 500_000 }],
      referredBy: { person: "amara", cycle: 2026 },
    },
  ]),
  P("yemi", "Yemi Ogunleye", "08031234511", "Lagos", "Alimosho", "6 Egbeda-Idimu Road, Egbeda", [
    { cycle: 2026, pkg: "silver", cp: 1, registered: lagos(2026, 1, 9, 12, 12), pays: monthly(lagos(2026, 1, 9, 12, 20), 10), referredBy: { person: "amara", cycle: 2026 } },
  ]),
  P("zainab", "Zainab Bello", "08031234512", "Lagos", "Ikorodu", "30 Lagos Road, Ikorodu", [
    { cycle: 2026, pkg: "bronze", cp: 3, registered: lagos(2026, 1, 15, 17, 25), pays: monthly(lagos(2026, 1, 15, 17, 31), 11), referredBy: { person: "amara", cycle: 2026 } },
  ]),
  P("kelechi", "Kelechi Nnamdi", "08031234513", "Enugu", "Enugu North", "11 Ogui Road, Enugu", [
    { cycle: 2026, pkg: "diamond", cp: 4, registered: lagos(2025, 12, 29, 8, 0), pays: monthly(lagos(2025, 12, 29, 8, 9), 11) },
  ]),

  // ── 2027 cycle: signing up now ────────────────────────────────────────────
  P("david", "David Adeleke", "08031234514", "Lagos", "Eti-Osa", "2 Ajose Adeogun Street, Victoria Island", [
    { cycle: 2027, pkg: "diamond-promax", cp: 0, registered: daysAgo(62, 10, 5), pays: [{ at: daysAgo(62, 10, 12), months: 3 }] },
  ]),
  P("aisha", "Aisha Abdullahi", "08031234515", "FCT - Abuja", "Abuja Municipal", "8 Gana Street, Maitama", [
    { cycle: 2027, pkg: "diamond-pro", cp: 4, registered: daysAgo(48, 13, 40), pays: [{ at: daysAgo(48, 13, 47), months: 1 }, { at: daysAgo(19, 9, 2), months: 1 }] },
  ]),
  P("tobi", "Tobi Fashola", "08031234516", "Lagos", "Ikeja", "17 Allen Avenue, Ikeja", [
    { cycle: 2027, pkg: "student", cp: 1, registered: daysAgo(44, 21, 0), pays: [{ at: daysAgo(44, 21, 6), months: 1 }] },
  ]),
  P("uche", "Uchenna Okafor", "08031234517", "Anambra", "Onitsha North", "4 New Market Road, Onitsha", [
    { cycle: 2027, pkg: "silver-pro", cp: 2, registered: daysAgo(40, 11, 15), pays: [{ at: daysAgo(40, 11, 21), months: 2 }], referredBy: { person: "ngozi", cycle: 2026 } },
  ]),
  P("funmi", "Funmilayo Ojo", "08031234518", "Lagos", "Surulere", "25 Bode Thomas Street, Surulere", [
    { cycle: 2027, pkg: "gold", cp: 2, registered: daysAgo(37, 18, 30), pays: [{ at: daysAgo(37, 18, 37), months: 1 }], referredBy: { person: "amara", cycle: 2026 } },
  ]),
  P("musa", "Musa Danjuma", "08031234519", "Kaduna", "Kaduna South", "13 Kachia Road, Kaduna", [
    { cycle: 2027, pkg: "bronze", cp: 4, registered: daysAgo(33, 9, 0), pays: [{ at: daysAgo(33, 9, 8), months: 1 }] },
  ]),
  P("adaeze", "Adaeze Chukwu", "08031234520", "Lagos", "Eti-Osa", "19 Chevron Drive, Lekki", [
    { cycle: 2027, pkg: "platinum", cp: 0, registered: daysAgo(29, 20, 10), pays: [{ at: daysAgo(29, 20, 16), months: 1 }, { at: daysAgo(2, 8, 45), months: 1 }] },
  ]),
  P("gbenga", "Gbenga Alabi", "08031234521", "Ogun", "Ado-Odo/Ota", "6 Idiroko Road, Ota", [
    { cycle: 2027, pkg: "silver", cp: 3, registered: daysAgo(26, 7, 55), pays: [{ at: daysAgo(26, 8, 1), months: 1 }] },
  ]),
  P("ifeoma", "Ifeoma Eze", "08031234522", "Enugu", "Enugu South", "20 Agbani Road, Enugu", [
    { cycle: 2027, pkg: "gold", cp: 4, registered: daysAgo(22, 16, 20), pays: [{ at: daysAgo(22, 16, 27), months: 3 }] },
  ]),
  P("samuel", "Samuel Johnson", "08031234523", "Lagos", "Ikorodu", "44 Ayangburen Road, Ikorodu", [
    { cycle: 2027, pkg: "bronze", cp: 3, registered: daysAgo(18, 12, 0), pays: [{ at: daysAgo(18, 12, 9), months: 1 }] },
  ]),
  P("ruth", "Ruth Akpan", "08031234524", "Rivers", "Obio/Akpor", "9 Rumuola Road, Port Harcourt", [
    { cycle: 2027, pkg: "silver", cp: 0, registered: daysAgo(14, 19, 5), pays: [{ at: daysAgo(14, 19, 12), months: 1 }], referredBy: { person: "ngozi", cycle: 2026 } },
  ]),
  P("bola", "Bola Tinubu-Ade", "08031234525", "Lagos", "Kosofe", "3 Ikorodu Road, Maryland", [
    { cycle: 2027, pkg: "gold", cp: 1, registered: daysAgo(11, 13, 30), pays: [{ at: daysAgo(11, 13, 37), months: 1 }] },
  ]),
  P("nkechi", "Nkechi Umeh", "08031234526", "Lagos", "Alimosho", "15 Ikotun Road, Ikotun", [
    { cycle: 2027, pkg: "student", cp: 1, registered: daysAgo(9, 22, 10), pays: [{ at: daysAgo(9, 22, 16), months: 1 }] },
  ]),
  P("femi", "Femi Ogunbiyi", "08031234527", "Oyo", "Ibadan North", "2 Ring Road, Ibadan", [
    { cycle: 2027, pkg: "silver-pro", cp: 3, registered: daysAgo(6, 10, 40), pays: [{ at: daysAgo(6, 10, 46), months: 1 }], referredBy: { person: "amara", cycle: 2027 } },
  ]),
  P("hauwa", "Hauwa Ibrahim", "08031234528", "FCT - Abuja", "Bwari", "10 Kubwa Expressway, Kubwa", [
    { cycle: 2027, pkg: "diamond", cp: 4, registered: daysAgo(5, 15, 0), pays: [{ at: daysAgo(5, 15, 6), months: 2 }] },
  ]),
  P("chinedu", "Chinedu Eze", "08031234529", "Lagos", "Surulere", "8 Ojuelegba Road, Surulere", [
    {
      cycle: 2027, pkg: "gold", cp: 2, registered: daysAgo(3, 18, 20),
      attempts: [{ at: daysAgo(3, 18, 26), status: "failed", response: "Declined by issuing bank" }],
      pays: [{ at: daysAgo(3, 18, 41), months: 1 }],
    },
  ]),
  P("joy", "Joy Okoro", "08031234530", "Lagos", "Ikeja", "21 Obafemi Awolowo Way, Ikeja", [
    { cycle: 2027, pkg: "bronze", cp: 1, registered: daysAgo(1, 11, 5), pays: [{ at: daysAgo(1, 11, 12), months: 1 }] },
  ]),
  P("kunle", "Kunle Martins", "08031234531", "Lagos", "Eti-Osa", "5 Admiralty Way, Lekki", [
    { cycle: 2027, pkg: "platinum", cp: 0, registered: daysAgo(0, 9, 20), pays: [{ at: daysAgo(0, 9, 27), months: 1 }] },
  ]),
  // registered but not paid
  P("sola", "Sola Bankole", "08031234532", "Lagos", "Kosofe", "16 Anthony Village Road, Anthony", [
    { cycle: 2027, pkg: "silver", cp: 1, registered: daysAgo(9, 20, 0), pays: [], attempts: [{ at: daysAgo(9, 20, 6), status: "abandoned", response: "Customer closed the checkout" }] },
  ]),
  P("ada", "Ada Okonkwo", "08031234533", "Anambra", "Awka South", "12 Zik Avenue, Awka", [
    { cycle: 2027, pkg: "gold", cp: 2, registered: daysAgo(6, 14, 15), pays: [], attempts: [{ at: daysAgo(6, 14, 20), status: "failed", response: "Insufficient funds" }, { at: daysAgo(6, 14, 31), status: "abandoned", response: "Customer closed the checkout" }] },
  ]),
  P("tayo", "Tayo Williams", "08031234534", "Lagos", "Ikorodu", "7 Sagamu Road, Ikorodu", [
    { cycle: 2027, pkg: "student", cp: 3, registered: daysAgo(0, 8, 10), pays: [] },
  ]),
];

const STAFF = [
  {
    key: "chidi", name: "Chidi Okafor", phone: "08031234590",
    permissions: ["customers.view", "procurement.view", "fulfilment.manage", "savings.manage"],
  },
  {
    key: "bisi", name: "Bisi Lawal", phone: "08031234591",
    permissions: ["customers.view", "customers.edit", "payments.view", "reports.view", "referrals.view"],
  },
];
const OWNER = { key: "owner", name: "Kemi Adebayo", phone: "08031234599" };

const email = (k: string) => `${k}@${DOMAIN}`;

// ─── helpers ────────────────────────────────────────────────────────────────
async function must<T>(label: string, p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function createAccount(k: string, name: string, phone: string) {
  const { data, error } = await db.auth.admin.createUser({
    email: email(k),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name, phone },
  });
  if (error) throw new Error(`create ${k}: ${error.message}`);
  return data.user.id;
}

/** Events written by the database get "now"; move them to when they happened. */
async function backdateNewEvents(enrollmentId: string, at: Date) {
  await must(
    "backdate events",
    db.from("enrollment_events").update({ created_at: iso(at) }).eq("enrollment_id", enrollmentId).gte("created_at", iso(addMin(NOW, -1))),
  );
}

// ─── clear ──────────────────────────────────────────────────────────────────
async function clear() {
  const profiles = await must("list demo profiles", db.from("profiles").select("id").ilike("email", `%@${DOMAIN}`));
  for (const p of profiles ?? []) {
    const { error } = await db.auth.admin.deleteUser(p.id);
    if (error) throw new Error(`delete user: ${error.message}`);
  }
  await must("email log", db.from("email_log").delete().ilike("to_email", `%@${DOMAIN}`));
  await must("activity", db.from("activity_log").delete().contains("details", DEMO));
  await must("system events", db.from("system_events").delete().contains("details", DEMO));
  await must("packages", db.from("packages").delete().like("description", `${TAG}%`));

  // put the ID and receipt counters back to the highest number still in use
  const counters = await must("counters", db.from("code_counters").select("scope"));
  for (const { scope } of counters ?? []) {
    const [kind, year] = String(scope).split(":");
    let max = 0;
    if (kind === "customer") {
      const rows = await must("codes", db.from("enrollments").select("customer_code").like("customer_code", `LUX-${year}-%`).order("customer_code", { ascending: false }).limit(1));
      max = rows?.[0] ? Number(String(rows[0].customer_code).split("-")[2]) : 0;
    } else if (kind === "receipt") {
      const rows = await must("receipts", db.from("payments").select("receipt_number").like("receipt_number", `RCP-${year}-%`).order("receipt_number", { ascending: false }).limit(1));
      max = rows?.[0] ? Number(String(rows[0].receipt_number).split("-")[2]) : 0;
    } else continue;
    if (max === 0) await must("reset counter", db.from("code_counters").delete().eq("scope", scope));
    else await must("set counter", db.from("code_counters").update({ last_value: max }).eq("scope", scope));
  }
  console.log(`✓ Demo data cleared (${profiles?.length ?? 0} demo accounts removed).`);
}

// ─── seed ───────────────────────────────────────────────────────────────────
type Emailed = { template_key: string; to_email: string; user_id: string; enrollment_id: string | null; subject: string; at: Date; status?: "sent" | "failed"; error?: string };

async function seed() {
  await clear();
  const emails: Emailed[] = [];
  const webhooks: { at: Date; reference: string }[] = [];
  const activity: { actor: string; action: string; entity_type?: string; entity_id?: string; summary: string; at: Date; details?: Record<string, unknown> }[] = [];

  // 1. a 2026 cycle (copied from 2027), open while it's seeded, closed after
  const pk27 = await must("2027 packages", db.from("packages").select("*, package_items(*)").eq("cycle_year", 2027));
  const pick26 = ["bronze", "silver", "gold", "platinum", "diamond"];
  const pkgs: Record<string, { id: string; name: string; savings: number; monthly: number }> = {};
  for (const p of pk27 ?? []) {
    pkgs[`2027:${p.slug}`] = { id: p.id, name: p.name, savings: p.savings_return_kobo, monthly: p.monthly_amount_kobo };
    if (!pick26.includes(p.slug)) continue;
    const { package_items, ...rest } = p;
    for (const k of ["id", "created_at", "updated_at"]) delete (rest as Record<string, unknown>)[k];
    const row = await must(
      "copy package",
      db.from("packages").insert({ ...rest, cycle_year: 2026, start_month: "2026-01-01", is_open: true, description: `${TAG} Sample 2026 cycle for trying the dashboards.` }).select("id").single(),
    );
    pkgs[`2026:${p.slug}`] = { id: row!.id, name: p.name, savings: p.savings_return_kobo, monthly: p.monthly_amount_kobo };
    await must(
      "copy items",
      db.from("package_items").insert((package_items as { name: string; quantity: number; unit: string; sort_order: number }[]).map((i) => ({ package_id: row!.id, name: i.name, quantity: i.quantity, unit: i.unit, sort_order: i.sort_order }))),
    );
  }
  const cps = (await must("collection points", db.from("collection_points").select("id, name").order("sort_order"))) ?? [];

  // 2. owner and staff
  const ids: Record<string, string> = {};
  ids.owner = await createAccount(OWNER.key, OWNER.name, OWNER.phone);
  await must("owner", db.from("profiles").update({ role: "owner", full_name: OWNER.name, phone: OWNER.phone, state: "Lagos" }).eq("id", ids.owner));
  for (const s of STAFF) {
    ids[s.key] = await createAccount(s.key, s.name, s.phone);
    await must("staff", db.from("profiles").update({ role: "staff", permissions: s.permissions, phone: s.phone, state: "Lagos" }).eq("id", ids[s.key]));
    const invitedAt = s.key === "chidi" ? lagos(2026, 7, 28, 10, 0) : daysAgo(20, 9, 30);
    emails.push({ template_key: "staff_invite", to_email: email(s.key), user_id: ids[s.key], enrollment_id: null, subject: "You've been invited to the Luxuriate back office", at: invitedAt });
    activity.push({ actor: "owner", action: "staff.invite", entity_type: "profile", entity_id: ids[s.key], summary: `Invited ${s.name}`, at: invitedAt });
  }

  // 3. customers' accounts
  for (const person of people) {
    ids[person.key] = await createAccount(person.key, person.name, person.phone);
    await must(
      "profile",
      db.from("profiles").update({
        phone: person.phone, whatsapp: person.phone, state: person.state, lga: person.lga, address: person.address,
        emergency_contact_name: "Next of kin", emergency_contact_phone: "08030000000",
      }).eq("id", ids[person.key]),
    );
  }

  // 4. everything that happened, in the order it happened
  type Step =
    | { at: Date; kind: "register"; person: Person; e: Enr; slot: string }
    | { at: Date; kind: "pay"; person: Person; e: Enr; slot: string; pay: Pay; first: boolean; last: boolean }
    | { at: Date; kind: "attempt"; person: Person; e: Enr; slot: string; attempt: Attempt };
  const steps: Step[] = [];
  for (const person of people) {
    for (const e of person.enr) {
      const slot = `${person.key}:${e.cycle}`;
      steps.push({ at: e.registered, kind: "register", person, e, slot });
      e.attempts?.forEach((attempt) => steps.push({ at: attempt.at, kind: "attempt", person, e, slot, attempt }));
      e.pays.forEach((pay, i) => steps.push({ at: pay.at, kind: "pay", person, e, slot, pay, first: i === 0, last: i === e.pays.length - 1 }));
    }
  }
  steps.sort((a, b) => a.at.getTime() - b.at.getTime() || (a.kind === "register" ? -1 : b.kind === "register" ? 1 : 0));

  const enrollmentIds: Record<string, string> = {};
  const referralCodes: Record<string, string> = {};
  const paidCount: Record<string, number> = {};
  const completedAt: Record<string, Date> = {};
  let n = 0;
  for (const s of steps) {
    const userId = ids[s.person.key];
    const pkg = pkgs[`${s.e.cycle}:${s.e.pkg}`];
    if (!pkg) throw new Error(`No package ${s.e.cycle}:${s.e.pkg}`);

    if (s.kind === "register") {
      const ref = s.e.referredBy ? referralCodes[`${s.e.referredBy.person}:${s.e.referredBy.cycle}`] : null;
      if (s.e.referredBy && !ref) throw new Error(`${s.slot}: referrer not active yet`);
      const id = await must(
        "create_enrollment",
        db.rpc("create_enrollment", { p_user_id: userId, p_package_id: pkg.id, p_collection_point_id: cps[s.e.cp].id, p_referral_code: ref }),
      );
      enrollmentIds[s.slot] = id as string;
      paidCount[s.slot] = 0;
      await must("backdate enrollment", db.from("enrollments").update({ created_at: iso(s.at), terms_accepted_at: iso(s.at) }).eq("id", id));
      await backdateNewEvents(id as string, s.at);
      continue;
    }

    const enrollmentId = enrollmentIds[s.slot];
    const months = s.kind === "pay" ? s.pay.months : 1;
    const [prep] = (await must(
      "prepare_payment",
      db.rpc("prepare_payment", { p_enrollment_id: enrollmentId, p_user_id: userId, p_months: months, p_provider: "paystack" }),
    )) as { payment_id: string; reference: string; amount_kobo: number; includes_registration: boolean }[];
    await must("backdate attempt", db.from("payments").update({ created_at: iso(addMin(s.at, -3)) }).eq("id", prep.payment_id));

    if (s.kind === "attempt") {
      await must(
        "mark_payment_unsuccessful",
        db.rpc("mark_payment_unsuccessful", { p_reference: prep.reference, p_status: s.attempt.status, p_gateway_response: s.attempt.response, p_raw: DEMO }),
      );
      continue;
    }

    const amount = prep.amount_kobo + (s.pay.extraKobo ?? 0);
    const ch = channel();
    const result = (await must(
      "finalize_payment",
      db.rpc("finalize_payment", {
        p_reference: prep.reference, p_amount_kobo: amount, p_paid_at: iso(s.at), p_channel: ch,
        p_gateway_transaction_id: 4_100_000_000 + ++n, p_fees_kobo: fee(amount), p_gateway_response: "Approved", p_raw: DEMO,
      }),
    )) as { activated: boolean; completed: boolean; referral_code: string; customer_code: string; receipt_number: string; months_paid: number };
    paidCount[s.slot] += result.months_paid;
    const patch: Record<string, string> = {};
    if (result.activated) {
      patch.activated_at = iso(s.at);
      referralCodes[s.slot] = result.referral_code;
    }
    if (result.completed) {
      patch.completed_at = iso(s.at);
      completedAt[s.slot] = s.at;
    }
    if (Object.keys(patch).length) await must("backdate lifecycle", db.from("enrollments").update(patch).eq("id", enrollmentId));
    await backdateNewEvents(enrollmentId, s.at);

    const to = email(s.person.key);
    if (result.activated)
      emails.push({ template_key: "welcome", to_email: to, user_id: userId, enrollment_id: enrollmentId, subject: `Welcome to Luxuriate, your customer ID is ${result.customer_code}`, at: addMin(s.at, 1) });
    // two receipts bounced: one today, one last week
    const bounced = s.person.key === "kunle" || s.person.key === "nkechi";
    emails.push({
      template_key: "payment_confirmation", to_email: to, user_id: userId, enrollment_id: enrollmentId, subject: `Payment received · ${result.receipt_number}`, at: addMin(s.at, 1),
      ...(bounced ? { status: "failed" as const, error: "550 5.1.1 Mailbox unavailable" } : {}),
    });
    if (result.completed)
      emails.push({ template_key: "contribution_completed", to_email: to, user_id: userId, enrollment_id: enrollmentId, subject: "Every month is paid. Congratulations!", at: addMin(s.at, 2) });
    if (s.at > addDays(NOW, -30)) webhooks.push({ at: addMin(s.at, 0.2), reference: prep.reference });
    process.stdout.write(".");
  }
  console.log("");

  // 5. monthly reminders and overdue notices for the 2026 payers
  for (const person of people) {
    for (const e of person.enr.filter((x) => x.cycle === 2026)) {
      const slot = `${person.key}:${e.cycle}`;
      const paid = paidCount[slot];
      for (let m = 2; m <= Math.min(12, paid + 1); m++) {
        const remindAt = lagos(2026, m, 25, 8, between(0, 6));
        if (remindAt > NOW) continue;
        const done = completedAt[slot];
        if (done && done < remindAt) continue;
        const month = new Date(Date.UTC(2026, m - 1, 1)).toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
        emails.push({ template_key: "payment_reminder", to_email: email(person.key), user_id: ids[person.key], enrollment_id: enrollmentIds[slot], subject: `Your ${month} contribution is due on the 28th`, at: remindAt });
      }
      for (let m = paid + 1; m <= 12; m++) {
        const overdueAt = lagos(2026, m + 1, 4, 8, between(0, 6));
        if (overdueAt > NOW) continue;
        const month = new Date(Date.UTC(2026, m - 1, 1)).toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
        emails.push({ template_key: "payment_overdue", to_email: email(person.key), user_id: ids[person.key], enrollment_id: enrollmentIds[slot], subject: `Your ${month} contribution is overdue`, at: overdueAt });
      }
    }
  }

  // 6. fulfilment steps and savings returns, done by Chidi from operations
  const STEP_TITLE: Record<Fulfil, string> = {
    preparing: "Your package is being prepared",
    ready: "Your package is ready",
    collection_scheduled: "Collection scheduled",
    collected: "Package collected",
  };
  for (const person of people) {
    for (const e of person.enr) {
      const slot = `${person.key}:${e.cycle}`;
      const enrollmentId = enrollmentIds[slot];
      const pkg = pkgs[`${e.cycle}:${e.pkg}`];
      if (e.fulfilment) {
        const lastStep = e.fulfilment.steps[e.fulfilment.steps.length - 1];
        await must(
          "fulfilment",
          db.from("enrollments").update({
            fulfilment_status: lastStep.status,
            fulfilment_updated_at: iso(lastStep.at),
            collection_scheduled_for: e.fulfilment.scheduledFor ? iso(e.fulfilment.scheduledFor) : null,
            fulfilment_note: e.fulfilment.note ?? null,
          }).eq("id", enrollmentId),
        );
        await must(
          "fulfilment events",
          db.from("enrollment_events").insert(
            e.fulfilment.steps.map((st) => ({
              enrollment_id: enrollmentId,
              kind: `fulfilment:${st.status}`,
              title: STEP_TITLE[st.status],
              body:
                st.status === "collection_scheduled" && e.fulfilment!.scheduledFor
                  ? `Collection on ${e.fulfilment!.scheduledFor.toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" })}${e.fulfilment!.note ? `. ${e.fulfilment!.note}` : ""}`
                  : null,
              created_at: iso(st.at),
            })),
          ),
        );
        for (const st of e.fulfilment.steps) {
          emails.push({ template_key: `fulfilment_${st.status}`, to_email: email(person.key), user_id: ids[person.key], enrollment_id: enrollmentId, subject: STEP_TITLE[st.status], at: addMin(st.at, 1) });
          activity.push({ actor: "chidi", action: "fulfilment.update", entity_type: "enrollment", summary: `Moved 1 package to ${st.status.replace(/_/g, " ")}`, at: st.at, details: { status: st.status, enrollment_ids: [enrollmentId] } });
        }
      }
      if (e.savingsPaidAt && pkg.savings > 0) {
        const ref = `TRF-${e.savingsPaidAt.toISOString().slice(0, 10).replace(/-/g, "")}-${between(1000, 9999)}`;
        await must(
          "savings",
          db.from("enrollments").update({ savings_return_status: "paid", savings_return_paid_at: iso(e.savingsPaidAt), savings_return_reference: ref, savings_return_paid_by: ids.chidi }).eq("id", enrollmentId),
        );
        const naira = `₦${(pkg.savings / 100).toLocaleString("en-NG")}`;
        await must(
          "savings event",
          db.from("enrollment_events").insert({ enrollment_id: enrollmentId, kind: "savings_paid", title: "Savings return paid", body: `${naira} has been sent to you.`, created_at: iso(e.savingsPaidAt) }),
        );
        emails.push({ template_key: "savings_return_paid", to_email: email(person.key), user_id: ids[person.key], enrollment_id: enrollmentId, subject: `Your ${naira} savings return has been sent`, at: addMin(e.savingsPaidAt, 1) });
        activity.push({ actor: "chidi", action: "savings.paid", entity_type: "enrollment", entity_id: enrollmentId, summary: `Marked savings return of ${naira} as paid`, at: e.savingsPaidAt, details: { reference: ref } });
      }
    }
  }

  // 7. staff going about their week
  const week: [string, string, string, number, number][] = [
    ["owner", "settings.update", "Updated business settings", 9, 10],
    ["owner", "package.toggle", "Opened Diamond Promax for registration", 8, 15],
    ["bisi", "customer.update", "Updated phone number for Seun Afolabi", 6, 11],
    ["owner", "email.template", "Edited the Monthly reminder email", 5, 16],
    ["bisi", "customer.update", "Updated address for Yemi Ogunleye", 4, 10],
    ["owner", "email.broadcast", "Emailed 4 Gold customers about collection dates", 3, 13],
    ["bisi", "customer.update", "Updated WhatsApp number for Chiamaka Okeke", 2, 15],
    ["owner", "settings.collection_point", "Updated opening hours for Lekki Hub", 1, 12],
    ["bisi", "customer.update", "Updated emergency contact for Blessing Etim", 0, 9],
  ];
  for (const [actor, action, summary, d, h] of week) activity.push({ actor, action, summary, at: daysAgo(d, h, between(0, 59)) });

  // 8. write the logs
  const names: Record<string, string> = { owner: OWNER.name, chidi: STAFF[0].name, bisi: STAFF[1].name };
  const pastEmails = emails.filter((m) => m.at <= NOW);
  for (let i = 0; i < pastEmails.length; i += 200) {
    await must(
      "email log",
      db.from("email_log").insert(
        pastEmails.slice(i, i + 200).map((m) => ({
          template_key: m.template_key, to_email: m.to_email, user_id: m.user_id, enrollment_id: m.enrollment_id,
          subject: m.subject, status: m.status ?? "sent", provider: "console", error: m.error ?? null, created_at: iso(m.at),
        })),
      ),
    );
  }
  await must(
    "activity",
    db.from("activity_log").insert(
      activity.filter((a) => a.at <= NOW).map((a) => ({
        actor_id: ids[a.actor], actor_name: names[a.actor], action: a.action, entity_type: a.entity_type ?? null, entity_id: a.entity_id ?? null,
        summary: a.summary, details: { ...(a.details ?? {}), ...DEMO }, created_at: iso(a.at),
      })),
    ),
  );

  const runs: Record<string, unknown>[] = [];
  for (let d = 44; d >= 0; d--) {
    const at = daysAgo(d, 8, between(0, 2));
    if (at > NOW) continue;
    const day = at.toISOString().slice(0, 10);
    const due = pastEmails.filter((m) => (m.template_key === "payment_reminder" || m.template_key === "payment_overdue") && m.at.toISOString().slice(0, 10) === day);
    const failed = due.filter((m) => m.status === "failed").length;
    runs.push({
      source: "cron.reminders", status: failed ? "error" : "ok",
      summary: due.length ? `${due.length - failed} sent${failed ? `, ${failed} failed` : ""} of ${due.length} due` : "Nothing due today",
      details: { candidates: due.length, sent: due.length - failed, failed, ...DEMO }, duration_ms: between(380, 1900), created_at: iso(at),
    });
  }
  for (const w of webhooks) runs.push({ source: "paystack.webhook", status: "ok", summary: "charge.success", details: { reference: w.reference, ...DEMO }, duration_ms: between(90, 420), created_at: iso(w.at) });
  await must("system events", db.from("system_events").insert(runs));

  // 9. close the 2026 cycle, and sign the team in once so "last seen" is real
  await must("close 2026", db.from("packages").update({ is_open: false }).like("description", `${TAG}%`));
  if (anonKey) {
    for (const k of ["owner", "chidi", "bisi", "amara"]) {
      const c = createClient(url!, anonKey, { auth: { persistSession: false } });
      await c.auth.signInWithPassword({ email: email(k), password: PASSWORD });
    }
  }

  const payments = steps.filter((s) => s.kind === "pay").length;
  console.log(`✓ Demo data ready: ${people.length} customers, ${payments} payments, ${pastEmails.length} emails.`);
  console.log(`\n  Password for every demo account: ${PASSWORD}   (shown once; pnpm demo:password makes a new one)\n`);
  console.log(`  Owner (super admin)   ${email("owner")}`);
  console.log(`  Operations staff      ${email("chidi")}`);
  console.log(`  Payments clerk        ${email("bisi")}`);
  console.log(`  Customer, month due   ${email("amara")}   (two packages, three referrals)`);
  console.log(`  Customer, collecting  ${email("ngozi")}`);
  console.log(`  Customer, late        ${email("seun")}`);
  console.log(`\n  Remove it all with: pnpm demo:clear`);
}

/** A fresh password for every demo account, printed once. */
async function rotate() {
  const profiles = await must("list demo profiles", db.from("profiles").select("id, email").ilike("email", `%@${DOMAIN}`));
  for (const p of profiles ?? []) {
    const { error } = await db.auth.admin.updateUserById(p.id, { password: PASSWORD });
    if (error) throw new Error(`${p.email}: ${error.message}`);
  }
  console.log(`✓ New password for ${profiles?.length ?? 0} demo accounts: ${PASSWORD}`);
}

const cmd = process.argv[2];
(cmd === "clear" ? clear() : cmd === "seed" ? seed() : cmd === "password" ? rotate() : Promise.reject(new Error("Usage: demo-data.ts seed|password|clear"))).catch((e) => {
  console.error("\n✗", e instanceof Error ? e.message : e);
  process.exit(1);
});
