"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCheck, ChevronRight, MessageSquare, RefreshCw, Repeat, Send, Settings, Banknote, X, ExternalLink } from "lucide-react";
import { StatusPill } from "@/components/finance/common";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterMenu, SearchInput } from "@/components/ui/filters";
import { Drawer } from "@/components/ui/overlay";
import { Page, PageHeader, ScopeNotice, Tabs } from "@/components/ui/page";
import { cn } from "@/lib/format";
import type { AlertType, Notification } from "@/lib/mock/admin-data";
import { useSession } from "@/lib/session";
import { AlertTile, ChannelsCard, daysAgo, TYPE_ICON, TYPE_LABEL, useNotifications } from "./notification-shared";

const GROUPS: { day: Notification["day"]; label: string }[] = [
  { day: "today", label: "Today · 31 Oct 2026" },
  { day: "yesterday", label: "Yesterday · 30 Oct 2026" },
  { day: "earlier", label: "Earlier" },
  { day: "older", label: "Older" },
];

const DATE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

export function NotificationCenter() {
  const { user } = useSession();
  const owner = user?.role === "owner";
  const { list, unread, setRead, markAll } = useNotifications();
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState<string | null>(null);
  const [range, setRange] = useState<string | null>("30");
  const [openId, setOpenId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const paramOpen = params.get("open");
  const currentId = openId ?? (paramOpen && paramOpen !== dismissed ? paramOpen : null);
  const opened = list.find((n) => n.id === currentId) ?? null;

  const types: AlertType[] = owner ? ["financial", "stock", "signoff", "cash", "reports", "system"] : ["financial", "stock", "signoff", "reports", "system"];
  const inRange = (n: Notification) => !range || range === "all" || daysAgo(n) <= Number(range);
  const base = list.filter((n) => inRange(n) && (!branch || n.branch === branch) && (!query.trim() || `${n.title} ${n.body}`.toLowerCase().includes(query.trim().toLowerCase())));
  const rows = base.filter((n) => tab === "all" || (tab === "unread" ? n.unread : n.type === tab));
  const hasOlder = list.some((n) => !inRange(n));
  const branches = useMemo(() => [...new Set(list.map((n) => n.branch).filter(Boolean))], [list]);

  const open = (n: Notification) => {
    if (n.unread) setRead(n.id);
    setOpenId(n.id);
  };
  const close = () => {
    setOpenId(null);
    if (paramOpen) {
      setDismissed(paramOpen);
      router.replace("/notifications");
    }
  };

  const unreadByType = types.map((t) => ({ type: t, count: list.filter((n) => n.unread && n.type === t).length })).filter((x) => x.count > 0);

  return (
    <Page>
      <PageHeader
        title="Notifications"
        subtitle={owner ? "Alerts about money owed, stock, sign-offs, cash and reports. Each one links to the record it is about." : `Alerts for ${user?.branch ?? "Toul Kork"} Branch. Each one links to the record it is about.`}
        actions={
          <>
            <Button variant="secondary" icon={CheckCheck} onClick={markAll} disabled={!unread}>
              Mark all as read
            </Button>
            <ButtonLink href="/notifications/preferences" variant="secondary" icon={Settings}>
              Preferences
            </ButtonLink>
          </>
        }
      />
      {!owner && <ScopeNotice branch={user?.branch ?? "Toul Kork"} className="mt-6" />}
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <Card className="min-w-0 h-fit">
          <Tabs
            label="Notification types"
            className="px-5"
            value={tab}
            onChange={setTab}
            items={[
              { id: "all", label: "All", count: base.length },
              { id: "unread", label: "Unread", count: base.filter((n) => n.unread).length },
              ...types.map((t) => ({ id: t, label: TYPE_LABEL[t] })),
            ]}
          />
          {tab === "unread" && unread === 0 ? (
            <div className="flex flex-col items-center px-6 py-20 text-center">
              <span className="inline-flex size-14 items-center justify-center rounded-full bg-muted-bg text-icon-strong">
                <CheckCheck size={22} aria-hidden />
              </span>
              <h2 className="mt-4 text-base leading-6 font-semibold text-fg">You’re all caught up</h2>
              <p className="mt-1 max-w-[360px] text-sm leading-[22px] text-muted">
                All {list.length} notifications are marked as read. New alerts will appear here and on the bell in the top bar.
              </p>
              <Button className="mt-5" onClick={() => setTab("all")}>
                View all notifications
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
                <SearchInput value={query} onChange={setQuery} placeholder="Search notifications" />
                {owner && <FilterMenu label="Branch" value={branch} onChange={setBranch} options={branches.map((b) => ({ value: b, label: b }))} />}
                <FilterMenu label="Date" icon="calendar" value={range} onChange={setRange} options={DATE_OPTIONS} />
              </div>
              {rows.length ? (
                <ul aria-label="Notifications">
                  {GROUPS.map((group) => {
                    const items = rows.filter((n) => n.day === group.day);
                    if (!items.length) return null;
                    return (
                      <Fragment key={group.day}>
                        <li className="border-b border-line bg-subtle px-5 py-2.5 text-overline text-muted">{group.label}</li>
                        {items.map((n) => (
                          <li key={n.id} className="border-b border-line-subtle last:border-b-0">
                            <button
                              type="button"
                              onClick={() => open(n)}
                              className={cn(
                                "focus-ring flex w-full cursor-pointer items-start gap-4 px-5 py-4 text-left hover:bg-subtle",
                                n.unread && "bg-primary-subtle/60 hover:bg-primary-subtle",
                              )}
                            >
                              <AlertTile icon={n.icon} />
                              <span className="min-w-0 flex-1">
                                <span className="block text-[15px] leading-[22px] font-medium text-fg">{n.title}</span>
                                <span className="block text-sm leading-5 text-body">{n.body}</span>
                                <span className="mt-0.5 block text-[13px] leading-5 text-muted">
                                  {n.time}
                                  {n.branch && ` · ${n.branch}`}
                                </span>
                              </span>
                              {n.unread && (
                                <span className="mt-2 size-2 shrink-0 rounded-full bg-primary">
                                  <span className="sr-only">Unread</span>
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </Fragment>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-5 py-14 text-center text-sm leading-5 text-muted">No notifications match these filters.</p>
              )}
              <div className="border-t border-line px-5 py-4 text-center">
                {hasOlder ? (
                  <button type="button" onClick={() => setRange("all")} className="focus-ring cursor-pointer rounded-xs text-sm leading-5 font-medium text-brand hover:underline">
                    Load older notifications
                  </button>
                ) : (
                  <p className="text-[13px] leading-5 text-muted">No older notifications.</p>
                )}
              </div>
            </>
          )}
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          <Card aria-labelledby="by-type-title">
            <h2 id="by-type-title" className="px-5 pt-5 text-base leading-6 font-semibold text-fg">
              Unread by type
            </h2>
            {unreadByType.length ? (
              <ul className="flex flex-col px-5 pt-2 pb-3">
                {unreadByType.map(({ type, count }) => (
                  <li key={type} className="border-b border-line-subtle last:border-b-0">
                    <button type="button" onClick={() => setTab(type)} className="focus-ring flex w-full cursor-pointer items-center gap-3 rounded-md py-2.5 text-left hover:bg-subtle">
                      <AlertTile icon={TYPE_ICON[type]} size={32} />
                      <span className="flex-1 text-sm leading-5 text-fg">{TYPE_LABEL[type]}</span>
                      <span className="tabular text-sm leading-5 text-fg">{count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-start gap-3 px-5 pt-3 pb-5">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-success-subtle text-icon-success">
                  <CheckCheck size={16} aria-hidden />
                </span>
                <span>
                  <span className="block text-sm leading-5 font-medium text-fg">Nothing unread</span>
                  <span className="block text-[13px] leading-5 text-muted">New alerts are counted here by type.</span>
                </span>
              </div>
            )}
          </Card>
          <ChannelsCard />
        </div>
      </div>

      <Drawer open={Boolean(opened)} onClose={close} labelledBy="alert-title">
        {opened && <AlertDetails n={opened} onClose={close} onUnread={() => {
              setRead(opened.id, false);
              close();
            }} />}
      </Drawer>
    </Page>
  );
}

const STEP_ICON = { send: Send, payment: Banknote, ai: MessageSquare, open: ExternalLink };

/** 14.3 Notification details drawer. */
function AlertDetails({ n, onClose, onUnread }: { n: Notification; onClose: () => void; onUnread: () => void }) {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-6 py-4">
        <p className="min-w-0 flex-1 truncate text-[13px] leading-5 text-muted">
          {TYPE_LABEL[n.type]} alert · {n.time}
          {n.branch && ` · ${n.branch}`}
        </p>
        <button type="button" onClick={onClose} aria-label="Close" className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg">
          <X size={18} aria-hidden />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="flex gap-4">
          <AlertTile icon={n.icon} size={44} />
          <div className="min-w-0">
            <h2 id="alert-title" className="text-lg leading-7 font-semibold text-fg">
              {n.lead ?? n.title}
            </h2>
            <p className="mt-1 text-sm leading-[22px] text-body">{n.detail ?? n.body}</p>
          </div>
        </div>

        {n.record && (
          <div className="mt-6 rounded-lg border border-line bg-subtle px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={n.href} className="focus-ring rounded-xs text-sm leading-5 font-medium text-brand hover:underline">
                {n.record.ref}
              </Link>
              {n.record.status && <StatusPill tone={n.record.status.tone}>{n.record.status.label}</StatusPill>}
              <span className="ml-auto text-[13px] leading-5 text-muted">{n.record.kind}</span>
            </div>
            <dl className="mt-3 grid grid-cols-[132px_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm leading-5">
              {n.record.rows.map(([label, value, tone]) => (
                <Fragment key={label}>
                  <dt className="text-muted">{label}</dt>
                  <dd className={cn(tone === "error" ? "text-error-fg" : tone === "success" ? "text-success-fg" : "text-fg")}>{value}</dd>
                </Fragment>
              ))}
            </dl>
          </div>
        )}

        {n.steps && (
          <section className="mt-6" aria-labelledby="steps-title">
            <h3 id="steps-title" className="text-sm leading-5 font-semibold text-fg">
              Suggested next steps
            </h3>
            <ul className="mt-2.5 flex flex-col gap-2.5">
              {n.steps.map((step) => {
                const Icon = STEP_ICON[step.icon];
                return (
                  <li key={step.label}>
                    <Link href={step.href} className="focus-ring flex items-center gap-3 rounded-md border border-line px-4 py-3 text-sm leading-5 font-medium text-fg hover:bg-subtle">
                      <Icon size={18} className="shrink-0 text-brand" aria-hidden />
                      <span className="flex-1">{step.label}</span>
                      <ChevronRight size={16} className="text-icon" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {n.history && (
          <section className="mt-6" aria-labelledby="history-title">
            <h3 id="history-title" className="text-sm leading-5 font-semibold text-fg">
              Alert history
            </h3>
            <ol className="mt-3 flex flex-col">
              {n.history.map((h, index) => (
                <li key={h.title} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < n.history!.length - 1 && <span aria-hidden className="absolute top-8 bottom-1 left-[13px] w-0.5 bg-line" />}
                  <span className="relative inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-info-subtle text-icon-info">
                    {h.icon === "send" ? <Send size={14} aria-hidden /> : <RefreshCw size={14} aria-hidden />}
                  </span>
                  <span className="pt-0.5">
                    <span className="block text-sm leading-5 font-medium text-fg">{h.title}</span>
                    <span className="block text-xs leading-4 text-muted">{h.meta}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {n.repeat && (
          <p className="mt-6 flex items-center gap-2 text-[13px] leading-5 text-muted">
            <Repeat size={14} aria-hidden />
            <span className="flex-1">{n.repeat}</span>
            <Link href="/notifications/preferences" className="focus-ring rounded-xs font-medium text-brand hover:underline">
              Change
            </Link>
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-6 py-4">
        <button type="button" onClick={onUnread} className="focus-ring mr-auto cursor-pointer rounded-xs px-2 text-sm leading-5 font-medium text-brand hover:underline">
          Mark unread
        </button>
        {n.secondary && (
          <ButtonLink href={n.secondary.href} variant="secondary">
            {n.secondary.label}
          </ButtonLink>
        )}
        <ButtonLink href={n.href} iconRight={ArrowRight}>
          {n.hrefLabel}
        </ButtonLink>
      </div>
    </>
  );
}
