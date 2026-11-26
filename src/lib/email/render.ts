/**
 * Turns editable template text into a branded, email-client-safe HTML
 * message plus a plain-text alternative.
 *
 * Template syntax: {{variable}}, blank line = paragraph, **bold**,
 * "- " bullet lines, and [[Button label|https://…]] for a button.
 */

export type Vars = Record<string, string | number | null | undefined>;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function fill(text: string, vars: Vars) {
  return text.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, k: string) => {
    const v = vars[k];
    return v === null || v === undefined ? "" : String(v);
  });
}

const safeUrl = (u: string) => (/^(https?:\/\/|mailto:)/i.test(u.trim()) ? u.trim() : "#");

const FONT = "'Plus Jakarta Sans','Segoe UI',Helvetica,Arial,sans-serif";

function inlineHtml(escaped: string) {
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#1e1a16;font-weight:600">$1</strong>');
}

export function bodyToHtml(body: string, vars: Vars) {
  const filled = fill(body, vars).replace(/\r\n/g, "\n");
  const blocks = filled.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks
    .map((block) => {
      const button = block.match(/^\[\[([^|\]]+)\|([^\]]+)\]\]$/);
      if (button) {
        return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0"><tr><td style="border-radius:12px;background:#014e22"><a href="${esc(safeUrl(button[2]))}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:15px;font-weight:600;color:#fffdf9;text-decoration:none;border-radius:12px">${esc(button[1].trim())} &rarr;</a></td></tr></table>`;
      }
      const lines = block.split("\n");
      if (lines.every((l) => /^\s*- /.test(l))) {
        return `<ul style="margin:0 0 18px;padding-left:20px;color:#3d362f">${lines
          .map((l) => `<li style="margin:6px 0">${inlineHtml(esc(l.replace(/^\s*- /, "")))}</li>`)
          .join("")}</ul>`;
      }
      return `<p style="margin:0 0 18px;line-height:1.65">${lines.map((l) => inlineHtml(esc(l))).join("<br>")}</p>`;
    })
    .join("\n");
}

export function bodyToText(body: string, vars: Vars) {
  return fill(body, vars)
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$1: $2")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .trim();
}

export function layout({
  contentHtml,
  preheader,
  businessName,
  siteUrl,
  footerNote,
}: {
  contentHtml: string;
  preheader?: string;
  businessName: string;
  siteUrl: string;
  footerNote?: string;
}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(businessName)}</title>
</head>
<body style="margin:0;padding:0;background:#fbf7f0;-webkit-text-size-adjust:100%">
<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all">${esc(preheader ?? "")}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf7f0">
<tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="padding:0 8px 22px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle">
          <img src="${esc(siteUrl)}/brand/luxuriate-lockup.png" width="179" height="40" alt="${esc(businessName)}" style="display:block;border:0;outline:none;height:40px;width:179px;font-family:${FONT};font-size:18px;font-weight:700;color:#014e22">
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#fffdf9;border:1px solid #e9e1d5;border-radius:20px;overflow:hidden">
      <div style="height:5px;background:#014e22;background:linear-gradient(90deg,#014e22 0%,#014e22 72%,#cf9e29 72%)"></div>
      <div style="padding:34px 32px 18px;font-family:${FONT};font-size:16px;color:#3d362f">
        ${contentHtml}
      </div>
    </td></tr>
    <tr><td style="padding:22px 8px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#8f867b;text-align:center">
      ${footerNote ? esc(footerNote) + "<br>" : ""}
      Sent by ${esc(businessName)} · <a href="${esc(siteUrl)}" style="color:#0d6236;text-decoration:none">${esc(siteUrl.replace(/^https?:\/\//, ""))}</a><br>
      Payments are processed securely by Paystack.
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}
