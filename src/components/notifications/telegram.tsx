"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Copy, Info, LoaderCircle, Send, ShieldCheck, Timer, Unlink, Users } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { StatusPill } from "@/components/finance/common";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, CardLink } from "@/components/ui/card";
import { useToast } from "@/components/ui/overlay";
import { Notice, Page, PageHeader } from "@/components/ui/page";
import { mmss, useAdmin } from "@/lib/admin-store";
import { cn } from "@/lib/format";
import { ALERT_TYPES } from "@/lib/mock/admin-data";
import { useSession } from "@/lib/session";
import { AlertGlyph } from "./notification-shared";

const CODE_SECONDS = 582;

/** Telegram blue tile with the paper-plane glyph. */
export function TelegramTile({ size = 36 }: { size?: 32 | 36 | 40 | 56 }) {
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-md bg-[#0088cc] text-white", { 32: "size-8", 36: "size-9", 40: "size-10", 56: "size-14 rounded-xl" }[size])}>
      <Send size={size === 56 ? 26 : size === 40 ? 20 : 17} />
    </span>
  );
}

/** Bot message preview used in 14.6 and 14.7. */
function BotPreview({ khmer }: { khmer?: boolean }) {
  return (
    <div className="rounded-xl bg-muted-bg/70 p-4">
      <div className="flex items-center gap-2.5">
        <TelegramTile size={32} />
        <div>
          <p className="text-[13px] leading-[18px] font-medium text-fg">LuyFlow Alerts</p>
          <p className="text-xs leading-4 text-muted">bot</p>
        </div>
      </div>
      <div className={cn("mt-2 rounded-xl border border-line bg-surface p-3.5", khmer && "font-khmer")}>
        <p className="text-[15px] leading-[22px] font-semibold text-fg">{khmer ? "វិក្កយបត្រហួសកាលកំណត់" : "Invoice overdue"}</p>
        <p className="mt-1.5 text-[13px] leading-5 text-body">INV-2026-0142 · Angkor Wholesale Trading</p>
        <p className="mt-1.5 text-[13px] leading-5 text-body">{khmer ? "សមតុល្យ $1,250.00 · ហួស 8 ថ្ងៃ" : "Balance $1,250.00 · 8 days overdue"}</p>
        <p className="mt-3 rounded-md bg-primary-subtle py-2 text-center text-[13px] leading-5 font-medium text-brand">{khmer ? "បើកក្នុង LuyFlow" : "Open in LuyFlow"}</p>
        <p className="mt-1.5 text-right text-[11px] leading-[14px] text-muted">08:00</p>
      </div>
    </div>
  );
}

/** A small QR-style pattern. It is decorative: the demo has no real bot to link to. */
function QrPattern() {
  const n = 21;
  const cells: [number, number][] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      if (finder) continue;
      if ((x * 7 + y * 13 + x * y) % 5 < 2) cells.push([x, y]);
    }
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} fill="currentColor" />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="white" />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill="currentColor" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="size-[176px] text-fg" shapeRendering="crispEdges" aria-hidden>
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + 0.1} y={y + 0.1} width={0.8} height={0.8} fill="currentColor" />
      ))}
      {finder(0, 0)}
      {finder(14, 0)}
      {finder(0, 14)}
    </svg>
  );
}

export function TelegramAlerts() {
  const { state } = useAdmin();
  return state.telegram.linked ? <Connected /> : <Connect />;
}

function Connect() {
  const { update } = useAdmin();
  const toast = useToast();
  const [code, setCode] = useState("482 913");
  const [left, setLeft] = useState(CODE_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    ["Open the LuyFlow Alerts bot", "Scan the QR code with your phone camera, or search for @LuyFlowAlertsBot in Telegram."],
    ["Press Start in the chat", "The bot will ask for your one-time code."],
    ["Send this code to the bot", "It links the chat to your LuyFlow account and expires in 10 minutes."],
  ];

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Notifications", href: "/notifications" }, { label: "Telegram alerts" }]}
        title="Telegram alerts"
        badges={<StatusPill tone="neutral" className="border border-line-strong bg-surface">Not Connected</StatusPill>}
        subtitle="Get your LuyFlow alerts as Telegram messages. Nothing in LuyFlow can be changed from Telegram."
        actions={
          <ButtonLink href="/notifications/preferences" variant="secondary" icon={ArrowLeft}>
            Back to preferences
          </ButtonLink>
        }
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="h-fit">
          <CardHeader title="Connect your Telegram account" subtitle="Takes about a minute. You need Telegram on your phone." />
          <div className="flex flex-col-reverse gap-6 p-5 md:flex-row">
            <div className="min-w-0 flex-1">
              <ol className="flex flex-col gap-5">
                {steps.map(([title, sub], index) => (
                  <li key={title} className="flex gap-4">
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-medium text-white">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm leading-5 font-medium text-fg">{title}</p>
                      <p className="mt-0.5 text-[13px] leading-5 text-muted">{sub}</p>
                      {index === 2 && (
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span className={cn("inline-flex h-12 items-center rounded-md border border-dashed border-line-strong bg-subtle px-4 text-xl font-semibold tracking-wide", left ? "text-fg" : "text-muted line-through")}>{code}</span>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Copy}
                            disabled={!left}
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(code.replace(" ", ""));
                                toast({ title: "Code copied", body: "Paste it in the chat with @LuyFlowAlertsBot." });
                              } catch {
                                toast({ title: "Could not copy", body: "Copy the code by hand.", tone: "error" });
                              }
                            }}
                          >
                            Copy
                          </Button>
                          <span className="inline-flex items-center gap-1.5 text-[13px] leading-5 text-muted" aria-live="polite">
                            <Timer size={14} aria-hidden />
                            {left ? `Expires in ${mmss(left)}` : "Code expired"}
                          </span>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              {left ? (
                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-icon-info/25 bg-info-subtle px-4 py-3">
                  <LoaderCircle size={16} className="animate-spin text-icon-info" aria-hidden />
                  <span className="flex-1 text-sm leading-5 text-info-fg">Waiting for your code in Telegram…</span>
                  <button
                    type="button"
                    onClick={() => {
                      update((s) => {
                        s.telegram.linked = true;
                        s.telegram.linkedOn = "31 Oct 2026";
                        s.prefs.telegramOn = true;
                      });
                      toast({ title: "Telegram connected", body: "Alerts you turned on for Telegram now go to this chat." });
                    }}
                    className="focus-ring cursor-pointer rounded-xs text-sm leading-5 font-medium text-brand hover:underline"
                  >
                    I sent it
                  </button>
                </div>
              ) : (
                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning-subtle px-4 py-3">
                  <span className="flex-1 text-sm leading-5 text-warning-fg">The code expired before it was used.</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setCode(`${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`);
                      setLeft(600);
                    }}
                  >
                    Get a new code
                  </Button>
                </div>
              )}
              <p className="mt-3 text-xs leading-4 text-muted">There is no Telegram bot behind this demo: “I sent it” links the account in this browser only.</p>
            </div>
            <div className="flex shrink-0 flex-col items-center self-start rounded-lg border border-line p-4">
              <QrPattern />
              <p className="mt-2 text-[13px] leading-5 text-muted">Scan to open the bot</p>
            </div>
          </div>
        </Card>
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="What a Telegram alert looks like" />
            <div className="p-5">
              <BotPreview />
            </div>
          </Card>
          <Card>
            <CardHeader title="Good to know" />
            <ul className="flex flex-col gap-3 p-5 text-sm leading-5 text-body">
              <li className="flex gap-3">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-icon" aria-hidden />
                Alerts contain record numbers and amounts, never passwords or bank details.
              </li>
              <li className="flex gap-3">
                <Users size={16} className="mt-0.5 shrink-0 text-icon" aria-hidden />
                Branch Managers link their own Telegram and only get alerts for their branch.
              </li>
              <li className="flex gap-3">
                <Unlink size={16} className="mt-0.5 shrink-0 text-icon" aria-hidden />
                You can disconnect at any time. Messages already sent stay in your chat.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </Page>
  );
}

function Connected() {
  const { state, update } = useAdmin();
  const { user } = useSession();
  const owner = user?.role === "owner";
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const types = ALERT_TYPES.filter((t) => owner || !t.ownerOnly);
  const on = types.filter((t) => state.prefs.alerts[t.key].telegram);
  const ordered = [...on, ...types.filter((t) => !state.prefs.alerts[t.key].telegram)];

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Notifications", href: "/notifications" }, { label: "Telegram alerts" }]}
        title="Telegram alerts"
        badges={<StatusPill tone="success">Connected</StatusPill>}
        subtitle="Get your LuyFlow alerts as Telegram messages. Nothing in LuyFlow can be changed from Telegram."
        actions={
          <>
            <Button variant="secondary" icon={Send} onClick={() => toast({ title: "Test message sent", body: `Sent to ${state.telegram.handle} on Telegram. (Simulated in this demo.)` })}>
              Send test message
            </Button>
            <Button variant="secondary" icon={Unlink} onClick={() => setConfirm(true)}>
              Disconnect
            </Button>
          </>
        }
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <div className="flex flex-wrap items-start gap-4 border-b border-line p-5">
              <TelegramTile size={56} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-lg leading-7 font-semibold text-fg">
                  {state.profile.name}
                  <StatusPill tone="success">Connected</StatusPill>
                </p>
                <p className="text-sm leading-5 text-muted">
                  {state.telegram.handle} · linked {state.telegram.linkedOn}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[13px] leading-5 text-muted">Last alert delivered</p>
                <p className="text-sm leading-5 font-medium text-fg">{state.telegram.lastDelivered}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
              {[
                ["Alert types on Telegram", `${on.length} of ${types.length}`],
                ["Quiet hours", state.prefs.quiet ? `${state.prefs.quietFrom} – ${state.prefs.quietUntil}` : "Off"],
                ["Language", state.prefs.language === "Khmer" ? "ខ្មែរ" : "English"],
                ["Delivered this month", `${state.telegram.delivered} alerts`],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[13px] leading-5 text-muted">{label}</dt>
                  <dd className="mt-0.5 text-[15px] leading-[22px] font-semibold text-fg">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <CardHeader title="Alerts sent to Telegram" subtitle="Shown for reference. Change them in notification preferences." actions={<CardLink href="/notifications/preferences">Edit preferences</CardLink>} />
            <ul className="flex flex-col px-5 pt-2 pb-3">
              {ordered.map((t) => {
                const active = state.prefs.alerts[t.key].telegram;
                const title = !owner && t.managerTitle ? t.managerTitle : t.title;
                return (
                  <li key={t.key} className="flex items-center gap-3 border-b border-line-subtle py-3 last:border-b-0">
                    <AlertGlyph icon={t.icon} className={active ? "text-brand" : "text-icon"} />
                    <span className={cn("flex-1 text-sm leading-5", active ? "text-fg" : "text-muted")}>{title}</span>
                    {active ? <StatusPill tone="success">On</StatusPill> : <StatusPill tone="neutral" className="border border-line-strong bg-surface">Off</StatusPill>}
                  </li>
                );
              })}
            </ul>
          </Card>
          <Notice tone="neutral" icon={<Info size={18} aria-hidden />} title="Alerts only">
            Messages link back to LuyFlow. Payments, sign-offs and edits always happen in the app.
          </Notice>
        </div>
        <Card className="h-fit">
          <CardHeader title="Preview" subtitle="English and Khmer versions of the same alert" />
          <div className="flex flex-col gap-4 p-5">
            <BotPreview />
            <BotPreview khmer />
          </div>
        </Card>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        id="disconnect-title"
        icon={<Unlink size={20} aria-hidden />}
        title="Disconnect Telegram?"
        confirmLabel="Disconnect"
        confirmVariant="danger"
        focusCancel
        onConfirm={() => {
          update((s) => {
            s.telegram.linked = false;
          });
          setConfirm(false);
          toast({ title: "Telegram disconnected", body: "Alerts now appear in the app and by email only." });
        }}
      >
        Alerts stop going to {state.telegram.handle}. Messages already sent stay in your chat. You can connect again at any time.
      </ConfirmDialog>
    </Page>
  );
}
