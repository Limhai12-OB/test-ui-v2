import { ArrowRight, ChartColumn, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/format";
import { SETUP_STEPS } from "@/lib/mock/dashboard";

/** Frame 05.5 — "Get set up" checklist for a business with no data yet. */
export function SetupCard({ businessName, className }: { businessName: string; className?: string }) {
  const done = SETUP_STEPS.filter((step) => step.done).length;
  return (
    <Card className={className} aria-labelledby="setup-title">
      <CardHeader
        title="Get set up"
        titleId="setup-title"
        subtitle={`${done} of ${SETUP_STEPS.length} steps done · about 15 minutes`}
        actions={
          <div
            className="hidden h-2 w-40 overflow-hidden rounded-full bg-line sm:block"
            role="progressbar"
            aria-label="Setup progress"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={SETUP_STEPS.length}
          >
            <div className="lf-grow-x h-full rounded-full bg-primary" style={{ width: `${(done / SETUP_STEPS.length) * 100}%` }} />
          </div>
        }
      />
      <ol className="flex flex-col gap-2.5 p-5">
        {SETUP_STEPS.map((step) => (
          <li
            key={step.id}
            className={cn(
              "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[10px] border border-line px-4 py-4 sm:flex-nowrap",
              step.done && "bg-subtle",
            )}
          >
            {step.done ? (
              <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-success text-white">
                <Check size={14} strokeWidth={3} aria-hidden />
              </span>
            ) : (
              <span aria-hidden className="size-[22px] shrink-0 rounded-full border-2 border-line-strong" />
            )}
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm leading-5 font-medium", step.done ? "text-muted" : "text-fg")}>
                {step.title}
                {step.done && <span className="sr-only"> (done)</span>}
              </p>
              <p className="text-[13px] leading-5 text-muted">
                {step.id === "business" ? `${businessName} · ${step.detail}` : step.detail}
              </p>
            </div>
            {step.done ? (
              <Badge tone="success" dot>
                Done
              </Badge>
            ) : (
              step.action &&
              step.href && (
                <ButtonLink href={step.href}variant="secondary" size="sm" iconRight={ArrowRight} className="ml-[38px] sm:ml-0">
                  {step.action}
                </ButtonLink>
              )
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function EmptyChartCard({ className }: { className?: string }) {
  return (
    <Card className={className} aria-labelledby="empty-chart-title">
      <CardHeader title="Income vs spending" titleId="empty-chart-title" />
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-muted-bg text-icon">
          <ChartColumn size={18} aria-hidden />
        </span>
        <p className="mt-4 text-[15px] leading-[22px] font-semibold text-fg">No transactions yet</p>
        <p className="mt-1 max-w-[240px] text-[13px] leading-5 text-muted">
          Record a sale or import a statement to see your daily trend.
        </p>
      </div>
    </Card>
  );
}
