# Luxuriate Foodstuff · Online Contribution Platform

Customers choose a foodstuff package, register, pay monthly contributions through Paystack and follow their progress until they collect their package. Behind it sits a back office for customers, payments, packages, procurement, fulfilment, savings returns, referrals, emails, staff and reports.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · Three.js · Supabase (Postgres, Auth, Row Level Security, Realtime) · Paystack · Resend or any SMTP server.

---

## What's included

| Proposal item | Where it lives |
|---|---|
| Homepage | `/`: hero, who we are, the package-box animation, then "View our packages" |
| All packages and how to join each one | The packages popup (`src/components/marketing/package-browser.tsx`), opened from the header, the hero, the package tiles or any link to `/#choose` (`/#choose-gold` preselects a package). For the chosen package it shows today's payment (including any months already due), the monthly amount and due day, the final month, the items and any savings return, with a button straight into registration |
| About page | `/about` |
| Package page (items, period, total, savings return shown apart) | `/packages/[slug]` |
| Three-step registration | `/join/[slug]` (details → review → password, terms and payment) |
| First payment = registration fee + first month | Computed by the database (`prepare_payment`), never by the browser |
| Customer ID on confirmed payment (`LUX-2027-000001`) | `finalize_payment` in the database |
| Monthly reminders | `/api/cron/reminders`, run daily |
| Customer dashboard | `/dashboard`: opens on the plan that needs attention first (late, then due, then a package waiting to be collected). A charcoal-and-gold hero says where the plan stands and what to pay, beside the customer's own 3D package box filled with one item per month paid. Below: savings against the plan, their on-time record, the year month by month, what's in their box, receipts, referral code and activity. Also `/dashboard/payments` (totals across plans, receipts, schedule), `/dashboard/referrals`, `/dashboard/profile` |
| Downloadable receipts | `/api/receipts/[id]` (branded PDF) |
| Completion, fulfilment steps, savings return status | Dashboard tracker and timeline |
| Executive brief (owner only, the super admin's home page) | `/admin/executive`: the cycle's booked value against what's collected, a scorecard against the previous cycle, collection, overdue, completion, renewal and referral rates, 12 months of revenue, where the money stands (received, still to come, promised back, costs), package mix, loyalty and top referrers, customers behind on payments with one-tap call and pre-written WhatsApp messages, stalled registrations, the team and recent sensitive changes. Staff who open it are sent to the command centre |
| Command centre: money, customers, packages, fulfilment, emails, team, system health and launch readiness on one page, with a live event stream | `/admin` (updates by itself through Supabase Realtime; each staff member sees only what their permissions allow) |
| Customers (search, profile, history, Excel export) | `/admin/customers` |
| Payments (Paid / Unpaid / Late / Completed; registration fees on their own line) | `/admin/payments` |
| Packages (create, edit, items, savings return, open/close, copy to next year) | `/admin/packages` |
| Procurement totals and buying list | `/admin/procurement` (Excel and PDF) |
| Fulfilment by collection point, customer notified at each step | `/admin/fulfilment` |
| Savings returns, mark as paid | `/admin/savings` |
| Referrals and top referrers | `/admin/referrals` |
| Editable automatic emails, email everyone on a package | `/admin/emails` |
| Staff accounts with limited permissions, activity log | `/admin/staff`, `/admin/activity` |
| Reports (Excel and PDF) | `/admin/reports` |
| Optional personal account numbers (Paystack Dedicated Virtual Accounts) | Set `PAYSTACK_DVA_ENABLED=true` |

### How money is kept safe

- **No fake alerts.** A payment is only marked paid after the server checks it with Paystack's API, from both the browser callback and the signed webhook. A screenshot or forwarded alert can never credit an account.
- **The database decides the amount.** The browser only says how many months; `prepare_payment` works out what is owed from the schedule.
- **Exactly once.** `finalize_payment` locks the payment row and is idempotent, so the webhook and the browser can race without double-crediting anyone.
- **Clean books.** Each payment is split into ledger lines: `registration_fee`, `contribution` (one per month) and `credit` (money that didn't fill a whole month, held and applied to the next one). Lines always add up to the amount paid.
- **Row Level Security everywhere.** Customers can only ever read their own records. Staff permissions are enforced inside the database, not just hidden in the UI. Money-moving functions can only be called by the server's secret key.

---

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (region close to Nigeria, e.g. `eu-west`).
2. Link it and push the schema:

   ```bash
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   pnpm db:push            # runs everything in supabase/migrations
   ```

   If your network has no IPv6 (the push fails with "no route to host"), push through Supabase's IPv4 session pooler instead. Find the exact string under **Connect → Session pooler**; for this project it is:

   ```bash
   supabase db push --include-seed --db-url "postgresql://postgres.<project-ref>:<url-encoded-password>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
   ```

3. Load the starter data (optional, see the note below). In the Supabase dashboard open **SQL Editor**, paste the contents of `supabase/seed.sql` and run it.
4. **Authentication → Sign In / Providers:** turn **off** "Allow new users to sign up". Customer accounts are created by the server during registration, and staff by invitation, so public sign-ups aren't needed.
5. **Project Settings → API:** copy the URL, the publishable (anon) key and the secret (service role) key into `.env.local`.

> **Placeholder data.** The nine packages, food items, savings returns, collection points and the draft terms in `seed.sql` were built from the proposal so the site has something to show. Replace them with Luxuriate's final 2027 list in **Admin → Packages** and **Admin → Settings** before launch.

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill it in. On Vercel, add the same variables under **Settings → Environment Variables**.

| Variable | What it's for |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public address, e.g. `https://luxuriatefoodstuff.com`. Used in emails, receipts and Paystack callbacks |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase project |
| `SUPABASE_SECRET_KEY` | Server only. Never expose it in the browser |
| `PAYSTACK_SECRET_KEY` | `sk_test_…` while testing, `sk_live_…` for launch |
| `PAYSTACK_TEST_MODE` | `true` gives a simulated checkout in local development when you have no Paystack keys. Ignored in production |
| `PAYSTACK_DVA_ENABLED`, `PAYSTACK_DVA_PREFERRED_BANK` | Optional personal account numbers (needs a CAC-registered Paystack business with the feature enabled) |
| `EMAIL_PROVIDER` | `resend`, `smtp` or `console` (prints to the server log) |
| `EMAIL_FROM`, `EMAIL_REPLY_TO` | Sender and reply-to address |
| `RESEND_API_KEY` or `SMTP_*` | Credentials for the chosen provider |
| `CRON_SECRET` | Long random string protecting the reminder job |

## 3. Create the owner account

```bash
pnpm create-owner owner@example.com "Owner Name" "a-strong-password"
```

Sign in at `/login` and you'll land on the executive brief. Invite staff from **Admin → Staff**; they get an email to set their password and land in the command centre.

### Trying it with demo data

```bash
pnpm demo:seed       # an owner, two staff and 34 customers with backdated payments
pnpm demo:password   # a new password for every demo account
pnpm demo:clear      # removes all of it
```

The seed copies five packages into a closed 2026 cycle (the public site only shows the newest open cycle) and signs customers up to both 2026 and 2027, so every state has something to show: on track, due, late, completed, each fulfilment step, savings returns, referrals, a payment flagged for review and failed checkouts. Payments go through `create_enrollment`, `prepare_payment` and `finalize_payment` in date order, so the ledger balances as it would for real.

Every demo account uses an `@luxuriate.test` address and shares one password, generated on each run and printed once by `demo:seed` or `demo:password` (it is never stored in the repository). The demo owner is a real owner account on the database in `.env.local`, so keep that password private:

| Account | Shows |
|---|---|
| `owner@luxuriate.test` | Executive brief and the whole back office |
| `chidi@luxuriate.test`, `bisi@luxuriate.test` | Staff with the Operations and Payments clerk permissions |
| `amara@luxuriate.test` | Two plans, a month due now, three referrals |
| `ngozi@luxuriate.test` | A finished plan with collection booked, plus a new 2027 plan |
| `seun@luxuriate.test` | Three months overdue |
| `tayo@luxuriate.test` | Registered, not yet paid |

`pnpm demo:clear` deletes the demo accounts (and with them their enrollments and payments), their emails and log entries and the 2026 demo packages, then winds the customer ID and receipt counters back to the highest number still in use. **Run it before launch.**

## 4. Paystack

1. Use your **test** secret key first. Paystack's test cards (e.g. `4084 0840 8408 4081`, any future expiry, CVV `408`, PIN `0000`, OTP `123456`) let you run the whole flow without real money.
2. In **Paystack → Settings → API Keys & Webhooks**, set the webhook URL to `https://YOUR-DOMAIN/api/paystack/webhook`. The exact URL is also shown in **Admin → Settings → Integrations**.
3. Switch to the live secret key for launch. Money always goes straight into Luxuriate's own Paystack account.

## 5. Email

- **Resend (recommended):** add and verify the sending domain in Resend, set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` and `EMAIL_FROM`.
- **SMTP:** set `EMAIL_PROVIDER=smtp` and `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (works with Zoho, Google Workspace, etc.).

Every email's wording can be edited in **Admin → Emails**, with a live preview and "send me a test". All deliveries are recorded in the delivery log.

## 6. Daily reminders

`vercel.json` schedules `/api/cron/reminders` every day at 07:00 UTC (08:00 in Lagos). Each run, and every Paystack webhook, is logged to `system_events`, so the overview shows when the job last ran and flags it if a day is missed. Vercel sends `CRON_SECRET` automatically. Reminders go out a few days before each due date (default 3) and one overdue notice goes out when the grace period ends (default 7 days). Both are set in **Admin → Settings**. Every reminder is de-duplicated, so running the job twice never emails anyone twice.

Not on Vercel? Schedule it from Supabase instead (enable the `pg_cron` and `pg_net` extensions first):

```sql
select cron.schedule('luxuriate-reminders', '0 7 * * *', $$
  select net.http_get(
    url := 'https://YOUR-DOMAIN/api/cron/reminders',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
  );
$$);
```

## 7. Run and deploy

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test:db      # 22 database tests (in-memory Postgres, no Docker needed)
pnpm typecheck
pnpm lint
pnpm build
```

Deploy by importing the repository into Vercel and adding the environment variables. Any Node 20+ host works too (`pnpm build && pnpm start`).

### Trying it locally without Paystack keys

Set `PAYSTACK_TEST_MODE=true` and leave `PAYSTACK_SECRET_KEY` empty. Checkout then opens a clearly labelled "Simulated checkout" that confirms the payment through the same server code path. It never appears in a production build.

---

## Go-live checklist

- [ ] Demo data removed with `pnpm demo:clear` (if it was ever seeded)
- [ ] Final 2027 packages, items and savings returns entered (Admin → Packages)
- [ ] Collection points and addresses (Admin → Settings → Collection points)
- [ ] Luxuriate's terms and conditions published (Admin → Settings → Terms)
- [ ] Support email, phone and WhatsApp number (Admin → Settings → Business)
- [ ] Live Paystack secret key and webhook URL set
- [ ] Sending domain verified and `EMAIL_PROVIDER` set
- [ ] `CRON_SECRET` set and the cron job visible in Vercel
- [ ] `NEXT_PUBLIC_SITE_URL` is the real domain
- [ ] Public sign-ups disabled in Supabase Auth
- [ ] Test purchase made end to end with a test card, receipt downloaded, webhook delivered

## Project structure

```
supabase/
  migrations/      schema, business logic (SQL functions), RLS & views, email templates
  seed.sql         placeholder packages, collection points and draft terms
scripts/
  test-db.ts       database test-suite (PGlite)
  create-owner.ts  create or promote the owner account
  demo-data.ts     seed or clear demo accounts and payments (pnpm demo:seed / demo:clear)
src/
  app/
    (marketing)/   homepage, package pages, terms
    (auth)/        login, forgot / reset password
    join/          three-step registration and first payment
    dashboard/     customer area
    admin/         back office (one folder per section, server actions in admin/actions)
    api/           Paystack webhook, payment verification, receipts, exports, cron
  components/      ui (design system), marketing, dashboard, admin, payments
  lib/
    payments.ts    start and confirm payments (Paystack + database)
    paystack.ts    Paystack API client and webhook signature check
    email/         template rendering, providers, notifications
    pdf/           receipt and report documents
    data/          data access (catalogue, customer, admin, executive brief), Nigerian states and LGAs
    customer-insights.ts  where a plan stands, the on-time record and savings against plan
  proxy.ts         session refresh and sign-in redirects (Next 16's middleware)
```

## Brand and design

- **Logo.** `src/lib/brand/logo-geometry.ts` holds the LM mark traced from the supplied artwork (polygons for the letters, two tapered arcs for the gold ring); `src/lib/brand/wordmark.ts` holds the LUXURIATE lettering as vector paths. Everything else is generated from these: the logo components in `src/components/ui/logo.tsx` (`Logo`, `LogoMark`, `LogoFull`, `Wordmark`, `ArcsMotif`), the favicon, the PDF receipts and reports, and the Three.js sculptures. `public/brand/luxuriate-lockup.png` is the email header.
- **Colours.** `forest-700` is the logo green `#014e22` and `honey-500` the logo gold `#cf9e29`; the other steps are built around them in `src/app/globals.css`.
- **Type.** Plus Jakarta Sans for all text (`font-sans` / `font-display`) and IBM Plex Mono for figures and labels (`font-mono`). Both are self-hosted and both include the ₦ sign.
- **Three.js.** Three scenes, each loaded on demand in its own chunk so first paint never waits for it:
  - `src/components/three/gold-orbit.ts`: the homepage hero. The logo's two gold arcs orbit the dashboard window on two tilted planes (the second wobbles slowly, like a gyroscope), shedding a fine gold dust, sweeping in on arrival and picking up speed as you scroll. The WebGL camera is matched to the CSS perspective of the window and an invisible copy of the window writes depth, so the arcs pass behind and in front of the real HTML. Behind it all sits a charcoal disc with a gold corona (`src/components/three/hero-stage.tsx`).
  - `src/components/three/pantry.ts`: the About page hero. A Luxuriate package box fills with foodstuff, one item per monthly payment; when the twelfth lands the full box is sent off for collection and an empty one slides in. A card beside it follows month by month. Items are modelled from primitives with painted "Luxuriate" labels, so there are no model files to download.
  - `src/components/three/monogram.ts`: the LM monogram as an enamel-and-gold sculpture (homepage closing section, login panel). It can be dragged to turn.
  - All of them pause off screen and in background tabs, respect "reduce motion", skip themselves on software-rendered WebGL, and stop animating if a device can't hold ~25 fps. Without WebGL the layout stays the same, with the flat logo or the plain dashboard window.
- **Light and dark.** Dark surfaces use warm charcoal (`night`, `night-2`, `night-3` in `globals.css`) with gold light, which sits well beside the cream. The homepage hero is light with the charcoal disc; "How it works", the closing card, the footer, the About hero, the login panel and the signed-in top bar and sidebar are charcoal. The header switches to light text over any element marked `data-dark`.

## Notes for developers

- **Money is in kobo** (`bigint`) everywhere in the database. `naira()` in `src/lib/format.ts` formats it.
- **Time zone:** due dates, "today" and reports use `Africa/Lagos`.
- **Cache Components:** public pages are prerendered and tagged (`packages`, `settings`, `collection-points`); admin edits refresh them with `updateTag`. Private pages read the session inside `<Suspense>` and stream.
- **Types:** row types live in `src/types/db.ts`. `pnpm db:types` can generate Supabase's full types after linking.
- **Adding a staff permission:** add it to `PERMISSIONS` in `src/lib/constants.ts`, check it with `authorize()` / `requireStaff()` in the app and `has_perm()` / `require_perm()` in SQL.
