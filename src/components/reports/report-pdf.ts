import { num } from "@/lib/format";
import { PdfDoc } from "@/lib/pdf";
import { BRANCH_META, KHR_RATE, TREND, type BranchReport, type Report } from "@/lib/mock/reports-data";

export type SectionId = "summary" | "pl" | "branches" | "cash" | "receivables" | "inventory" | "insights" | "completeness" | "categories";
export type AmountMode = "usd" | "khr" | "both";

export const OWNER_SECTIONS: { id: SectionId; label: string }[] = [
  { id: "summary", label: "Summary and KPIs" },
  { id: "pl", label: "Profit & loss" },
  { id: "branches", label: "Branch performance" },
  { id: "cash", label: "Cash by account" },
  { id: "receivables", label: "Receivables & payables" },
  { id: "inventory", label: "Inventory highlights" },
  { id: "insights", label: "AI insights" },
  { id: "completeness", label: "Completeness status" },
];
export const BRANCH_SECTIONS: { id: SectionId; label: string }[] = [
  { id: "summary", label: "Summary and KPIs" },
  { id: "categories", label: "Expenses by category" },
  { id: "completeness", label: "Completeness status" },
];

const BLUE = "#1d33ba";
const ORANGE = "#ea580c";
const GREY = "#6b7280";
const strip = (text: string) => text.replace(/\*\*/g, "");

function money(mode: AmountMode) {
  return (n: number) => {
    const khr = `KHR ${num(n * KHR_RATE, "KHR")}`;
    if (mode === "khr") return khr;
    if (mode === "both") return `$${num(n)} (${khr})`;
    return `$${num(n)}`;
  };
}

function heading(doc: PdfDoc, title: string, sub?: string) {
  doc.text(title, { size: 15, bold: true });
  if (sub) doc.text(sub, { size: 9, color: GREY });
  doc.y += 6;
}

function cover(doc: PdfDoc, title: string, scope: string, status: string, generated: string, kpis: [string, string][]) {
  doc.rect(doc.left, doc.y, 10, 10, BLUE);
  doc.text("LuyFlow", { x: doc.left + 16, size: 10, bold: true });
  if (status === "Incomplete") doc.text("INCOMPLETE", { align: "right", size: 9, bold: true, color: "#b45309", advance: false });
  doc.y += 10;
  doc.text(title, { size: 20, bold: true });
  doc.text(scope, { size: 10, color: GREY });
  doc.text(`Status: ${status} · Generated ${generated}`, { size: 9, color: GREY });
  doc.y += 10;
  const colW = (doc.right - doc.left) / kpis.length;
  const top = doc.y;
  kpis.forEach(([label, value], i) => {
    doc.rect(doc.left + i * colW, top, colW - 8, 48, "#f3f4f6");
    doc.y = top + 8;
    doc.text(label, { x: doc.left + i * colW + 8, size: 8, color: GREY });
    doc.text(value, { x: doc.left + i * colW + 8, size: 11, bold: true });
  });
  doc.y = top + 64;
}

/** Owner report, one section per page as the export preview promises. */
export function ownerPdf(report: Report, sections: SectionId[], mode: AmountMode) {
  const doc = new PdfDoc();
  const m = money(mode);
  const scope = `Mekong Mart Co., Ltd. · all branches · ${report.period}`;
  const pageFor = (index: number) => index > 0 && doc.addPage();
  const cols = { a: doc.left, c: 380, d: 465, e: doc.right };

  sections.forEach((section, index) => {
    pageFor(index);
    if (section === "summary") {
      cover(doc, `Monthly report · ${report.label}`, scope, report.status === "complete" ? "Complete" : "Incomplete", report.generatedAt, [
        ["Revenue", m(report.revenue)],
        ["Expenses", m(report.expenses)],
        ["Net profit", m(report.profit)],
        ["Margin", `${report.margin.toFixed(1)}%`],
      ]);
      heading(doc, "Summary", "Written by AI from your recorded data. Not accounting or tax advice.");
      report.summary.forEach((p) => {
        doc.paragraph(strip(p));
        doc.y += 6;
      });
      // Trend columns up to this month.
      const points = TREND.slice(0, TREND.findIndex((t) => t.id === report.id) + 1);
      doc.ensure(180);
      doc.y += 8;
      doc.text("Revenue and expenses by month (USD)", { size: 10, bold: true });
      const base = doc.y + 120;
      const slot = (doc.right - doc.left) / points.length;
      points.forEach((p, i) => {
        const x = doc.left + i * slot + slot / 2 - 12;
        const hr = (p.revenue / 60000) * 110;
        const he = (p.expenses / 60000) * 110;
        doc.rect(x, base - hr, 11, hr, BLUE);
        doc.rect(x + 13, base - he, 11, he, ORANGE);
        doc.y = base + 4;
        doc.text(p.short, { x: x + 4, size: 8, color: GREY, advance: false });
      });
      doc.y = base + 22;
    }
    if (section === "pl") {
      heading(doc, "Profit & loss", `${report.label} compared with ${report.prevLabel ?? "the previous month"} · all branches`);
      doc.row([{ text: "Category", x: cols.a, bold: true }, { text: report.short, x: cols.c, align: "right", bold: true }, { text: report.prevLabel?.split(" ")[0].slice(0, 3) ?? "Previous", x: cols.d, align: "right", bold: true }, { text: "Change", x: cols.e, align: "right", bold: true }]);
      doc.rule();
      const block = (title: string, rows: typeof report.revenueLines, total: string) => {
        doc.text(title, { size: 10, bold: true });
        rows.forEach((l) => doc.row([{ text: `   ${l.label}`, x: cols.a }, { text: m(l.now), x: cols.c, align: "right" }, { text: m(l.before), x: cols.d, align: "right" }, { text: `${l.now - l.before >= 0 ? "+" : "-"}${m(Math.abs(l.now - l.before))}`, x: cols.e, align: "right" }]));
        const now = rows.reduce((s, l) => s + l.now, 0);
        const before = rows.reduce((s, l) => s + l.before, 0);
        doc.row([{ text: total, x: cols.a, bold: true }, { text: m(now), x: cols.c, align: "right", bold: true }, { text: m(before), x: cols.d, align: "right", bold: true }, { text: `${now - before >= 0 ? "+" : "-"}${m(Math.abs(now - before))}`, x: cols.e, align: "right", bold: true }]);
        doc.y += 6;
      };
      block("Revenue", report.revenueLines, "Total revenue");
      block("Expenses", report.expenseLines, "Total expenses");
      doc.rule();
      doc.row([{ text: "Net profit", x: cols.a, bold: true, color: "#15803d" }, { text: m(report.profit), x: cols.c, align: "right", bold: true, color: "#15803d" }], 10);
    }
    if (section === "branches") {
      heading(doc, "Branch performance", `${report.label} · USD`);
      doc.row([{ text: "Branch", x: cols.a, bold: true }, { text: "Revenue", x: 300, align: "right", bold: true }, { text: "Expenses", x: 390, align: "right", bold: true }, { text: "Net profit", x: 470, align: "right", bold: true }, { text: "Margin", x: cols.e, align: "right", bold: true }]);
      doc.rule();
      report.branches.forEach((b) =>
        doc.row([
          { text: BRANCH_META[b.key].name, x: cols.a },
          { text: m(b.revenue), x: 300, align: "right" },
          { text: m(b.expenses), x: 390, align: "right" },
          { text: m(b.revenue - b.expenses), x: 470, align: "right" },
          { text: `${(((b.revenue - b.expenses) / b.revenue) * 100).toFixed(1)}%`, x: cols.e, align: "right" },
        ]),
      );
      doc.rule();
      doc.row([{ text: "All branches", x: cols.a, bold: true }, { text: m(report.revenue), x: 300, align: "right", bold: true }, { text: m(report.expenses), x: 390, align: "right", bold: true }, { text: m(report.profit), x: 470, align: "right", bold: true }, { text: `${report.margin.toFixed(1)}%`, x: cols.e, align: "right", bold: true }]);
    }
    if (section === "cash") {
      heading(doc, "Cash by account", `Closing balances · KHR shown in USD at ${num(KHR_RATE, "KHR")} KHR per USD`);
      doc.row([{ text: "Account", x: cols.a, bold: true }, { text: "Recorded balance", x: 380, align: "right", bold: true }, { text: "USD equivalent", x: cols.e, align: "right", bold: true }]);
      doc.rule();
      report.accounts.forEach((a) => doc.row([{ text: `${a.name} (${a.branch})`, x: cols.a }, { text: `${a.recorded} ${a.recordedSub === "USD" || a.recordedSub === "KHR" ? a.recordedSub : `+ ${a.recordedSub}`}`, x: 380, align: "right" }, { text: `$${num(a.usd)}`, x: cols.e, align: "right" }]));
      doc.rule();
      doc.row([{ text: "Total cash", x: cols.a, bold: true }, { text: `$${num(report.accounts.reduce((s, a) => s + a.usd, 0))}`, x: cols.e, align: "right", bold: true }]);
    }
    if (section === "receivables") {
      heading(doc, "Receivables & payables", `As of the last day of ${report.label}`);
      const lines =
        report.id === "2026-10"
          ? ["14 open invoices worth $10,380.00; 3 are overdue ($3,150.00), the oldest by 22 days.", "11 open bills worth $9,120.00; 2 are due in the next 7 days ($2,300.00).", "Customers paid on average 17 days after invoicing."]
          : [`All invoices issued before ${report.label} were collected within their terms.`, "Open bills were paid on or before their due dates."];
      lines.forEach((l) => doc.paragraph(`- ${l}`));
    }
    if (section === "inventory") {
      heading(doc, "Inventory highlights", report.label);
      ["Best seller by revenue: Kampot Pepper 100g.", "Most units sold: Condensed Milk 390g.", report.id === "2026-10" ? "Vital Water 500ml has been out of stock in Siem Reap since 27 Oct." : "No items ran out of stock this month."].forEach((l) => doc.paragraph(`- ${l}`));
    }
    if (section === "insights") {
      heading(doc, "AI insights", "Suggestions to check, not accounting advice.");
      report.insights.forEach((i) => {
        doc.ensure(60);
        doc.text(i.title, { size: 11, bold: true });
        doc.paragraph(i.body, { size: 9.5 });
        doc.text(i.basis, { size: 8, color: GREY });
        doc.y += 8;
      });
    }
    if (section === "completeness") {
      heading(doc, "Completeness status", `${report.checksPassed} of 12 checks passed · ${report.status === "complete" ? "Complete" : "Incomplete"}`);
      if (report.open.length) {
        doc.text(`Open items (${report.open.length})`, { size: 11, bold: true, color: "#b45309" });
        report.open.forEach((c) => {
          doc.text(c.title, { size: 10, bold: true });
          doc.paragraph(c.detail, { size: 9 });
          doc.y += 4;
        });
        doc.y += 6;
      }
      doc.text(`Passed (${report.passed.length})`, { size: 11, bold: true, color: "#15803d" });
      report.passed.forEach((c) => doc.paragraph(`- ${c.title}: ${c.detail}`, { size: 9 }));
    }
  });

  return doc;
}

export function branchPdf(report: BranchReport, branch: string, sections: SectionId[], mode: AmountMode) {
  const doc = new PdfDoc();
  const m = money(mode);
  sections.forEach((section, index) => {
    if (index > 0) doc.addPage();
    if (section === "summary") {
      cover(doc, `Branch report · ${report.label}`, `Mekong Mart Co., Ltd. · ${branch} Branch · ${report.period}`, report.status === "complete" ? "Complete" : "Incomplete", "31 Oct 2026, 19:04", [
        ["Branch revenue", m(report.revenue)],
        ["Branch expenses", m(report.expenses)],
        ["Net profit", m(report.profit)],
        ["Margin", `${report.margin.toFixed(1)}%`],
      ]);
      heading(doc, "Summary", report.summaryBasis);
      report.summary.forEach((p) => {
        doc.paragraph(strip(p));
        doc.y += 6;
      });
    }
    if (section === "categories") {
      heading(doc, "Expenses by category", `${branch} · ${report.label}`);
      report.categories.forEach((c) => doc.row([{ text: c.label, x: doc.left }, { text: m(c.amount), x: doc.right, align: "right" }], 10));
      doc.rule();
      doc.row([{ text: "Total expenses", x: doc.left, bold: true }, { text: m(report.expenses), x: doc.right, align: "right", bold: true }], 10);
    }
    if (section === "completeness") {
      heading(doc, "Completeness status", report.status === "complete" ? "Complete" : `${report.open.length} open item${report.open.length === 1 ? "" : "s"} at this branch`);
      [...report.open, ...report.passed].forEach((c) => {
        doc.text(c.title, { size: 10, bold: true });
        doc.paragraph(c.detail, { size: 9 });
        doc.y += 4;
      });
    }
  });
  return doc;
}
