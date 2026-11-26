import "server-only";
import { env } from "@/lib/env";

export type OutgoingEmail = { to: string; subject: string; html: string; text: string; replyTo?: string };
export type SendResult = { ok: true; id?: string; provider: string } | { ok: false; error: string; provider: string };

type Transport = { sendMail: (opts: Record<string, unknown>) => Promise<{ messageId?: string }> };
let smtp: Transport | null = null;

async function smtpTransport(): Promise<Transport> {
  if (smtp) return smtp;
  const nodemailer = await import("nodemailer");
  smtp = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  }) as unknown as Transport;
  return smtp;
}

export async function sendEmail(msg: OutgoingEmail): Promise<SendResult> {
  const provider = env.emailProvider;
  const replyTo = msg.replyTo ?? env.emailReplyTo;
  try {
    if (provider === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.emailFrom, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text, reply_to: replyTo }),
      });
      const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!res.ok) return { ok: false, error: json.message ?? `Resend responded ${res.status}`, provider };
      return { ok: true, id: json.id, provider };
    }
    if (provider === "smtp") {
      const t = await smtpTransport();
      const info = await t.sendMail({ from: env.emailFrom, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text, replyTo });
      return { ok: true, id: info.messageId, provider };
    }
    console.info(`\n✉️  [email:console] To: ${msg.to}\n   Subject: ${msg.subject}\n   ${msg.text.split("\n").join("\n   ")}\n`);
    return { ok: true, id: `console-${Date.now()}`, provider };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), provider };
  }
}

/** Many emails at once. Resend accepts 100 per request; other providers go one by one. */
export async function sendEmailBatch(msgs: OutgoingEmail[]): Promise<SendResult[]> {
  if (env.emailProvider !== "resend") {
    const out: SendResult[] = [];
    for (const m of msgs) out.push(await sendEmail(m));
    return out;
  }
  const results: SendResult[] = [];
  for (let i = 0; i < msgs.length; i += 100) {
    const chunk = msgs.slice(i, i + 100);
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(
          chunk.map((m) => ({ from: env.emailFrom, to: [m.to], subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo ?? env.emailReplyTo })),
        ),
      });
      const json = (await res.json().catch(() => ({}))) as { data?: { id: string }[]; message?: string };
      if (!res.ok) chunk.forEach(() => results.push({ ok: false, error: json.message ?? `Resend responded ${res.status}`, provider: "resend" }));
      else chunk.forEach((_, j) => results.push({ ok: true, id: json.data?.[j]?.id, provider: "resend" }));
    } catch (err) {
      chunk.forEach(() => results.push({ ok: false, error: err instanceof Error ? err.message : String(err), provider: "resend" }));
    }
    if (i + 100 < msgs.length) await new Promise((r) => setTimeout(r, 600));
  }
  return results;
}
