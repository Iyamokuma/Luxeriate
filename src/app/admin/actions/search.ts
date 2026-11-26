"use server";

import { authorize } from "@/lib/auth";
import { escapeFilter } from "@/lib/utils";

export async function searchCustomers(q: string) {
  const auth = await authorize("customers.view");
  if (!auth.ok) return [];
  const term = escapeFilter(q);
  if (term.length < 2) return [];
  const { data } = await auth.session.supabase
    .from("enrollment_overview")
    .select("id, full_name, customer_code, phone, package_name, status")
    .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,customer_code.ilike.%${term}%,email.ilike.%${term}%`)
    .order("created_at", { ascending: false })
    .limit(8);
  return data ?? [];
}
