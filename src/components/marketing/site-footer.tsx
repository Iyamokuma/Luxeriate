import Link from "next/link";
import { LogoFull } from "@/components/ui/logo";
import { getPublicSettings } from "@/lib/data/catalog";
import { whatsappLink } from "@/lib/format";

export async function SiteFooter() {
  const s = await getPublicSettings();
  const contact = [
    s.whatsapp_number && { label: "WhatsApp", value: s.whatsapp_number, href: whatsappLink(s.whatsapp_number), external: true },
    s.support_phone && { label: "Phone", value: s.support_phone, href: `tel:${s.support_phone}` },
    s.support_email && { label: "Email", value: s.support_email, href: `mailto:${s.support_email}` },
  ].filter(Boolean) as { label: string; value: string; href: string; external?: boolean }[];

  return (
    <footer data-dark className="relative overflow-hidden bg-night text-cream">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_80%_at_0%_0%,rgb(207_158_41/0.10)_0%,transparent_70%)]" />
      <div className="relative mx-auto grid max-w-[77.5rem] gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr_1.3fr] lg:px-8 lg:py-20">
        <div>
          <LogoFull tone="light" className="h-[5.5rem]" />
          <p className="mt-6 max-w-[17rem] text-[0.875rem] leading-relaxed text-ink-300">
            Monthly foodstuff contributions, with every payment verified and receipted.
          </p>
        </div>

        <FooterColumn
          title="Explore"
          links={[
            ["/#packages", "Packages"],
            ["/#how-it-works", "How it works"],
            ["/#faq", "Questions"],
            ["/about", "About us"],
            ["/terms", "Terms & conditions"],
          ]}
        />
        <FooterColumn
          title="Your account"
          links={[
            ["/login", "Log in"],
            ["/dashboard", "Dashboard"],
            ["/dashboard/payments", "Receipts"],
            ["/forgot-password", "Reset password"],
          ]}
        />

        <div>
          <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-ink-400">Talk to us</p>
          <dl className="mt-5 space-y-3 text-[0.875rem]">
            {contact.map((c) => (
              <div key={c.label} className="flex items-baseline gap-2">
                <dt className="text-ink-400">{c.label}</dt>
                <span className="leader" style={{ borderColor: "rgb(255 255 255 / 0.14)" }} />
                <dd>
                  <a
                    href={c.href}
                    {...(c.external ? { target: "_blank", rel: "noreferrer" } : {})}
                    className="font-medium text-cream transition-colors hover:text-honey-300"
                  >
                    {c.value}
                  </a>
                </dd>
              </div>
            ))}
            {s.office_address && <p className="pt-1 leading-relaxed text-ink-300">{s.office_address}</p>}
            {contact.length === 0 && !s.office_address && (
              <p className="leading-relaxed text-ink-300">Reply to any of our emails and our team will get back to you.</p>
            )}
          </dl>
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-[77.5rem] flex-col justify-between gap-2 px-4 py-6 font-mono text-[0.6875rem] text-ink-400 sm:flex-row sm:px-6 lg:px-8">
          <p>© {s.business_name}</p>
          <p>Payments by Paystack · Card · Bank transfer · USSD</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-ink-400">{title}</p>
      <ul className="mt-5 space-y-3 text-[0.875rem]">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="text-ink-200 transition-colors hover:text-cream">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
