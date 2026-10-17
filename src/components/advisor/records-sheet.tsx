"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/overlay";
import { cn } from "@/lib/format";
import type { AdvisorRecord } from "@/lib/mock/advisor-data";
import { RecordIcon } from "./answer";

const OPEN_LABEL: Record<AdvisorRecord["kind"], string> = {
  invoice: "Open invoice",
  bill: "Open bill",
  report: "Open report",
  transactions: "Open transactions",
  accounts: "Open accounts",
  branch: "Open branch",
};

/**
 * Frame 11.6: the records behind an answer. Selecting one shows a preview;
 * the footer button opens it on its own screen, where the role decides what
 * can be changed.
 */
export function RecordsSheet({
  open,
  onClose,
  records,
  initialId,
  context,
  hrefFor,
}: {
  open: boolean;
  onClose: () => void;
  records: AdvisorRecord[];
  initialId?: string;
  context: string;
  hrefFor: (record: AdvisorRecord) => string;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialId);
  const selected = records.find((record) => record.id === selectedId) ?? records[0];
  // Records with a preview are listed as cards; summaries (reports, counts) below them.
  const cards = records.filter((record) => record.preview);
  const summaries = records.filter((record) => !record.preview);

  return (
    <Drawer open={open} onClose={onClose} labelledBy="records-title">
      <div className="flex items-start gap-3 border-b border-line px-5 py-5 md:px-6">
        <div className="min-w-0 flex-1">
          <h2 id="records-title" className="flex items-center gap-2 text-lg leading-7 font-semibold text-fg md:text-xl">
            Referenced records
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted-bg px-2 text-xs leading-4 font-medium text-body">{records.length}</span>
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-muted">{context}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg hover:text-icon-strong">
          <X size={18} aria-hidden />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-5 md:px-6">
        {cards.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="Records">
            {cards.map((record) => {
              const active = record.id === selected?.id;
              return (
                <li key={record.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedId(record.id)}
                    className={cn(
                      "focus-ring flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 text-left",
                      active ? "border-primary bg-primary-subtle/60" : "border-line bg-surface hover:bg-subtle",
                    )}
                  >
                    <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-md", active ? "text-brand" : "bg-muted-bg text-icon")}>
                      <RecordIcon kind={record.kind} size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm leading-5 font-medium text-brand">{record.title}</span>
                        {record.status && (
                          <Badge tone={record.status.tone} size="sm" dot>
                            {record.status.label}
                          </Badge>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] leading-5 text-muted">{record.sub}</span>
                    </span>
                    {record.amount && (
                      <span className="shrink-0 text-right">
                        <span className="tabular block text-sm leading-5 font-medium text-fg">{record.amount}</span>
                        <span className={cn("block text-xs leading-4", record.status?.tone === "error" ? "text-error-fg" : "text-muted")}>{record.amountSub}</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {selected?.preview && (
          <section aria-labelledby="preview-title" className="rounded-lg border border-line bg-subtle p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 id="preview-title" className="text-sm leading-5 font-semibold text-fg">
                {selected.title}
              </h3>
              <span className="text-xs leading-4 text-muted">Preview</span>
            </div>
            <dl className="mt-3 grid grid-cols-[120px_1fr] gap-x-4 gap-y-2.5 text-[13px] leading-5">
              {selected.preview.map(([label, value, tone]) => (
                <div key={label} className="contents">
                  <dt className="text-muted">{label}</dt>
                  <dd className={tone === "error" ? "text-error-fg" : "text-fg"}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {summaries.map((record) => (
          <button
            key={record.id}
            type="button"
            onClick={() => router.push(hrefFor(record))}
            className="focus-ring flex w-full cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface px-3.5 py-3 text-left hover:bg-subtle"
          >
            <span className="mt-0.5 text-icon">
              <RecordIcon kind={record.kind} size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm leading-5 font-medium text-fg">{record.title ?? record.label}</span>
              {record.sub && <span className="mt-0.5 block text-[13px] leading-5 text-muted">{record.sub}</span>}
            </span>
            <ArrowRight size={16} className="mt-0.5 shrink-0 text-icon" aria-hidden />
          </button>
        ))}

        <p className="flex items-start gap-3 rounded-lg border border-icon-ai/20 bg-ai-subtle px-4 py-3 text-[13px] leading-5 text-body">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-icon-ai" aria-hidden />
          The advisor only reads these records. Opening one takes you to the normal screen, where your role decides what you can change.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-4 md:px-6">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {selected && (
          <Button iconRight={ArrowRight} onClick={() => router.push(hrefFor(selected))}>
            {OPEN_LABEL[selected.kind]}
          </Button>
        )}
      </div>
    </Drawer>
  );
}
