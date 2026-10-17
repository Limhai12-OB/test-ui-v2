"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NotificationInbox, type InboxItem } from "@/components/hairline/notification-inbox";
import { useNotifications } from "./notification-shared";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** The demo's "now": 31 Oct 2026, 19:00. */
const DEMO_NOW = Date.parse("2026-10-31T19:00:00");

/** "Today, 08:00", "Yesterday, 11:05" or "29 Oct 2026, 08:00" → a time on the demo's calendar. */
function demoTime(label: string) {
  const [day, clock = "09:00"] = label.split(/,\s*/);
  const [h, m] = clock.split(":").map(Number);
  let date = new Date(DEMO_NOW);
  if (/^yesterday$/i.test(day)) date = new Date(DEMO_NOW - 864e5);
  else if (!/^today$/i.test(day)) {
    const [d, mon, y] = day.split(" ");
    date = new Date(Number(y), MONTHS.indexOf(mon), Number(d));
  }
  date.setHours(h || 9, m || 0, 0, 0);
  return date.getTime();
}

/**
 * Top-bar bell (14.1) as the Hairline UI notification inbox: the bell grows
 * into the inbox, the unread count rolls, and items can be marked read or
 * archived. Times are shown relative to the demo's today, 31 Oct 2026.
 */
export function NotificationBell({ firstRun }: { firstRun?: boolean }) {
  const { list, setRead } = useNotifications();
  const router = useRouter();
  const [archived, setArchived] = useState<string[]>([]);
  // Relative times ("2h ago") are measured from the real clock, so shift the demo calendar onto it.
  const [offset] = useState(() => Date.now() - DEMO_NOW);

  const items = useMemo<InboxItem[]>(
    () =>
      firstRun
        ? []
        : list
            .filter((n) => !archived.includes(n.id))
            .map((n) => ({
              id: n.id,
              title: n.title,
              body: n.branch ? `${n.body} · ${n.branch}` : n.body,
              at: new Date(demoTime(n.time) + offset),
              read: !n.unread,
              actor: { name: n.branch || "LuyFlow" },
              href: n.href,
            })),
    [list, archived, firstRun, offset],
  );

  return (
    <NotificationInbox
      value={items}
      onRead={(ids, read) => ids.forEach((id) => setRead(id, read))}
      onArchive={(ids) => setArchived((a) => [...a, ...ids])}
      onOpen={(item) => item.href && router.push(item.href)}
      align="end"
      label="Notifications"
      className="shrink-0"
    />
  );
}
