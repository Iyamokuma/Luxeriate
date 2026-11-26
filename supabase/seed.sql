-- ============================================================================
-- Sample data for local development and first launch.
-- IMPORTANT: the nine packages, food items, savings returns and collection
-- points below are PLACEHOLDERS built from the proposal. Replace them with
-- Luxuriate's final 2027 list from Admin → Packages and Admin → Settings.
-- ============================================================================

insert into public.collection_points (id, name, address, state, sort_order) values
  ('00000000-0000-4000-8000-000000000101', 'Lekki Hub', 'Admiralty Way, Lekki Phase 1', 'Lagos', 1),
  ('00000000-0000-4000-8000-000000000102', 'Ikeja Hub', 'Allen Avenue, Ikeja', 'Lagos', 2),
  ('00000000-0000-4000-8000-000000000103', 'Surulere Hub', 'Adeniran Ogunsanya Street, Surulere', 'Lagos', 3),
  ('00000000-0000-4000-8000-000000000104', 'Ikorodu Hub', 'Lagos Road, Ikorodu', 'Lagos', 4),
  ('00000000-0000-4000-8000-000000000105', 'Abuja Hub', 'Aminu Kano Crescent, Wuse 2', 'FCT - Abuja', 5)
on conflict (id) do nothing;

insert into public.packages (id, cycle_year, slug, name, tagline, badge, theme, monthly_amount_kobo, registration_fee_kobo, savings_return_kobo, duration_months, start_month, due_day, sort_order) values ('00000000-0000-4000-8000-000000000201', 2027, 'student', 'Student', 'Light, smart essentials for students and young singles.', null, 'oat', 850000, 300000, 0, 12, '2027-01-01', 28, 1) on conflict (id) do nothing;
insert into public.package_items (package_id, name, quantity, unit, sort_order) values
  ('00000000-0000-4000-8000-000000000201', 'Rice (parboiled)', 10, 'kg', 1),
  ('00000000-0000-4000-8000-000000000201', 'Beans (brown)', 5, 'kg', 2),
  ('00000000-0000-4000-8000-000000000201', 'Garri (white)', 5, 'kg', 3),
  ('00000000-0000-4000-8000-000000000201', 'Spaghetti', 10, 'packs', 4),
  ('00000000-0000-4000-8000-000000000201', 'Instant noodles', 1, 'cartons', 5),
  ('00000000-0000-4000-8000-000000000201', 'Vegetable oil', 3, 'litres', 6),
  ('00000000-0000-4000-8000-000000000201', 'Tomato paste', 6, 'tins', 7),
  ('00000000-0000-4000-8000-000000000201', 'Sugar', 1, 'packs', 8),
  ('00000000-0000-4000-8000-000000000201', 'Seasoning cubes', 1, 'packs', 9),
  ('00000000-0000-4000-8000-000000000201', 'Salt', 1, 'packs', 10);

insert into public.packages (id, cycle_year, slug, name, tagline, badge, theme, monthly_amount_kobo, registration_fee_kobo, savings_return_kobo, duration_months, start_month, due_day, sort_order) values ('00000000-0000-4000-8000-000000000202', 2027, 'bronze', 'Bronze', 'The everyday staples for a small home.', null, 'oat', 1050000, 300000, 0, 12, '2027-01-01', 28, 2) on conflict (id) do nothing;
insert into public.package_items (package_id, name, quantity, unit, sort_order) values
  ('00000000-0000-4000-8000-000000000202', 'Rice (parboiled)', 25, 'kg', 1),
  ('00000000-0000-4000-8000-000000000202', 'Beans (brown)', 10, 'kg', 2),
  ('00000000-0000-4000-8000-000000000202', 'Garri (white)', 10, 'kg', 3),
  ('00000000-0000-4000-8000-000000000202', 'Spaghetti', 10, 'packs', 4),
  ('00000000-0000-4000-8000-000000000202', 'Instant noodles', 1, 'cartons', 5),
  ('00000000-0000-4000-8000-000000000202', 'Vegetable oil', 5, 'litres', 6),
  ('00000000-0000-4000-8000-000000000202', 'Palm oil', 3, 'litres', 7),
  ('00000000-0000-4000-8000-000000000202', 'Tomato paste', 12, 'tins', 8),
  ('00000000-0000-4000-8000-000000000202', 'Sugar', 1, 'packs', 9),
  ('00000000-0000-4000-8000-000000000202', 'Seasoning cubes', 2, 'packs', 10),
  ('00000000-0000-4000-8000-000000000202', 'Salt', 1, 'packs', 11);

insert into public.packages (id, cycle_year, slug, name, tagline, badge, theme, monthly_amount_kobo, registration_fee_kobo, savings_return_kobo, duration_months, start_month, due_day, sort_order) values ('00000000-0000-4000-8000-000000000203', 2027, 'silver', 'Silver', 'A fuller pantry with milk and swallow.', null, 'sage', 1450000, 300000, 0, 12, '2027-01-01', 28, 3) on conflict (id) do nothing;
insert into public.package_items (package_id, name, quantity, unit, sort_order) values
  ('00000000-0000-4000-8000-000000000203', 'Rice (parboiled)', 25, 'kg', 1),
  ('00000000-0000-4000-8000-000000000203', 'Beans (brown)', 10, 'kg', 2),
  ('00000000-0000-4000-8000-000000000203', 'Garri (white)', 10, 'kg', 3),
  ('00000000-0000-4000-8000-000000000203', 'Semovita', 5, 'kg', 4),
  ('00000000-0000-4000-8000-000000000203', 'Spaghetti', 20, 'packs', 5),
  ('00000000-0000-4000-8000-000000000203', 'Instant noodles', 1, 'cartons', 6),
  ('00000000-0000-4000-8000-000000000203', 'Vegetable oil', 5, 'litres', 7),
  ('00000000-0000-4000-8000-000000000203', 'Palm oil', 5, 'litres', 8),
  ('00000000-0000-4000-8000-000000000203', 'Tomato paste', 12, 'tins', 9),
  ('00000000-0000-4000-8000-000000000203', 'Sugar', 2, 'packs', 10),
  ('00000000-0000-4000-8000-000000000203', 'Evaporated milk', 12, 'tins', 11),
  ('00000000-0000-4000-8000-000000000203', 'Seasoning cubes', 2, 'packs', 12),
  ('00000000-0000-4000-8000-000000000203', 'Salt', 2, 'packs', 13);

insert into public.packages (id, cycle_year, slug, name, tagline, badge, theme, monthly_amount_kobo, registration_fee_kobo, savings_return_kobo, duration_months, start_month, due_day, sort_order) values ('00000000-0000-4000-8000-000000000204', 2027, 'silver-pro', 'Silver Pro', 'A full bag of rice and more of everything.', null, 'sage', 1850000, 300000, 0, 12, '2027-01-01', 28, 4) on conflict (id) do nothing;
insert into public.package_items (package_id, name, quantity, unit, sort_order) values
  ('00000000-0000-4000-8000-000000000204', 'Rice (parboiled)', 50, 'kg', 1),
  ('00000000-0000-4000-8000-000000000204', 'Beans (brown)', 10, 'kg', 2),
  ('00000000-0000-4000-8000-000000000204', 'Garri (white)', 10, 'kg', 3),
  ('00000000-0000-4000-8000-000000000204', 'Semovita', 10, 'kg', 4),
  ('00000000-0000-4000-8000-000000000204', 'Spaghetti', 20, 'packs', 5),
  ('00000000-0000-4000-8000-000000000204', 'Instant noodles', 2, 'cartons', 6),
  ('00000000-0000-4000-8000-000000000204', 'Vegetable oil', 10, 'litres', 7),
  ('00000000-0000-4000-8000-000000000204', 'Palm oil', 5, 'litres', 8),
  ('00000000-0000-4000-8000-000000000204', 'Tomato paste', 24, 'tins', 9),
  ('00000000-0000-4000-8000-000000000204', 'Sugar', 2, 'packs', 10),
  ('00000000-0000-4000-8000-000000000204', 'Evaporated milk', 24, 'tins', 11),
  ('00000000-0000-4000-8000-000000000204', 'Seasoning cubes', 2, 'packs', 12),
  ('00000000-0000-4000-8000-000000000204', 'Salt', 2, 'packs', 13);

insert into public.packages (id, cycle_year, slug, name, tagline, badge, theme, monthly_amount_kobo, registration_fee_kobo, savings_return_kobo, duration_months, start_month, due_day, sort_order) values ('00000000-0000-4000-8000-000000000205', 2027, 'gold', 'Gold', 'Our most loved family package, with yam and breakfast.', 'Most popular', 'honey', 2250000, 300000, 1500000, 12, '2027-01-01', 28, 5) on conflict (id) do nothing;
insert into public.package_items (package_id, name, quantity, unit, sort_order) values
  ('00000000-0000-4000-8000-000000000205', 'Rice (parboiled)', 50, 'kg', 1),
  ('00000000-0000-4000-8000-000000000205', 'Beans (brown)', 20, 'kg', 2),
  ('00000000-0000-4000-8000-000000000205', 'Garri (white)', 20, 'kg', 3),
  ('00000000-0000-4000-8000-000000000205', 'Semovita', 10, 'kg', 4),
  ('00000000-0000-4000-8000-000000000205', 'Spaghetti', 20, 'packs', 5),
  ('00000000-0000-4000-8000-000000000205', 'Instant noodles', 2, 'cartons', 6),
  ('00000000-0000-4000-8000-000000000205', 'Vegetable oil', 10, 'litres', 7),
  ('00000000-0000-4000-8000-000000000205', 'Palm oil', 10, 'litres', 8),
  ('00000000-0000-4000-8000-000000000205', 'Tomato paste', 24, 'tins', 9),
  ('00000000-0000-4000-8000-000000000205', 'Sugar', 2, 'packs', 10),
  ('00000000-0000-4000-8000-000000000205', 'Evaporated milk', 24, 'tins', 11),
  ('00000000-0000-4000-8000-000000000205', 'Chocolate beverage', 2, 'packs', 12),
  ('00000000-0000-4000-8000-000000000205', 'Seasoning cubes', 3, 'packs', 13),
  ('00000000-0000-4000-8000-000000000205', 'Salt', 2, 'packs', 14),
  ('00000000-0000-4000-8000-000000000205', 'Yam', 5, 'tubers', 15);

insert into public.packages (id, cycle_year, slug, name, tagline, badge, theme, monthly_amount_kobo, registration_fee_kobo, savings_return_kobo, duration_months, start_month, due_day, sort_order) values ('00000000-0000-4000-8000-000000000206', 2027, 'platinum', 'Platinum', 'Protein, swallow and a generous kitchen for bigger homes.', null, 'blush', 2650000, 300000, 2000000, 12, '2027-01-01', 28, 6) on conflict (id) do nothing;
insert into public.package_items (package_id, name, quantity, unit, sort_order) values
  ('00000000-0000-4000-8000-000000000206', 'Rice (parboiled)', 50, 'kg', 1),
  ('00000000-0000-4000-8000-000000000206', 'Beans (brown)', 25, 'kg', 2),
  ('00000000-0000-4000-8000-000000000206', 'Garri (white)', 25, 'kg', 3),
  ('00000000-0000-4000-8000-000000000206', 'Semovita', 10, 'kg', 4),
  ('00000000-0000-4000-8000-000000000206', 'Poundo yam flour', 5, 'kg', 5),
  ('00000000-0000-4000-8000-000000000206', 'Spaghetti', 30, 'packs', 6),
  ('00000000-0000-4000-8000-000000000206', 'Instant noodles', 2, 'cartons', 7),
  ('00000000-0000-4000-8000-000000000206', 'Vegetable oil', 20, 'litres', 8),
  ('00000000-0000-4000-8000-000000000206', 'Palm oil', 10, 'litres', 9),
  ('00000000-0000-4000-8000-000000000206', 'Tomato paste', 24, 'tins', 10),
  ('00000000-0000-4000-8000-000000000206', 'Sugar', 3, 'packs', 11),
  ('00000000-0000-4000-8000-000000000206', 'Evaporated milk', 24, 'tins', 12),
  ('00000000-0000-4000-8000-000000000206', 'Chocolate beverage', 2, 'packs', 13),
  ('00000000-0000-4000-8000-000000000206', 'Seasoning cubes', 3, 'packs', 14),
  ('00000000-0000-4000-8000-000000000206', 'Salt', 2, 'packs', 15),
  ('00000000-0000-4000-8000-000000000206', 'Yam', 10, 'tubers', 16),
  ('00000000-0000-4000-8000-000000000206', 'Frozen chicken', 5, 'kg', 17);

insert into public.packages (id, cycle_year, slug, name, tagline, badge, theme, monthly_amount_kobo, registration_fee_kobo, savings_return_kobo, duration_months, start_month, due_day, sort_order) values ('00000000-0000-4000-8000-000000000207', 2027, 'diamond', 'Diamond', 'The complete festive kitchen, from rice to soup.', null, 'forest', 3550000, 300000, 2500000, 12, '2027-01-01', 28, 7) on conflict (id) do nothing;
insert into public.package_items (package_id, name, quantity, unit, sort_order) values
  ('00000000-0000-4000-8000-000000000207', 'Rice (parboiled)', 50, 'kg', 1),
  ('00000000-0000-4000-8000-000000000207', 'Beans (brown)', 25, 'kg', 2),
  ('00000000-0000-4000-8000-000000000207', 'Garri (white)', 25, 'kg', 3),
  ('00000000-0000-4000-8000-000000000207', 'Semovita', 10, 'kg', 4),
  ('00000000-0000-4000-8000-000000000207', 'Poundo yam flour', 10, 'kg', 5),
  ('00000000-0000-4000-8000-000000000207', 'Spaghetti', 30, 'packs', 6),
  ('00000000-0000-4000-8000-000000000207', 'Instant noodles', 3, 'cartons', 7),
  ('00000000-0000-4000-8000-000000000207', 'Vegetable oil', 25, 'litres', 8),
  ('00000000-0000-4000-8000-000000000207', 'Palm oil', 10, 'litres', 9),
  ('00000000-0000-4000-8000-000000000207', 'Tomato paste', 48, 'tins', 10),
  ('00000000-0000-4000-8000-000000000207', 'Sugar', 3, 'packs', 11),
  ('00000000-0000-4000-8000-000000000207', 'Evaporated milk', 48, 'tins', 12),
  ('00000000-0000-4000-8000-000000000207', 'Chocolate beverage', 3, 'packs', 13),
  ('00000000-0000-4000-8000-000000000207', 'Seasoning cubes', 4, 'packs', 14),
  ('00000000-0000-4000-8000-000000000207', 'Salt', 3, 'packs', 15),
  ('00000000-0000-4000-8000-000000000207', 'Yam', 10, 'tubers', 16),
  ('00000000-0000-4000-8000-000000000207', 'Frozen chicken', 10, 'kg', 17),
  ('00000000-0000-4000-8000-000000000207', 'Crayfish', 1, 'kg', 18),
  ('00000000-0000-4000-8000-000000000207', 'Onions', 5, 'kg', 19);

insert into public.packages (id, cycle_year, slug, name, tagline, badge, theme, monthly_amount_kobo, registration_fee_kobo, savings_return_kobo, duration_months, start_month, due_day, sort_order) values ('00000000-0000-4000-8000-000000000208', 2027, 'diamond-pro', 'Diamond Pro', 'Everything in Diamond, with a full bag of beans and breakfast extras.', 'Best value', 'forest', 4250000, 300000, 3000000, 12, '2027-01-01', 28, 8) on conflict (id) do nothing;
insert into public.package_items (package_id, name, quantity, unit, sort_order) values
  ('00000000-0000-4000-8000-000000000208', 'Rice (parboiled)', 50, 'kg', 1),
  ('00000000-0000-4000-8000-000000000208', 'Beans (brown)', 50, 'kg', 2),
  ('00000000-0000-4000-8000-000000000208', 'Garri (white)', 25, 'kg', 3),
  ('00000000-0000-4000-8000-000000000208', 'Semovita', 10, 'kg', 4),
  ('00000000-0000-4000-8000-000000000208', 'Poundo yam flour', 10, 'kg', 5),
  ('00000000-0000-4000-8000-000000000208', 'Spaghetti', 30, 'packs', 6),
  ('00000000-0000-4000-8000-000000000208', 'Instant noodles', 3, 'cartons', 7),
  ('00000000-0000-4000-8000-000000000208', 'Vegetable oil', 25, 'litres', 8),
  ('00000000-0000-4000-8000-000000000208', 'Palm oil', 10, 'litres', 9),
  ('00000000-0000-4000-8000-000000000208', 'Tomato paste', 48, 'tins', 10),
  ('00000000-0000-4000-8000-000000000208', 'Sugar', 3, 'packs', 11),
  ('00000000-0000-4000-8000-000000000208', 'Evaporated milk', 48, 'tins', 12),
  ('00000000-0000-4000-8000-000000000208', 'Chocolate beverage', 3, 'packs', 13),
  ('00000000-0000-4000-8000-000000000208', 'Custard', 2, 'tins', 14),
  ('00000000-0000-4000-8000-000000000208', 'Breakfast cereal', 2, 'packs', 15),
  ('00000000-0000-4000-8000-000000000208', 'Seasoning cubes', 4, 'packs', 16),
  ('00000000-0000-4000-8000-000000000208', 'Salt', 3, 'packs', 17),
  ('00000000-0000-4000-8000-000000000208', 'Yam', 10, 'tubers', 18),
  ('00000000-0000-4000-8000-000000000208', 'Frozen chicken', 10, 'kg', 19),
  ('00000000-0000-4000-8000-000000000208', 'Crayfish', 1, 'kg', 20),
  ('00000000-0000-4000-8000-000000000208', 'Egusi (ground)', 2, 'kg', 21),
  ('00000000-0000-4000-8000-000000000208', 'Onions', 5, 'kg', 22);

insert into public.packages (id, cycle_year, slug, name, tagline, badge, theme, monthly_amount_kobo, registration_fee_kobo, savings_return_kobo, duration_months, start_month, due_day, sort_order) values ('00000000-0000-4000-8000-000000000209', 2027, 'diamond-promax', 'Diamond Promax', 'Our grandest package: two bags of rice, turkey and the works.', 'Premium', 'ink', 6550000, 300000, 5000000, 12, '2027-01-01', 28, 9) on conflict (id) do nothing;
insert into public.package_items (package_id, name, quantity, unit, sort_order) values
  ('00000000-0000-4000-8000-000000000209', 'Rice (parboiled)', 100, 'kg', 1),
  ('00000000-0000-4000-8000-000000000209', 'Beans (brown)', 50, 'kg', 2),
  ('00000000-0000-4000-8000-000000000209', 'Garri (white)', 50, 'kg', 3),
  ('00000000-0000-4000-8000-000000000209', 'Semovita', 20, 'kg', 4),
  ('00000000-0000-4000-8000-000000000209', 'Poundo yam flour', 10, 'kg', 5),
  ('00000000-0000-4000-8000-000000000209', 'Spaghetti', 40, 'packs', 6),
  ('00000000-0000-4000-8000-000000000209', 'Instant noodles', 4, 'cartons', 7),
  ('00000000-0000-4000-8000-000000000209', 'Vegetable oil', 25, 'litres', 8),
  ('00000000-0000-4000-8000-000000000209', 'Palm oil', 25, 'litres', 9),
  ('00000000-0000-4000-8000-000000000209', 'Tomato paste', 48, 'tins', 10),
  ('00000000-0000-4000-8000-000000000209', 'Sugar', 4, 'packs', 11),
  ('00000000-0000-4000-8000-000000000209', 'Evaporated milk', 48, 'tins', 12),
  ('00000000-0000-4000-8000-000000000209', 'Chocolate beverage', 4, 'packs', 13),
  ('00000000-0000-4000-8000-000000000209', 'Custard', 2, 'tins', 14),
  ('00000000-0000-4000-8000-000000000209', 'Breakfast cereal', 3, 'packs', 15),
  ('00000000-0000-4000-8000-000000000209', 'Seasoning cubes', 5, 'packs', 16),
  ('00000000-0000-4000-8000-000000000209', 'Salt', 4, 'packs', 17),
  ('00000000-0000-4000-8000-000000000209', 'Yam', 20, 'tubers', 18),
  ('00000000-0000-4000-8000-000000000209', 'Frozen chicken', 10, 'kg', 19),
  ('00000000-0000-4000-8000-000000000209', 'Turkey', 10, 'kg', 20),
  ('00000000-0000-4000-8000-000000000209', 'Dried fish', 2, 'kg', 21),
  ('00000000-0000-4000-8000-000000000209', 'Crayfish', 2, 'kg', 22),
  ('00000000-0000-4000-8000-000000000209', 'Egusi (ground)', 2, 'kg', 23),
  ('00000000-0000-4000-8000-000000000209', 'Onions', 10, 'kg', 24);

update public.app_settings set
  business_name = 'Luxuriate Foodstuff',
  reminder_days_before = 3,
  late_grace_days = 7,
  terms_updated_at = now(),
  terms_content = $terms$## About these terms

These terms explain how the Luxuriate Foodstuff contribution plan works. By registering, you agree to them. **Luxuriate will replace this draft with its final terms before launch.**

## Registration

- A one-time registration fee is paid together with your first monthly contribution.
- Your account becomes active, and your customer ID is issued, as soon as that first payment is confirmed.

## Monthly contributions

- Contributions are paid monthly for the full contribution period of your package.
- Payments are made online through Paystack by card, bank transfer or USSD. Every confirmed payment produces a receipt.
- We send an email reminder before each due date. You may pay ahead for future months at any time.

## Missed payments

- A month that is not paid by its due date is marked as overdue once the grace period ends.
- Your package is prepared only after every month has been paid.

## Leaving early

- If you wish to leave the plan before the end of the cycle, contact us. How any contributions already made are treated will be set out here by Luxuriate.

## Your package and collection

- After your final payment, your package moves through Preparing, Ready and Collection Scheduled. We will tell you at each step.
- Packages are collected from the collection point you chose at registration. Please bring your customer ID.
- Food items may be substituted with items of equal or greater value if a brand or size is unavailable.

## Savings return

- Where a package includes a savings return, it is shown separately from the food items and paid to you after you complete all contributions.

## Contact

If you have questions about these terms, reply to any of our emails.
$terms$
where id = 1;
