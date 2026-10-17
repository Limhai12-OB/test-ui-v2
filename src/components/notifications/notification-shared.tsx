"use client";

import Link from "next/link";
import { ArrowRight, Bell, CalendarClock, CloudUpload, FileChartColumn, Mail, Package, ReceiptText, Scale, Send, Target, TriangleAlert, Banknote } from "lucide-react";
import { StatusPill } from "@/components/finance/common";
import { Card } from "@/components/ui/card";
import { useAdmin } from "@/lib/admin-store";
import { cn } from "@/lib/format";
import type { AlertIcon, AlertType, Notification } from "@/lib/mock/admin-data";
import { useSession } from "@/lib/session";

const ICONS: Record<AlertIcon | "target", { icon: typeof Bell; tone: string }> = {
  scale: { icon: Scale, tone: "bg-primary-subtle text-brand" },
  upload: { icon: CloudUpload, tone: "bg-info-subtle text-icon-info" },
  package: { icon: Package, tone: "bg-warning-subtle text-icon-warning" },
  invoice: { icon: ReceiptText, tone: "bg-error-subtle text-icon-error" },
  alert: { icon: TriangleAlert, tone: "bg-error-subtle text-icon-error" },
  payment: { icon: Banknote, tone: "bg-success-subtle text-icon-success" },
  bill: { icon: CalendarClock, tone: "bg-warning-subtle text-icon-warning" },
  report: { icon: FileChartColumn, tone: "bg-ai-subtle text-icon-ai" },
  target: { icon: Target, tone: "bg-info-subtle text-icon-info" },
};

export function AlertTile({ icon, size = 36, muted }: { icon: AlertIcon | "target"; size?: 32 | 36 | 44; muted?: boolean }) {
  const { icon: Icon, tone } = ICONS[icon];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md",
        muted ? "bg-muted-bg text-icon" : tone,
        size === 44 ? "size-11" : size === 36 ? "size-9" : "size-8",
      )}
    >
      <Icon size={size === 44 ? 22 : 18} />
    </span>
  );
}

export function AlertGlyph({ icon, className }: { icon: AlertIcon | "target"; className?: string }) {
  const { icon: Icon } = ICONS[icon];
  return <Icon size={18} className={className} aria-hidden />;
}

export const TYPE_LABEL: Record<AlertType, string> = {
  financial: "Financial",
  stock: "Stock",
  signoff: "Sign-off",
  cash: "Cash",
  reports: "Reports",
  system: "System",
};

export const TYPE_ICON: Record<AlertType, AlertIcon> = {
  financial: "invoice",
  stock: "package",
  signoff: "scale",
  cash: "alert",
  reports: "report",
  system: "upload",
};

/** Days before 31 Oct 2026 that a notification time refers to. */
export function daysAgo(n: Notification) {
  if (n.day === "today") return 0;
  if (n.day === "yesterday") return 1;
  const match = n.time.match(/^(\d{1,2}) (\w{3}) (\d{4})/);
  if (!match) return 2;
  const date = Date.parse(`${match[1]} ${match[2]} ${match[3]} UTC`);
  return Math.round((Date.parse("2026-10-31T00:00:00Z") - date) / 864e5);
}

/** Bell, list and drawer share this: the signed-in user's notifications. */
export function useNotifications() {
  const { state, update } = useAdmin();
  const list = state.notifications;
  const unread = list.filter((n) => n.unread).length;
  const setRead = (id: string, read = true) =>
    update((draft) => {
      const n = draft.notifications.find((x) => x.id === id);
      if (n) n.unread = !read;
    });
  const markAll = () =>
    update((draft) => {
      draft.notifications.forEach((n) => (n.unread = false));
    });
  return { list, unread, setRead, markAll };
}

/** "Where alerts are sent" (14.2, 14.4, 14.8). */
export function ChannelsCard() {
  const { state } = useAdmin();
  const { user } = useSession();
  const owner = user?.role === "owner";
  const telegramTypes = Object.entries(state.prefs.alerts).filter(([key, p]) => p.telegram && (owner || (key !== "cash" && key !== "budget"))).length;
  return (
    <Card aria-labelledby="channels-title">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 id="channels-title" className="text-base leading-6 font-semibold text-fg">
          Where alerts are sent
        </h2>
        <Link href="/notifications/preferences" className="focus-ring inline-flex items-center gap-1 rounded-xs text-[13px] leading-[18px] font-medium text-brand hover:underline">
          Manage
          <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      <ul className="flex flex-col px-5 pt-2 pb-4">
        <ChannelRow icon={<Bell size={18} aria-hidden />} tile="bg-primary-subtle text-brand" title="In the app" sub="Always on for every alert type" status={<StatusPill tone="success">On</StatusPill>} />
        <ChannelRow
          icon={<Send size={18} aria-hidden />}
          tile="bg-[#0088cc] text-white"
          title="Telegram"
          href="/notifications/telegram"
          sub={state.telegram.linked ? `${state.telegram.handle} · ${telegramTypes} alert types` : "Not linked yet"}
          status={state.telegram.linked && state.prefs.telegramOn ? <StatusPill tone="success">Connected</StatusPill> : <StatusPill tone="neutral">{state.telegram.linked ? "Paused" : "Not Connected"}</StatusPill>}
        />
        <ChannelRow
          icon={<Mail size={18} aria-hidden />}
          tile="bg-muted-bg text-icon-strong"
          title="Email"
          sub={state.profile.email}
          status={state.prefs.emailOn ? <StatusPill tone="sky">{state.prefs.dailySummary ? "Daily" : "On"}</StatusPill> : <StatusPill tone="neutral">Off</StatusPill>}
        />
      </ul>
    </Card>
  );
}

function ChannelRow({ icon, tile, title, sub, status, href }: { icon: React.ReactNode; tile: string; title: string; sub: string; status: React.ReactNode; href?: string }) {
  const body = (
    <>
      <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-md", tile)}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 text-sm leading-5 font-medium text-fg">
          {title}
          {status}
        </span>
        <span className="block text-[13px] leading-5 break-words text-muted">{sub}</span>
      </span>
    </>
  );
  return (
    <li className="border-b border-line-subtle py-3 last:border-b-0">
      {href ? (
        <Link href={href} className="focus-ring flex items-start gap-3 rounded-md hover:bg-subtle">
          {body}
        </Link>
      ) : (
        <div className="flex items-start gap-3">{body}</div>
      )}
    </li>
  );
}
