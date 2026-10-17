"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { RevenueChart } from "@/components/hairline/revenue-chart";
import { Card, CardHeader } from "@/components/ui/card";
import { Menu } from "@/components/ui/menu";
import { downloadCsv } from "@/lib/format";
import { KHR_PER_USD, type ChartInfo, type Currency, type Kpi } from "@/lib/mock/dashboard";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
// September has 30 days; its series is spread over 31 points so the two months line up day by day.

/**
 * Daily amounts that add up to the month's total: busier at weekends, a dip
 * mid-month and the usual month-end invoice payments. Deterministic, so the
 * chart is the same on every load.
 */
function daily(total: number, seed: number, days = 31) {
  const weights = Array.from({ length: days }, (_, i) => {
    const weekday = (i + 4) % 7; // 1 Oct 2026 is a Thursday
    const weekend = weekday === 5 || weekday === 6 ? 1.28 : 1;
    const wave = 1 + 0.16 * Math.sin((i + seed) / 3.1) + 0.08 * Math.cos((i * seed) / 5.3);
    const monthEnd = i >= days - 3 ? 1.35 : 1;
    return weekend * wave * monthEnd;
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  const values = weights.map((w) => Math.round((w / sum) * total));
  values[values.length - 1] += total - values.reduce((a, b) => a + b, 0);
  return values;
}

const previousTotal = (kpi: Kpi) => {
  const pct = Number.parseFloat(kpi.delta) / 100;
  return kpi.value / (1 + (kpi.deltaDirection === "up" ? pct : -pct));
};

/**
 * Card "Income vs spending" (05.1 / 05.3), drawn with the Hairline UI revenue
 * chart: October against September, day by day, with a scrubber that reads out
 * each day. Totals match the KPI cards above it.
 */
export function IncomeChartCard({
  chart,
  kpis,
  currency,
  className,
}: {
  chart: ChartInfo;
  kpis: Kpi[];
  currency: Currency;
  className?: string;
}) {
  const router = useRouter();
  const revenue = kpis.find((k) => k.id === "revenue")!;
  const expenses = kpis.find((k) => k.id === "expenses")!;
  const rate = currency === "KHR" ? KHR_PER_USD : 1;
  const metrics = useMemo(() => {
    const format: Intl.NumberFormatOptions = currency === "KHR" ? { maximumFractionDigits: 0 } : { style: "currency", currency: "USD", maximumFractionDigits: 0 };
    return [
      {
        id: "income",
        label: "Income",
        current: daily(revenue.value * rate, 2),
        previous: daily(previousTotal(revenue) * rate, 5),
        format,
      },
      {
        id: "spending",
        label: "Spending",
        current: daily(expenses.value * rate, 7),
        previous: daily(previousTotal(expenses) * rate, 3),
        format,
      },
    ];
  }, [revenue, expenses, rate, currency]);

  const exportCsv = () =>
    downloadCsv("income-vs-spending-oct-2026.csv", [
      ["Day", `Income (${currency})`, `Spending (${currency})`, `Income September (${currency})`, `Spending September (${currency})`],
      ...DAYS.map((d, i) => [`${d} Oct 2026`, metrics[0].current[i], metrics[1].current[i], metrics[0].previous[i], metrics[1].previous[i]]),
    ]);

  return (
    <Card className={className} aria-labelledby="income-chart-title">
      <CardHeader
        title="Income vs spending"
        titleId="income-chart-title"
        subtitle={currency === "KHR" ? chart.subtitle.replace("USD", "KHR") : chart.subtitle}
        actions={
          <Menu
            align="end"
            triggerLabel="Chart options"
            triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-icon hover:bg-muted-bg"
            trigger={<Ellipsis size={16} aria-hidden />}
            items={[
              { id: "transactions", label: "View transactions", onSelect: () => router.push("/financial-records/transactions") },
              { id: "export", label: "Export as CSV", description: "Daily totals for October and September", onSelect: exportCsv },
            ]}
          />
        }
      />
      <div className="flex flex-1 flex-col px-1 pb-1">
        <RevenueChart
          labels={DAYS.map((d) => `${d} Oct`)}
          titles={DAYS.map((d) => `${d} October 2026`)}
          metrics={metrics}
          series={["October", "September"]}
          locales="en-US"
          // Taller plot than the component default so the chart fills the card beside the health score.
          className="!rounded-none !bg-transparent !shadow-none xl:[&>div]:[--plot:330px]"
        />
      </div>
    </Card>
  );
}
