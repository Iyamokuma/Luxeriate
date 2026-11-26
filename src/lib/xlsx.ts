import "server-only";

export type SheetColumn = {
  header: string;
  key: string;
  width?: number;
  format?: "naira" | "date" | "datetime" | "number" | "text";
};

export type SheetSpec = { name: string; columns: SheetColumn[]; rows: Record<string, unknown>[]; totals?: Record<string, unknown> };

/** Branded Excel workbook: forest header row, frozen panes, filters, ₦ formats. */
export async function buildWorkbook(title: string, sheets: SheetSpec[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Luxuriate Foodstuff";
  wb.created = new Date();
  wb.title = title;

  for (const spec of sheets) {
    const ws = wb.addWorksheet(spec.name.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = spec.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? Math.max(12, c.header.length + 4),
      style:
        c.format === "naira"
          ? { numFmt: '"₦"#,##0' }
          : c.format === "date"
            ? { numFmt: "dd mmm yyyy" }
            : c.format === "datetime"
              ? { numFmt: "dd mmm yyyy hh:mm" }
              : c.format === "number"
                ? { numFmt: "#,##0.##" }
                : {},
    }));
    for (const row of spec.rows) {
      const out: Record<string, unknown> = {};
      for (const c of spec.columns) {
        const v = row[c.key];
        if (c.format === "naira") out[c.key] = v === null || v === undefined ? null : Number(v) / 100;
        else if ((c.format === "date" || c.format === "datetime") && v) out[c.key] = new Date(String(v));
        else out[c.key] = v ?? "";
      }
      ws.addRow(out);
    }
    const header = ws.getRow(1);
    header.height = 22;
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFDF9" }, name: "Calibri", size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF244C3B" } };
      cell.alignment = { vertical: "middle" };
    });
    if (spec.totals) {
      const out: Record<string, unknown> = {};
      for (const c of spec.columns) {
        const v = spec.totals[c.key];
        out[c.key] = c.format === "naira" && v !== undefined && v !== null && v !== "" ? Number(v) / 100 : (v ?? "");
      }
      const r = ws.addRow(out);
      r.font = { bold: true };
      r.eachCell((cell) => {
        cell.border = { top: { style: "thin", color: { argb: "FF244C3B" } } };
      });
    }
    if (spec.rows.length) {
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: spec.columns.length } };
    }
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function fileResponse(buf: Buffer | Uint8Array, filename: string, type: "xlsx" | "pdf") {
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        type === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf",
      "Content-Disposition": `${type === "pdf" ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
