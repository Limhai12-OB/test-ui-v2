"use client";

import { useState } from "react";
import { NumberRoll } from "@/components/hairline/number-roll";
import { cn } from "@/lib/format";

export type SourceKey = "wholesale" | "walkin" | "online";
export type Source = { key: SourceKey; label: string; short: string; color: string };
export type Week = { label: string } & Record<SourceKey, number>;

const usd = { minimumFractionDigits: 0, maximumFractionDigits: 0 } as const;
const EASE = "cubic-bezier(0.16,1,0.3,1)";

/** Rounds the top of the scale up to a tidy step so the gridlines read well. */
function niceMax(value: number) {
  const step = 10 ** Math.floor(Math.log10(Math.max(value, 1) / 4));
  const nice = [1, 2, 2.5, 5, 10].map((m) => m * step).find((s) => s * 4 >= value) ?? step * 10;
  return nice * 4;
}

/**
 * "Sales by week": stacked columns by source. Point at a week (or arrow through
 * them) and the header becomes its readout; pick a source to see it alone, and
 * the columns ease to the new scale.
 */
export function WeeklySalesChart({ weeks, sources }: { weeks: Week[]; sources: Source[] }) {
  const [only, setOnly] = useState<SourceKey | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const shown = only ? sources.filter((s) => s.key === only) : sources;
  const sum = (w: Week) => shown.reduce((t, s) => t + w[s.key], 0);
  const max = niceMax(Math.max(...weeks.map(sum)));
  const total = weeks.reduce((t, w) => t + sum(w), 0);
  const focus = active === null ? null : weeks[active];
  const best = weeks.reduce((b, w, i) => (sum(w) > sum(weeks[b]) ? i : b), 0);

  return (
    <div className="flex flex-col gap-5 px-5 pt-4 pb-5">
      {/* Readout */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div aria-live="polite">
          <p className="text-[13px] leading-5 text-muted">{focus ? `Week of ${focus.label}` : `October${only ? ` · ${shown[0].label}` : ""}`}</p>
          <p className="tabular text-[28px] leading-9 font-semibold text-fg">
            <NumberRoll value={focus ? sum(focus) : total} format={usd} prefix="$" />
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs leading-4 text-muted">
            {focus
              ? shown.map((s) => (
                  <span key={s.key} className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="size-2 rounded-[2px]" style={{ background: s.color }} />
                    {s.short} <NumberRoll value={focus[s.key]} format={usd} prefix="$" className="text-fg" />
                  </span>
                ))
              : `Best week: ${weeks[best].label} · point at a week for its figures`}
          </p>
        </div>
        <div role="group" aria-label="Show source" className="inline-flex rounded-md bg-muted-bg p-[3px]">
          {[null, ...sources.map((s) => s.key)].map((key) => {
            const on = only === key;
            const src = sources.find((s) => s.key === key);
            return (
              <button
                key={key ?? "all"}
                type="button"
                aria-pressed={on}
                onClick={() => setOnly(key)}
                className={cn("focus-ring inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium whitespace-nowrap transition-colors", on ? "bg-surface text-fg shadow-xs" : "text-muted hover:text-fg")}
              >
                {src && <span aria-hidden className="size-2 rounded-full" style={{ background: src.color }} />}
                {src ? src.short : "All"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Plot */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Sales by week"
        aria-valuemin={0}
        aria-valuemax={weeks.length - 1}
        aria-valuenow={active ?? 0}
        aria-valuetext={focus ? `Week of ${focus.label}: $${sum(focus).toLocaleString("en-US")}` : `October total $${total.toLocaleString("en-US")}`}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          setActive((i) => Math.max(0, Math.min(weeks.length - 1, (i ?? -1) + (e.key === "ArrowRight" ? 1 : -1))));
        }}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
        className="focus-ring relative ml-10 h-[220px] rounded-xs"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="pointer-events-none absolute inset-x-0" style={{ top: `${(i / 4) * 100}%` }} aria-hidden>
            <span className={cn("absolute inset-x-0 h-px", i === 4 ? "bg-chart-axis" : "bg-chart-grid")} />
            <span className="absolute -top-[7px] -left-10 w-8 text-right text-[11px] leading-[14px] text-muted">${(((max * (4 - i)) / 4) / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end">
          {weeks.map((w, i) => {
            const dim = active !== null && active !== i;
            return (
              <div key={w.label} onPointerEnter={() => setActive(i)} className="flex h-full flex-1 cursor-default items-end justify-center px-[9%]">
                <div
                  className="lf-grow-y flex w-full max-w-[56px] flex-col-reverse overflow-hidden rounded-t-[6px]"
                  style={{ height: `${(sum(w) / max) * 100}%`, opacity: dim ? 0.45 : 1, transition: `height 520ms ${EASE}, opacity 200ms ease`, animationDelay: `${i * 60}ms` }}
                >
                  {shown.map((s, k) => (
                    <span
                      key={s.key}
                      className={cn(k > 0 && "border-t-2 border-surface")}
                      style={{ height: `${sum(w) ? (w[s.key] / sum(w)) * 100 : 0}%`, background: s.color, transition: `height 520ms ${EASE}` }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="-mt-3 ml-10 flex" aria-hidden>
        {weeks.map((w, i) => (
          <span key={w.label} className={cn("flex-1 text-center text-[11px] leading-[14px] whitespace-nowrap transition-colors", active === i ? "font-medium text-fg" : "text-muted")}>
            {w.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * "Sales by source": a donut with its legend. Hover or focus a slice or a row
 * and the slice lifts out, the others fade, and the centre rolls to that source.
 */
export function SourceDonut({ totals, sources }: { totals: Record<SourceKey, number>; sources: Source[] }) {
  const [active, setActive] = useState<SourceKey | null>(null);
  const total = sources.reduce((t, s) => t + totals[s.key], 0) || 1;
  const R = 42;
  const C = 2 * Math.PI * R;
  const GAP = 1.6;
  const arcs = sources.map((s, i) => ({
    ...s,
    len: (totals[s.key] / total) * C,
    offset: sources.slice(0, i).reduce((t, p) => t + (totals[p.key] / total) * C, 0),
  }));
  const focus = sources.find((s) => s.key === active);
  const value = focus ? totals[focus.key] : total;

  return (
    <div className="flex flex-col items-center gap-5 p-5" onPointerLeave={() => setActive(null)}>
      <div className="relative size-[188px]">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90 overflow-visible" role="img" aria-label={`Sales by source: ${sources.map((s) => `${s.label} ${Math.round((totals[s.key] / total) * 100)}%`).join(", ")}`}>
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--lf-bg-muted)" strokeWidth="11" />
          {arcs.map((a, i) => {
            const on = active === a.key;
            const dim = active !== null && !on;
            return (
              <circle
                key={a.key}
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth={on ? 14 : 11}
                strokeLinecap="butt"
                strokeDasharray={`${Math.max(a.len - GAP, 0)} ${C}`}
                strokeDashoffset={-a.offset}
                onPointerEnter={() => setActive(a.key)}
                className="lf-donut-arc cursor-pointer"
                style={{ opacity: dim ? 0.3 : 1, transition: `stroke-width 260ms ${EASE}, opacity 200ms ease`, animationDelay: `${i * 90}ms` }}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-live="polite">
          <span className="text-xs leading-4 text-muted">{focus ? focus.short : "October"}</span>
          <span className="tabular text-[22px] leading-7 font-semibold text-fg">
            <NumberRoll value={value} format={usd} prefix="$" />
          </span>
          <span className="text-xs leading-4 text-muted">{focus ? `${Math.round((totals[focus.key] / total) * 100)}% of sales` : "Total sales"}</span>
        </div>
      </div>
      <ul className="flex w-full flex-col gap-1">
        {sources.map((s) => {
          const share = (totals[s.key] / total) * 100;
          const on = active === s.key;
          return (
            <li key={s.key}>
              <button
                type="button"
                onPointerEnter={() => setActive(s.key)}
                onFocus={() => setActive(s.key)}
                onBlur={() => setActive(null)}
                className={cn("focus-ring flex w-full cursor-default flex-col gap-1.5 rounded-md px-2.5 py-2 text-left transition-colors", on ? "bg-muted-bg" : "hover:bg-subtle", active !== null && !on && "opacity-60")}
              >
                <span className="flex w-full items-center gap-2 text-sm">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="min-w-0 flex-1 truncate text-body">{s.label}</span>
                  <span className="tabular text-fg">${totals[s.key].toLocaleString("en-US")}</span>
                  <span className="w-9 text-right text-[13px] text-muted">{Math.round(share)}%</span>
                </span>
                <span className="ml-[18px] block h-1 overflow-hidden rounded-full bg-line" aria-hidden>
                  <span className="lf-grow-x block h-full rounded-full" style={{ width: `${share}%`, background: s.color }} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
