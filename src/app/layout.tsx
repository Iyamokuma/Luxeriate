import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

// Self-hosted so builds never depend on reaching Google Fonts.
// Plus Jakarta Sans for everything you read, IBM Plex Mono for figures and labels.
// The latin-ext files are split out with a unicode-range so they only load
// for the ₦ sign and accented names (font loader options must be literals).
const jakarta = localFont({
  src: [{ path: "../assets/fonts/web/plus-jakarta-sans-latin-wght-normal.woff2", weight: "200 800", style: "normal" }],
  variable: "--font-jakarta",
  display: "swap",
  adjustFontFallback: false,
});

const jakartaExt = localFont({
  src: [{ path: "../assets/fonts/web/plus-jakarta-sans-latin-ext-wght-normal.woff2", weight: "200 800", style: "normal" }],
  variable: "--font-jakarta-ext",
  display: "swap",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF" }],
});

const plexMono = localFont({
  src: [
    { path: "../assets/fonts/web/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/web/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex",
  display: "swap",
  adjustFontFallback: false,
});

const plexMonoExt = localFont({
  src: [
    { path: "../assets/fonts/web/ibm-plex-mono-latin-ext-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/web/ibm-plex-mono-latin-ext-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex-ext",
  display: "swap",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF" }],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Luxuriate Foodstuff · Save monthly, receive your foodstuff",
    template: "%s · Luxuriate Foodstuff",
  },
  description:
    "Choose a foodstuff package, pay small monthly contributions through Paystack, and collect your full package at the end of the year.",
  applicationName: "Luxuriate Foodstuff",
  openGraph: {
    type: "website",
    siteName: "Luxuriate Foodstuff",
    title: "Luxuriate Foodstuff",
    description: "Save monthly. Shop smart. Receive your foodstuff package.",
    locale: "en_NG",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#fbf7f0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-NG" className={`${jakarta.variable} ${jakartaExt.variable} ${plexMono.variable} ${plexMonoExt.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster position="top-center" offset={16} gap={10} />
      </body>
    </html>
  );
}
