import { Path, Svg, Text, View, type Styles } from "@react-pdf/renderer";
import { ARCS, BRAND, L_POLY, M_POLY, MARK_BOX, crescentPath, polyPath } from "@/lib/brand/logo-geometry";
import { WORDMARK } from "@/lib/brand/wordmark";

export type PdfStyle = Styles[string];
import { C, fontsAvailable } from "./fonts";

export const display = () => (fontsAvailable ? "Jakarta" : "Helvetica-Bold");
export const sans = () => (fontsAvailable ? "Jakarta" : "Helvetica");
export const mono = () => (fontsAvailable ? "Mono" : "Courier");

/** ₦ amounts: the sign comes from the Naira subset, digits from the text font. */
export function Money({ kobo, style }: { kobo: number; style?: PdfStyle }) {
  const digits = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(Math.round(Number(kobo) / 100));
  const neg = Number(kobo) < 0;
  return (
    <Text style={style}>
      {neg ? "−" : ""}
      <Text style={{ fontFamily: fontsAvailable ? "Naira" : "Helvetica" }}>{fontsAvailable ? "₦" : "NGN "}</Text>
      {digits.replace("-", "")}
    </Text>
  );
}

export function naira(kobo: number) {
  const digits = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(Math.round(Number(kobo) / 100));
  return `NGN ${digits}`;
}

export function Brand({ businessName }: { businessName: string }) {
  const rest = businessName.split(" ").slice(1).join(" ") || "Foodstuff";
  const markH = 30;
  const wordH = 9.5;
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Svg width={(markH * MARK_BOX.w) / MARK_BOX.h} height={markH} viewBox={`${MARK_BOX.x} ${MARK_BOX.y} ${MARK_BOX.w} ${MARK_BOX.h}`}>
        <Path d={ARCS.map(crescentPath).join("")} fill={BRAND.gold} />
        <Path d={polyPath(L_POLY) + polyPath(M_POLY)} fill={BRAND.green} />
      </Svg>
      <View style={{ marginLeft: 8 }}>
        <Svg width={(wordH * WORDMARK.width) / WORDMARK.height} height={wordH} viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`}>
          <Path d={WORDMARK.d} fill={BRAND.green} />
        </Svg>
        <Text style={{ fontFamily: sans(), fontWeight: 600, fontSize: 5.5, letterSpacing: 2, color: C.ink500, marginTop: 3 }}>
          {rest.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

export function Eyebrow({ children, color = C.ink400 }: { children: string; color?: string }) {
  return (
    <Text style={{ fontFamily: sans(), fontWeight: 600, fontSize: 7, letterSpacing: 1.6, color, textTransform: "uppercase" }}>
      {children}
    </Text>
  );
}
