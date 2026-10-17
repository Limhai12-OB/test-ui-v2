"use client";

import { cn } from "@/lib/format";

/** Smooth path through points using a Catmull–Rom to Bézier conversion. */
function smoothPath(points: [number, number][]) {
  if (points.length < 2) return "";
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * Filled area chart in the style of the Banking "Cash position" and account
 * "Balance" charts: solid primary fill, grid lines, y labels on the left,
 * x labels below and an end-point callout.
 */
export function AreaChart({
  values,
  min,
  max,
  yLabels,
  xLabels,
  callout,
  height = 260,
  label,
  line,
  endDot = true,
}: {
  values: number[];
  /** Optional second series drawn as an orange line (revenue vs expenses). */
  line?: number[];
  endDot?: boolean;
  min: number;
  max: number;
  yLabels: string[];
  xLabels: { index: number; label: string }[];
  callout?: { title: string; sub: string };
  height?: number;
  label: string;
}) {
  const W = 1000;
  const H = 1000;
  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const points = values.map((v, i) => [x(i), y(v)] as [number, number]);
  const path = smoothPath(points);
  const last = points[points.length - 1];
  const lastTop = `${(last[1] / H) * 100}%`;

  return (
    <figure className="relative pr-2 pb-6 pl-12" style={{ height }} aria-label={label}>
      <div className="relative h-full">
        {yLabels.map((text, index) => (
          <div key={text} className="absolute inset-x-0" style={{ top: `${(index / (yLabels.length - 1)) * 100}%` }}>
            <span className="absolute inset-x-0 h-px bg-chart-grid" />
            <span className="absolute -top-[7px] -left-12 w-10 text-right text-[11px] leading-[14px] text-muted">{text}</span>
          </div>
        ))}
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <path d={`${path} L${W},${H} L0,${H} Z`} fill="var(--lf-chart-revenue)" />
          {line && (
            <path
              d={smoothPath(line.map((v, i) => [(i / (line.length - 1)) * W, y(v)] as [number, number]))}
              fill="none"
              stroke="var(--lf-chart-expense)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {endDot && <span
          aria-hidden
          className="absolute -right-[5px] size-2.5 -translate-y-1/2 rounded-full border-[2.5px] border-primary bg-white"
          style={{ top: lastTop }}
        />}
        {callout && (
          <figcaption
            className="absolute right-3 w-[130px] -translate-y-[calc(100%+10px)] rounded-md bg-inverse px-2.5 py-1.5 text-white shadow-md"
            style={{ top: lastTop }}
          >
            <span className="block text-xs leading-4 font-medium">{callout.title}</span>
            <span className="block text-[11px] leading-[14px]">{callout.sub}</span>
          </figcaption>
        )}
        {xLabels.map((item) => (
          <span
            key={item.label}
            className="absolute -bottom-[22px] w-16 -translate-x-1/2 text-center text-[11px] leading-[14px] text-muted"
            style={{ left: `${(item.index / (values.length - 1)) * 100}%` }}
          >
            {item.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

/** Donut with a centred total (account "Money out by category"). */
export function Donut({
  segments,
  center,
  sub,
  size = 180,
}: {
  segments: { label: string; value: number; color: string }[];
  center: string;
  sub: string;
  size?: number;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const r = 40;
  const c = 2 * Math.PI * r;
  const arcs = segments.map((segment, index) => ({
    ...segment,
    length: (segment.value / total) * c,
    offset: segments.slice(0, index).reduce((sum, s) => sum + (s.value / total) * c, 0),
  }));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${sub}: ${center}`}>
      <svg viewBox="0 0 100 100" className="-rotate-90" width={size} height={size} aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--lf-bg-muted)" strokeWidth="16" />
        {arcs.map((arc) => (
          <circle
            key={arc.label}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth="16"
            strokeDasharray={`${Math.max(arc.length - 0.6, 0)} ${c}`}
            strokeDashoffset={-arc.offset}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] leading-5 font-semibold text-fg">{center}</span>
        <span className="text-xs leading-4 text-muted">{sub}</span>
      </div>
    </div>
  );
}

/** Horizontal bar with a light track, used in category breakdowns. */
export function Bar({ value, color, className }: { value: number; color: string; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-line", className)} aria-hidden>
      <div className="lf-grow-x h-full rounded-full" style={{ width: `${Math.max(Math.min(value, 100), 1.5)}%`, background: color }} />
    </div>
  );
}

/** Small coloured dot used in legends and category lists. */
export function Dot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", className)} style={{ background: color }} />;
}
