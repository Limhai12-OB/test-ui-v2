"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Calendar, ChevronDown, CircleCheck, CircleHelp, FileText, Languages, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ModalFooter, ModalHeader } from "@/components/ui/overlay";
import { cn } from "@/lib/format";
import { buildReport, MONTH_IDS, type MonthId } from "@/lib/mock/reports-data";

function Select({ id, label, icon: Icon, value, onChange, options }: { id: string; label: string; icon: typeof Calendar; value: string; onChange: (v: string) => void; options: { value: string; label: string; disabled?: boolean }[] }) {
  return (
    <div className="flex min-w-0 flex-col">
      <label htmlFor={id} className="mb-1.5 text-sm leading-5 font-medium text-fg">
        {label}
      </label>
      <div className="relative">
        <Icon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-icon-strong" aria-hidden />
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="focus-ring h-10 w-full cursor-pointer appearance-none rounded-md border border-icon-subtle bg-surface pr-9 pl-9 text-sm leading-5 text-fg"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-icon-strong" aria-hidden />
      </div>
    </div>
  );
}

/**
 * Frame 12.3: the completeness check runs before a report is written, and the
 * owner can still generate an Incomplete report.
 */
export function GenerateDialog({
  open,
  onClose,
  initialMonth,
  onGenerate,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  initialMonth: MonthId;
  onGenerate: (id: MonthId) => void;
  /** Whether the month already has a report, which turns the action into "Regenerate". */
  existing: (id: MonthId) => boolean;
}) {
  const [month, setMonth] = useState<MonthId>(initialMonth);
  const [language, setLanguage] = useState("en");
  const [showPassed, setShowPassed] = useState(false);
  const [help, setHelp] = useState(false);
  const report = buildReport(month);
  const openCount = report.open.length;
  const progress = (report.checksPassed / 12) * 100;

  return (
    <Dialog open={open} onClose={onClose} labelledBy="generate-title" width={680}>
      <ModalHeader
        id="generate-title"
        title="Generate monthly report"
        description="LuyFlow checks that the month’s records are complete, then writes the summary and insights."
        icon={<FileText size={20} aria-hidden />}
        onClose={onClose}
      />
      <div className="flex flex-col gap-5 px-5 py-5 md:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            id="gen-month"
            label="Month"
            icon={Calendar}
            value={month}
            onChange={(v) => setMonth(v as MonthId)}
            options={[...MONTH_IDS].reverse().map((id) => ({ value: id, label: buildReport(id).label }))}
          />
          <Select id="gen-branches" label="Branches" icon={Building2} value="all" onChange={() => {}} options={[{ value: "all", label: "All branches (4)" }]} />
          <Select
            id="gen-language"
            label="Report language"
            icon={Languages}
            value={language}
            onChange={setLanguage}
            options={[
              { value: "en", label: "English" },
              { value: "km", label: "ខ្មែរ (Khmer)" },
            ]}
          />
        </div>

        <section aria-labelledby="checks-title" className="overflow-hidden rounded-lg border border-line">
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-subtle px-4 py-3">
            <h3 id="checks-title" className="flex-1 text-sm leading-5 font-semibold text-fg">
              Completeness check
            </h3>
            <div className="h-1.5 w-[140px] overflow-hidden rounded-full bg-line" role="meter" aria-label="Checks passed" aria-valuenow={report.checksPassed} aria-valuemin={0} aria-valuemax={12}>
              <div className={cn("lf-grow-x h-full rounded-full", openCount ? "bg-warning" : "bg-success")} style={{ width: `${progress}%` }} />
            </div>
            <span className={cn("text-[13px] leading-5 font-medium", openCount ? "text-warning-fg" : "text-success-fg")}>{report.checksPassed} of 12 passed</span>
          </div>
          <ul className="divide-y divide-line-subtle px-4">
            {report.open.map((check) => (
              <li key={check.id} className="flex items-center gap-3 py-3">
                <TriangleAlert size={16} className="mt-0.5 shrink-0 self-start text-icon-warning" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-5 font-medium text-fg">{check.title}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-muted">{check.detail}</p>
                </div>
                {check.action && (
                  <Link href={check.action.href} className="focus-ring inline-flex h-8 shrink-0 items-center rounded-md border border-line-strong bg-surface px-3 text-[13px] leading-[18px] font-medium text-fg hover:bg-subtle">
                    {check.action.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <div className={cn("border-line bg-subtle px-4 py-2.5", report.open.length > 0 && "border-t")}>
            <button
              type="button"
              onClick={() => setShowPassed((v) => !v)}
              aria-expanded={showPassed}
              className="focus-ring flex w-full cursor-pointer items-center gap-2 rounded-xs text-left text-sm leading-5 text-fg"
            >
              <CircleCheck size={16} className="text-icon-success" aria-hidden />
              <span className="flex-1">{report.passed.length} checks passed</span>
              <span className="flex items-center gap-1 text-[13px] font-medium text-brand">
                {showPassed ? "Hide" : "Show"}
                <ChevronDown size={14} className={cn("transition-transform", showPassed && "rotate-180")} aria-hidden />
              </span>
            </button>
            {showPassed && (
              <ul className="mt-2 flex flex-col gap-2 pb-1 pl-6">
                {report.passed.map((check) => (
                  <li key={check.id} className="text-[13px] leading-5">
                    <span className="font-medium text-fg">{check.title}</span>
                    <span className="text-muted"> · {check.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {openCount > 0 ? (
          <div className="flex gap-3 rounded-lg border border-warning/50 bg-warning-subtle px-4 py-3" role="status">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-icon-warning" aria-hidden />
            <div className="text-[13px] leading-5 text-body md:text-sm">
              <p className="font-medium text-fg">This report will be marked Incomplete</p>
              <p className="mt-0.5">
                You can generate it now and regenerate after resolving the {openCount} open item{openCount === 1 ? "" : "s"}.
                {report.draftsTotal && ` Until then, $3,535.00 of draft documents and 2 WeBill365 bills are not in the totals yet.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 rounded-lg border border-success/25 bg-success-subtle px-4 py-3" role="status">
            <CircleCheck size={18} className="mt-0.5 shrink-0 text-icon-success" aria-hidden />
            <p className="text-[13px] leading-5 text-body md:text-sm">All 12 checks passed, so this report will be marked Complete.</p>
          </div>
        )}

        {help && (
          <p id="complete-help" className="rounded-md bg-subtle px-4 py-3 text-[13px] leading-5 text-body">
            A report is Complete when all 12 checks pass: every bank, wallet and till balance for the month is Signed Off, every transaction has a category, no invoices or bills are
            left as drafts, and synced data has been reviewed. Incomplete reports show what was missing, including on the PDF.
          </p>
        )}
      </div>
      <ModalFooter
        note={
          <button type="button" onClick={() => setHelp((v) => !v)} aria-expanded={help} aria-controls="complete-help" className="focus-ring inline-flex cursor-pointer items-center gap-1 rounded-xs font-medium text-brand hover:underline">
            What makes a report complete?
            <CircleHelp size={14} aria-hidden />
          </button>
        }
      >
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          icon={Sparkles}
          onClick={() => {
            // Close first so the caller can navigate away (12.3 → 12.4) without the close handler undoing it.
            onClose();
            onGenerate(month);
          }}
        >
          {existing(month) ? "Regenerate report" : "Generate report"}
        </Button>
      </ModalFooter>
    </Dialog>
  );
}
