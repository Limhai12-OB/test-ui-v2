"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown, Info, LayoutGrid, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { useShell } from "@/components/shell/shell-context";
import { cn } from "@/lib/format";
import { getDashboard, type BranchId, type DashboardData } from "@/lib/mock/dashboard";
import { useSession } from "@/lib/session";
import { AgingCard } from "./aging-card";
import { AttentionCard } from "./attention-card";
import { CustomiseDialog, type WidgetId } from "./customise-dialog";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { EmptyChartCard, SetupCard } from "./first-run";
import { HealthCard } from "./health-card";
import { IncomeChartCard } from "./income-chart-card";
import { KpiCard } from "./kpi-card";
import { QuickActionsCard } from "./quick-actions-card";
import { TransactionsCard } from "./transactions-card";
import { PAGE_CLASS } from "@/components/ui/page";

const HIDDEN_KEY = "fs-dashboard-hidden";

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/**
 * Dashboard screen (section 05). `?state=loading` or `?state=empty` pins the
 * loading (05.4) or first-run (05.5) state for review.
 */
export function Dashboard() {
  const { user } = useSession();
  const { branch, currency } = useShell();
  const router = useRouter();
  const forced = useSearchParams().get("state");
  const [loaded, setLoaded] = useState<{ branch: BranchId; data: DashboardData | null } | null>(null);
  const [customiseOpen, setCustomiseOpen] = useState(false);
  const [hidden, setHidden] = useState<WidgetId[]>([]);

  useEffect(() => {
    let cancelled = false;
    getDashboard(branch).then((data) => {
      if (!cancelled) setLoaded({ branch, data });
    });
    return () => {
      cancelled = true;
    };
  }, [branch]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HIDDEN_KEY);
      // Saved preferences can only be read after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setHidden(JSON.parse(stored));
    } catch {}
  }, []);

  const updateHidden = (next: WidgetId[]) => {
    setHidden(next);
    try {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
    } catch {}
  };

  if (!user) return null;
  const isManager = user.role === "manager";
  const firstRun = forced === "empty" || (Boolean(user.firstRun) && forced !== "loading");
  const loading = forced === "loading" || (!firstRun && loaded?.branch !== branch);
  const data = loaded?.data;
  const firstName = user.name.split(" ")[0];
  const scope = isManager ? `${user.branch} Branch` : data?.scopeLabel ?? "all branches";

  const subtitle = firstRun
    ? `${user.businessName} is set up with one branch: Central Market (Main). Add your data to see your dashboard come to life.`
    : loading
      ? "Loading your October 2026 figures…"
      : `${greeting()}, ${firstName}. Here is how ${scope} did in October 2026.`;

  const primary = isManager
    ? { label: "New walk-in sale", href: "/sales/walk-in/new" }
    : { label: "New transaction", href: "/financial-records/transactions?new=1" };

  return (
    <div className={PAGE_CLASS}>
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] leading-8 font-semibold tracking-[-0.12px] text-fg md:text-2xl">
            {firstRun ? `Welcome to LuyFlow, ${firstName}` : "Dashboard"}
          </h1>
          <p className="mt-1 text-sm leading-[22px] text-muted" aria-live="polite">
            {subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {!firstRun && (
            <>
              <Menu
                width={220}
                triggerLabel="Reporting month"
                triggerClassName={cn(
                  "inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-surface px-4 text-sm leading-5 font-medium text-fg hover:bg-subtle",
                  loading && "pointer-events-none border-line text-icon-subtle",
                )}
                trigger={
                  <>
                    <Calendar size={16} className={loading ? "text-icon-subtle" : "text-icon-strong"} aria-hidden />
                    October 2026
                    <ChevronDown size={16} className={loading ? "text-icon-subtle" : "text-icon-strong"} aria-hidden />
                  </>
                }
                items={[
                  { id: "2026-10", label: "October 2026", selected: true },
                  { id: "2026-09", label: "September 2026", description: "No demo data yet", disabled: true },
                  { id: "2026-08", label: "August 2026", description: "No demo data yet", disabled: true },
                ]}
              />
              <Button variant="secondary" icon={LayoutGrid} disabled={loading} onClick={() => setCustomiseOpen(true)}>
                Customise
              </Button>
            </>
          )}
          <Button icon={Plus} disabled={loading && !firstRun} onClick={() => router.push(primary.href)}>
            {primary.label}
          </Button>
        </div>
      </header>

      {isManager && !firstRun && (
        <p className="mt-6 flex items-start gap-3 rounded-md border border-line bg-muted-bg/60 px-4 py-3 text-[13px] leading-5 text-body">
          <Info size={16} className="mt-0.5 shrink-0 text-icon" aria-hidden />
          You are viewing {user.branch} Branch only. Figures from other branches are not included.
        </p>
      )}

      <div className="mt-6">
        {firstRun ? (
          <FirstRunBody currency={currency} businessName={user.businessName} />
        ) : loading ? (
          <>
            <span className="sr-only" role="status">
              Loading dashboard
            </span>
            <DashboardSkeleton />
          </>
        ) : data ? (
          <DashboardBody data={data} isManager={isManager} hidden={hidden} />
        ) : (
          <NoDataBody currency={currency} scope={scope} />
        )}
      </div>

      <CustomiseDialog
        open={customiseOpen}
        onClose={() => setCustomiseOpen(false)}
        hidden={hidden}
        onChange={updateHidden}
        isManager={isManager}
      />
    </div>
  );
}

function DashboardBody({ data, isManager, hidden }: { data: DashboardData; isManager: boolean; hidden: WidgetId[] }) {
  const { currency } = useShell();
  const show = (id: WidgetId) => !hidden.includes(id);

  const attention = show("attention") && (
    <AttentionCard
      key="attention"
      title={data.attention.title}
      badgeTone={data.attention.badgeTone}
      items={data.attention.items}
      className="max-xl:order-1"
    />
  );
  const health = show("health") && <HealthCard key="health" health={data.health} className="max-xl:order-3" />;
  const quick = show("quickActions") && (
    <QuickActionsCard key="quick" actions={data.quickActions} className="max-xl:order-6" />
  );

  // Owner: health beside the chart, alerts lower right. Branch Manager: tasks
  // beside the chart, branch health lower right (frames 05.1 / 05.3).
  const beside = isManager ? attention : health;
  const lowerRight = isManager ? [health, quick] : [attention, quick];

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4 xl:gap-6">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} currency={currency} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px] xl:items-start">
        {show("chart") && (
          <IncomeChartCard
            chart={data.chart}
            kpis={data.kpis}
            currency={currency}
            className={cn("hidden self-stretch md:flex max-xl:order-2", !beside && "xl:col-span-2")}
          />
        )}
        {beside && <div className="contents xl:flex xl:flex-col xl:self-stretch xl:[&>*]:flex-1">{beside}</div>}

        <div className="contents xl:flex xl:flex-col xl:gap-6">
          {show("aging") && (
            <div className="grid gap-4 md:grid-cols-2 md:gap-6 max-xl:order-4">
              <AgingCard id="receivable" aging={data.receivable} currency={currency} />
              <AgingCard id="payable" aging={data.payable} currency={currency} />
            </div>
          )}
          {show("transactions") && (
            <div className="max-xl:order-5">
              <TransactionsCard subtitle={data.transactions.subtitle} rows={data.transactions.rows} />
            </div>
          )}
        </div>
        <div className="contents xl:flex xl:flex-col xl:gap-6">{lowerRight}</div>
      </div>
    </div>
  );
}

const EMPTY_KPIS: DashboardData["kpis"] = [
    { id: "revenue", label: "Monthly revenue", shortLabel: "Revenue", value: 0, kind: "money", delta: "", deltaDirection: "up", deltaTone: "success", deltaSuffix: "", shortSuffix: "" },
    { id: "expenses", label: "Monthly expenses", shortLabel: "Expenses", value: 0, kind: "money", delta: "", deltaDirection: "up", deltaTone: "success", deltaSuffix: "", shortSuffix: "" },
    { id: "profit", label: "Net profit", shortLabel: "Net profit", value: 0, kind: "money", delta: "", deltaDirection: "up", deltaTone: "success", deltaSuffix: "", shortSuffix: "" },
    { id: "margin", label: "Profit margin", shortLabel: "Profit margin", value: 0, kind: "percent", delta: "", deltaDirection: "up", deltaTone: "success", deltaSuffix: "", shortSuffix: "" },
];

function EmptyKpis({ currency }: { currency: "USD" | "KHR" }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4 xl:gap-6">
      {EMPTY_KPIS.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} currency={currency} empty />
      ))}
    </div>
  );
}

/** A branch with no records yet (e.g. a newly invited Branch Manager's branch). */
function NoDataBody({ currency, scope }: { currency: "USD" | "KHR"; scope: string }) {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <EmptyKpis currency={currency} />
      <div className="grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <EmptyChartCard />
        <section className="flex flex-col justify-center rounded-lg border border-line bg-surface p-6 text-center shadow-xs">
          <h2 className="text-base leading-6 font-semibold text-fg">Nothing recorded for {scope} yet</h2>
          <p className="mt-1 text-[13px] leading-5 text-muted">
            Sales, bills and bank imports for this branch will appear here as soon as they are recorded.
          </p>
        </section>
      </div>
    </div>
  );
}

function FirstRunBody({ currency, businessName }: { currency: "USD" | "KHR"; businessName: string }) {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <EmptyKpis currency={currency} />
      <div className="grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <SetupCard businessName={businessName} />
        <EmptyChartCard />
      </div>
    </div>
  );
}
