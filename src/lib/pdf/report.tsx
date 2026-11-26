import { Document, Page, Text, View } from "@react-pdf/renderer";
import { Brand, Eyebrow, Money, sans, display, type PdfStyle } from "./parts";
import { C, registerFonts } from "./fonts";

export type ReportCell = string | number | { kobo: number };
export type ReportColumn = { label: string; width?: number; align?: "left" | "right" };
export type ReportSection = {
  heading: string;
  note?: string;
  columns: ReportColumn[];
  rows: ReportCell[][];
  totals?: ReportCell[];
};

export function ReportDocument({
  businessName,
  title,
  subtitle,
  stats,
  sections,
}: {
  businessName: string;
  title: string;
  subtitle?: string;
  stats?: { label: string; value: ReportCell }[];
  sections: ReportSection[];
}) {
  registerFonts();
  const generated = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  }).format(new Date());

  const cell = (v: ReportCell, style: PdfStyle) =>
    typeof v === "object" ? <Money kobo={v.kobo} style={style} /> : <Text style={style}>{String(v)}</Text>;

  return (
    <Document title={title} author={businessName}>
      <Page size="A4" style={{ padding: 36, paddingBottom: 54, fontFamily: sans(), fontSize: 9, color: C.ink700, backgroundColor: "#ffffff" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }} fixed>
          <Brand businessName={businessName} />
          <Text style={{ color: C.ink400, fontSize: 8 }}>Generated {generated}</Text>
        </View>

        <View style={{ marginTop: 26 }}>
          <Eyebrow color={C.forest600}>Report</Eyebrow>
          <Text style={{ fontFamily: display(), fontWeight: 600, fontSize: 22, color: C.ink, marginTop: 4 }}>{title}</Text>
          {subtitle ? <Text style={{ color: C.ink500, marginTop: 3 }}>{subtitle}</Text> : null}
        </View>

        {stats && stats.length > 0 && (
          <View style={{ flexDirection: "row", marginTop: 18, borderWidth: 1, borderColor: C.line, borderRadius: 10 }}>
            {stats.map((s, i) => (
              <View key={i} style={{ flex: 1, padding: 12, borderLeftWidth: i ? 1 : 0, borderColor: C.line }}>
                <Text style={{ color: C.ink400, fontSize: 7.5 }}>{s.label}</Text>
                {cell(s.value, { fontFamily: display(), fontWeight: 600, fontSize: 13, color: C.ink, marginTop: 4 })}
              </View>
            ))}
          </View>
        )}

        {sections.map((section, si) => (
          <View key={si} style={{ marginTop: 24 }} wrap>
            <Text style={{ fontFamily: display(), fontWeight: 600, fontSize: 12.5, color: C.ink }}>{section.heading}</Text>
            {section.note ? <Text style={{ color: C.ink500, marginTop: 2 }}>{section.note}</Text> : null}
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: "row", backgroundColor: C.sand, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 3 }} fixed>
                {section.columns.map((c, ci) => (
                  <Text
                    key={ci}
                    style={{
                      flex: c.width ?? 1,
                      paddingHorizontal: 5,
                      textAlign: c.align ?? "left",
                      fontWeight: 600,
                      fontSize: 7,
                      letterSpacing: 1,
                      color: C.ink500,
                      textTransform: "uppercase",
                    }}
                  >
                    {c.label}
                  </Text>
                ))}
              </View>
              {section.rows.map((row, ri) => (
                <View key={ri} style={{ flexDirection: "row", paddingVertical: 6, paddingHorizontal: 3, borderBottomWidth: 1, borderColor: C.line }} wrap={false}>
                  {row.map((v, ci) => (
                    <View key={ci} style={{ flex: section.columns[ci]?.width ?? 1, paddingHorizontal: 5 }}>
                      {cell(v, { textAlign: section.columns[ci]?.align ?? "left", color: C.ink })}
                    </View>
                  ))}
                </View>
              ))}
              {section.totals && (
                <View style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 3 }}>
                  {section.totals.map((v, ci) => (
                    <View key={ci} style={{ flex: section.columns[ci]?.width ?? 1, paddingHorizontal: 5 }}>
                      {cell(v, { textAlign: section.columns[ci]?.align ?? "left", color: C.ink, fontWeight: 600 })}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}

        <Text
          style={{ position: "absolute", bottom: 24, left: 36, right: 36, textAlign: "center", fontSize: 7.5, color: C.ink400 }}
          render={({ pageNumber, totalPages }) => `${businessName} · Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
