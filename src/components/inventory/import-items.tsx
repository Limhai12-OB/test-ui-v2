"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownWideNarrow, ArrowLeft, ArrowRight, CircleAlert, CircleCheck, Copy, Download, Info, PackagePlus, Sparkles, Tags, TriangleAlert, Undo2, Boxes } from "lucide-react";
import { AiBadge, FileDrop, FileTile, formatBytes, StatusPill } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox, SelectField } from "@/components/ui/fields";
import { Pagination, paginate } from "@/components/ui/filters";
import { DetailList, Stepper } from "@/components/ui/flow";
import { useToast } from "@/components/ui/overlay";
import { Notice, Page, PageHeader, Tabs } from "@/components/ui/page";
import { cn, downloadCsv, num } from "@/lib/format";
import { ITEM_CATEGORIES } from "@/lib/mock/ops-data";
import type { BranchName } from "@/lib/mock/ops-types";
import { moveStock, nowStamp, useBranchScope, useOps } from "@/lib/ops-store";
import { useSession } from "@/lib/session";

const STEPS = ["Upload file", "Validate", "Review", "Confirm"];
const FIELDS = [
  { value: "name", label: "Item name" },
  { value: "sku", label: "SKU" },
  { value: "category", label: "Category" },
  { value: "cost", label: "Cost price (USD)" },
  { value: "price", label: "Selling price (USD)" },
  { value: "stock:Central Market", label: "Stock · Central Market" },
  { value: "stock:Toul Kork", label: "Stock · Toul Kork" },
  { value: "stock:Siem Reap", label: "Stock · Siem Reap" },
  { value: "stock:Battambang", label: "Stock · Battambang" },
  { value: "skip", label: "Not imported" },
];

type Row = { row: number; name: string; sku: string; category: string; cost: number; price: number | null; stock: Partial<Record<BranchName, number>>; leaveOut?: boolean };
type Mapping = { column: string; field: string; sample: string; confidence: number | null };
type Parsed = { file: string; size: number; sample: boolean; headers: string[]; data: string[][] };

/** The supplier list from frames 08.5 (49 rows). */
function sampleFile(): Parsed {
  const headers = ["Product", "Code", "Group", "Buy", "Sell", "CM qty", "TK qty", "Remarks"];
  const designed: [number, string, string, string, string, string, string, string][] = [
    [1, "Angkor Beer 330ml × 24", "BEV-ANG-330", "Beverages", "11.20", "14.50", "86", "18"],
    [2, "Prahok Jar 400g", "SAU-PRH-400", "Pantry", "2.40", "3.60", "40", "24"],
    [3, "Kampot Pepper 100g", "SPC-KPP-100", "Spices", "3.80", "5.50", "120", "74"],
    [4, "Cashew Nuts 250g", "SNK-CSH-250", "Snacks", "3.10", "4.90", "60", "30"],
    [7, "Lemongrass Tea 20 bags", "BEV-LGT-20", "Beverages", "1.90", "", "48", "24"],
    [19, "Soy Sauce 500ml", "SAU-SOY-500", "Pantry", "1.25", "", "72", "36"],
    [22, "Palm Sugar 500g", "SWT-PLM-500", "Pantry", "1.60", "2.40", "210", "96"],
  ];
  const names = [
    ["Jasmine Rice 5kg", "RIC-JAS-5", "Rice & grains", 4.1, 5.4], ["Sticky Rice 5kg", "RIC-STK-5", "Rice & grains", 4.6, 6], ["Oyster Sauce 500ml", "SAU-OYS-500", "Pantry", 1.7, 2.5], ["Chili Sauce 300ml", "SAU-CHL-300", "Pantry", 0.9, 1.4],
    ["Coconut Milk 400ml", "DRY-COC-400", "Dairy", 0.85, 1.3], ["UHT Milk 1L", "DRY-UHT-1L", "Dairy", 1.2, 1.75], ["Evaporated Milk 410g", "DRY-EVP-410", "Dairy", 0.9, 1.35], ["Green Tea 25 bags", "BEV-GRT-25", "Beverages", 1.4, 2.1],
    ["Iced Coffee Mix × 20", "BEV-ICM-20", "Beverages", 2.3, 3.4], ["Orange Juice 1L", "BEV-ORJ-1L", "Beverages", 1.5, 2.2], ["Soda Water × 24", "BEV-SOD-24", "Beverages", 4.8, 6.5], ["Energy Drink × 24", "BEV-ENG-24", "Beverages", 9.6, 12.5],
    ["Dried Squid 200g", "SNK-SQD-200", "Snacks", 3.6, 5.2], ["Banana Chips 150g", "SNK-BNC-150", "Snacks", 0.8, 1.3], ["Prawn Crackers 200g", "SNK-PRC-200", "Snacks", 1.1, 1.7], ["Peanuts 500g", "SNK-PNT-500", "Snacks", 1.3, 1.95],
    ["Dish Soap 750ml", "HSH-DSH-750", "Household", 1.2, 1.8], ["Laundry Powder 3kg", "HSH-LDP-3", "Household", 4.2, 5.9], ["Tissue Box × 3", "HSH-TIS-3", "Household", 1.6, 2.4], ["Bleach 1L", "HSH-BLC-1L", "Household", 0.9, 1.4],
    ["Garbage Bags × 30", "HSH-GBG-30", "Household", 1.1, 1.7], ["Mosquito Coil × 10", "HSH-MSQ-10", "Household", 0.7, 1.1], ["Sugar 1kg", "SWT-SUG-1", "Pantry", 0.95, 1.35], ["Salt 1kg", "PAN-SLT-1", "Pantry", 0.3, 0.55],
    ["MSG 500g", "PAN-MSG-500", "Pantry", 1.4, 2], ["Rice Noodles 400g", "NDL-RCE-400", "Pantry", 0.7, 1.1], ["Egg Noodles 500g", "NDL-EGG-500", "Pantry", 0.9, 1.4], ["Canned Sardines 155g", "CAN-SRD-155", "Pantry", 0.65, 1],
    ["Canned Tuna 185g", "CAN-TUN-185", "Pantry", 1.15, 1.7], ["Corn Kernels 425g", "CAN-CRN-425", "Pantry", 0.8, 1.2], ["Tamarind Paste 200g", "SAU-TAM-200", "Pantry", 0.75, 1.15], ["Black Pepper Ground 50g", "SPC-BPG-50", "Spices", 1.6, 2.4],
    ["Star Anise 50g", "SPC-STA-50", "Spices", 1.2, 1.9], ["Turmeric Powder 100g", "SPC-TUR-100", "Spices", 0.9, 1.4], ["Lemongrass Paste 200g", "SPC-LGP-200", "Spices", 1.3, 2], ["Kroeung Paste 200g", "SPC-KRG-200", "Spices", 1.5, 2.3],
    ["Instant Porridge × 10", "NDL-POR-10", "Pantry", 2.4, 3.4], ["Cooking Oil 2L", "OIL-CKG-2L", "Pantry", 3.5, 4.8], ["Sesame Oil 250ml", "OIL-SES-250", "Pantry", 1.9, 2.8], ["Vinegar 500ml", "SAU-VIN-500", "Pantry", 0.6, 0.95],
    ["Bottled Water 1.5L × 6", "BEV-WTR-15", "Beverages", 1.8, 2.6], ["Herbal Jelly Drink × 24", "BEV-HJD-24", "Beverages", 6.2, 8.4],
  ] as const;
  let k = 0;
  const data: string[][] = [];
  for (let row = 1; row <= 49; row++) {
    const d = designed.find((x) => x[0] === row);
    if (d) {
      data.push([d[1], d[2], d[3], d[4], d[5], d[6], d[7], row === 4 ? "new supplier from Nov" : ""]);
      continue;
    }
    const [name, sku, category, cost, price] = names[k++];
    data.push([name, sku, category, num(cost), num(price), String(20 + ((row * 7) % 60)), String(10 + ((row * 5) % 30)), ""]);
  }
  return { file: "items-oct-2026.xlsx", size: 48 * 1024, sample: true, headers, data };
}

/** Guesses the LuyFlow field for a column header (the demo's stand-in for the AI mapping). */
function guess(header: string): { field: string; confidence: number | null } {
  const h = header.toLowerCase();
  const rules: [RegExp, string, number][] = [
    [/^(product|item|name|description)/, "name", 99],
    [/^(code|sku|barcode)/, "sku", 98],
    [/^(group|category|type)/, "category", 93],
    [/(buy|cost)/, "cost", 96],
    [/(sell|price)/, "price", 95],
    [/^(cm|central)/, "stock:Central Market", 82],
    [/^(tk|toul)/, "stock:Toul Kork", 80],
    [/^(sr|siem)/, "stock:Siem Reap", 80],
    [/^(bb|battam)/, "stock:Battambang", 80],
  ];
  for (const [re, field, confidence] of rules) if (re.test(h)) return { field, confidence };
  return { field: "skip", confidence: null };
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

/** Turns the file into rows using the chosen column mapping. */
function computeRows(file: Parsed, mapping: Mapping[], headerRow: string): Row[] {
  const data = headerRow === "headers" ? file.data : [file.headers, ...file.data];
  const at = (r: string[], field: string) => {
    const index = mapping.findIndex((m) => m.field === field);
    return index >= 0 ? (r[index] ?? "").trim() : "";
  };
  return data.map((r, i) => {
    const price = Number(at(r, "price").replace(/[^\d.]/g, ""));
    const stock: Partial<Record<BranchName, number>> = {};
    for (const b of ["Central Market", "Toul Kork", "Siem Reap", "Battambang"] as BranchName[]) {
      const v = at(r, `stock:${b}`);
      if (v !== "") stock[b] = Math.max(0, Math.round(Number(v.replace(/[^\d.]/g, "")) || 0));
    }
    return { row: i + 1, name: at(r, "name"), sku: at(r, "sku").toUpperCase(), category: at(r, "category") || "Pantry", cost: Number(at(r, "cost").replace(/[^\d.]/g, "")) || 0, price: price > 0 ? price : null, stock };
  });
}

/** Frames 08.5 "Bulk Item Import" steps 1–4 and the result. */
export function ImportItems() {
  const { state, update } = useOps();
  const { user } = useSession();
  const scope = useBranchScope();
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<Parsed | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [postStock, setPostStock] = useState(true);
  const [headerRow, setHeaderRow] = useState("headers");
  const [mapping, setMapping] = useState<Mapping[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ ids: string[]; dupes: number; cats: string[]; moves: number; at: string } | null>(null);

  if (scope) {
    return (
      <Page>
        <Notice tone="neutral" icon={<Info size={18} aria-hidden />} title="Only the Business Owner can import items">
          Ask Sokha Chan to add items to the list.
        </Notice>
      </Page>
    );
  }

  const load = (parsed: Parsed) => {
    setUploading(true);
    setFile(parsed);
    setTimeout(() => setUploading(false), 900);
  };

  const onFile = async (picked: File) => {
    setError(undefined);
    const ext = picked.name.split(".").pop()?.toLowerCase();
    if (ext === "xlsx" || ext === "xls") {
      setError("Excel files are read by the import service, which is not connected in this demo. Save the sheet as CSV, or use the sample file.");
      return;
    }
    if (ext !== "csv") return setError("Upload a CSV or Excel file.");
    const table = parseCsv(await picked.text());
    if (table.length < 2) return setError("The file has no rows under the header.");
    load({ file: picked.name, size: picked.size, sample: false, headers: table[0], data: table.slice(1) });
  };

  const validate = () => {
    if (!file) return;
    const headers = headerRow === "headers" ? file.headers : file.headers.map((_, i) => `Column ${i + 1}`);
    setMapping(headers.map((column, i) => ({ column, ...guess(column), sample: (headerRow === "headers" ? file.data : [file.headers, ...file.data])[0]?.[i] ?? "" })));
    setStep(1);
  };

  const buildRows = () => {
    setRows(computeRows(file!, mapping, headerRow));
    setTab("all");
    setPage(1);
    setStep(2);
  };

  const existingSkus = new Set(state.items.map((i) => i.sku.toUpperCase()));
  const statusOf = (r: Row) => (r.leaveOut ? "left" : existingSkus.has(r.sku) || !r.sku ? "duplicate" : !r.name || r.price === null ? "review" : "ready");
  const groups = { review: rows.filter((r) => statusOf(r) === "review"), duplicate: rows.filter((r) => statusOf(r) === "duplicate"), ready: rows.filter((r) => statusOf(r) === "ready") };
  const ordered = [...groups.review, ...groups.duplicate, ...rows.filter((r) => statusOf(r) === "left"), ...groups.ready.slice().sort((a, b) => a.row - b.row)];
  const shown = tab === "review" ? groups.review : tab === "duplicate" ? groups.duplicate : tab === "ready" ? groups.ready : ordered;
  const { current, slice } = paginate(shown, page, 7);
  const toImport = groups.ready;
  const knownCats = new Set([...ITEM_CATEGORIES.slice(0, 5), ...state.items.map((i) => i.category)]);
  const newCats = [...new Set(toImport.map((r) => r.category).filter((c) => !knownCats.has(c)))];
  const stockMoves = postStock ? toImport.reduce((s, r) => s + Object.values(r.stock).filter((n) => (n ?? 0) > 0).length, 0) : 0;
  const branchesUsed = [...new Set(toImport.flatMap((r) => Object.keys(r.stock)))];
  // Live validation for step 2, from the current mapping.
  const preview = step === 1 && file ? computeRows(file, mapping, headerRow) : [];
  const previewStatus = (r: Row) => (existingSkus.has(r.sku) || !r.sku ? "duplicate" : !r.name || r.price === null ? "review" : "ready");
  const previewCats = [...new Set(preview.filter((r) => previewStatus(r) !== "duplicate").map((r) => r.category).filter((c) => !knownCats.has(c)))];
  const mapSummary = {
    ready: preview.filter((r) => previewStatus(r) === "ready").length,
    missing: preview.filter((r) => previewStatus(r) === "review").length,
    dupes: preview.filter((r) => previewStatus(r) === "duplicate").length,
  };

  const confirm = () => {
    const ids: string[] = [];
    update((draft) => {
      for (const r of toImport) {
        const id = `${r.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        ids.push(id);
        const branches = Object.keys(r.stock).length ? (Object.keys(r.stock) as BranchName[]) : (["Central Market"] as BranchName[]);
        draft.items.push({ id, name: r.name, sku: r.sku, category: r.category, unit: "piece", cost: r.cost, price: r.price!, active: true, stock: Object.fromEntries(branches.map((b) => [b, 0])), min: Object.fromEntries(branches.map((b) => [b, 0])), created: "2026-10-31", createdBy: user!.name });
        if (postStock) for (const b of branches) if ((r.stock[b] ?? 0) > 0) moveStock(draft, { at: nowStamp(), itemId: id, branch: b, kind: "initial", change: r.stock[b]!, ref: "Initial stock", refSub: `Import · ${file!.file}`, by: user!.name });
      }
      draft.lastImport = { ids, at: nowStamp(), file: file!.file };
    });
    setResult({ ids, dupes: groups.duplicate.length, cats: newCats, moves: stockMoves, at: nowStamp() });
    setStep(4);
  };

  const undo = () => {
    if (!result) return;
    const sold = state.saleLines.some((l) => result.ids.includes(l.itemId));
    if (sold) return toast({ title: "Cannot undo", body: "Some imported items have already been sold.", tone: "error" });
    update((draft) => {
      draft.items = draft.items.filter((i) => !result.ids.includes(i.id));
      draft.moves = draft.moves.filter((m) => !result.ids.includes(m.itemId));
      draft.lastImport = undefined;
    });
    toast({ title: "Import undone", body: `${result.ids.length} items and their opening stock were removed.` });
    router.push("/inventory");
  };

  const header = (title: string, subtitle: string, ai = false) => (
    <PageHeader breadcrumbs={[{ label: "Items & Inventory", href: "/inventory" }, { label: "Import items" }]} title={title} badges={ai && <AiBadge>AI-assisted</AiBadge>} subtitle={subtitle} />
  );
  const stepper = <Stepper className="mt-6" steps={STEPS.map((label, i) => ({ label, state: i < step ? "done" : i === step ? "active" : "todo" }))} />;

  if (step === 4 && result) {
    return (
      <Page>
        {header("Import complete", `${file?.file} · finished 31 Oct 2026, ${result.at.slice(11, 16)}`, true)}
        <section className="mt-6 flex flex-col items-center rounded-lg border border-line bg-surface px-6 py-10 text-center shadow-xs" role="status">
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-success-subtle text-icon-success">
            <CircleCheck size={26} aria-hidden />
          </span>
          <h2 className="mt-4 text-[22px] font-semibold text-fg">{result.ids.length} items created</h2>
          <p className="mt-1 text-sm text-muted">
            {result.moves ? `Opening stock posted to ${branchesUsed.length} branch${branchesUsed.length === 1 ? "" : "es"}` : "No opening stock posted"} · {result.dupes} duplicate{result.dupes === 1 ? "" : "s"} skipped
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="ghost" icon={Undo2} onClick={undo} className="text-brand">
              Undo import
            </Button>
            <Button variant="secondary" icon={Download} onClick={() => downloadCsv("import-result.csv", [["Row", "Item", "SKU", "Result"], ...rows.map((r) => [r.row, r.name, r.sku, statusOf(r) === "ready" ? "Created" : statusOf(r) === "duplicate" ? "Skipped · SKU exists" : "Left out"])])}>
              Download result (CSV)
            </Button>
            <Button onClick={() => router.push("/inventory")}>View items</Button>
          </div>
        </section>
      </Page>
    );
  }

  return (
    <Page>
      {step === 0 && header("Import items", "Upload your item list or a supplier catalogue. Nothing is created until you confirm.")}
      {step === 1 && header("Check the column mapping", `${file?.file} · ${file?.data.length} rows · AI matched your columns to LuyFlow fields.`, true)}
      {step === 2 && header("Review the rows", "Fix the flagged rows or leave them out. Ready rows need no action.", true)}
      {step === 3 && header("Confirm the import", "Check the summary. Items and opening stock are created when you confirm.", true)}
      {stepper}

      {step === 0 && (
        <>
          <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
            <Card aria-labelledby="upload-title">
              <CardHeader title="Upload your file" titleId="upload-title" />
              <div className="flex flex-col gap-5 p-5">
                {file ? (
                  <div className="rounded-lg border border-success/30 bg-success-subtle p-4">
                    <div className="flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-3">
                      <FileTile />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{file.file}</p>
                        <p className="text-xs text-muted">
                          {file.data.length} rows · {formatBytes(file.size)} · {uploading ? "uploading…" : "uploaded"}
                        </p>
                      </div>
                      <button type="button" onClick={() => setFile(null)} className="focus-ring cursor-pointer rounded-xs px-2 text-sm font-medium text-brand hover:underline">
                        Replace
                      </button>
                      {uploading ? <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-success/30 border-t-success" /> : <CircleCheck size={20} className="text-icon-success" aria-label="Uploaded" />}
                    </div>
                    <p className="mt-3 text-[13px] text-success-fg" role="status">
                      {uploading ? "Uploading… keep this page open." : "Uploaded. Choose the sheet and continue."}
                    </p>
                  </div>
                ) : (
                  <>
                    <FileDrop accept=".csv,.xlsx,.xls" hint="CSV or Excel (.xlsx) · up to 10 MB" onFile={onFile} label="Choose an item list" />
                    {error && <p role="alert" className="text-[13px] text-error-fg">{error}</p>}
                    <p className="text-[13px] text-muted">
                      No file at hand?{" "}
                      <button type="button" onClick={() => load(sampleFile())} className="focus-ring cursor-pointer rounded-xs font-medium text-brand hover:underline">
                        Use the sample items-oct-2026.xlsx
                      </button>
                    </p>
                  </>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField label="Sheet" disabled={!file} value="items" onChange={() => {}} options={[{ value: "items", label: file ? `${file.sample ? "Items" : file.file} (${file.data.length} rows)` : "—" }]} />
                  <SelectField
                    label="First row contains"
                    disabled={!file}
                    value={headerRow}
                    onChange={(e) => setHeaderRow(e.target.value)}
                    options={[
                      { value: "headers", label: "Column headers" },
                      { value: "data", label: "Data (no headers)" },
                    ]}
                  />
                </div>
                <Checkbox checked={postStock} onChange={setPostStock}>
                  Post opening stock to branches from the “Stock” columns
                </Checkbox>
              </div>
            </Card>
            <Card aria-labelledby="look-title">
              <CardHeader title="What we look for" titleId="look-title" />
              <ul className="flex flex-col gap-2.5 px-5 pt-4 pb-4 text-sm text-body">
                {["Item name", "SKU (must be unique)", "Category", "Cost price and selling price", "Stock per branch (optional)"].map((x) => (
                  <li key={x} className="flex items-center gap-2.5">
                    <CircleCheck size={16} className="text-icon-success" aria-hidden /> {x}
                  </li>
                ))}
              </ul>
              <div className="mx-5 border-t border-line py-4">
                <button
                  type="button"
                  onClick={() => downloadCsv("luyflow-items-template.csv", [["Item name", "SKU", "Category", "Cost price (USD)", "Selling price (USD)", "Stock Central Market", "Stock Toul Kork", "Stock Siem Reap", "Stock Battambang"], ["Angkor Beer 330ml × 24", "BEV-ANG-330", "Beverages", "11.20", "14.50", "86", "18", "40", "22"]])}
                  className="focus-ring flex cursor-pointer items-center gap-1.5 rounded-xs text-sm font-medium text-brand hover:underline"
                >
                  Download the template (CSV) <Download size={14} aria-hidden />
                </button>
              </div>
            </Card>
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => router.push("/inventory")}>
              Cancel
            </Button>
            <Button iconRight={ArrowRight} disabled={!file || uploading} onClick={validate}>
              Validate file
            </Button>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
            <Card className="overflow-hidden" aria-labelledby="mapping-title">
              <CardHeader title="Column mapping" titleId="mapping-title" subtitle="Change any match that looks wrong" divided />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <caption className="sr-only">Column mapping</caption>
                  <thead>
                    <tr className="h-11 border-b border-line bg-subtle text-xs text-muted">
                      <th scope="col" className="px-4 font-medium">Your column</th>
                      <th scope="col" className="w-10" />
                      <th scope="col" className="px-2 font-medium">LuyFlow field</th>
                      <th scope="col" className="px-4 font-medium">Sample value</th>
                      <th scope="col" className="px-4 font-medium">AI confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapping.map((m, i) => (
                      <tr key={m.column} className="h-14 border-b border-line-subtle last:border-b-0">
                        <td className="px-4 text-sm font-medium text-fg">{m.column}</td>
                        <td className="text-icon" aria-hidden>
                          →
                        </td>
                        <td className="px-2">
                          <select
                            aria-label={`LuyFlow field for ${m.column}`}
                            value={m.field}
                            onChange={(e) => setMapping((list) => list.map((x, j) => (j === i ? { ...x, field: e.target.value, confidence: 100 } : e.target.value !== "skip" && x.field === e.target.value ? { ...x, field: "skip", confidence: null } : x)))}
                            className="focus-ring h-10 w-full max-w-[220px] cursor-pointer rounded-md border border-icon-subtle bg-surface px-3 text-sm text-fg"
                          >
                            {FIELDS.map((f) => (
                              <option key={f.value} value={f.value}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="max-w-[200px] truncate px-4 text-sm text-muted">{m.sample}</td>
                        <td className="px-4">
                          {m.confidence === null ? (
                            <span className="inline-flex h-6 items-center rounded-full bg-muted-bg px-2 text-xs font-medium text-body">No match</span>
                          ) : m.confidence === 100 ? (
                            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-success-subtle px-2 text-xs font-medium text-success-fg"><CircleCheck size={12} aria-hidden /> Set by you</span>
                          ) : m.confidence >= 90 ? (
                            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-success-subtle px-2 text-xs font-medium text-success-fg"><CircleCheck size={12} aria-hidden /> {m.confidence}% confident</span>
                          ) : (
                            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-warning-subtle px-2 text-xs font-medium text-warning-fg"><CircleAlert size={12} aria-hidden /> {m.confidence}% · check</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <div className="flex flex-col gap-4 md:gap-6">
              <Card aria-labelledby="validation-title">
                <CardHeader title="Validation result" titleId="validation-title" />
                <ul className="flex flex-col gap-3 p-5 text-sm text-body">
                  <li className="flex gap-2.5"><CircleCheck size={18} className="shrink-0 text-icon-success" aria-hidden /> {mapSummary.ready} rows are ready</li>
                  <li className="flex gap-2.5"><TriangleAlert size={18} className="shrink-0 text-icon-warning" aria-hidden /> {mapSummary.missing} rows are missing a selling price</li>
                  <li className="flex gap-2.5"><Copy size={18} className="shrink-0 text-icon" aria-hidden /> {mapSummary.dupes} rows use an SKU that already exists</li>
                  <li className="flex gap-2.5"><CircleCheck size={18} className="shrink-0 text-icon-success" aria-hidden /> All categories recognised{previewCats.length ? ` (${previewCats.length} new)` : ""}</li>
                </ul>
              </Card>
              <Notice tone="ai" icon={<Sparkles size={18} aria-hidden />}>
                {file!.sample ? "AI suggestions are a starting point. You review every flagged row in the next step." : "Columns were matched by their names. You review every flagged row in the next step."}
              </Notice>
            </div>
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(0)}>
              Back
            </Button>
            <Button iconRight={ArrowRight} disabled={!mapping.some((m) => m.field === "name") || !mapping.some((m) => m.field === "sku")} onClick={buildRows}>
              Review rows
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Rows">
            <div className="flex flex-wrap items-end justify-between gap-2 px-5">
              <Tabs
                label="Rows"
                value={tab}
                onChange={(id) => (setTab(id), setPage(1))}
                className="border-b-0"
                items={[
                  { id: "review", label: "Needs Review", count: groups.review.length },
                  { id: "duplicate", label: "Duplicates", count: groups.duplicate.length },
                  { id: "ready", label: "Ready", count: groups.ready.length },
                  { id: "all", label: "All rows", count: rows.length },
                ]}
              />
              <p className="flex items-center gap-1.5 pb-3 text-[13px] text-muted">
                <ArrowDownWideNarrow size={14} aria-hidden /> Rows that need attention come first
              </p>
            </div>
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <caption className="sr-only">Rows to import</caption>
                <thead>
                  <tr className="h-11 border-b border-line bg-subtle text-xs text-muted">
                    {["Row", "Item name", "SKU", "Category", "Cost (USD)", "Price (USD)", "Status", "Note"].map((h, i) => (
                      <th key={h} scope="col" className={cn("px-4 font-medium", (i === 4 || i === 5) && "text-right")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slice.map((r) => {
                    const s = statusOf(r);
                    return (
                      <tr key={r.row} className={cn("h-14 border-b border-line-subtle", s === "review" && "bg-warning-subtle/70", (s === "duplicate" || s === "left") && "bg-subtle")}>
                        <td className="px-4 text-sm text-muted">{r.row}</td>
                        <td className="px-4 text-sm font-medium text-fg">{r.name || "—"}</td>
                        <td className="px-4 text-sm text-body">{r.sku}</td>
                        <td className="px-4 text-sm text-body">{r.category}{newCats.includes(r.category) ? " (new)" : ""}</td>
                        <td className="tabular px-4 text-right text-sm font-normal text-fg">{num(r.cost)}</td>
                        <td className="px-4 text-right">
                          {s === "review" ? (
                            <input
                              aria-label={`Selling price for ${r.name}`}
                              placeholder="Enter price"
                              inputMode="decimal"
                              onBlur={(e) => {
                                const v = Number(e.target.value.replace(/[^\d.]/g, ""));
                                if (v > 0) setRows((list) => list.map((x) => (x.row === r.row ? { ...x, price: v } : x)));
                              }}
                              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                              className="h-10 w-[130px] rounded-md border border-error bg-surface px-3 text-right text-sm outline-none placeholder:text-fg focus:ring-2 focus:ring-error/20"
                            />
                          ) : (
                            <span className="tabular text-sm font-normal text-fg">{r.price !== null ? num(r.price) : "—"}</span>
                          )}
                        </td>
                        <td className="px-4">
                          {s === "review" ? <StatusPill tone="warning">Needs Review</StatusPill> : s === "duplicate" ? <StatusPill tone="neutral" className="border border-line-strong bg-surface">Duplicate</StatusPill> : s === "left" ? <StatusPill tone="neutral">Left out</StatusPill> : <StatusPill tone="success">Ready</StatusPill>}
                        </td>
                        <td className="px-4 text-sm text-muted">
                          {s === "review" ? (
                            <span className="flex items-center gap-3">
                              Selling price missing
                              <button type="button" onClick={() => setRows((list) => list.map((x) => (x.row === r.row ? { ...x, leaveOut: true } : x)))} className="focus-ring cursor-pointer rounded-xs text-brand hover:underline">
                                Leave out
                              </button>
                            </span>
                          ) : s === "duplicate" ? (
                            "SKU exists · skipped"
                          ) : s === "left" ? (
                            <button type="button" onClick={() => setRows((list) => list.map((x) => (x.row === r.row ? { ...x, leaveOut: false } : x)))} className="focus-ring cursor-pointer rounded-xs text-brand hover:underline">
                              Include again
                            </button>
                          ) : newCats.includes(r.category) ? (
                            "New category"
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={current} pageSize={7} total={shown.length} noun="rows" onPage={setPage} />
          </section>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(1)}>
              Back
            </Button>
            <p className="text-[13px] text-muted">
              {groups.review.length ? `${groups.review.length} row${groups.review.length === 1 ? "" : "s"} still need a selling price. You can fix them now or import the other ${groups.ready.length}.` : `${groups.ready.length} rows are ready to import.`}
            </p>
            <Button iconRight={ArrowRight} className="ml-auto" disabled={!groups.ready.length} onClick={() => setStep(3)}>
              Continue
            </Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
            <Card aria-labelledby="summary-title">
              <CardHeader title="Summary" titleId="summary-title" />
              <ul className="flex flex-col px-5 pt-2">
                {[
                  [<PackagePlus key="i" size={20} aria-hidden />, "bg-success-subtle text-icon-success", "New items to create", "Added to the item list as Active", toImport.length],
                  [<Copy key="i" size={20} aria-hidden />, "bg-muted-bg text-icon-strong", "Duplicates skipped", "SKU already exists — existing items are not changed", groups.duplicate.length],
                  [<Tags key="i" size={20} aria-hidden />, "bg-info-subtle text-icon-info", "New categories", newCats.join(", ") || "None", newCats.length],
                  [<Boxes key="i" size={20} aria-hidden />, "bg-primary-subtle text-brand", "Opening stock movements", postStock ? `Posted to ${branchesUsed.join(" and ")} as “Initial stock”` : "Not posted", stockMoves],
                ].map(([icon, tone, title, sub, value]) => (
                  <li key={String(title)} className="flex items-center gap-4 border-b border-line-subtle py-4 last:border-b-0">
                    <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-[10px]", tone as string)}>{icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] text-fg">{title}</span>
                      <span className="block text-[13px] text-muted">{sub}</span>
                    </span>
                    <span className="text-xl font-semibold text-fg">{value as number}</span>
                  </li>
                ))}
              </ul>
              <Notice tone="info" className="m-5 mt-2" icon={<Info size={18} aria-hidden />} title="You can undo this import for 24 hours">
                Undo removes the created items and their opening stock, as long as none of them has been sold.
              </Notice>
            </Card>
            <Card aria-labelledby="file-title">
              <CardHeader title="File" titleId="file-title" />
              <div className="p-5">
                <DetailList labelWidth={100} items={[["Name", file!.file], ["Rows", `${rows.length} read · ${toImport.length} to import`], ["Reviewed by", user!.name]]} />
              </div>
            </Card>
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(2)}>
              Back
            </Button>
            <Button iconRight={ArrowRight} onClick={confirm}>
              Confirm and create {toImport.length} items
            </Button>
          </div>
        </>
      )}
    </Page>
  );
}
