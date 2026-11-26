import "server-only";
import path from "node:path";
import { existsSync } from "node:fs";
import { Font } from "@react-pdf/renderer";

let registered = false;

/** Plus Jakarta Sans for text, IBM Plex Mono for reference numbers; the extended subset supplies ₦. */
export function registerFonts() {
  if (registered) return;
  const dir = path.join(process.cwd(), "src", "assets", "fonts");
  const f = (name: string) => path.join(dir, name);
  if (!existsSync(f("plus-jakarta-sans-latin-600-normal.woff"))) {
    console.warn("[pdf] brand fonts not found, falling back to built-in fonts");
    registered = true;
    return;
  }
  Font.register({
    family: "Jakarta",
    fonts: [
      { src: f("plus-jakarta-sans-latin-400-normal.woff"), fontWeight: 400 },
      { src: f("plus-jakarta-sans-latin-600-normal.woff"), fontWeight: 600 },
      { src: f("plus-jakarta-sans-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Naira",
    fonts: [
      { src: f("plus-jakarta-sans-latin-ext-400-normal.woff"), fontWeight: 400 },
      { src: f("plus-jakarta-sans-latin-ext-600-normal.woff"), fontWeight: 600 },
      { src: f("plus-jakarta-sans-latin-ext-700-normal.woff"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Mono",
    fonts: [{ src: f("ibm-plex-mono-latin-500-normal.woff"), fontWeight: 500 }],
  });
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
  fontsAvailable = true;
}

export let fontsAvailable = false;

export const C = {
  paper: "#faf6ef",
  cream: "#fffdf9",
  sand: "#f4eee4",
  line: "#e9e1d5",
  ink: "#1e1a16",
  ink700: "#3d362f",
  ink500: "#6d645a",
  ink400: "#8f867b",
  forest: "#014e22",
  forest600: "#0d6236",
  forest50: "#eef6f1",
  honey: "#cf9e29",
  clay: "#d47d59",
  clay600: "#a94e2e",
};
