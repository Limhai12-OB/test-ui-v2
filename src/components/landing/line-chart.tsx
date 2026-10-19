import { useId } from "react";
import s from "./landing.module.css";

/** Two-series line chart (brand = income, soft = last period). Coordinates on a 300×120 grid. Draws itself when revealed. */
const income = [96, 90, 92, 78, 82, 70, 64, 68, 50, 46, 34, 28];
const previous = [104, 100, 96, 94, 88, 86, 80, 76, 72, 66, 60, 54];

function path(values: number[], w: number) {
  const step = w / (values.length - 1);
  return values.map((y, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)} ${y}`).join(" ");
}

export default function LineChart({ marker = 8, tip }: { marker?: number; tip?: string }) {
  const id = useId();
  const w = 300;
  const x = (w / (income.length - 1)) * marker;
  const y = income[marker];
  return (
    <svg viewBox={`0 -14 ${w} 140`} width="100%" aria-hidden="true" className={s.lineChart}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3b5ed9" stopOpacity=".2" />
          <stop offset="1" stopColor="#3b5ed9" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[30, 60, 90].map((gy) => (
        <line key={gy} x1="0" x2={w} y1={gy} y2={gy} stroke="#e5e7eb" strokeDasharray="2 4" />
      ))}
      <path className={s.lcArea} d={`${path(income, w)} L${w} 120 L0 120 Z`} fill={`url(#${id})`} />
      <path className={s.lcLine} pathLength={1} d={path(previous, w)} fill="none" stroke="#c7d2fb" strokeWidth="1.6" />
      <path className={s.lcLine} pathLength={1} d={path(income, w)} fill="none" stroke="#1e40af" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <g className={s.lcMarker}>
        <line x1={x} x2={x} y1={y} y2="120" stroke="#1e40af" strokeDasharray="3 3" />
        <circle cx={x} cy={y} r="4.5" fill="#fff" stroke="#1e40af" strokeWidth="2" />
        {tip && (
          <g transform={`translate(${x} ${y - 14})`}>
            <rect x="-30" y="-15" width="60" height="19" rx="6" fill="#3b5ed9" />
            <text x="0" y="-2" textAnchor="middle" fontSize="9.5" fill="#fff" fontWeight="600">
              {tip}
            </text>
          </g>
        )}
      </g>
    </svg>
  );
}
