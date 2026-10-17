"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowRightLeft,
  Banknote,
  Building2,
  Check,
  CircleHelp,
  FileText,
  Info,
  Landmark,
  Lock,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  X,
  CloudUpload,
} from "lucide-react";
import { AnswerActions, StreamingText } from "@/components/hairline/streaming-answer";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/format";
import type { AdvisorRecord, Answer, BranchBars, ColumnChart, RecordKind, Stat, Table } from "@/lib/mock/advisor-data";

const KM = {
  records: "កំណត់ត្រាដែលបានយោង",
  readOnly: "បានតែអាន",
  disclaimer: "ផ្អែកលើទិន្នន័យដែលបានកត់ត្រារបស់អ្នក។ នេះមិនមែនជាដំបូន្មានគណនេយ្យ ឬពន្ធដារទេ។",
  askNext: "សួរបន្ត",
};
const EN = {
  records: "Referenced records",
  readOnly: "Read-only",
  disclaimer: "Based on your recorded data. This is not accounting or tax advice.",
  askNext: "Ask next",
};
export const advisorCopy = (lang?: string) => (lang === "km" ? KM : EN);

/** Renders `**bold**` spans in scripted answer text. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((part, index) =>
        part.startsWith("**") ? (
          <strong key={index} className="font-semibold text-fg">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** "✦ AI" pill next to the advisor's name and the page title. */
export function AiPill() {
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-full border border-icon-ai/25 bg-ai-subtle px-1.5 text-[11px] leading-[14px] font-medium text-ai-fg">
      <Sparkles size={11} aria-hidden />
      AI
    </span>
  );
}

export function ReadOnlyPill({ label = "Read-only" }: { label?: string }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-icon-info/40 bg-info-subtle px-2.5 text-xs leading-4 font-medium text-info-fg">{label}</span>
  );
}

/** 32px violet tile with the advisor sparkle. */
export function AdvisorAvatar() {
  return (
    <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-icon-ai/20 bg-ai-subtle text-icon-ai">
      <Sparkles size={16} />
    </span>
  );
}

const RECORD_ICON: Record<RecordKind, typeof FileText> = {
  report: FileText,
  invoice: ReceiptText,
  bill: FileText,
  transactions: ArrowRightLeft,
  accounts: Landmark,
  branch: Building2,
};

export function RecordIcon({ kind, size = 14 }: { kind: RecordKind; size?: number }) {
  const Icon = RECORD_ICON[kind];
  return <Icon size={size} aria-hidden />;
}

function StatTile({ stat }: { stat: Stat }) {
  const Trend = stat.tone === "good" ? TrendingUp : TrendingDown;
  return (
    <div className="min-w-0 rounded-md border border-line bg-subtle px-4 py-3.5">
      <p className="truncate text-xs leading-4 text-muted">{stat.label}</p>
      <p className="tabular mt-2 truncate text-xl leading-7 font-semibold text-fg md:text-[22px]">{stat.value}</p>
      <p className="mt-1.5 flex flex-wrap items-center gap-1 text-xs leading-4">
        {stat.vs && <Trend size={13} className={stat.tone === "good" ? "text-icon-success" : "text-icon-warning"} aria-hidden />}
        <span className={stat.vs ? (stat.tone === "good" ? "text-success-fg" : "text-warning-fg") : "text-muted"}>{stat.delta}</span>
        {stat.vs && <span className="text-muted">{stat.vs}</span>}
      </p>
    </div>
  );
}

function Legend({ series }: { series: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {series.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs leading-4 text-muted">
          <span aria-hidden className="size-2.5 rounded-[2px]" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Grouped columns (frame 11.2 "September and October 2026"). */
function Columns({ chart }: { chart: ColumnChart }) {
  const summary = chart.groups.map((g) => `${g.label}: ${g.values.map((v, i) => `${chart.series[i].label} $${v.toLocaleString("en-US")}`).join(", ")}`).join("; ");
  return (
    <figure className="rounded-md border border-line px-4 pt-4 pb-3 md:px-5" aria-label={`${chart.title}. ${summary}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-[13px] leading-5 font-semibold text-fg">{chart.title}</figcaption>
        <Legend series={chart.series} />
      </div>
      <div className="relative mt-4 h-[150px] pl-10" aria-hidden>
        {chart.yLabels.map((label, index) => (
          <div key={label} className="absolute inset-x-0 left-10" style={{ top: `${(index / (chart.yLabels.length - 1)) * 100}%` }}>
            <span className={cn("absolute inset-x-0 h-px", index === chart.yLabels.length - 1 ? "bg-chart-axis" : "bg-chart-grid")} />
            <span className="absolute -top-[7px] -left-10 w-8 text-right text-[11px] leading-[14px] text-muted">{label}</span>
          </div>
        ))}
        <div className="absolute inset-0 left-10 flex">
          {chart.groups.map((group) => (
            <div key={group.label} className="flex flex-1 items-end justify-center gap-1">
              {group.values.map((value, index) => (
                <span
                  key={index}
                  className="lf-grow-y w-4 rounded-t-[3px] md:w-5"
                  style={{ height: `${(value / chart.max) * 100}%`, background: chart.series[index].color }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex pl-10" aria-hidden>
        {chart.groups.map((group) => (
          <span key={group.label} className="flex-1 text-center text-[11px] leading-[14px] text-muted">
            {group.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

/** Branch rows with the expense bar laid over the revenue bar (frame 11.3). */
function BranchBarsChart({ chart }: { chart: BranchBars }) {
  const max = Math.max(...chart.rows.map((row) => row.track));
  const [front, back] = chart.series;
  return (
    <figure className="rounded-md border border-line px-4 py-4 md:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-[13px] leading-5 font-semibold text-fg">{chart.title}</figcaption>
        <Legend series={chart.series} />
      </div>
      <dl className="mt-3 flex flex-col gap-3">
        {chart.rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 md:grid-cols-[130px_1fr_110px_120px]">
            <dt className="text-sm leading-5 text-fg">{row.label}</dt>
            <dd className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto" aria-hidden>
              <div className="relative h-5">
                {back && <span className="absolute inset-y-0 left-0 rounded-[3px]" style={{ width: `${(row.track / max) * 100}%`, background: back.color }} />}
                <span className="absolute inset-y-[3px] left-0 rounded-[3px]" style={{ width: `${(row.bar / max) * 100}%`, background: front.color }} />
              </div>
            </dd>
            <dd className="tabular text-right text-sm leading-5 font-medium text-fg">{row.value}</dd>
            <dd className={cn("hidden text-right text-xs leading-4 md:block", row.highlight ? "font-medium text-warning-fg" : "text-muted")}>{row.note}</dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}

function AnswerTable({ table }: { table: Table }) {
  const toneClass = { up: "text-warning-fg", down: "text-success-fg", error: "text-error-fg" };
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full min-w-[520px] text-left text-[13px] leading-5">
        <thead className="bg-subtle text-xs leading-4 text-muted">
          <tr>
            {table.columns.map((column) => (
              <th key={column.label} scope="col" className={cn("px-4 py-3 font-medium", column.align === "right" && "text-right")}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.cells.join("|")} className="border-t border-line">
              {row.cells.map((cell, index) => {
                const right = table.columns[index]?.align === "right";
                const tone = row.tones?.[index];
                return (
                  <td key={index} className={cn("px-4 py-3", right && "tabular text-right whitespace-nowrap", tone ? toneClass[tone] : "text-fg")}>
                    {index === 0 && row.href ? (
                      <Link href={row.href} className="focus-ring rounded-xs font-medium text-brand hover:underline">
                        {cell}
                      </Link>
                    ) : (
                      cell
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {table.total && (
          <tfoot>
            <tr className="border-t border-line bg-subtle font-semibold">
              {table.total.map((cell, index) => (
                <td key={index} className={cn("px-4 py-3 text-fg", table.columns[index]?.align === "right" && "tabular text-right whitespace-nowrap")}>
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function RecordChips({ records, label, onOpen }: { records: AdvisorRecord[]; label: string; onOpen: (id: string) => void }) {
  if (!records.length) return null;
  return (
    <div>
      <p className="text-xs leading-4 text-muted md:text-[13px] md:leading-5">{label}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {records.map((record) => (
          <li key={record.id}>
            <button
              type="button"
              onClick={() => onOpen(record.id)}
              className="focus-ring inline-flex h-8 max-w-full cursor-pointer items-center gap-1.5 rounded-md bg-muted-bg px-2.5 text-[13px] leading-[18px] font-medium text-fg hover:bg-line"
            >
              <span className="text-icon">
                <RecordIcon kind={record.kind} />
              </span>
              <span className="truncate">{record.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}


const ACTION_ICON = { invoice: ReceiptText, payment: Banknote, import: CloudUpload };

/**
 * One advisor answer: scope tags, text, figures, chart or table, AI insight,
 * referenced records and the read-only footer (frames 11.2–11.5, 11.10).
 */
export function AnswerCard({
  answer,
  copyText,
  onOpenRecord,
  onRegenerate,
  streamWords,
  busy,
}: {
  answer: Answer;
  copyText: string;
  onOpenRecord: (recordId: string) => void;
  onRegenerate?: () => void;
  /** While the answer streams in: how many words of the text have arrived. */
  streamWords?: number;
  busy?: boolean;
}) {
  const streaming = streamWords !== undefined;
  const words = answer.text.replace(/\*\*/g, "").split(/(\s+)/);
  // The text streams in word by word (Hairline UI streaming text); bold figures and the blocks below appear once it is written.
  const body = streaming ? (
    <StreamingText content={[words.slice(0, streamWords * 2).join("")]} status="streaming" className="!text-sm !leading-[22px] !text-body md:!text-[15px] md:!leading-6" />
  ) : (
    <Rich text={answer.text} />
  );
  const copy = advisorCopy(answer.lang);
  const tone = answer.tone ?? "default";
  const HeadingIcon = tone === "locked" ? Lock : CircleHelp;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-lg border bg-surface p-4 shadow-xs md:p-5",
        tone === "warning" ? "border-warning/60" : tone === "locked" ? "border-primary/25" : "border-line",
      )}
    >
      {(answer.tags.length > 0 || answer.readOnlyTag !== false) && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Answer scope">
          {answer.tags.map((tag) => (
            <li key={tag} className="inline-flex h-6 items-center rounded-full bg-muted-bg px-2.5 text-xs leading-4 font-medium text-body">
              {tag}
            </li>
          ))}
          {answer.readOnlyTag !== false && (
            <li>
              <ReadOnlyPill label={copy.readOnly} />
            </li>
          )}
        </ul>
      )}

      {answer.heading ? (
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-md",
              tone === "locked" ? "bg-primary-subtle text-brand" : "bg-warning-subtle text-icon-warning",
            )}
          >
            <HeadingIcon size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="text-[15px] leading-[22px] font-semibold text-fg">{answer.heading}</h3>
            <div className="mt-1 text-sm leading-[22px] text-body">{body}</div>
          </div>
        </div>
      ) : (
        <div className="text-sm leading-[22px] text-body md:text-[15px] md:leading-6">{body}</div>
      )}

      {!streaming && (
      <div className="flex flex-col gap-4 animate-[ui-fade-up_420ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none">

      {answer.stats && (
        <div className="grid gap-3 sm:grid-cols-3">
          {answer.stats.map((stat) => (
            <StatTile key={stat.label} stat={stat} />
          ))}
        </div>
      )}
      {answer.chart?.kind === "columns" && <Columns chart={answer.chart} />}
      {answer.chart?.kind === "branch-bars" && <BranchBarsChart chart={answer.chart} />}
      {answer.table && <AnswerTable table={answer.table} />}

      {answer.note && (
        <p className="flex items-start gap-3 rounded-md border border-line bg-muted-bg/60 px-4 py-3 text-[13px] leading-5 text-body">
          <Info size={16} className="mt-0.5 shrink-0 text-icon" aria-hidden />
          {answer.note}
        </p>
      )}

      {answer.available && (
        <div className="rounded-md bg-subtle px-4 py-3.5">
          <p className="text-[13px] leading-5 text-muted">What is available</p>
          <ul className="mt-2 flex flex-col gap-2">
            {answer.available.map((item) => (
              <li key={item.text} className="flex items-center gap-2.5 text-sm leading-5 text-fg">
                {item.ok ? <Check size={16} className="shrink-0 text-icon-success" aria-label="Available" /> : <X size={16} className="shrink-0 text-icon-error" aria-label="Not available" />}
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {answer.importPrompt && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] leading-5 text-muted">{answer.importPrompt.text}</p>
          <ButtonLink href={answer.importPrompt.href} variant="secondary" size="sm" iconRight={ArrowRight}>
            {answer.importPrompt.label}
          </ButtonLink>
        </div>
      )}

      {answer.insight && (
        <div className="rounded-md border border-line p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-warning-subtle text-icon-warning">
              <TriangleAlert size={16} aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm leading-5 font-semibold text-fg">{answer.insight.title}</h3>
              <p className="mt-1 text-[13px] leading-5 text-body">{answer.insight.body}</p>
              <p className="mt-1 text-xs leading-4 text-muted">{answer.insight.basis}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="inline-flex h-6 items-center gap-1 rounded-full border border-icon-ai/20 bg-ai-subtle px-2 text-xs leading-4 font-medium text-ai-fg">
              <Sparkles size={12} aria-hidden />
              AI insight
            </span>
            <Link href={answer.insight.href} className="focus-ring rounded-xs text-[13px] leading-5 font-medium text-brand hover:underline">
              {answer.insight.link}
            </Link>
          </div>
        </div>
      )}

      {answer.actions && (
        <div className="flex flex-wrap gap-2">
          {answer.actions.map((action) => {
            const Icon = ACTION_ICON[action.icon];
            return (
              <ButtonLink key={action.href} href={action.href} variant="secondary" size="sm" icon={Icon} iconRight={ArrowRight}>
                {action.label}
              </ButtonLink>
            );
          })}
        </div>
      )}

      <RecordChips records={answer.records} label={copy.records} onOpen={onOpenRecord} />

      {answer.disclaimer && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <p className="flex items-center gap-2 text-xs leading-4 text-muted">
            <ShieldCheck size={14} className="shrink-0" aria-hidden />
            {copy.disclaimer}
          </p>
          <AnswerActions
            copyText={copyText}
            onRegenerate={onRegenerate}
            disabled={busy}
            sources={answer.records.map((r) => ({ name: r.label }))}
            onSourcesClick={answer.records[0] ? () => onOpenRecord(answer.records[0].id) : undefined}
          />
        </div>
      )}
      </div>
      )}
    </div>
  );
}

/** "✦ Which branch has the highest expenses? ↗" suggestion chip. */
export function SuggestionChip({ question, onAsk, disabled, block }: { question: string; onAsk: (q: string) => void; disabled?: boolean; block?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onAsk(question)}
      className={cn(
        "lift focus-ring group inline-flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md border border-line bg-surface px-3.5 py-2 text-left text-sm leading-5 font-medium text-fg shadow-xs hover:border-icon-ai/40 hover:bg-ai-subtle/50 disabled:cursor-not-allowed disabled:opacity-60",
        block && "w-full",
      )}
    >
      <Sparkles size={15} className="shrink-0 text-icon-ai" aria-hidden />
      <span className="min-w-0">{question}</span>
      <ArrowUpRight size={14} className="shrink-0 text-icon group-hover:text-icon-strong" aria-hidden />
    </button>
  );
}
