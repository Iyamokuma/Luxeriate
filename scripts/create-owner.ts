/**
 * Create (or promote) the business owner account.
 *
 *   pnpm create-owner owner@luxuriate.ng "Owner Name" "a-strong-password"
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from .env.local.
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const [email, name, password] = process.argv.slice(2);
  if (!email || !name) {
    console.error('Usage: pnpm create-owner <email> "<full name>" [password]');
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
  const admin = createClient(url, key, { auth: { persistSession: false } });

  let userId: string | undefined;
  const { data: existing } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
  if (existing) {
    userId = existing.id;
    console.log(`Found existing account for ${email}.`);
    if (password) await admin.auth.admin.updateUserById(userId!, { password });
  } else {
    if (!password || password.length < 8) throw new Error("Provide a password of at least 8 characters for a new account.");
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Created ${email}.`);
  }

  const { error } = await admin.from("profiles").update({ role: "owner", full_name: name, is_active: true }).eq("id", userId!);
  if (error) throw error;
  console.log(`✓ ${name} is now an owner. Sign in at /login to open the back office.`);
}

main().catch((e) => {
  console.error("✗", e.message ?? e);
  process.exit(1);
});
