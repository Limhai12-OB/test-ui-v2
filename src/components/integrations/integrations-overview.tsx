"use client";

import { RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { OwnerOnlyBadge } from "@/components/admin/restricted";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, MobileRow, type Column } from "@/components/ui/data-table";
import { Page, PageHeader } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat";
import { useAdmin } from "@/lib/admin-store";
import { cn } from "@/lib/format";
import { IntegrationStatus, ProviderTile, type IntegrationState } from "./integrations-shared";

type Activity = { id: string; time: string; provider: "shopify" | "webill" | "telegram"; what: string; sub: string; result: IntegrationState };

export function IntegrationsOverview() {
  const { state } = useAdmin();
  const { shopify, webill } = state;
  const reviews = webill.status === "needs_review" ? webill.reviews.length : 0;
  const telegram = state.telegramBusiness;
  const statuses: IntegrationState[] = [shopify.status, webill.status, telegram ? "connected" : "not_connected"];
  const setUp = statuses.filter((s) => s !== "not_connected").length;
  const counts = (["connected", "needs_review", "syncing", "error"] as const)
    .map((s) => [s, statuses.filter((x) => x === s).length] as const)
    .filter(([, n]) => n)
    .map(([s, n]) => `${n} ${{ connected: "Connected", needs_review: "Needs Review", syncing: "Syncing", error: "Error" }[s]}`)
    .join(" · ");
  const shopifyLive = shopify.status === "connected" || shopify.status === "error";
  const orders = shopifyLive ? (shopify.status === "error" ? 314 : 318) : 0;
  const bills = webill.status === "not_connected" ? 0 : 16;
  const alerts = telegram ? 37 : 0;

  const activity: Activity[] = [
    ...(shopifyLive
      ? [
          shopify.status === "error"
            ? { id: "a0", time: "31 Oct, 18:45", provider: "shopify" as const, what: "Scheduled sync", sub: "Access removed or expired", result: "failed" as const }
            : { id: "a1", time: "31 Oct, 18:45", provider: "shopify" as const, what: "Scheduled sync", sub: "4 new orders · $51.80", result: "completed" as const },
          { id: "a2", time: "31 Oct, 18:30", provider: "shopify" as const, what: "Scheduled sync", sub: "2 new orders · $23.50", result: "completed" as const },
        ]
      : []),
    ...(webill.status !== "not_connected"
      ? [{ id: "a3", time: "31 Oct, 17:00", provider: "webill" as const, what: "Daily sync", sub: reviews ? `3 bills fetched · ${reviews} need review` : "3 bills fetched · all recorded", result: (reviews ? "needs_review" : "completed") as IntegrationState }]
      : []),
    ...(shopifyLive ? [{ id: "a4", time: "31 Oct, 14:10", provider: "shopify" as const, what: "Manual sync by Sokha Chan", sub: "11 new orders · $142.30", result: "completed" as const }] : []),
    ...(telegram ? [{ id: "a5", time: "31 Oct, 08:00", provider: "telegram" as const, what: "Morning alerts", sub: "4 alerts delivered to 3 people", result: "completed" as const }] : []),
    ...(shopifyLive ? [{ id: "a6", time: "30 Oct, 23:00", provider: "shopify" as const, what: "Payout matched", sub: "$612.40 matched to ABA Business USD", result: "completed" as const }] : []),
  ];

  const names = { shopify: "Shopify", webill: "WeBill365", telegram: "Telegram" };
  const columns: Column<Activity>[] = [
    { key: "time", header: "Time", width: "20%", cell: (a) => <span className="text-muted">{a.time}</span> },
    {
      key: "integration",
      header: "Integration",
      width: "22%",
      cell: (a) => (
        <span className="flex items-center gap-2.5 font-medium text-fg">
          <ProviderTile provider={a.provider} size={32} />
          {names[a.provider]}
        </span>
      ),
    },
    {
      key: "what",
      header: "What happened",
      cell: (a) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] leading-5 font-medium text-fg">{a.what}</p>
          <p className="truncate text-xs leading-4 text-muted">{a.sub}</p>
        </div>
      ),
    },
    { key: "result", header: "Result", width: "21%", cell: (a) => <IntegrationStatus status={a.result} /> },
  ];

  return (
    <Page>
      <PageHeader title="Integrations" badges={<OwnerOnlyBadge />} subtitle="Connect the tools Mekong Mart already uses. LuyFlow reads from them; it never changes data in the other system." />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Integrations set up" value={`${setUp} of 3`} lines={[counts || "Nothing connected yet"]} />
        <StatCard label="Needs your review" value={reviews} tone={reviews ? "warning" : "default"} lines={[reviews ? "WeBill365 bills to check" : "Nothing waiting"]} />
        <StatCard label="Records synced in October" value={orders + bills + alerts} lines={[`${orders} orders · ${bills} bills · ${alerts} alerts`]} />
        <StatCard
          label="Last sync"
          value={shopify.status === "connected" ? "18:45" : shopify.status === "error" ? "18:30" : webill.status !== "not_connected" ? "17:00" : "—"}
          lines={[shopify.status === "connected" ? "Shopify, today · next at 19:00" : shopify.status === "error" ? "Shopify failed at 18:45" : webill.status !== "not_connected" ? "WeBill365, today" : "No syncs yet"]}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <IntegrationCard
          provider="shopify"
          name="Shopify"
          kind="Online store"
          status={shopify.status}
          description="Online orders become sales, products are matched to your items by SKU, and payouts are matched to your bank account."
          rows={
            shopify.status === "not_connected"
              ? []
              : [
                  ["Store", `${shopify.store}.myshopify.com`],
                  ["Last sync", shopify.status === "syncing" ? "First sync running" : shopify.status === "error" ? "31 Oct 2026, 18:30" : "31 Oct 2026, 18:45"],
                  ["Orders this month", shopify.status === "syncing" ? "Importing…" : shopify.status === "error" ? "314 · $3,768.20" : "318 · $3,820.00"],
                ]
          }
          footer={
            shopify.status === "error" ? (
              <span className="flex items-center gap-1.5 text-error-fg">
                <TriangleAlert size={14} aria-hidden />
                The last sync failed
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <RefreshCw size={14} aria-hidden />
                {shopify.status === "not_connected" ? "Not set up yet" : `Syncs ${shopify.frequency.toLowerCase()}`}
              </span>
            )
          }
          action={<ButtonLink href="/integrations/shopify" variant={shopify.status === "not_connected" || shopify.status === "error" ? "primary" : "secondary"}>{shopify.status === "not_connected" ? "Connect" : shopify.status === "error" ? "Reconnect" : "Manage"}</ButtonLink>}
        />
        <IntegrationCard
          provider="webill"
          name="WeBill365"
          kind="Bill payments"
          status={webill.status}
          highlight={webill.status === "needs_review"}
          description="Utility and supplier bills paid through WeBill365 are brought in as bills, with their payment status."
          rows={
            webill.status === "not_connected"
              ? []
              : [
                  ["Merchant", "Mekong Mart Co., Ltd."],
                  ["Last sync", "31 Oct 2026, 17:00"],
                  ["Bills this month", reviews ? `16 · ${reviews} to review` : "16", reviews ? "text-warning-fg" : undefined],
                ]
          }
          footer={
            reviews ? (
              <span className="flex items-center gap-1.5 text-warning-fg">
                <TriangleAlert size={14} aria-hidden />
                {reviews} {reviews === 1 ? "bill needs" : "bills need"} your decision
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <RefreshCw size={14} aria-hidden />
                {webill.status === "not_connected" ? "Not set up yet" : "Syncs daily at 17:00"}
              </span>
            )
          }
          action={<ButtonLink href="/integrations/webill365" variant={webill.status === "connected" ? "secondary" : "primary"}>{webill.status === "not_connected" ? "Connect" : reviews ? "Review" : "Manage"}</ButtonLink>}
        />
        <IntegrationCard
          provider="telegram"
          name="Telegram"
          kind="Messaging"
          status={telegram ? "connected" : "not_connected"}
          description="Send invoices and payment reminders to customers, and deliver alerts to you and your Branch Managers."
          rows={
            telegram
              ? [
                  ["Team members linked", `${state.team.filter((t) => t.connected).length} of ${state.team.length}`],
                  ["Customers with Telegram", "20 of 23"],
                  ["Messages this month", "37 alerts · 22 invoices"],
                ]
              : []
          }
          footer={
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} aria-hidden />
              Messages are one-way
            </span>
          }
          action={<ButtonLink href="/integrations/telegram" variant={telegram ? "secondary" : "primary"}>{telegram ? "Manage" : "Connect"}</ButtonLink>}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card aria-labelledby="activity-title" className="h-fit">
          <CardHeader title="Recent sync activity" titleId="activity-title" subtitle="All integrations · last 24 hours" divided />
          <DataTable
            caption="Recent sync activity"
            columns={columns}
            rows={activity}
            rowKey={(a) => a.id}
            minWidth={640}
            empty="No sync activity yet. Connect an integration to start."
            mobileRow={(a) => <MobileRow leading={<ProviderTile provider={a.provider} size={32} />} title={a.what} sub={`${a.time} · ${a.sub}`} value={<IntegrationStatus status={a.result} />} />}
          />
        </Card>
        <Card aria-labelledby="states-title" className="h-fit">
          <CardHeader title="Connection states" titleId="states-title" subtitle="Used on every integration" />
          <dl className="grid grid-cols-[132px_minmax(0,1fr)] gap-x-4 gap-y-4 p-5 text-[13px] leading-5">
            {(
              [
                ["not_connected", "Not set up yet, or disconnected by you."],
                ["connected", "Working. The last sync finished without problems."],
                ["syncing", "A sync is running now. You can keep working."],
                ["needs_review", "Synced, but some records need your decision."],
                ["error", "The last sync failed. No partial records were kept."],
              ] as const
            ).map(([s, text]) => (
              <div key={s} className="contents">
                <dt>
                  <IntegrationStatus status={s} />
                </dt>
                <dd className="text-body">{text}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </Page>
  );
}

function IntegrationCard({
  provider,
  name,
  kind,
  status,
  description,
  rows,
  footer,
  action,
  highlight,
}: {
  provider: "shopify" | "webill" | "telegram";
  name: string;
  kind: string;
  status: IntegrationState;
  description: string;
  rows: [string, string, string?][];
  footer: React.ReactNode;
  action: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && "border-warning/60")} aria-label={name}>
      <div className="flex items-start gap-3 p-5 pb-4">
        <ProviderTile provider={provider} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg leading-7 font-semibold text-fg">{name}</h2>
          <p className="text-[13px] leading-5 text-muted">{kind}</p>
        </div>
        <IntegrationStatus status={status} />
      </div>
      <div className="flex-1 px-5 pb-5">
        <p className="text-sm leading-[22px] text-body">{description}</p>
        {rows.length > 0 && (
          <dl className="mt-4 flex flex-col gap-3 text-sm leading-5">
            {rows.map(([label, value, cls]) => (
              <div key={label} className="flex items-baseline justify-between gap-4">
                <dt className="shrink-0 text-muted">{label}</dt>
                <dd className={cn("min-w-0 text-right break-all text-fg", cls)}>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className={cn("flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13px] leading-5 text-muted", highlight && "bg-warning-subtle/40")}>
        {footer}
        {action}
      </div>
    </Card>
  );
}
