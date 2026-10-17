import { Fragment } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/format";

export type Step = { label: string; sub?: string; state: "done" | "active" | "todo" };

/**
 * Horizontal progress card used by import (blue checks) and by till balancing
 * and reconciliation sign-off (green checks).
 */
export function Stepper({ steps, doneTone = "primary", className }: { steps: Step[]; doneTone?: "primary" | "success"; className?: string }) {
  const doneBg = doneTone === "success" ? "bg-success" : "bg-primary";
  return (
    <ol
      aria-label="Progress"
      className={cn("flex items-center gap-3 overflow-x-auto rounded-lg border border-line bg-surface px-4 py-4 shadow-xs md:px-6 [scrollbar-width:none]", className)}
    >
      {steps.map((step, index) => (
        <Fragment key={step.label}>
          {index > 0 && (
            <li aria-hidden className={cn("h-0.5 min-w-6 flex-1 rounded-full", step.state === "todo" && steps[index - 1].state !== "done" ? "bg-line" : steps[index - 1].state === "done" ? doneBg : "bg-line")} />
          )}
          <li className="flex shrink-0 items-center gap-2.5" aria-current={step.state === "active" ? "step" : undefined}>
            <span
              className={cn(
                "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] leading-[18px] font-medium",
                step.state === "done" && `${doneBg} text-white`,
                step.state === "active" && (doneTone === "success" ? "bg-primary text-white" : "border-2 border-primary text-brand"),
                step.state === "todo" && "border border-line-strong text-muted",
              )}
            >
              {step.state === "done" ? <Check size={14} strokeWidth={3} aria-label="Done" /> : index + 1}
            </span>
            <span className="flex flex-col">
              <span className={cn("text-sm leading-5 font-medium whitespace-nowrap", step.state === "todo" ? "text-body" : "text-fg")}>{step.label}</span>
              {step.sub && <span className="text-xs leading-4 whitespace-nowrap text-muted">{step.sub}</span>}
            </span>
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

export type TimelineItem = {
  icon: React.ReactNode;
  tone?: "primary" | "success" | "warning" | "sky" | "ai" | "neutral";
  title: string;
  meta: string;
  detail?: string;
};

const TIMELINE_TONES = {
  primary: "bg-primary-subtle text-brand",
  success: "bg-success-subtle text-icon-success",
  warning: "bg-warning-subtle text-icon-warning",
  sky: "bg-info-subtle text-icon-info",
  ai: "bg-ai-subtle text-icon-ai",
  neutral: "bg-muted-bg text-icon-strong",
};

/** "History" list with a connecting line, newest first. */
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="flex flex-col">
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
          {index < items.length - 1 && <span aria-hidden className="absolute top-8 bottom-1 left-[13px] w-0.5 bg-line" />}
          <span className={cn("relative inline-flex size-7 shrink-0 items-center justify-center rounded-full", TIMELINE_TONES[item.tone ?? "neutral"])}>{item.icon}</span>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm leading-5 font-medium text-fg">{item.title}</p>
            <p className="text-xs leading-4 text-muted">{item.meta}</p>
            {item.detail && <p className="mt-1 text-[13px] leading-5 text-body">{item.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Label / value list ("Details", "Account details"). */
export function DetailList({ items, labelWidth = 136 }: { items: [string, React.ReactNode][]; labelWidth?: number }) {
  return (
    <dl className="grid gap-x-4 gap-y-3 text-sm leading-5" style={{ gridTemplateColumns: `${labelWidth}px minmax(0,1fr)` }}>
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="min-w-0 break-words text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Switch (role=switch checkbox) matching the Figma toggle: 36×20, primary when on. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="checkbox"
      role="switch"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      className="relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-icon-subtle transition-colors before:absolute before:top-0.5 before:left-0.5 before:size-4 before:rounded-full before:bg-white before:shadow-xs before:transition-transform checked:bg-primary checked:before:translate-x-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
    />
  );
}

/** Pill segmented control (7 days / 31 days / 90 days). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-0.5 rounded-md bg-muted-bg p-[3px]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "focus-ring inline-flex h-8 cursor-pointer items-center rounded-sm px-3 text-[13px] leading-[18px] font-medium whitespace-nowrap",
            value === option.value ? "bg-surface text-fg shadow-xs" : "text-body hover:text-fg",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
