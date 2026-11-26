import { Document, Page, Text, View } from "@react-pdf/renderer";
import { Brand, Eyebrow, Money, sans, display, mono } from "./parts";
import { C, registerFonts } from "./fonts";

export type ReceiptData = {
  businessName: string;
  siteUrl: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
  receiptNumber: string;
  paidAt: string;
  reference: string;
  channel: string;
  customer: { name: string; email: string; phone?: string | null; code?: string | null };
  packageName: string;
  cycleYear: number;
  lines: { description: string; amountKobo: number }[];
  totalKobo: number;
  paidSoFarKobo: number;
  totalDueKobo: number;
  paidCount: number;
  duration: number;
};

export function ReceiptDocument(d: ReceiptData) {
  registerFonts();
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  }).format(new Date(d.paidAt));
  const balance = Math.max(0, d.totalDueKobo - d.paidSoFarKobo);
  const pct = d.totalDueKobo ? Math.min(1, d.paidSoFarKobo / d.totalDueKobo) : 0;

  return (
    <Document title={`Receipt ${d.receiptNumber}`} author={d.businessName} subject="Payment receipt">
      <Page size="A4" style={{ backgroundColor: C.paper, padding: 36, fontFamily: sans(), fontSize: 9.5, color: C.ink700 }}>
        <View style={{ backgroundColor: C.cream, borderRadius: 14, borderWidth: 1, borderColor: C.line, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", height: 5 }}>
            <View style={{ flex: 12, backgroundColor: C.forest }} />
            <View style={{ flex: 5, backgroundColor: C.honey }} />
          </View>

          <View style={{ padding: 30 }}>
            {/* header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Brand businessName={d.businessName} />
              <View style={{ alignItems: "flex-end" }}>
                <Eyebrow color={C.forest600}>Payment receipt</Eyebrow>
                <Text style={{ fontFamily: mono(), fontWeight: 500, fontSize: 12, color: C.ink, marginTop: 4 }}>{d.receiptNumber}</Text>
                <Text style={{ color: C.ink500, marginTop: 2 }}>{date}</Text>
              </View>
            </View>

            {/* amount */}
            <View style={{ marginTop: 30, padding: 22, backgroundColor: C.forest50, borderRadius: 12 }}>
              <Eyebrow color={C.forest600}>Amount paid</Eyebrow>
              <Money kobo={d.totalKobo} style={{ fontFamily: display(), fontWeight: 600, fontSize: 32, color: C.forest, marginTop: 6 }} />
              <Text style={{ color: C.forest600, marginTop: 4 }}>
                Paid by {d.channel} · Verified with Paystack
              </Text>
            </View>

            {/* parties */}
            <View style={{ flexDirection: "row", marginTop: 26 }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Eyebrow>Received from</Eyebrow>
                <Text style={{ fontFamily: display(), fontWeight: 600, fontSize: 12, color: C.ink, marginTop: 6 }}>{d.customer.name}</Text>
                <Text style={{ marginTop: 3 }}>{d.customer.email}</Text>
                {d.customer.phone ? <Text style={{ marginTop: 2 }}>{d.customer.phone}</Text> : null}
              </View>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Eyebrow>Package</Eyebrow>
                <Text style={{ fontFamily: display(), fontWeight: 600, fontSize: 12, color: C.ink, marginTop: 6 }}>{d.packageName}</Text>
                <Text style={{ marginTop: 3 }}>{d.cycleYear} cycle</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Eyebrow>Customer ID</Eyebrow>
                <Text style={{ fontFamily: display(), fontWeight: 600, fontSize: 12, color: C.ink, marginTop: 6 }}>{d.customer.code ?? "—"}</Text>
              </View>
            </View>

            {/* lines */}
            <View style={{ marginTop: 28, borderTopWidth: 1, borderColor: C.line }}>
              <View style={{ flexDirection: "row", paddingVertical: 9, borderBottomWidth: 1, borderColor: C.line }}>
                <Text style={{ flex: 1, fontWeight: 600, fontSize: 7.5, letterSpacing: 1.2, color: C.ink400 }}>DESCRIPTION</Text>
                <Text style={{ width: 110, textAlign: "right", fontWeight: 600, fontSize: 7.5, letterSpacing: 1.2, color: C.ink400 }}>AMOUNT</Text>
              </View>
              {d.lines.map((l, i) => (
                <View key={i} style={{ flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderColor: C.line }}>
                  <Text style={{ flex: 1, color: C.ink, fontSize: 10 }}>{l.description}</Text>
                  <Money kobo={l.amountKobo} style={{ width: 110, textAlign: "right", color: C.ink, fontSize: 10 }} />
                </View>
              ))}
              <View style={{ flexDirection: "row", paddingVertical: 12 }}>
                <Text style={{ flex: 1, fontWeight: 600, color: C.ink, fontSize: 11 }}>Total</Text>
                <Money kobo={d.totalKobo} style={{ width: 110, textAlign: "right", fontWeight: 600, color: C.ink, fontSize: 11 }} />
              </View>
            </View>

            {/* progress */}
            <View style={{ marginTop: 14, padding: 18, borderRadius: 12, backgroundColor: C.sand }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: C.ink500 }}>
                  Contributions paid so far ({d.paidCount} of {d.duration} months)
                </Text>
                <Text style={{ color: C.ink, fontWeight: 600 }}>
                  <Money kobo={d.paidSoFarKobo} /> of <Money kobo={d.totalDueKobo} />
                </Text>
              </View>
              <View style={{ marginTop: 10, height: 6, borderRadius: 3, backgroundColor: C.line }}>
                <View style={{ width: `${Math.round(pct * 100)}%`, height: 6, borderRadius: 3, backgroundColor: C.forest600 }} />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                <Text style={{ color: C.ink500 }}>Balance left</Text>
                <Money kobo={balance} style={{ color: C.ink, fontWeight: 600 }} />
              </View>
            </View>

            <View style={{ marginTop: 22, flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <Eyebrow>Payment reference</Eyebrow>
                <Text style={{ marginTop: 4, color: C.ink }}>{d.reference}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontFamily: display(), fontWeight: 600, fontSize: 12, color: C.forest }}>Thank you for saving with us.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 16, alignItems: "center" }}>
          <Text style={{ fontSize: 8, color: C.ink400, textAlign: "center", lineHeight: 1.5 }}>
            {d.businessName} · {d.siteUrl.replace(/^https?:\/\//, "")}
            {d.supportEmail ? ` · ${d.supportEmail}` : ""}
            {d.supportPhone ? ` · ${d.supportPhone}` : ""}
          </Text>
          <Text style={{ fontSize: 8, color: C.ink400, marginTop: 2 }}>
            This receipt was generated automatically after the payment was confirmed with Paystack.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
