import { z } from "zod";
import { NIGERIA } from "@/lib/data/nigeria";

const cleanPhone = (v: unknown) => (typeof v === "string" ? v.replace(/[\s\-().]/g, "") : v);

export const phoneSchema = z.preprocess(
  cleanPhone,
  z.string().regex(/^(\+?234|0)[789][01]\d{8}$/, "Enter a valid Nigerian phone number, e.g. 0803 123 4567"),
);

export const detailsSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(3, "Enter your full name")
      .max(120)
      .refine((v) => v.split(/\s+/).length >= 2, "Enter your first and last name"),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
    phone: phoneSchema,
    whatsapp: phoneSchema,
    address: z.string().trim().min(6, "Enter your home address").max(300),
    state: z.string().refine((s) => s in NIGERIA, "Choose your state"),
    lga: z.string().min(1, "Choose your LGA"),
    collection_point_id: z.uuid("Choose where you'll collect your package"),
    emergency_contact_name: z.string().trim().min(2, "Enter an emergency contact's name").max(120),
    emergency_contact_phone: phoneSchema,
    referral_code: z
      .string()
      .trim()
      .toUpperCase()
      .max(20)
      .optional()
      .transform((v) => v || undefined),
  })
  .refine((d) => (NIGERIA[d.state] ?? []).includes(d.lga), { path: ["lga"], message: "Choose an LGA in your state" });

export const accountSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters").max(72),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, { path: ["confirm_password"], message: "The passwords don't match" });

export const termsSchema = z.object({
  accept_terms: z.literal(true, { error: "Please accept the terms and conditions to continue" }),
});

export type Details = z.infer<typeof detailsSchema>;

export const profileUpdateSchema = z
  .object({
    full_name: detailsSchema.shape.full_name,
    phone: phoneSchema,
    whatsapp: phoneSchema,
    address: z.string().trim().min(6, "Enter your home address").max(300),
    state: z.string().refine((s) => s in NIGERIA, "Choose your state"),
    lga: z.string().min(1, "Choose your LGA"),
    emergency_contact_name: z.string().trim().min(2, "Enter a name").max(120),
    emergency_contact_phone: phoneSchema,
  })
  .refine((d) => (NIGERIA[d.state] ?? []).includes(d.lga), { path: ["lga"], message: "Choose an LGA in your state" });

/** Normalise to 0XXXXXXXXXX for storage */
export function normalisePhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.startsWith("234")) return "0" + d.slice(3);
  return d;
}

export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const k = String(issue.path[0] ?? "_");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}
