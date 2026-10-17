// Hairline UI · notification-inbox · MIT License
// Copyright (c) 2026 Hairline UI · https://hairlineui.com/license#components

"use client";
"use no memo";

import * as React from "react";
import { Archive, Bell, X } from "lucide-react";
import { NumberRoll } from "./number-roll";
import { RelativeTime, toTime, type DateLike } from "./relative-time";
import { StatusButton, type ActionStatus } from "./status-button";
import { TextMorph } from "./text-morph";
import { useRowMotion } from "./use-row-motion";

/* ─────────────────────────────────────────────────────────
 * NOTIFICATION INBOX: the bell, done properly
 *
 *   arrive    a new notification rings the bell (a short swing
 *             from its top) and the count rolls; if the inbox is
 *             open it fades in on top while the rest glide down
 *   open      the bell's own circle grows into the inbox: size
 *             and corners ease, the bell fades into the list,
 *             and it folds back the same way
 *   tabs      Unread / All, the highlight sliding between them;
 *             Unread counts as you go
 *   read      opening a notification reads it; the dot shrinks,
 *             the title settles to grey, and in Unread the row
 *             folds away a moment later. Mark all read does
 *             them together
 *   archive   the row folds away and the rest glide up
 *   empty     "You're all caught up", with a drawn check
 *
 * Items are plain records; subscribe() feeds new ones from
 * Knock, Novu, Supabase Realtime or your own stream.
 * ───────────────────────────────────────────────────────── */

export type { DateLike };

export interface InboxItem {
  id: string;
  title: string;
  body?: string;
  at: DateLike;
  read?: boolean;
  actor?: { name: string; image?: string };
  /** Where opening it goes. */
  href?: string;
}

export interface NotificationInboxProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  value?: InboxItem[];
  defaultValue?: InboxItem[];
  onValueChange?: (items: InboxItem[]) => void;
  /** Feeds new notifications: call push with one or many; return a function that stops it. */
  subscribe?: (push: (items: InboxItem | InboxItem[]) => void) => () => void;
  /** Saves read state. Throw to put it back. */
  onRead?: (ids: string[], read: boolean) => Promise<unknown> | unknown;
  onArchive?: (ids: string[]) => Promise<unknown> | unknown;
  /** Called when a notification is opened (after it's marked read). */
  onOpen?: (item: InboxItem) => void;
  /** Older notifications, newest first; an empty list means there are no more. */
  loadMore?: (before: InboxItem) => Promise<InboxItem[]>;
  /** Which edge of the bell the inbox lines up with. */
  align?: "end" | "start";
  label?: string;
  defaultOpen?: boolean;
}

type Phase = "closed" | "opening" | "open" | "closing";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const DURATION = 460;
const WIDTH = 384;
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const NONE: InboxItem[] = [];

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

const DAY = 86_400_000;
const groupOf = (at: DateLike) => {
  const t = new Date(toTime(at));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = today.getTime();
  return t.getTime() >= start ? "Today" : t.getTime() >= start - DAY ? "Yesterday" : "Earlier";
};

function Avatar({ item }: { item: InboxItem }) {
  if (item.actor?.image)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.actor.image} alt="" className="size-7 shrink-0 rounded-full object-cover shadow-[0_0_0_1px_var(--border)]" />;
  const letters = (item.actor?.name ?? "•")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-muted-bg text-[10.5px] font-medium text-muted shadow-[inset_0_0_0_1px_var(--border)]">
      {letters}
    </span>
  );
}

interface RowProps {
  item: InboxItem;
  reduced: boolean;
  canArchive: boolean;
  act: React.RefObject<{ open: (i: InboxItem) => void; read: (i: InboxItem, read: boolean) => void; archive: (i: InboxItem) => void }>;
}

const Row = React.memo(function Row({ item, reduced, canArchive, act }: RowProps) {
  const unread = !item.read;
  const Body = item.href ? "a" : "button";
  return (
    <li data-row-id={item.id} className="group relative">
      <Body
        {...(item.href ? { href: item.href } : { type: "button" as const })}
        onClick={() => act.current.open(item)}
        className={`flex w-full cursor-pointer items-start gap-3 rounded-[12px] px-3 py-2.5 pr-16 text-left transition-colors hover:bg-muted-bg/60 ${FOCUS}`}
      >
        <span className="relative mt-0.5">
          <Avatar item={item} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[13px] leading-[1.4] transition-colors duration-500 ${unread ? "font-medium text-fg" : "text-muted"}`}>
            {item.title}
            <span className="sr-only">{unread ? ", unread" : ""}</span>
          </span>
          {item.body && <span className="mt-0.5 line-clamp-2 block text-[12px] leading-[1.45] text-muted">{item.body}</span>}
          <span className="mt-1 block text-[11px] text-muted">
            <RelativeTime date={item.at} />
          </span>
        </span>
      </Body>
      {/* The unread dot doubles as the read / unread toggle; archive sits beside it. */}
      <span className="absolute top-2.5 right-2 flex items-center gap-0.5">
        {canArchive && (
          <button
            type="button"
            aria-label={`Archive “${item.title}”`}
            onClick={() => act.current.archive(item)}
            className={`grid size-7 cursor-pointer place-items-center rounded-full text-muted opacity-0 transition-[opacity,background-color,color] group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-muted-bg hover:text-fg [@media(pointer:coarse)]:opacity-100 ${FOCUS}`}
          >
            <Archive className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          aria-label={unread ? `Mark “${item.title}” read` : `Mark “${item.title}” unread`}
          aria-pressed={!unread}
          onClick={() => act.current.read(item, unread)}
          className={`grid size-7 cursor-pointer place-items-center rounded-full transition-colors hover:bg-muted-bg ${FOCUS}`}
        >
          <span
            aria-hidden="true"
            className={`size-2 rounded-full transition-[transform,background-color,box-shadow] ${unread ? "bg-primary" : "bg-transparent shadow-[inset_0_0_0_1px_var(--border)] group-hover:shadow-[inset_0_0_0_1px_var(--muted-foreground)]"}`}
            style={{ transform: unread ? "scale(1)" : "scale(0.8)", transitionDuration: reduced ? "0ms" : "420ms", transitionTimingFunction: EASE }}
          />
        </button>
      </span>
    </li>
  );
});

export function NotificationInbox({
  value,
  defaultValue = NONE,
  onValueChange,
  subscribe,
  onRead,
  onArchive,
  onOpen,
  loadMore,
  align = "end",
  label = "Inbox",
  defaultOpen = false,
  className = "",
  ...props
}: NotificationInboxProps) {
  const reduced = useReducedMotion();
  const id = React.useId();
  const [inner, setInner] = React.useState(defaultValue);
  const items = value ?? inner;
  const [phase, setPhase] = React.useState<Phase>(defaultOpen ? "open" : "closed");
  const [tab, setTab] = React.useState<"unread" | "all">("unread");
  const [leaving, setLeaving] = React.useState<string[]>([]);
  const [markAll, setMarkAll] = React.useState<ActionStatus>("idle");
  const [loading, setLoading] = React.useState(false);
  const [noMore, setNoMore] = React.useState(!loadMore);
  const [panelHeight, setPanelHeight] = React.useState(0);
  const [fit, setFit] = React.useState({ width: WIDTH, shift: 0 });
  const [announce, setAnnounce] = React.useState("");
  const [bar, setBar] = React.useState({ left: 0, width: 0, ready: false });
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const bellRef = React.useRef<HTMLButtonElement>(null);
  const iconRef = React.useRef<HTMLSpanElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const ghostRef = React.useRef<HTMLDivElement>(null);
  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const timer = React.useRef(0);
  const latest = React.useRef(items);
  latest.current = items;
  const expanded = phase === "open";
  const mounted = phase !== "closed";

  const commit = React.useCallback(
    (next: InboxItem[]) => {
      if (value === undefined) setInner(next);
      onValueChange?.(next);
    },
    [value, onValueChange],
  );

  const unreadCount = items.filter((i) => !i.read).length;
  const shown = items.filter((i) => tab === "all" || !i.read || leaving.includes(i.id));
  const rows: ({ kind: "head"; key: string } | { kind: "item"; item: InboxItem })[] = [];
  let lastGroup = "";
  for (const item of shown) {
    const g = groupOf(item.at);
    if (g !== lastGroup) rows.push({ kind: "head", key: `head-${g}` });
    lastGroup = g;
    rows.push({ kind: "item", item });
  }
  const ranks = React.useMemo(() => new Map(rows.map((r, i) => [r.kind === "head" ? r.key : r.item.id, i])), [rows.map((r) => (r.kind === "head" ? r.key : r.item.id)).join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  useRowMotion(listRef, { reduced, ranks, ghosts: ghostRef, resetKey: tab });

  // New notifications: the bell swings, the count rolls.
  const ring = React.useCallback(() => {
    if (reduced) return;
    iconRef.current?.animate(
      [{ transform: "rotate(0deg)" }, { transform: "rotate(-16deg)" }, { transform: "rotate(13deg)" }, { transform: "rotate(-8deg)" }, { transform: "rotate(4deg)" }, { transform: "rotate(0deg)" }],
      { duration: 720, easing: "ease-out" },
    );
  }, [reduced]);

  React.useEffect(() => {
    if (!subscribe) return;
    return subscribe((incoming) => {
      const list = Array.isArray(incoming) ? incoming : [incoming];
      const fresh = list.filter((n) => !latest.current.some((i) => i.id === n.id));
      if (!fresh.length) return;
      commit([...fresh, ...latest.current]);
      ring();
      setAnnounce(fresh.length === 1 ? `New: ${fresh[0].title}` : `${fresh.length} new notifications`);
    });
  }, [subscribe, commit, ring]);

  const measureFit = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const width = Math.min(WIDTH, vw - 24);
    // Lined up with the bell's edge, nudged back on screen.
    const shift = align === "end" ? Math.max(0, 12 - (r.right - width)) : Math.min(0, vw - 12 - (r.left + width));
    setFit((f) => (f.width === width && f.shift === shift ? f : { width, shift }));
  };

  // Opened from the start: fit it to the screen before the first paint.
  React.useLayoutEffect(() => {
    if (defaultOpen) measureFit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = () => {
    if (phase === "open" || phase === "opening") return;
    window.clearTimeout(timer.current);
    measureFit();
    setPhase(reduced ? "open" : "opening");
  };
  const close = React.useCallback(
    (refocus = true) => {
      window.clearTimeout(timer.current);
      if (refocus) bellRef.current?.focus({ preventScroll: true });
      if (reduced) return setPhase("closed");
      setPhase("closing");
      timer.current = window.setTimeout(() => setPhase("closed"), DURATION);
    },
    [reduced],
  );

  React.useEffect(() => {
    if (phase !== "opening") return;
    let inner = 0;
    const outer = requestAnimationFrame(() => (inner = requestAnimationFrame(() => setPhase("open"))));
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [phase]);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  React.useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const measure = () => setPanelHeight(panel.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [mounted]);

  React.useLayoutEffect(() => {
    const b = tabRefs.current[tab];
    if (!b) return;
    setBar((p) => (p.left === b.offsetLeft && p.width === b.offsetWidth ? p : { left: b.offsetLeft, width: b.offsetWidth, ready: p.width > 0 }));
  }, [tab, mounted, unreadCount]);

  React.useEffect(() => {
    if (expanded) tabRefs.current[tab]?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  React.useEffect(() => {
    if (!expanded) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [expanded, close]);

  const setRead = async (ids: string[], read: boolean) => {
    const before = latest.current;
    commit(before.map((i) => (ids.includes(i.id) ? { ...i, read } : i)));
    if (read && tab === "unread") {
      // Read rows stay a moment in Unread, then fold away.
      setLeaving((l) => [...l, ...ids]);
      window.setTimeout(() => setLeaving((l) => l.filter((x) => !ids.includes(x))), 900);
    }
    try {
      await onRead?.(ids, read);
    } catch {
      commit(latest.current.map((i) => (ids.includes(i.id) ? { ...i, read: !read } : i)));
      setAnnounce("That change couldn't be saved.");
    }
  };

  const act = React.useRef<RowProps["act"]["current"]>(null!);
  act.current = {
    open: (item) => {
      if (!item.read) setRead([item.id], true);
      onOpen?.(item);
    },
    read: (item, read) => {
      setRead([item.id], read);
      setAnnounce(read ? "Marked read." : "Marked unread.");
    },
    archive: async (item) => {
      const before = latest.current;
      commit(before.filter((i) => i.id !== item.id));
      setAnnounce("Archived.");
      try {
        await onArchive?.([item.id]);
      } catch {
        commit([item, ...latest.current].sort((a, b) => toTime(b.at) - toTime(a.at)));
        setAnnounce("That couldn't be archived.");
      }
    },
  };

  const readAll = async () => {
    const ids = latest.current.filter((i) => !i.read).map((i) => i.id);
    if (!ids.length) return;
    setMarkAll("pending");
    try {
      await setRead(ids, true);
      setMarkAll("success");
      setAnnounce("All marked read.");
    } catch {
      setMarkAll("error");
    }
  };

  const more = async () => {
    const last = latest.current[latest.current.length - 1];
    if (!loadMore || !last || loading) return;
    setLoading(true);
    try {
      const older = await loadMore(last);
      if (!older.length) setNoMore(true);
      else commit([...latest.current, ...older.filter((o) => !latest.current.some((i) => i.id === o.id))]);
    } finally {
      setLoading(false);
    }
  };

  const width = expanded ? fit.width : 36;
  const height = expanded ? panelHeight : 36;
  const empty = !shown.length;

  return (
    <div
      ref={wrapRef}
      className={`relative inline-flex ${className}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && expanded) {
          e.preventDefault();
          close();
        }
      }}
      {...props}
    >
      <button
        ref={bellRef}
        type="button"
        aria-label={`${label}${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        aria-controls={mounted ? `${id}-panel` : undefined}
        onClick={() => (expanded ? close() : open())}
        className={`relative grid size-9 cursor-pointer place-items-center rounded-full text-fg shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-muted-bg ${FOCUS}`}
      >
        <span ref={iconRef} className="grid origin-top place-items-center">
          <Bell className="size-4" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-white tabular-nums shadow-[0_0_0_2px_var(--background)]"
          // Hidden while the inbox is open: the count is in the Unread tab then.
          style={{ transform: unreadCount && !mounted ? "scale(1)" : "scale(0)", transition: reduced ? "none" : `transform 380ms ${unreadCount && !mounted ? "cubic-bezier(0.34,1.36,0.64,1)" : EASE}` }}
        >
          <NumberRoll value={Math.min(99, unreadCount || 1)} />
        </span>
      </button>

      {mounted && (
        <div
          id={`${id}-panel`}
          role="dialog"
          aria-label={label}
          className="absolute top-0 z-40 overflow-hidden bg-surface text-fg"
          style={{
            [align === "end" ? "right" : "left"]: expanded ? (align === "end" ? -fit.shift : fit.shift) : 0,
            width,
            height,
            borderRadius: expanded ? 20 : 18,
            boxShadow: "inset 0 0 0 1px var(--border)",
            transition: reduced ? "none" : `width ${DURATION}ms ${EASE}, height ${DURATION}ms ${EASE}, right ${DURATION}ms ${EASE}, left ${DURATION}ms ${EASE}, border-radius ${DURATION}ms ${EASE}`,
          }}
        >
          {/* The bell, fading as its circle grows into the inbox. */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute top-0 grid size-9 place-items-center ${align === "end" ? "right-0" : "left-0"}`}
            style={{ opacity: expanded ? 0 : 1, transition: reduced ? "none" : `opacity ${expanded ? 140 : 260}ms ${EASE} ${expanded ? 0 : 140}ms` }}
          >
            <Bell className="size-4" strokeWidth={1.75} />
          </span>

          <div
            ref={panelRef}
            inert={!expanded}
            className={`absolute top-0 ${align === "end" ? "right-0" : "left-0"}`}
            style={{ width: fit.width, opacity: expanded ? 1 : 0, transition: reduced ? "none" : `opacity ${expanded ? 280 : 120}ms ${EASE} ${expanded ? 100 : 0}ms` }}
          >
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <div role="tablist" aria-label={label} className="relative flex items-center gap-0.5">
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-0 h-7 rounded-full bg-muted-bg shadow-[inset_0_0_0_1px_var(--border)]"
                  style={{ width: bar.width, transform: `translateX(${bar.left}px)`, transition: bar.ready && !reduced ? `transform 360ms ${EASE}, width 360ms ${EASE}` : "none" }}
                />
                {(["unread", "all"] as const).map((t) => (
                  <button
                    key={t}
                    ref={(el) => {
                      tabRefs.current[t] = el;
                    }}
                    role="tab"
                    aria-selected={tab === t}
                    tabIndex={tab === t ? 0 : -1}
                    onClick={() => setTab(t)}
                    onKeyDown={(e) => {
                      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                      e.preventDefault();
                      const next = t === "unread" ? "all" : "unread";
                      setTab(next);
                      tabRefs.current[next]?.focus();
                    }}
                    className={`relative inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors ${FOCUS} ${tab === t ? "text-fg" : "text-muted hover:text-fg"}`}
                  >
                    {t === "unread" ? "Unread" : "All"}
                    {t === "unread" && (
                      <span className="text-[11.5px] font-normal text-muted tabular-nums">
                        <NumberRoll value={unreadCount} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <span className="ml-auto" />
              {onRead && (
                <StatusButton
                  size="sm"
                  variant="ghost"
                  status={markAll}
                  labels={{ idle: "Mark all read", pending: "Marking", success: "All read", error: "Try again" }}
                  onClick={readAll}
                  onReset={() => setMarkAll("idle")}
                  aria-disabled={(!unreadCount && markAll === "idle") || undefined}
                  className={!unreadCount && markAll === "idle" ? "pointer-events-none opacity-40" : ""}
                />
              )}
              <button
                type="button"
                aria-label={`Close ${label.toLowerCase()}`}
                onClick={() => close()}
                className={`grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-muted-bg hover:text-fg ${FOCUS}`}
              >
                <X className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[min(26rem,calc(100dvh_-_10rem))] overflow-y-auto overscroll-contain px-1.5 pb-1.5" role="tabpanel">
              <div className="relative">
                <ul ref={listRef} aria-label={tab === "unread" ? "Unread notifications" : "All notifications"} className="relative">
                  {rows.map((r) =>
                    r.kind === "head" ? (
                      <li key={r.key} data-row-id={r.key} aria-hidden="true" className="px-3 pt-2 pb-1 text-[11px] font-medium text-muted">
                        {r.key.slice(5)}
                      </li>
                    ) : (
                      <Row key={r.item.id} item={r.item} reduced={reduced} canArchive={Boolean(onArchive)} act={act} />
                    ),
                  )}
                </ul>
                <div ref={ghostRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />
              </div>

              <div
                className="grid"
                style={{ gridTemplateRows: empty ? "1fr" : "0fr", opacity: empty ? 1 : 0, transition: reduced ? "none" : `grid-template-rows 420ms ${EASE}, opacity 300ms ${EASE} ${empty ? 120 : 0}ms` }}
              >
                <div className="min-h-0 min-w-0 overflow-clip">
                  <div className="flex flex-col items-center gap-2 py-9 text-center">
                    <span className="grid size-9 place-items-center rounded-full text-emerald-600 shadow-[inset_0_0_0_1px_var(--border)] dark:text-emerald-400">
                      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4">
                        <path
                          d="M3.5 8.5 6.5 11.5 12.5 4.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          pathLength={1}
                          strokeDasharray={1}
                          style={{ strokeDashoffset: empty && expanded ? 0 : 1, transition: reduced ? "none" : `stroke-dashoffset 480ms ${EASE} 260ms` }}
                        />
                      </svg>
                    </span>
                    <p className="text-[13px] font-medium">{tab === "unread" ? "You're all caught up" : "Nothing here yet"}</p>
                    <p className="text-[12px] text-muted">{tab === "unread" ? "New notifications will show up here." : "When something happens, you'll hear about it here."}</p>
                  </div>
                </div>
              </div>

              {loadMore && !noMore && tab === "all" && !empty && (
                <div className="flex justify-center py-1.5">
                  <button type="button" onClick={more} aria-busy={loading || undefined} className={`h-7 cursor-pointer rounded-full px-3 text-[12px] font-medium text-muted transition-colors hover:bg-muted-bg hover:text-fg ${FOCUS}`}>
                    <TextMorph>{loading ? "Loading" : "Show older"}</TextMorph>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <span className="sr-only" role="status">
        {announce}
      </span>
    </div>
  );
}
