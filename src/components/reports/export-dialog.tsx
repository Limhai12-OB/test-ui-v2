"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, Info, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/fields";
import { ModalFooter, ModalHeader } from "@/components/ui/overlay";
import { cn } from "@/lib/format";
import type { AmountMode, SectionId } from "./report-pdf";

function Radio({ name, checked, onChange, disabled, children, hint }: { name: string; checked: boolean; onChange: () => void; disabled?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <label className={cn("flex items-start gap-2.5 text-sm leading-5", disabled ? "cursor-not-allowed text-muted" : "cursor-pointer text-fg")}>
      <input type="radio" name={name} checked={checked} onChange={onChange} disabled={disabled} className="mt-0.5 size-[18px] shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed" />
      <span>
        {children}
        {hint && <span className="block text-xs leading-4 text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/**
 * Frame 12.9. Each chosen section becomes one page of the PDF, so the preview
 * pages and the page count match the file that is downloaded.
 */
export function ExportDialog({
  open,
  onClose,
  title,
  subtitle,
  sections,
  defaults,
  incomplete,
  fileName,
  preview,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  sections: { id: SectionId; label: string }[];
  defaults: SectionId[];
  incomplete: boolean;
  fileName: string;
  preview: { label: string; scope: string; kpis: [string, string][] };
  onExport: (sections: SectionId[], mode: AmountMode) => void;
}) {
  const [chosen, setChosen] = useState<SectionId[]>(() => (incomplete && !defaults.includes("completeness") ? [...defaults, "completeness"] : defaults));
  const [mode, setMode] = useState<AmountMode>("usd");
  const [page, setPage] = useState(0);
  const ordered = sections.filter((s) => chosen.includes(s.id));
  const pages = ordered.length;
  const current = Math.min(page, Math.max(0, pages - 1));
  const toggle = (id: SectionId, on: boolean) => setChosen((list) => (on ? [...list, id] : list.filter((s) => s !== id)));

  return (
    <Dialog open={open} onClose={onClose} labelledBy="export-title" width={820}>
      <ModalHeader id="export-title" title={title} description={subtitle} icon={<Download size={20} aria-hidden />} onClose={onClose} />
      <div className="grid md:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5 px-5 py-5 md:px-6">
          <fieldset>
            <legend className="text-sm leading-5 font-medium text-fg">Sections to include</legend>
            <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {sections.map((section) => {
                const locked = section.id === "completeness" && incomplete;
                return (
                  <Checkbox key={section.id} checked={chosen.includes(section.id)} disabled={locked} onChange={(on) => toggle(section.id, on)}>
                    {section.label}
                  </Checkbox>
                );
              })}
            </div>
            {incomplete && (
              <p className="mt-3 flex items-start gap-1.5 text-xs leading-4 text-muted">
                <Lock size={12} className="mt-0.5 shrink-0" aria-hidden />
                Completeness status is always included while a report is Incomplete.
              </p>
            )}
          </fieldset>
          <hr className="border-line" />
          <div className="grid gap-5 sm:grid-cols-2">
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2.5 text-sm leading-5 font-medium text-fg">Language</legend>
              <Radio name="pdf-lang" checked onChange={() => {}}>
                English
              </Radio>
              <Radio name="pdf-lang" checked={false} onChange={() => {}} disabled hint="Needs the Khmer font service, not connected in this demo">
                <span lang="km">ខ្មែរ</span> (Khmer)
              </Radio>
              <Radio name="pdf-lang" checked={false} onChange={() => {}} disabled>
                Both, side by side
              </Radio>
            </fieldset>
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2.5 text-sm leading-5 font-medium text-fg">Amounts</legend>
              <Radio name="pdf-amounts" checked={mode === "usd"} onChange={() => setMode("usd")}>
                USD
              </Radio>
              <Radio name="pdf-amounts" checked={mode === "khr"} onChange={() => setMode("khr")}>
                KHR
              </Radio>
              <Radio name="pdf-amounts" checked={mode === "both"} onChange={() => setMode("both")}>
                USD with KHR beside it
              </Radio>
            </fieldset>
          </div>
          {mode !== "usd" && (
            <p className="flex items-start gap-2.5 rounded-md bg-subtle px-4 py-3 text-[13px] leading-5 text-body">
              <Info size={16} className="mt-0.5 shrink-0 text-icon" aria-hidden />
              KHR amounts in the PDF are display conversions at 4,100 KHR per USD, labelled as such on every page.
            </p>
          )}
        </div>

        <div className="border-t border-line bg-subtle px-5 py-5 md:border-t-0 md:border-l md:px-6">
          <div className="flex items-center justify-between">
            <p className="text-sm leading-5 font-medium text-fg">Preview</p>
            <div className="flex items-center gap-1 text-[13px] text-muted">
              <button type="button" aria-label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)} className="focus-ring inline-flex size-7 cursor-pointer items-center justify-center rounded-md hover:bg-muted-bg disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft size={16} aria-hidden />
              </button>
              <span aria-live="polite">
                {pages ? current + 1 : 0} / {pages}
              </span>
              <button type="button" aria-label="Next page" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="focus-ring inline-flex size-7 cursor-pointer items-center justify-center rounded-md hover:bg-muted-bg disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>
          </div>
          <div className="mx-auto mt-3 flex aspect-[1/1.414] w-full max-w-[280px] flex-col rounded-sm border border-line bg-white p-4 text-[#111827] shadow-md" aria-label={`Preview of page ${current + 1}: ${ordered[current]?.label ?? "empty"}`}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold">
                <span className="size-2.5 rounded-[2px] bg-primary" />
                LuyFlow
              </span>
              {incomplete && <span className="rounded-[3px] border border-warning/60 bg-warning-subtle px-1.5 py-px text-[8px] font-semibold text-warning-fg">INCOMPLETE</span>}
            </div>
            {ordered[current]?.id === "summary" ? (
              <>
                <p className="mt-3 text-[12px] font-semibold">{preview.label}</p>
                <p className="text-[8px] text-[#6b7280]">{preview.scope}</p>
                <div className="mt-2 grid grid-cols-3 gap-1 border-y border-[#e5e7eb] py-1.5">
                  {preview.kpis.slice(0, 3).map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[7px] text-[#6b7280]">{label}</p>
                      <p className="text-[9px] font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  {[100, 92, 70].map((w) => (
                    <span key={w} className="h-1 rounded-full bg-[#e5e7eb]" style={{ width: `${w}%` }} />
                  ))}
                </div>
                <div className="mt-3 flex h-16 items-end justify-around border-b border-[#e5e7eb]">
                  {[52, 55, 60, 62, 65, 68, 71, 80].map((h, i) => (
                    <span key={i} className="flex items-end gap-px">
                      <span className="w-1 bg-primary" style={{ height: h * 0.7 }} />
                      <span className="w-1 bg-chart-expense" style={{ height: h * 0.5 }} />
                    </span>
                  ))}
                </div>
              </>
            ) : ordered[current] ? (
              <>
                <p className="mt-3 text-[12px] font-semibold">{ordered[current].label}</p>
                <p className="text-[8px] text-[#6b7280]">{preview.label}</p>
                <div className="mt-3 flex flex-col gap-1.5">
                  {Array.from({ length: 9 }, (_, i) => (
                    <span key={i} className="flex justify-between gap-2">
                      <span className="h-1 rounded-full bg-[#e5e7eb]" style={{ width: `${40 + ((i * 17) % 30)}%` }} />
                      <span className="h-1 w-[18%] rounded-full bg-[#e5e7eb]" />
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="m-auto text-center text-[10px] text-[#6b7280]">Choose at least one section</p>
            )}
            <p className="mt-auto flex justify-between pt-2 text-[7px] text-[#6b7280]">
              <span>{incomplete ? `Generated ${preview.scope.split(" · ").pop()} · open items listed on the last page` : "Generated by LuyFlow"}</span>
              <span>
                {current + 1} / {pages}
              </span>
            </p>
          </div>
        </div>
      </div>
      <ModalFooter
        note={
          <span className="flex items-center gap-1.5 text-muted">
            <FileText size={14} aria-hidden />
            {fileName} · A4 · {pages} page{pages === 1 ? "" : "s"}
          </span>
        }
      >
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button icon={Download} disabled={!pages} onClick={() => onExport(ordered.map((s) => s.id), mode)}>
          Export PDF
        </Button>
      </ModalFooter>
    </Dialog>
  );
}
