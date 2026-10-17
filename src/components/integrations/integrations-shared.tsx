"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Restricted } from "@/components/admin/restricted";
import { StatusPill } from "@/components/finance/common";
import { TelegramTile } from "@/components/notifications/telegram";
import { cn } from "@/lib/format";
import { useSession } from "@/lib/session";

export type IntegrationState = "not_connected" | "connected" | "syncing" | "needs_review" | "error" | "running" | "completed" | "failed";

export function IntegrationStatus({ status }: { status: IntegrationState }) {
  switch (status) {
    case "connected":
      return <StatusPill tone="success">Connected</StatusPill>;
    case "completed":
      return <StatusPill tone="success">Completed</StatusPill>;
    case "syncing":
      return <StatusPill tone="sky">Syncing</StatusPill>;
    case "running":
      return <StatusPill tone="sky">Running</StatusPill>;
    case "needs_review":
      return <StatusPill tone="warning">Needs Review</StatusPill>;
    case "error":
      return <StatusPill tone="error">Error</StatusPill>;
    case "failed":
      return <StatusPill tone="error">Failed</StatusPill>;
    default:
      return (
        <StatusPill tone="neutral" className="border border-line-strong bg-surface">
          Not Connected
        </StatusPill>
      );
  }
}

/** Lettered provider tiles from the Figma cards. */
export function ProviderTile({ provider, size = 56 }: { provider: "shopify" | "webill" | "telegram"; size?: 32 | 56 }) {
  if (provider === "telegram") return <TelegramTile size={size === 56 ? 56 : 32} />;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold text-white",
        provider === "shopify" ? "bg-[#2e7d32]" : "bg-[#c2410c]",
        size === 56 ? "size-14 rounded-xl text-lg" : "size-8 rounded-md text-xs",
      )}
    >
      {provider === "shopify" ? "S" : "WB"}
    </span>
  );
}

/** Branch Managers see frame 15.9 on every Integrations screen. */
export function OwnerOnlyIntegrations({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  if (user?.role !== "manager") return <>{children}</>;
  return (
    <Restricted
      title="Integrations"
      heading="Integrations are managed by the Business Owner"
      footer={
        <Link href="/notifications/telegram" className="focus-ring mx-auto flex max-w-[420px] items-center gap-3 rounded-lg border border-line px-4 py-3.5 text-left hover:bg-subtle">
          <TelegramTile size={40} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm leading-5 font-medium text-fg">Link your own Telegram for alerts</span>
            <span className="block text-[13px] leading-5 text-muted">Available to every user in notification preferences</span>
          </span>
          <ArrowRight size={16} className="text-icon" aria-hidden />
        </Link>
      }
    >
      Connections to Shopify, WeBill365 and Telegram affect the whole business, so only Sokha Chan can set them up or change them. Sales and bills that arrive through them still
      appear in your branch records.
    </Restricted>
  );
}

/** Label / value rows used in the cards and the "Connection" panel. */
export function KeyValues({ rows, labelWidth = 146 }: { rows: [string, React.ReactNode, string?][]; labelWidth?: number }) {
  return (
    <dl className="grid gap-x-4 gap-y-3 text-sm leading-5" style={{ gridTemplateColumns: `${labelWidth}px minmax(0,1fr)` }}>
      {rows.map(([label, value, cls]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className={cn("min-w-0 text-fg [overflow-wrap:anywhere]", cls)}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "Orders → Sales" table of what a connection brings in. */
export function SyncedTable({ rows }: { rows: [string, string, string, string][] }) {
  return (
    <ul className="flex flex-col px-5 pb-3">
      {rows.map(([what, where, href, note]) => (
        <li key={what} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-line-subtle py-4 last:border-b-0 md:grid-cols-[150px_200px_minmax(0,1fr)]">
          <span className="text-sm leading-5 font-medium text-fg">{what}</span>
          <Link href={href} className="focus-ring inline-flex items-center gap-3 justify-self-end rounded-xs text-sm leading-5 font-medium text-brand hover:underline md:justify-self-start">
            <ArrowRight size={16} className="text-icon" aria-hidden />
            {where}
          </Link>
          <span className="col-span-2 text-[13px] leading-5 text-muted md:col-span-1">{note}</span>
        </li>
      ))}
    </ul>
  );
}
