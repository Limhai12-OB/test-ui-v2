"use client";

import { useState } from "react";
import { CircleHelp, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/format";
import type { Health } from "@/lib/mock/dashboard";

/** Scores below 70 are flagged amber in the design (Receivables 58, Expense control 62). */
const WARN_BELOW = 70;

/** Card "Business / Branch health score" (05.1 / 05.3). */
export function HealthCard({ health, className }: { health: Health; className?: string }) {
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <Card className={className} aria-labelledby="health-title">
      <CardHeader
        title={health.title}
        titleId="health-title"
        subtitle="Updated today, 06:00"
        actions={
          <button
            type="button"
            onClick={() => setHelpOpen((open) => !open)}
            aria-expanded={helpOpen}
            aria-controls="health-help"
            aria-label="How the score works"
            className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg"
          >
            <CircleHelp size={16} aria-hidden />
          </button>
        }
      />
      <div className="flex flex-col gap-[18px] p-5">
        {helpOpen && (
          <p id="health-help" className="rounded-md bg-subtle px-3 py-2 text-xs leading-4 text-body">
            The score combines six areas, each out of 100. Scores of 70 and above are shown green; lower ones are
            shown amber so you know where to look first.
          </p>
        )}
        <div className="flex items-center gap-4">
          <ScoreRing score={health.score} />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
            <Badge tone="success" dot>
              Good
            </Badge>
            <p className="text-[13px] leading-5 text-muted">{health.summary}</p>
          </div>
        </div>

        <ul className="flex flex-col gap-3">
          {health.factors.map((factor) => {
            const warn = factor.score < WARN_BELOW;
            return (
              <li key={factor.label} className="flex flex-col gap-1.5">
                <div className="flex items-center text-[13px] leading-5">
                  <span className="min-w-0 flex-1 text-body">{factor.label}</span>
                  <span className={cn("tabular", warn ? "text-warning-fg" : "text-fg")}>{factor.score}</span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-line"
                  role="meter"
                  aria-label={factor.label}
                  aria-valuenow={factor.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className={cn("lf-grow-x h-full rounded-full", warn ? "bg-warning" : "bg-success")} style={{ width: `${factor.score}%` }} />
                </div>
              </li>
            );
          })}
        </ul>

        <hr className="border-line-subtle" />
        <p className="flex gap-2 text-xs leading-4 text-muted">
          <Sparkles size={14} className="shrink-0 text-icon-ai" aria-label="AI insight" />
          {health.insight}
        </p>
      </div>
    </Card>
  );
}

/**
 * 96px ring: a 10px band (outer radius 48, inner 38) matching the Figma
 * "Score ring" track and segment, drawn from the score so it works for any value.
 */
export function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const radius = 43;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Score ${score} out of 100`}>
      <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden className="-rotate-90">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--lf-bg-muted)" strokeWidth="10" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={score < WARN_BELOW ? "var(--lf-warning-default)" : "var(--lf-success-default)"}
          strokeWidth="10"
          strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
        />
      </svg>
      {size >= 96 ? (
        <div className="absolute inset-x-0 top-6 flex flex-col items-center" aria-hidden>
          <span className="text-[28px] leading-9 font-semibold tracking-[-0.14px] text-fg">{score}</span>
          <span className="text-[11px] leading-[14px] text-muted">out of 100</span>
        </div>
      ) : (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center text-xl leading-7 font-semibold text-fg">
          {score}
        </span>
      )}
    </div>
  );
}
