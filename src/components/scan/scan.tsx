"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  Crop,
  Expand,
  Images,
  LoaderCircle,
  Pencil,
  RotateCw,
  ScanLine,
  Sparkles,
  SwitchCamera,
  Wallet,
  X,
  Zap,
  ZapOff,
  Camera,
  CopyCheck,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/overlay";
import { useFinance } from "@/lib/finance-store";
import { cn, money } from "@/lib/format";
import { invoicePaid, invoiceStatus, invoiceTotal, nowMeta, useOps } from "@/lib/ops-store";
import { useSession } from "@/lib/session";

type Mode = "receipt" | "slip";
type Stage = "camera" | "preview" | "reading" | "review" | "confirm" | "saved";

/** What the scripted "AI" reads from the sample receipt (frames 18.5–18.8). */
const RECEIPT = {
  merchant: "Khmer Fresh Produce",
  address: "Phsar Toul Kork, Phnom Penh",
  phone: "Tel 012 449 871",
  date: "2026-10-31",
  time: "13:05",
  currency: "USD" as const,
  category: "Inventory purchases",
  lines: [
    { name: "Morning glory 5kg", amount: 7.5 },
    { name: "Tomato 8kg", amount: 16.5 },
    { name: "Cabbage 12kg", amount: 24 },
  ],
  total: 48,
  cash: 50,
  change: 2,
};

/** The sample ABA transfer slip (frames 18.11–18.13). */
const SLIP = { bank: "ABA", amount: 1250, from: "Angkor Wholesale Trading", to: "MEKONG MART CO LTD", account: "000 482 148 21", trx: "17303847562", date: "2026-10-31", time: "10:24", remark: "INV 2026 0142" };

const READ_STEPS = [
  { title: "Text detected", sub: "Khmer and English" },
  { title: "Merchant and date found", sub: "Khmer Fresh Produce · 31 Oct 2026" },
  { title: "Reading line items and total", sub: "Checking that the items add up to the total" },
  { title: "Looking for a similar expense", sub: "To avoid saving it twice" },
];

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${y}`;
};
const clock = () => new Date().toTimeString().slice(0, 5);

/** The paper receipt as drawn in the design, used when no camera photo is available. */
function ReceiptPaper({ tilt, className }: { tilt?: boolean; className?: string }) {
  return (
    <div className={cn("w-[220px] bg-white px-5 py-4 text-[#111827] shadow-md", tilt && "rotate-[2deg]", className)} aria-label="Receipt from Khmer Fresh Produce, total 48.00 US dollars">
      <p className="text-center text-[13px] font-semibold tracking-wide">KHMER FRESH PRODUCE</p>
      <p className="text-center text-[11px] text-[#475569]">{RECEIPT.address}</p>
      <p className="text-center text-[11px] text-[#475569]">{RECEIPT.phone}</p>
      <div className="mt-2 flex justify-between border-t border-[#cbd5e1] pt-1.5 text-[11px]">
        <span>31/10/2026</span>
        <span>{RECEIPT.time}</span>
      </div>
      {RECEIPT.lines.map((l) => (
        <div key={l.name} className="flex justify-between text-[11px] leading-5">
          <span>{l.name}</span>
          <span>{l.amount.toFixed(2)}</span>
        </div>
      ))}
      <div className="mt-1 flex justify-between border-t border-[#cbd5e1] pt-1.5 text-[12px] font-semibold">
        <span>TOTAL (USD)</span>
        <span>48.00</span>
      </div>
      <div className="flex justify-between text-[10px] text-[#64748b]">
        <span>CASH</span>
        <span>50.00</span>
      </div>
      <div className="flex justify-between text-[10px] text-[#64748b]">
        <span>CHANGE</span>
        <span>2.00</span>
      </div>
      <p className="mt-2 text-center text-[11px] text-[#64748b]">Thank you · អរគុណ</p>
    </div>
  );
}

function SlipPaper({ className }: { className?: string }) {
  const rows = [
    ["From", "ANGKOR WHOLESALE TRADING"],
    ["To", SLIP.to],
    ["Account", SLIP.account],
    ["Trx. ID", SLIP.trx],
    ["Date", "31 Oct 2026, 10:24"],
    ["Remark", SLIP.remark],
  ];
  return (
    <div className={cn("w-[220px] rounded-xl bg-white px-4 py-4 text-[#111827] shadow-md", className)} aria-label="ABA transfer receipt, 1,250.00 US dollars from Angkor Wholesale Trading">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-8 items-center justify-center rounded-md bg-[#0f5c66] text-[11px] font-semibold text-white">ABA</span>
        <span className="text-[13px] font-medium">Transfer receipt</span>
      </div>
      <div className="mt-3 flex flex-col items-center">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#dcfce7] text-[#16a34a]">
          <Check size={16} strokeWidth={3} aria-hidden />
        </span>
        <p className="mt-1 text-[11px] text-[#475569]">Transfer successful</p>
        <p className="text-[15px] font-semibold">1,250.00 USD</p>
      </div>
      <dl className="mt-2 border-t border-[#e5e7eb] pt-2 text-[10px] leading-4">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-0.5">
            <dt className="text-[#64748b]">{k}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Light full-screen page with a title bar (18.7–18.13). */
function Sheet({ title, onClose, right, children, footer }: { title: string; onClose?: () => void; right?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close" className="focus-ring inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg">
            <X size={20} aria-hidden />
          </button>
        )}
        <h1 className="flex-1 text-[17px] leading-6 font-semibold text-fg">{title}</h1>
        {right}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
      {footer && <div className="shrink-0 border-t border-line bg-surface px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">{footer}</div>}
    </div>
  );
}

function Confidence({ value, tone = "success", children }: { value?: number; tone?: "success" | "warning"; children?: React.ReactNode }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium", tone === "success" ? "bg-success-subtle text-success-fg" : "bg-warning-subtle text-warning-fg")}>
      {tone === "success" ? <CircleCheck size={12} aria-hidden /> : <CircleAlert size={12} aria-hidden />}
      {children ?? `${value}%`}
    </span>
  );
}

function Field({ label, badge, children, hint, warn }: { label: string; badge?: React.ReactNode; children: React.ReactNode; hint?: React.ReactNode; warn?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-sm leading-5 font-medium text-fg">{label}</span>
        {badge}
      </div>
      {children}
      {hint && <p className={cn("mt-1.5 text-xs leading-4", warn ? "text-warning-fg" : "text-muted")}>{hint}</p>}
    </div>
  );
}

const inputClass = (ai: boolean, warn?: boolean) =>
  cn(
    "focus-ring h-12 w-full rounded-md border px-3.5 text-[15px] text-fg outline-none",
    warn ? "border-warning bg-warning-subtle" : "border-icon-subtle bg-surface",
    ai && "pr-10",
  );

function AiMark({ warn }: { warn?: boolean }) {
  return <Sparkles size={16} className={cn("pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2", warn ? "text-icon-warning" : "text-icon-ai")} aria-hidden />;
}

/**
 * Scan receipt (section 18.5–18.13): camera, photo check, AI reading, review
 * and save for receipts, and payment-slip capture matched to an invoice.
 * The camera is real when the browser has one; the values AI "reads" come
 * from the scripted sample receipt or slip.
 */
export function ScanFlow() {
  const { user } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const finance = useFinance();
  const ops = useOps();
  const isManager = user?.role === "manager";
  const homeBranch = user?.branch ?? "Central Market";

  const [mode, setMode] = useState<Mode>(params.get("mode") === "slip" ? "slip" : "receipt");
  const [stage, setStage] = useState<Stage>("camera");
  const [photo, setPhoto] = useState<string | null>(null);
  const [capturedAt, setCapturedAt] = useState("");
  const [readStep, setReadStep] = useState(0);
  const [saved, setSaved] = useState<{ id: string; amount: string; label: string; extra?: [string, string][] } | null>(null);

  // Receipt fields
  const [merchant, setMerchant] = useState(RECEIPT.merchant);
  const [date, setDate] = useState(RECEIPT.date);
  const [currency, setCurrency] = useState<"USD" | "KHR">("USD");
  const [total, setTotal] = useState("48.00");
  const [totalChecked, setTotalChecked] = useState(false);
  const [category, setCategory] = useState(RECEIPT.category);
  const tills = finance.state.accounts.filter((a) => a.status === "active" && (!isManager || a.branch === homeBranch || a.branch === "Business-wide"));
  const defaultAccount = tills.find((a) => a.kind === "till" && a.branch === homeBranch)?.id ?? tills[0]?.id ?? "";
  const [accountId, setAccountId] = useState(defaultAccount);
  const [branch, setBranch] = useState(homeBranch === "Central Market" && !isManager ? "Toul Kork" : homeBranch);
  const [linesOpen, setLinesOpen] = useState(true);
  const [enlarge, setEnlarge] = useState(false);

  // Slip fields
  const [slipAmount, setSlipAmount] = useState("1,250.00");
  const [slipDate, setSlipDate] = useState("31 Oct 2026, 10:24");
  const [editSlip, setEditSlip] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [showAllInvoices, setShowAllInvoices] = useState(false);

  useEffect(() => {
    if (!defaultAccount) return;
    // Accounts load with the finance store after the first render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAccountId((current) => current || defaultAccount);
  }, [defaultAccount]);

  const close = useCallback(() => router.push("/dashboard"), [router]);

  /* ----- camera ----- */
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState<"starting" | "live" | "none">("starting");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [torch, setTorch] = useState(false);

  useEffect(() => {
    if (stage !== "camera") return;
    let cancelled = false;
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setCamera("none");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 } }, audio: false });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCamera("live");
      } catch {
        if (!cancelled) setCamera("none");
      }
    };
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [stage, facing]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    const next = !torch;
    setTorch(next);
    try {
      await track?.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
    } catch {
      // Torch is not supported on this camera; the button still shows the choice.
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (camera === "live" && video && video.videoWidth) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      setPhoto(canvas.toDataURL("image/jpeg", 0.85));
    } else setPhoto(null);
    setCapturedAt(clock());
    setStage("preview");
  };

  const fromGallery = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(String(reader.result));
      setCapturedAt(clock());
      setStage("preview");
    };
    reader.readAsDataURL(file);
  };

  /* ----- reading ----- */
  useEffect(() => {
    if (stage !== "reading") return;
    if (readStep >= READ_STEPS.length) {
      const t = setTimeout(() => setStage("review"), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setReadStep((s) => s + 1), 1100);
    return () => clearTimeout(t);
  }, [stage, readStep]);

  const usePhoto = () => {
    setReadStep(0);
    setStage(mode === "receipt" ? "reading" : "review");
  };

  /* ----- receipt data ----- */
  const totalValue = Number(total.replace(/[^\d.]/g, "")) || 0;
  const itemsSum = RECEIPT.lines.reduce((s, l) => s + l.amount, 0);
  const account = finance.state.accounts.find((a) => a.id === accountId);
  const categories = finance.state.categories.filter((c) => c.kind === "expense" && c.active).map((c) => c.name);
  const duplicate = finance.state.transactions.find((t) => t.date === date && t.type === "expense" && Math.abs(Math.abs(t.amount) - totalValue) < 0.005 && t.description.toLowerCase().includes(merchant.toLowerCase().slice(0, 10)));
  const fieldsChecked = 6;

  const saveExpense = () => {
    let id = "";
    finance.update((d) => {
      id = `TXN-2026-10-${String(d.nextIds.txn++).padStart(4, "0")}`;
      const a = d.accounts.find((x) => x.id === accountId);
      if (a) {
        if (a.kind === "till" && currency === "KHR") a.khrBalance = (a.khrBalance ?? 0) - totalValue;
        else a.balance = Math.round((a.balance - totalValue) * 100) / 100;
      }
      d.transactions.unshift({
        id,
        date,
        description: `${merchant} — receipt`,
        type: "expense",
        accountId,
        branch,
        category,
        amount: -totalValue,
        currency,
        status: "posted",
        ref: `Receipt ${clock()}`,
        method: account?.kind === "till" ? "Cash" : "Bank transfer",
        recon: "unmatched",
        history: [
          { kind: "ai", title: "Read from a receipt photo by AI", meta: nowMeta(user!.name) },
          { kind: "start", title: "Saved with the receipt photo attached", meta: nowMeta(user!.name) },
        ],
      });
    });
    setSaved({ id, amount: `${money(totalValue, currency)} ${currency}`, label: merchant });
    setStage("saved");
  };

  /* ----- slip data ----- */
  const openInvoices = useMemo(
    () =>
      ops.state.invoices
        .filter((i) => i.stored !== "draft" && ["sent", "partial", "overdue"].includes(invoiceStatus(i)) && (!isManager || i.branch === homeBranch))
        .map((i) => ({ invoice: i, balance: Math.round((invoiceTotal(i) - invoicePaid(i)) * 100) / 100, customer: ops.state.customers.find((c) => c.id === i.customerId)?.name ?? "" })),
    [ops.state, isManager, homeBranch],
  );
  const slipValue = Number(slipAmount.replace(/[^\d.]/g, "")) || 0;
  const remarkId = SLIP.remark.replace(/\s+/g, "-").replace(/^INV-(\d{4})-(\d{4})$/, "INV-$1-$2");
  const ranked = [...openInvoices]
    .map((o) => ({ ...o, score: (o.invoice.id === remarkId ? 4 : 0) + (Math.abs(o.balance - slipValue) < 0.01 ? 2 : 0) + (o.customer === SLIP.from ? 1 : 0) }))
    .sort((a, b) => b.score - a.score || a.invoice.due.localeCompare(b.invoice.due));
  const best = ranked[0] && ranked[0].score >= 3 ? ranked[0] : null;
  const suggestions = showAllInvoices ? ranked : ranked.filter((r) => r.customer === SLIP.from || r === best).slice(0, 2);
  const chosen = ranked.find((r) => r.invoice.id === (invoiceId ?? best?.invoice.id));
  const receivedIn = finance.state.accounts.find((a) => a.id === "aba-business-usd");

  const recordPayment = () => {
    if (!chosen) return;
    const value = Math.min(slipValue, chosen.balance);
    const fullyPaid = value >= chosen.balance - 0.004;
    ops.update((d) => {
      const t = d.invoices.find((i) => i.id === chosen.invoice.id)!;
      t.payments.push({ id: `pay-${Date.now()}`, date: SLIP.date, amount: value, method: "Bank transfer", accountId: "aba-business-usd", ref: SLIP.trx, by: user!.name, slip: "ABA transfer slip (photo)" });
      t.history.unshift({ kind: "payment", title: `Payment recorded · ${money(value, "USD")}`, meta: nowMeta(user!.name), detail: `ABA transfer · ref ${SLIP.trx} · Payment slip attached` });
    });
    let id = "";
    finance.update((d) => {
      id = `TXN-2026-10-${String(d.nextIds.txn++).padStart(4, "0")}`;
      const a = d.accounts.find((x) => x.id === "aba-business-usd");
      if (a) a.balance = Math.round((a.balance + value) * 100) / 100;
      d.transactions.unshift({
        id,
        date: SLIP.date,
        description: `Payment ${chosen.invoice.id}`,
        type: "income",
        accountId: "aba-business-usd",
        branch: chosen.invoice.branch,
        category: "Wholesale invoices",
        amount: value,
        currency: "USD",
        status: "posted",
        ref: SLIP.trx,
        method: "Bank transfer",
        linked: { label: `${chosen.invoice.id} · ${fullyPaid ? "paid in full" : "part payment"}`, href: `/sales/invoices/${chosen.invoice.id}` },
        recon: "unmatched",
        history: [{ kind: "payment", title: `Recorded from a payment slip for ${chosen.invoice.id}`, meta: nowMeta(user!.name) }],
      });
    });
    setSaved({
      id: chosen.invoice.id,
      amount: `${money(value, "USD")} USD`,
      label: chosen.customer,
      extra: [
        ["Received in", `${receivedIn?.name ?? "ABA Business USD"} •••• ${receivedIn?.last4 ?? "4821"}`],
        ["Status", fullyPaid ? "Paid" : "Partially paid"],
      ],
    });
    setStage("saved");
  };

  const restart = (next: Mode = mode) => {
    setMode(next);
    setPhoto(null);
    setSaved(null);
    setInvoiceId(null);
    setTotal("48.00");
    setTotalChecked(false);
    setStage("camera");
  };

  if (!user) return null;

  /* ---------- screens ---------- */

  let screen: React.ReactNode;
  if (stage === "camera") {
    screen = (
      <div className="relative flex h-full flex-col bg-[#0b1220] text-white">
        <header className="flex h-14 shrink-0 items-center justify-between px-4">
          <button type="button" onClick={close} aria-label="Close camera" className="focus-ring inline-flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-white/10">
            <X size={22} aria-hidden />
          </button>
          <span className="rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-[#111827]">{mode === "receipt" ? "Fit the whole receipt in the frame" : "Fit the whole slip in the frame"}</span>
          <button type="button" onClick={toggleTorch} aria-pressed={torch} aria-label={torch ? "Turn the flash off" : "Turn the flash on"} disabled={camera !== "live"} className="focus-ring inline-flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-40">
            {torch ? <Zap size={20} aria-hidden /> : <ZapOff size={20} aria-hidden />}
          </button>
        </header>
        <div className="relative mx-0 flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#1e293b]">
          <video ref={videoRef} playsInline muted className={cn("absolute inset-0 h-full w-full object-cover", camera !== "live" && "hidden")} />
          {camera !== "live" && (mode === "receipt" ? <ReceiptPaper tilt /> : <SlipPaper className="rotate-[-2deg]" />)}
          {/* Viewfinder corners */}
          <div aria-hidden className="pointer-events-none absolute inset-x-14 inset-y-10">
            {["top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-lg", "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-lg", "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg", "bottom-0 right-0 border-r-[3px] border-b-[3px] rounded-br-lg"].map((c) => (
              <span key={c} className={cn("absolute size-7 border-white", c)} />
            ))}
          </div>
          <p role="status" className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#0b1220]/85 px-3.5 py-1.5 text-[13px] whitespace-nowrap">
            {camera === "starting" ? (
              <>
                <LoaderCircle size={14} className="animate-spin" aria-hidden />
                Starting the camera…
              </>
            ) : camera === "live" ? (
              <>
                <ScanLine size={14} className="text-[#86efac]" aria-hidden />
                Hold the {mode === "receipt" ? "receipt" : "slip"} flat and steady
              </>
            ) : (
              <>
                <CircleCheck size={14} className="text-[#86efac]" aria-hidden />
                {mode === "receipt" ? "Receipt" : "Payment slip"} detected · hold steady
              </>
            )}
          </p>
        </div>
        {camera === "none" && <p className="bg-[#0b1220] px-4 pt-2 text-center text-xs text-white/60">No camera here, so the sample {mode === "receipt" ? "receipt" : "slip"} is shown. Choose a photo with the gallery button, or press the shutter to use the sample.</p>}
        <div className="shrink-0 px-4 pt-4 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <div role="tablist" aria-label="What are you scanning?" className="flex justify-center gap-2">
            {(
              [
                ["receipt", "Receipt"],
                ["slip", "Payment slip"],
                ["bill", "Bill"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => (id === "bill" ? router.push("/financial-records/bills/new") : setMode(id))}
                className={cn("focus-ring h-9 cursor-pointer rounded-full px-4 text-sm font-medium", mode === id ? "bg-primary-subtle text-brand" : "bg-white/10 text-white hover:bg-white/20")}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Choose a photo from the gallery" className="focus-ring inline-flex size-12 cursor-pointer items-center justify-center rounded-xl bg-white/10 hover:bg-white/20">
              <Images size={22} aria-hidden />
            </button>
            <button type="button" onClick={capture} disabled={camera === "starting"} aria-label={`Take a photo of the ${mode === "receipt" ? "receipt" : "payment slip"}`} className="focus-ring inline-flex size-[76px] cursor-pointer items-center justify-center rounded-full border-4 border-white disabled:opacity-50">
              <span className="size-[60px] rounded-full bg-white" />
            </button>
            <button type="button" onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))} disabled={camera !== "live"} aria-label="Switch camera" className="focus-ring inline-flex size-12 cursor-pointer items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40">
              <SwitchCamera size={22} aria-hidden />
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            aria-label="Choose a photo"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) fromGallery(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    );
  } else if (stage === "preview") {
    screen = (
      <div className="flex h-full flex-col bg-[#0b1220] text-white">
        <header className="flex h-14 shrink-0 items-center gap-3 px-4">
          <button type="button" onClick={() => setStage("camera")} aria-label="Back to the camera" className="focus-ring inline-flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-white/10">
            <ArrowLeft size={22} aria-hidden />
          </button>
          <h1 className="flex-1 text-[17px] font-semibold">Check the photo</h1>
          <span className="inline-flex size-10 items-center justify-center text-white/60" title="Edges are straightened automatically">
            <Crop size={20} aria-hidden />
          </span>
          <span className="inline-flex size-10 items-center justify-center text-white/60" title="Rotated automatically">
            <RotateCw size={20} aria-hidden />
          </span>
        </header>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-[#1e293b] p-6">
          <div className="relative">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt={`Photo of the ${mode === "receipt" ? "receipt" : "payment slip"}`} className="max-h-[56dvh] max-w-full rounded-sm object-contain" />
            ) : mode === "receipt" ? (
              <ReceiptPaper />
            ) : (
              <SlipPaper />
            )}
            <span aria-hidden className="pointer-events-none absolute -inset-3 rounded-sm border-2 border-[#6366f1]">
              {["-top-2 -left-2", "-top-2 -right-2", "-bottom-2 -left-2", "-right-2 -bottom-2"].map((p) => (
                <span key={p} className={cn("absolute size-4 rounded-full border-[3px] border-[#6366f1] bg-white", p)} />
              ))}
            </span>
          </div>
        </div>
        <div className="shrink-0 px-4 pt-4 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <div className="flex gap-3 rounded-lg bg-white/10 px-4 py-3">
            <CircleCheck size={18} className="mt-0.5 shrink-0 text-[#86efac]" aria-hidden />
            <div className="text-sm">
              <p className="font-medium">Sharp and fully in frame</p>
              <p className="text-white/70">Text is readable. Edges were straightened automatically.</p>
            </div>
          </div>
          {photo && (
            <p className="mt-2 flex items-start gap-2 text-xs text-white/60">
              <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
              Demo: AI reading is simulated, so the next screen shows the sample {mode === "receipt" ? "receipt’s" : "slip’s"} values. Your photo is attached as taken.
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setStage("camera")} className="focus-ring inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-white text-[15px] font-medium text-[#111827]">
              <Camera size={18} aria-hidden />
              Retake
            </button>
            <button type="button" onClick={usePhoto} className="focus-ring inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary text-[15px] font-medium text-white hover:bg-primary-hover">
              Use photo
              <ArrowRight size={18} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    );
  } else if (stage === "reading") {
    screen = (
      <Sheet title="Reading receipt" onClose={() => setStage("preview")}>
        <div className="relative flex justify-center overflow-hidden rounded-xl bg-muted-bg py-5">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="max-h-[260px] rounded-sm object-contain" />
          ) : (
            <ReceiptPaper />
          )}
          <span aria-hidden className="absolute inset-x-6 top-[38%] h-10 animate-pulse bg-icon-ai/70" />
        </div>
        <div className="mt-5 text-center" role="status" aria-live="polite">
          <p className="flex items-center justify-center gap-2 text-lg font-semibold text-fg">
            <Sparkles size={20} className="text-icon-ai" aria-hidden />
            AI is reading the receipt
          </p>
          <p className="mt-1 text-sm text-muted">Usually about 5 seconds. Nothing is saved yet.</p>
        </div>
        <ul className="mt-5 divide-y divide-line-subtle rounded-lg border border-line bg-surface px-4">
          {READ_STEPS.map((s, i) => {
            const state = i < readStep ? "done" : i === readStep ? "active" : "todo";
            return (
              <li key={s.title} className="flex items-center gap-3 py-3.5">
                <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full", state === "done" ? "bg-success-subtle text-icon-success" : state === "active" ? "bg-ai-subtle text-icon-ai" : "border border-line-strong")}>
                  {state === "done" ? <Check size={15} strokeWidth={3} aria-hidden /> : state === "active" ? <LoaderCircle size={15} className="animate-spin" aria-hidden /> : null}
                </span>
                <div>
                  <p className={cn("text-[15px] font-medium", state === "todo" ? "text-muted" : "text-fg")}>{s.title}</p>
                  <p className="text-[13px] text-muted">{s.sub}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 text-center">
          <button type="button" onClick={() => setStage("camera")} className="focus-ring cursor-pointer rounded-xs text-[15px] font-medium text-brand hover:underline">
            Cancel
          </button>
        </div>
      </Sheet>
    );
  } else if (stage === "review" && mode === "receipt") {
    const totalWarn = !totalChecked;
    screen = (
      <Sheet
        title="Review receipt"
        onClose={() => setStage("camera")}
        right={
          <Link href="/help" className="focus-ring rounded-xs text-[15px] font-medium text-brand hover:underline">
            Help
          </Link>
        }
        footer={
          <>
            {totalWarn && (
              <p className="mb-3 flex items-start gap-2 text-[13px] text-warning-fg">
                <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />
                Check the total against the receipt. Edit it if it is wrong.
              </p>
            )}
            <Button size="lg" iconRight={ArrowRight} className="w-full" disabled={!totalValue || !merchant.trim() || !accountId} onClick={() => (setTotalChecked(true), setStage("confirm"))}>
              Confirm {money(totalValue, currency)} and continue
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <button type="button" onClick={() => setEnlarge(true)} className="focus-ring flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface p-3 text-left">
            <span className="inline-flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted-bg">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col gap-1">
                  {[24, 18, 22, 16].map((w) => (
                    <span key={w} className="h-0.5 rounded bg-icon-subtle" style={{ width: w }} />
                  ))}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium text-fg">Receipt photo</span>
              <span className="block text-[13px] text-muted">Captured today, {capturedAt} · tap to enlarge</span>
            </span>
            <Expand size={18} className="text-icon" aria-hidden />
          </button>
          <p className="flex gap-3 rounded-lg border border-icon-ai/20 bg-ai-subtle px-4 py-3 text-sm leading-5 text-body">
            <Sparkles size={18} className="mt-0.5 shrink-0 text-icon-ai" aria-hidden />
            AI filled these fields from the photo. Check them and edit anything that is wrong. Nothing is saved until you choose Save.
          </p>
          <Field label="Merchant" badge={<Confidence value={98}>98% confident</Confidence>}>
            <span className="relative">
              <input aria-label="Merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} className={inputClass(true)} />
              <AiMark />
            </span>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" badge={<Confidence value={96} />}>
              <input aria-label="Date" type="date" value={date} max="2026-10-31" onChange={(e) => setDate(e.target.value)} className={inputClass(false)} />
            </Field>
            <Field label="Currency" badge={<Confidence value={99} />}>
              <select aria-label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value as "USD" | "KHR")} className={inputClass(false)}>
                <option>USD</option>
                <option>KHR</option>
              </select>
            </Field>
          </div>
          <Field
            label="Total"
            badge={totalWarn ? <Confidence tone="warning">Check amount</Confidence> : <Confidence>Checked by you</Confidence>}
            warn={totalWarn || Math.abs(totalValue - itemsSum) > 0.005}
            hint={
              Math.abs(totalValue - itemsSum) > 0.005
                ? `The 3 items add up to ${money(itemsSum, "USD")}, not ${money(totalValue, currency)}. Check the receipt before you continue.`
                : totalWarn
                  ? "One digit of the printed total is faint: it could be 8 or 3. The 3 items below add up to $48.00, so that amount is filled in."
                  : undefined
            }
          >
            <span className="relative">
              <input
                aria-label="Total"
                inputMode="decimal"
                value={total}
                onChange={(e) => {
                  setTotal(e.target.value.replace(/[^\d.,]/g, ""));
                  setTotalChecked(true);
                }}
                className={inputClass(true, totalWarn)}
              />
              <AiMark warn={totalWarn} />
            </span>
          </Field>
          <Field label="Category" badge={<Confidence>Suggested · 91%</Confidence>}>
            <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass(false)}>
              {[...new Set([category, ...categories])].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Paid from">
            <span className="relative">
              <Wallet size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-icon-strong" aria-hidden />
              <select aria-label="Paid from" value={accountId} onChange={(e) => setAccountId(e.target.value)} className={cn(inputClass(false), "appearance-none pl-10")}>
                {tills.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-icon-strong" aria-hidden />
            </span>
          </Field>
          <Field label="Branch" hint={isManager ? "Your expenses are recorded for your branch." : undefined}>
            <span className="relative">
              <Building2 size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-icon-strong" aria-hidden />
              <select aria-label="Branch" value={branch} disabled={isManager} onChange={(e) => setBranch(e.target.value)} className={cn(inputClass(false), "appearance-none pl-10 disabled:bg-muted-bg")}>
                {(isManager ? [homeBranch] : ["Central Market", "Toul Kork", "Siem Reap", "Battambang", "Business-wide"]).map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
              <ChevronDown size={18} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-icon-strong" aria-hidden />
            </span>
          </Field>
          <section className="rounded-lg border border-line bg-surface">
            <button type="button" onClick={() => setLinesOpen((v) => !v)} aria-expanded={linesOpen} className="focus-ring flex w-full cursor-pointer items-center gap-2 px-4 py-3.5 text-left">
              <span className="flex-1 text-[15px] font-semibold text-fg">{RECEIPT.lines.length} line items</span>
              <Confidence>Read clearly</Confidence>
              {linesOpen ? <ChevronUp size={18} className="text-icon" aria-hidden /> : <ChevronDown size={18} className="text-icon" aria-hidden />}
            </button>
            {linesOpen && (
              <dl className="border-t border-line px-4 pt-3 pb-3.5 text-sm">
                {RECEIPT.lines.map((l) => (
                  <div key={l.name} className="flex justify-between py-1">
                    <dt className="text-muted">{l.name}</dt>
                    <dd className="tabular text-fg">{money(l.amount, "USD")}</dd>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t border-line pt-2.5 font-semibold text-fg">
                  <dt>Items add up to</dt>
                  <dd className="tabular">{money(itemsSum, "USD")}</dd>
                </div>
              </dl>
            )}
          </section>
        </div>
        {enlarge && (
          <div role="dialog" aria-label="Receipt photo" className="fixed inset-0 z-[70] flex flex-col bg-black/90 p-4" onClick={() => setEnlarge(false)}>
            <button type="button" aria-label="Close photo" className="focus-ring ml-auto inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-white hover:bg-white/10">
              <X size={22} aria-hidden />
            </button>
            <div className="flex flex-1 items-center justify-center">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="Receipt photo" className="max-h-full max-w-full object-contain" />
              ) : (
                <ReceiptPaper className="scale-150" />
              )}
            </div>
          </div>
        )}
      </Sheet>
    );
  } else if (stage === "confirm") {
    screen = (
      <Sheet
        title="Confirm expense"
        onClose={() => setStage("review")}
        footer={
          <div className="flex flex-col gap-2">
            <Button size="lg" icon={Check} className="w-full" onClick={saveExpense}>
              Save expense
            </Button>
            <button type="button" onClick={() => setStage("review")} className="focus-ring h-11 cursor-pointer rounded-md text-[15px] font-medium text-brand hover:underline">
              Back to edit
            </button>
          </div>
        }
      >
        <section className="rounded-xl border border-line bg-surface px-5 py-5">
          <p className="text-center text-sm text-muted">Expense</p>
          <p className="mt-1 flex items-baseline justify-center gap-1.5">
            <span className="tabular text-[40px] leading-[48px] font-semibold text-fg">{money(totalValue, currency)}</span>
            <span className="text-sm font-medium text-muted">{currency}</span>
          </p>
          <p className="text-center text-[13px] text-muted">≈ {currency === "USD" ? money(totalValue * 4100, "KHR") : money(totalValue / 4100, "USD")} · display conversion</p>
          <dl className="mt-4 flex flex-col gap-3 border-t border-line pt-4 text-[15px]">
            {(
              [
                ["Merchant", merchant],
                ["Date", fmtDate(date)],
                ["Category", <span key="c" className="rounded-full bg-muted-bg px-2.5 py-0.5 text-[13px] font-medium text-body">{category}</span>],
                ["Paid from", account?.name ?? ""],
                ["Branch", branch],
                ["Attachment", "Receipt photo · 1 page"],
              ] as [string, React.ReactNode][]
            ).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-medium text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        {duplicate ? (
          <p role="alert" className="mt-4 flex gap-3 rounded-lg border border-warning/50 bg-warning-subtle px-4 py-3 text-sm text-body">
            <CircleAlert size={18} className="mt-0.5 shrink-0 text-icon-warning" aria-hidden />
            {duplicate.id} already records {money(Math.abs(duplicate.amount), duplicate.currency)} for {merchant} on this date. Saving creates a second expense; go back if this receipt is the same one.
          </p>
        ) : (
          <p className="mt-4 flex gap-3 rounded-lg border border-success/30 bg-success-subtle px-4 py-3 text-sm text-body">
            <CopyCheck size={18} className="mt-0.5 shrink-0 text-icon-success" aria-hidden />
            No similar expense was found for {date === "2026-10-31" ? "today" : fmtDate(date)}, so this will not be a duplicate.
          </p>
        )}
        <p className="mt-3 flex items-center gap-2 text-[13px] text-muted">
          <Pencil size={14} aria-hidden />
          You checked {fieldsChecked} fields and confirmed the total yourself.
        </p>
      </Sheet>
    );
  } else if (stage === "review" && mode === "slip") {
    screen = (
      <Sheet
        title="Payment slip"
        onClose={() => setStage("camera")}
        right={
          <Link href="/help" className="focus-ring rounded-xs text-[15px] font-medium text-brand hover:underline">
            Help
          </Link>
        }
        footer={
          <div className="flex flex-col gap-2">
            <Button size="lg" icon={Check} className="w-full" disabled={!chosen || !slipValue} onClick={recordPayment}>
              {chosen ? `Record payment for ${chosen.invoice.id}` : "Choose an invoice"}
            </Button>
            <button type="button" onClick={() => setShowAllInvoices((v) => !v)} className="focus-ring h-11 cursor-pointer rounded-md text-[15px] font-medium text-brand hover:underline">
              {showAllInvoices ? "Show suggested invoices only" : "Choose a different invoice"}
            </button>
          </div>
        }
      >
        <p className="flex gap-3 rounded-lg border border-icon-ai/20 bg-ai-subtle px-4 py-3 text-sm leading-5 text-body">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-icon-ai" aria-hidden />
          AI read these values from the slip photo. Check the amount, the date and the invoice, and edit anything that is wrong before you record the payment.
        </p>
        <section className="mt-4 rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-md bg-[#0f5c66] text-[13px] font-semibold text-white">ABA</span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-fg">Transfer received</p>
              <p className="text-[13px] text-muted">Read from the slip photo</p>
            </div>
            <button type="button" onClick={() => setEditSlip((v) => !v)} aria-pressed={editSlip} className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-xs text-[15px] font-medium text-brand hover:underline">
              <Pencil size={15} aria-hidden />
              {editSlip ? "Done" : "Edit"}
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            <Field label="Amount" badge={<Confidence value={97} />}>
              <span className="relative">
                <input aria-label="Amount" readOnly={!editSlip} value={editSlip ? slipAmount : `${slipAmount} USD`} onChange={(e) => setSlipAmount(e.target.value.replace(/[^\d.,]/g, ""))} className={cn(inputClass(true), !editSlip && "bg-subtle")} />
                <AiMark />
              </span>
            </Field>
            <Field label="Date and time" badge={<Confidence value={95} />}>
              <span className="relative">
                <input aria-label="Date and time" readOnly={!editSlip} value={slipDate} onChange={(e) => setSlipDate(e.target.value)} className={cn(inputClass(true), !editSlip && "bg-subtle")} />
                <AiMark />
              </span>
            </Field>
          </div>
          <dl className="mt-4 flex flex-col gap-2.5 border-t border-line pt-4 text-sm">
            {[
              ["From", SLIP.from],
              ["To account", `${receivedIn?.name ?? "ABA Business USD"} •••• ${receivedIn?.last4 ?? "4821"}`],
              ["Transaction ID", SLIP.trx],
              ["Remark", SLIP.remark],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-medium text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <h2 className="mt-5 flex items-center gap-2 text-[15px] font-semibold text-fg">
          {showAllInvoices ? "Open invoices" : "Suggested invoice"}
          {!showAllInvoices && best && (
            <span className="inline-flex h-6 items-center gap-1 rounded-full border border-icon-ai/20 bg-ai-subtle px-2 text-xs font-medium text-ai-fg">
              <Sparkles size={12} aria-hidden />
              AI match
            </span>
          )}
        </h2>
        {suggestions.length === 0 ? (
          <p className="mt-3 rounded-lg border border-line bg-surface px-4 py-4 text-sm text-muted">{isManager ? `No open invoice at ${homeBranch} matches this slip. Choose a different invoice, or record the money as income in Financial Records.` : "No open invoice matches this slip."}</p>
        ) : (
          <div role="radiogroup" aria-label="Invoice for this payment" className="mt-3 flex flex-col gap-3">
            {suggestions.map((s) => {
              const active = s.invoice.id === chosen?.invoice.id;
              const status = invoiceStatus(s.invoice);
              return (
                <button key={s.invoice.id} type="button" role="radio" aria-checked={active} onClick={() => setInvoiceId(s.invoice.id)} className={cn("focus-ring cursor-pointer rounded-xl border p-4 text-left", active ? "border-primary bg-primary-subtle/60 ring-1 ring-primary" : "border-line bg-surface hover:bg-subtle")}>
                  <span className="flex items-start gap-3">
                    <span className={cn("mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2", active ? "border-primary" : "border-icon-subtle")}>{active && <span className="size-2.5 rounded-full bg-primary" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold text-brand">{s.invoice.id}</span>
                        <Badge tone={status === "overdue" ? "error" : status === "partial" ? "warning" : "sky"} dot size="sm">
                          {status === "overdue" ? "Overdue" : status === "partial" ? "Partially paid" : "Sent"}
                        </Badge>
                      </span>
                      <span className="block text-sm text-body">{s.customer}</span>
                      <span className="block text-[13px] text-muted">Due {fmtDate(s.invoice.due)}</span>
                    </span>
                    <span className="tabular text-[15px] font-medium text-fg">{money(s.balance, "USD")}</span>
                  </span>
                  {s === best && !showAllInvoices && (
                    <span className="mt-2 flex gap-2 pl-8 text-[13px] text-ai-fg">
                      <Sparkles size={14} className="mt-0.5 shrink-0" aria-hidden />
                      Same customer, same amount, and the remark mentions the invoice number.
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {chosen && (
          <p className="mt-3 flex items-start gap-2 text-[13px] text-muted">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
            {slipValue >= chosen.balance - 0.004 ? `After this payment ${chosen.invoice.id} will be Paid.` : `${chosen.invoice.id} will be Partially paid, with ${money(chosen.balance - slipValue, "USD")} still to pay.`} The slip photo is attached to the payment.
          </p>
        )}
      </Sheet>
    );
  } else {
    const isSlip = mode === "slip";
    screen = (
      <div className="flex h-full flex-col bg-surface px-6 pt-16 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <div className="flex flex-1 flex-col items-center text-center" role="status">
          <span className="inline-flex size-[88px] items-center justify-center rounded-full bg-success-subtle">
            <span className="inline-flex size-[60px] items-center justify-center rounded-full bg-success text-white">
              <Check size={30} strokeWidth={3} aria-hidden />
            </span>
          </span>
          <h1 className="mt-5 text-[26px] leading-8 font-semibold text-fg">{isSlip ? "Payment recorded" : "Expense saved"}</h1>
          <p className="mt-2 max-w-[320px] text-[15px] leading-[22px] text-muted">
            {isSlip ? `${saved?.id} is now ${saved?.extra?.[1][1] ?? "Paid"}. The slip is attached as proof of payment.` : `It is now in Financial Records for ${branch}, with the receipt attached.`}
          </p>
          <dl className="mt-6 w-full max-w-[360px] rounded-xl border border-line bg-subtle px-4 py-3 text-left text-sm">
            {(
              [
                [isSlip ? "Invoice" : "Reference", saved?.id ?? ""],
                ["Amount", saved?.amount ?? ""],
                ...(isSlip ? [saved?.extra?.[0] ?? ["", ""]] : []),
                [isSlip ? "Customer" : "Merchant", saved?.label ?? ""],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-1.5">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-medium text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-col gap-3">
          <Button size="lg" icon={ScanLine} className="w-full" onClick={() => restart(mode)}>
            {isSlip ? "Capture another slip" : "Scan another receipt"}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={() => (isSlip ? router.push(`/sales/invoices/${saved?.id}`) : router.push(`/financial-records/transactions?txn=${saved?.id}`))}
          >
            {isSlip ? "Open the invoice" : "View transaction"}
          </Button>
          <button
            type="button"
            onClick={() => {
              toast({ title: isSlip ? "Payment recorded" : "Expense saved", body: `${saved?.id} · ${saved?.amount}` });
              close();
            }}
            className="focus-ring h-11 cursor-pointer rounded-md text-[15px] font-medium text-brand hover:underline"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[45] flex justify-center bg-[#0b1220]/80 md:py-6">
      <div className="h-full w-full overflow-hidden md:max-w-[430px] md:rounded-2xl md:border md:border-white/10 md:shadow-md">{screen}</div>
    </div>
  );
}
