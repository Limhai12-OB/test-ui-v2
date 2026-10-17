"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AudioLines, Check, CircleAlert, CircleCheck, Info, Mic, Pause, Play, Sparkles, Square, Trash2 } from "lucide-react";
import { AiBadge, StatusPill } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { TextAreaField } from "@/components/ui/fields";
import { Stepper } from "@/components/ui/flow";
import { useToast } from "@/components/ui/overlay";
import { Notice, Page, PageHeader } from "@/components/ui/page";
import { addDays, cn, fmtDate, money, TODAY } from "@/lib/format";
import { docTotal } from "@/lib/mock/ops-data";
import type { DocLine } from "@/lib/mock/ops-types";
import { nowMeta, useBranchScope, useOps } from "@/lib/ops-store";
import { useSession } from "@/lib/session";
import { BillTo, CustomerAndDates, type InvoiceForm } from "./invoice-editor";
import { LineEditor, SummaryCard } from "./sales-shared";

const STEPS = ["Record", "Check transcript", "Review AI draft", "Save invoice"];
const BARS = [10, 18, 26, 14, 30, 22, 34, 16, 28, 20, 36, 24, 18, 30, 14, 26, 32, 18, 22, 12];

const SAMPLE = {
  en: [
    ["Invoice for ", false],
    ["Angkor Wholesale", true],
    [": ", false],
    ["20 cases", true],
    [" of ", false],
    ["Angkor Beer", true],
    [" at ", false],
    ["14 dollars 50", true],
    [" each and ", false],
    ["10 bags", true],
    [" of ", false],
    ["jasmine rice", true],
    [" at ", false],
    ["23 dollars", true],
    [", due ", false],
    ["in two weeks", true],
    [".", false],
  ],
  km: [
    ["វិក្កយបត្រសម្រាប់ ", false],
    ["អង្គរ ហូលសេល", true],
    [" ៖ ស្រាបៀរអង្គរ ", false],
    ["២០ កេស", true],
    [" តម្លៃ ", false],
    ["១៤ ដុល្លារ ៥០", true],
    [" និងអង្ករម្លិះ ", false],
    ["១០ បាវ", true],
    [" តម្លៃ ", false],
    ["២៣ ដុល្លារ", true],
    [" ត្រូវបង់ក្នុង ", false],
    ["ពីរសប្ដាហ៍", true],
  ],
} as const;

const DRAFT_LINES: DocLine[] = [
  { itemId: "angkor-beer", description: "Angkor Beer 330ml × 24", sku: "BEV-ANG-330", qty: 20, price: 14.5, discount: 0, ai: true },
  { itemId: "rumduol-rice", description: "Phka Rumduol Rice 25kg", sku: "RIC-JAS-25", qty: 10, price: 23, discount: 0, ai: true },
];

/** Frames 09.16 "Voice-to-Invoice": recording, transcript and AI draft, review before saving. */
export function VoiceToInvoice() {
  const { state, update } = useOps();
  const { user } = useSession();
  const scope = useBranchScope();
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState<"en" | "km">("en");
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mic, setMic] = useState<"pending" | "live" | "unavailable">("pending");
  const [levels, setLevels] = useState(BARS);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [transcript, setTranscript] = useState<string>(SAMPLE.en.map(([t]) => t).join(""));
  const [form, setForm] = useState<InvoiceForm>({
    id: `INV-2026-${String(state.next.invoice).padStart(4, "0")}`,
    customerId: "angkor-wholesale",
    issued: TODAY,
    due: addDays(TODAY, 14),
    branch: scope ?? "Central Market",
    currency: "USD",
    lines: DRAFT_LINES,
    notes: "",
  });
  const [dueConfirmed, setDueConfirmed] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  // Real microphone when the browser allows it; otherwise the sample recording.
  useEffect(() => {
    if (step !== 0) return;
    let cancelled = false;
    let frame = 0;
    const start = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        const rec = new MediaRecorder(s);
        chunks.current = [];
        rec.ondataavailable = (e) => chunks.current.push(e.data);
        rec.onstop = () => setAudioUrl(URL.createObjectURL(new Blob(chunks.current, { type: rec.mimeType })));
        rec.start();
        recorder.current = rec;
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        ctx.createMediaStreamSource(s).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          setLevels(BARS.map((_, i) => 6 + Math.round((data[i % data.length] / 255) * 34)));
          frame = requestAnimationFrame(tick);
        };
        tick();
        setMic("live");
      } catch {
        setMic("unavailable");
      }
    };
    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [step]);

  useEffect(() => {
    if (step !== 0 || paused) return;
    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
      if (mic !== "live") setLevels((l) => l.map((_, i) => 8 + Math.round(Math.abs(Math.sin(Date.now() / 300 + i)) * 28)));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, paused, mic]);

  const stopMic = () => {
    if (recorder.current?.state === "recording" || recorder.current?.state === "paused") recorder.current.stop();
    stream.current?.getTracks().forEach((t) => t.stop());
  };
  useEffect(() => () => stopMic(), []);

  const finish = () => {
    stopMic();
    if (seconds < 1) setSeconds(18);
    setStep(1);
  };
  const restart = () => {
    stopMic();
    setAudioUrl(null);
    setSeconds(0);
    setPaused(false);
    setMic("pending");
    setStep(0);
  };
  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const customer = state.customers.find((c) => c.id === form.customerId);
  const total = docTotal(form.lines);

  const saveDraft = () => {
    if (!customer || !form.lines.length) return;
    update((d) => {
      d.invoices.unshift({
        id: form.id,
        customerId: form.customerId,
        branch: form.branch,
        issued: form.issued,
        due: form.due,
        currency: form.currency,
        lines: form.lines.map((l) => ({ ...l, ai: undefined })),
        notes: form.notes,
        stored: "draft",
        payments: [],
        history: [{ kind: "ai", title: "Draft created from a voice note", meta: nowMeta(user!.name), detail: `${mmss} · ${lang === "en" ? "English" : "Khmer"}` }],
      });
      d.next.invoice++;
    });
    toast({ title: "Invoice saved as draft", body: `${form.id} · ${money(total)}. Review it, then send.` });
    router.push(`/sales/invoices/${form.id}?review=1`);
  };

  const langToggle = (
    <div role="radiogroup" aria-label="Language" className="inline-flex gap-0.5 rounded-md bg-muted-bg p-[3px]">
      {(["en", "km"] as const).map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          onClick={() => {
            setLang(l);
            setTranscript(SAMPLE[l].map(([t]) => t).join(""));
          }}
          className={cn("focus-ring inline-flex h-8 cursor-pointer items-center rounded-sm px-3 text-[13px] font-medium", lang === l ? "bg-surface text-fg shadow-xs" : "text-body", l === "km" && "font-khmer")}
        >
          {l === "en" ? "English" : "ខ្មែរ"}
        </button>
      ))}
    </div>
  );
  const nothingSaved = (
    <Notice tone="ai" icon={<Sparkles size={18} aria-hidden />} title="Nothing is saved automatically">
      A voice note only creates a draft on screen. It becomes an invoice when you review it and choose Save.
    </Notice>
  );

  if (step === 2) {
    return (
      <Page>
        <PageHeader
          breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Invoices", href: "/sales/invoices" }, { label: "Voice to invoice" }]}
          title="Review AI draft invoice"
          badges={
            <>
              <AiBadge>AI-generated draft</AiBadge>
              <StatusPill tone="warning">Not saved</StatusPill>
            </>
          }
          subtitle="Created from your voice note. Check every highlighted field, then save. Nothing has been saved yet."
        />
        <Stepper className="mt-6" steps={STEPS.map((label, i) => ({ label, state: i < 2 ? "done" : i === 2 ? "active" : "todo" }))} />
        <Notice
          tone="ai"
          className="mt-6"
          icon={<Sparkles size={18} aria-hidden />}
          title="Review before saving"
          action={<button type="button" onClick={() => setStep(1)} className="cursor-pointer text-sm font-medium text-ai-fg hover:underline">Listen again</button>}
        >
          {dueConfirmed ? "All 6 fields are checked." : `5 of 6 fields were extracted with high confidence. The due date needs your attention: “in two weeks” was read as ${fmtDate(form.due)}.`}
        </Notice>
        <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
          <div className="flex min-w-0 flex-col gap-4 md:gap-6">
            <CustomerAndDates form={form} set={(p) => setForm((f) => ({ ...f, ...p }))} errors={{}} customers={state.customers} scope={scope} customerConfidence={97} aiDue={{ confirmed: dueConfirmed, onConfirm: () => setDueConfirmed(true) }} />
            <LineEditor lines={form.lines} onChange={(lines) => setForm((f) => ({ ...f, lines }))} branch={form.branch} currency={form.currency} aiFlags />
            <Card aria-labelledby="voice-notes-title">
              <CardHeader title="Notes for the customer" titleId="voice-notes-title" subtitle="Not mentioned in the voice note. Add one if you want it on the invoice." />
              <div className="p-5">
                <TextAreaField label="Notes" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Add a note for the customer (optional)" />
              </div>
            </Card>
          </div>
          <div className="flex flex-col gap-4 md:gap-6">
            <SummaryCard lines={form.lines} currency={form.currency}>
              <Button icon={Check} onClick={saveDraft} disabled={!form.lines.length}>
                Save invoice as draft
              </Button>
              <button
                type="button"
                onClick={() => {
                  toast({ title: "Draft discarded", body: "Nothing was saved." });
                  router.push("/sales/invoices");
                }}
                className="focus-ring mx-auto cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline"
              >
                Discard draft
              </button>
            </SummaryCard>
            {customer && <BillTo customer={customer} />}
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Invoices", href: "/sales/invoices" }, { label: "Voice to invoice" }]}
        title="Voice to invoice"
        badges={<AiBadge>AI-assisted</AiBadge>}
        subtitle="Say the customer, items, quantities, prices and due date in Khmer or English. You review the draft before anything is saved."
      />
      <Stepper className="mt-6" steps={STEPS.map((label, i) => ({ label, state: i < step ? "done" : i === step ? "active" : "todo" }))} />
      <div className="mt-6 grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="flex min-w-0 flex-col gap-4 md:gap-6">
          <Card aria-labelledby="rec-title">
            <CardHeader title={step === 0 ? "Recording" : "Your recording"} titleId="rec-title" actions={langToggle} />
            <div className="flex flex-col gap-5 p-5">
              <div className="mx-auto flex w-full max-w-[320px] flex-col items-center rounded-xl border border-line px-6 py-6">
                <div className="flex h-10 items-center gap-[3px]" aria-hidden>
                  {levels.map((h, i) => (
                    <span key={i} className={cn("w-[3px] rounded-full transition-[height] duration-150", step === 0 && !paused ? "bg-error" : "bg-icon")} style={{ height: step === 0 ? h : BARS[i] }} />
                  ))}
                </div>
                <p className="mt-3 text-xl font-semibold text-fg" aria-live="off">
                  {mmss}
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <button type="button" onClick={restart} aria-label="Delete recording" className="focus-ring inline-flex size-12 cursor-pointer items-center justify-center rounded-md border border-line-strong text-icon-strong hover:bg-subtle">
                    <Trash2 size={20} aria-hidden />
                  </button>
                  {step === 0 ? (
                    <button type="button" onClick={finish} aria-label="Stop recording" className="focus-ring inline-flex size-[72px] cursor-pointer items-center justify-center rounded-full bg-error text-white shadow-md hover:bg-error/90">
                      <Square size={26} aria-hidden />
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label={playing ? "Pause playback" : "Play recording"}
                      onClick={() => {
                        if (!audioUrl) return toast({ title: "No audio to play", body: "The microphone was not available, so the demo used a sample transcript." });
                        if (!audio.current) audio.current = new Audio(audioUrl);
                        if (playing) audio.current.pause();
                        else {
                          audio.current.onended = () => setPlaying(false);
                          audio.current.play();
                        }
                        setPlaying(!playing);
                      }}
                      className="focus-ring inline-flex size-[72px] cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-md hover:bg-primary-hover"
                    >
                      {playing ? <Pause size={26} aria-hidden /> : <Play size={26} aria-hidden />}
                    </button>
                  )}
                  {step === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPaused(!paused);
                        if (recorder.current?.state === "paused") recorder.current.resume();
                        else if (recorder.current?.state === "recording") recorder.current.pause();
                      }}
                      aria-label={paused ? "Resume recording" : "Pause recording"}
                      className="focus-ring inline-flex size-12 cursor-pointer items-center justify-center rounded-md border border-line-strong text-icon-strong hover:bg-subtle"
                    >
                      {paused ? <Mic size={20} aria-hidden /> : <Pause size={20} aria-hidden />}
                    </button>
                  ) : (
                    <button type="button" onClick={() => setStep(2)} aria-label="Use this recording" className="focus-ring inline-flex size-12 cursor-pointer items-center justify-center rounded-md border border-line-strong text-icon-strong hover:bg-subtle">
                      <Check size={20} aria-hidden />
                    </button>
                  )}
                </div>
                <p className="mt-4 text-center text-[13px] text-muted">
                  {step === 0 ? (paused ? "Paused. Tap the microphone to continue." : "Listening… tap the square to finish") : "Finished. Play it back or record again."}
                </p>
              </div>
              {step === 0 && (
                <Notice tone="info" icon={<Info size={18} aria-hidden />} title="Tip">
                  Example: “Invoice for Angkor Wholesale, 20 cases of Angkor Beer at 14 dollars 50, due in two weeks.”
                </Notice>
              )}
              {mic === "unavailable" && step === 0 && <p className="text-xs text-muted">The microphone is not available here, so the demo shows the sample recording.</p>}
            </div>
          </Card>
          {step === 1 && (
            <Card aria-labelledby="transcript-title">
              <CardHeader title="Transcription" titleId="transcript-title" actions={<><span className="inline-flex h-6 items-center rounded-full bg-muted-bg px-2 text-xs font-medium text-body">{lang === "en" ? "English" : "Khmer"}</span><StatusPill tone="success">94% confident</StatusPill></>} />
              <div className="p-5">
                {editing ? (
                  <TextAreaField label="Transcript" rows={4} value={transcript} onChange={(e) => setTranscript(e.target.value)} />
                ) : (
                  <p className={cn("rounded-lg bg-subtle px-4 py-3 text-[15px] leading-7 text-fg", lang === "km" && "font-khmer")}>
                    {SAMPLE[lang].map(([text, highlight], i) => (
                      <span key={i} className={highlight ? "font-medium text-ai-fg" : undefined}>
                        {text}
                      </span>
                    ))}
                  </p>
                )}
                <p className="mt-3 flex items-center gap-1.5 text-[13px] text-muted">
                  <Sparkles size={14} className="text-icon-ai" aria-hidden /> Highlighted words become invoice fields.
                </p>
                <p className="mt-1 text-xs text-muted">Speech recognition is simulated in this demo: the transcript is the sample note, whatever was recorded.</p>
                <div className="mt-3 flex justify-end gap-5">
                  <button type="button" onClick={() => setEditing(!editing)} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline">
                    {editing ? "Done editing" : "Edit text"}
                  </button>
                  <button type="button" onClick={restart} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-brand hover:underline">
                    Record again
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
        <div className="flex flex-col gap-4 md:gap-6">
          {step === 0 ? (
            <Card aria-labelledby="draft-wait-title">
              <CardHeader title="AI draft" titleId="draft-wait-title" />
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <span className="inline-flex size-14 items-center justify-center rounded-full bg-muted-bg text-icon">
                  <AudioLines size={24} aria-hidden />
                </span>
                <p className="mt-4 text-base font-semibold text-fg">Listening…</p>
                <p className="mt-1 text-sm text-muted">The draft appears here when you finish recording.</p>
              </div>
            </Card>
          ) : (
            <section className="overflow-hidden rounded-lg border border-icon-ai/25 bg-surface shadow-xs" aria-labelledby="ai-draft-title">
              <div className="flex items-center justify-between bg-ai-subtle px-5 py-3">
                <p id="ai-draft-title" className="flex items-center gap-2 text-[15px] font-medium text-ai-fg">
                  <Sparkles size={16} aria-hidden /> AI-generated draft
                </p>
                <StatusPill tone="warning">Not saved</StatusPill>
              </div>
              <dl className="grid grid-cols-[100px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-5 py-4 text-sm">
                {[
                  ["Customer", customer?.name, true],
                  ["Items", `${form.lines.length} lines · ${form.lines.reduce((s, l) => s + l.qty, 0)} units`, true],
                  ["Due date", fmtDate(form.due), false],
                  ["Total", `${money(total)} USD`, true],
                ].map(([label, value, ok]) => (
                  <div key={String(label)} className="contents">
                    <dt className="text-muted">{label}</dt>
                    <dd className="truncate text-fg">{value}</dd>
                    <dd>
                      <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium", ok ? "bg-success-subtle text-success-fg" : "bg-warning-subtle text-warning-fg")}>
                        {ok ? <CircleCheck size={12} aria-hidden /> : <CircleAlert size={12} aria-hidden />}
                        {ok ? "Confident" : "Check date"}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {nothingSaved}
        </div>
      </div>
      <div className="mt-6 flex justify-between">
        <Button variant="secondary" onClick={() => (stopMic(), router.push("/sales/invoices"))}>
          Cancel
        </Button>
        {step === 0 ? (
          <Button icon={Square} onClick={finish}>
            Finish recording
          </Button>
        ) : (
          <Button iconRight={ArrowRight} onClick={() => setStep(2)}>
            Review and edit draft
          </Button>
        )}
      </div>
    </Page>
  );
}
