"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, ChevronRight, CircleCheck, Info, ReceiptText, Send, Unlink } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { StatusPill } from "@/components/finance/common";
import { TelegramTile } from "@/components/notifications/telegram";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, MobileRow, type Column } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/flow";
import { ModalBody, ModalFooter, ModalHeader, useToast } from "@/components/ui/overlay";
import { Notice, Page, PageHeader } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat";
import { useAdmin } from "@/lib/admin-store";
import { initialsOf } from "@/lib/format";
import { ALERT_TYPES, type TeamLink } from "@/lib/mock/admin-data";
import { IntegrationStatus, KeyValues } from "./integrations-shared";

const NO_TELEGRAM = [
  { id: "sovann-guesthouse", name: "Sovann Guesthouse" },
  { id: "phsar-leu", name: "Phsar Leu Traders" },
  { id: "kampot-pepper-house", name: "Kampot Pepper House" },
];

export function TelegramIntegration() {
  const { state, update } = useAdmin();
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [viewing, setViewing] = useState<TeamLink | null>(null);
  const linked = state.team.filter((t) => t.connected).length;

  if (!state.telegramBusiness) {
    return (
      <Page>
        <PageHeader breadcrumbs={[{ label: "Integrations", href: "/integrations" }, { label: "Telegram" }]} title="Telegram" badges={<IntegrationStatus status="not_connected" />} subtitle="Messaging · invoices to customers and alerts to your team" />
        <Card className="mt-6 max-w-[720px] p-6">
          <div className="flex items-start gap-4">
            <TelegramTile size={56} />
            <div className="min-w-0 flex-1">
              <h2 className="text-base leading-6 font-semibold text-fg">Connect the Mekong Mart bot</h2>
              <p className="mt-1 text-sm leading-[22px] text-muted">Send invoices and reminders to customers on Telegram, and let your team link their own accounts for alerts.</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  icon={Send}
                  onClick={() => {
                    update((s) => {
                      s.telegramBusiness = true;
                    });
                    toast({ title: "Telegram connected", body: "@MekongMartBot can send invoices and alerts again." });
                  }}
                >
                  Connect Telegram
                </Button>
                <span className="text-xs leading-4 text-muted">Simulated in this demo.</span>
              </div>
            </div>
          </div>
        </Card>
      </Page>
    );
  }

  const columns: Column<TeamLink>[] = [
    {
      key: "person",
      header: "Person",
      width: "40%",
      cell: (t) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar initials={initialsOf(t.name)} />
          <div className="min-w-0">
            <p className="truncate text-[13px] leading-5 font-medium text-fg">{t.name}</p>
            <p className="truncate text-xs leading-4 text-muted">{t.role}</p>
          </div>
        </div>
      ),
    },
    { key: "telegram", header: "Telegram", width: "24%", cell: (t) => (t.connected ? <StatusPill tone="success">Connected</StatusPill> : t.invited ? <StatusPill tone="sky">Invite sent</StatusPill> : <IntegrationStatus status="not_connected" />) },
    { key: "types", header: "Alert types", width: "16%", cell: (t) => <span className="text-fg">{t.types}</span> },
    {
      key: "action",
      header: "Action",
      srHeader: true,
      align: "right",
      cell: (t) =>
        t.connected ? (
          <button
            type="button"
            onClick={() => (t.id === "sokha" ? router.push("/notifications/telegram") : setViewing(t))}
            className="focus-ring cursor-pointer rounded-xs text-[13px] leading-5 font-medium text-brand hover:underline"
          >
            View
          </button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              update((s) => {
                const row = s.team.find((x) => x.id === t.id);
                if (row) row.invited = true;
              });
              toast({ title: "Invite sent", body: `${t.name} got a link to connect Telegram. (Simulated in this demo.)` });
            }}
          >
            {t.invited ? "Send again" : "Send invite"}
          </Button>
        ),
    },
  ];

  const messages = [
    { key: "invoices" as const, icon: ReceiptText, title: "Invoices", sub: "Sent as a PDF with a short message when you choose Telegram in “Send invoice”." },
    { key: "reminders" as const, icon: BellRing, title: "Payment reminders", sub: "Sent only when you press “Send reminder”. Never automatic." },
    { key: "receipts" as const, icon: CircleCheck, title: "Payment receipts", sub: "A confirmation message when you record a payment." },
  ];

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Integrations", href: "/integrations" }, { label: "Telegram" }]}
        title="Telegram"
        badges={<IntegrationStatus status="connected" />}
        subtitle="Messaging · invoices to customers and alerts to your team"
        actions={
          <>
            <Button variant="secondary" icon={Send} onClick={() => toast({ title: "Test message sent", body: "Sent to @sokha_mekongmart from @MekongMartBot. (Simulated in this demo.)" })}>
              Send test message
            </Button>
            <Button variant="secondary" icon={Unlink} onClick={() => setConfirm(true)}>
              Disconnect
            </Button>
          </>
        }
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Team members linked" value={`${linked} of ${state.team.length}`} lines={["Each person links their own account"]} />
        <StatCard label="Customers with Telegram" value="20 of 23" lines={["Others receive invoices by email"]} />
        <StatCard label="Invoices sent · October" value={22} lines={["19 opened · 3 reminders sent"]} />
        <StatCard label="Alerts delivered · October" value={37} lines={[`To ${linked} team members`]} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card aria-labelledby="team-title">
            <CardHeader title="Team alerts" titleId="team-title" subtitle="Who receives LuyFlow alerts on Telegram. People only get alerts for the branches they can see." divided />
            <DataTable
              caption="Team alerts"
              columns={columns}
              rows={state.team}
              rowKey={(t) => t.id}
              minWidth={620}
              mobileRow={(t) => <MobileRow leading={<Avatar initials={initialsOf(t.name)} />} title={t.name} sub={t.role} value={t.connected ? "Connected" : t.invited ? "Invite sent" : "Not Connected"} valueSub={t.types} />}
            />
          </Card>
          <Card aria-labelledby="customer-title">
            <CardHeader title="Customer messages" titleId="customer-title" subtitle="What customers can receive from Mekong Mart on Telegram." />
            <ul className="flex flex-col px-5 pt-2 pb-3">
              {messages.map((m) => (
                <li key={m.key} className="flex items-center gap-4 border-b border-line-subtle py-3.5 last:border-b-0">
                  <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-brand">
                    <m.icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-5 font-medium text-fg">{m.title}</span>
                    <span className="block text-[13px] leading-5 text-muted">{m.sub}</span>
                  </span>
                  <Switch
                    label={m.title}
                    checked={state.customerMessages[m.key]}
                    onChange={(v) => {
                      update((s) => {
                        s.customerMessages[m.key] = v;
                      });
                      toast({ title: `${m.title} ${v ? "turned on" : "turned off"}`, body: v ? "Customers with Telegram can receive them." : "Customers will not get these on Telegram." });
                    }}
                  />
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="h-fit">
            <CardHeader title="Connection" />
            <div className="p-5">
              <KeyValues
                rows={[
                  ["Business account", "Mekong Mart · @MekongMartBot"],
                  ["Connected by", "Sokha Chan · 6 Mar 2026"],
                  ["Message language", "Customer’s preferred language"],
                  ["Sender name", "Mekong Mart"],
                ]}
              />
            </div>
          </Card>
          <Card className="h-fit">
            <CardHeader
              title="Customers without Telegram"
              badge={<span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted-bg px-1.5 text-xs font-medium text-body">{NO_TELEGRAM.length}</span>}
              subtitle="Add a Telegram contact on the customer record to send invoices there."
            />
            <ul className="flex flex-col px-5 pt-2 pb-3">
              {NO_TELEGRAM.map((c) => (
                <li key={c.id} className="border-b border-line-subtle last:border-b-0">
                  <Link href={`/sales/customers/${c.id}`} className="focus-ring flex items-center gap-3 rounded-md py-3 hover:bg-subtle">
                    <Avatar initials={initialsOf(c.name)} />
                    <span className="flex-1 text-sm leading-5 font-medium text-fg">{c.name}</span>
                    <span className="text-[13px] leading-5 text-muted">Email only</span>
                    <ChevronRight size={16} className="text-icon" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Notice tone="neutral" icon={<Info size={18} aria-hidden />} title="Messages are one-way">
            Customers and staff cannot change invoices, payments or records by replying on Telegram.
          </Notice>
        </div>
      </div>

      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} labelledBy="person-alerts" width={480}>
        {viewing && (
          <>
            <ModalHeader id="person-alerts" title={`${viewing.name} on Telegram`} description={`${viewing.role} · ${viewing.types} alert types`} icon={<Send size={20} aria-hidden />} onClose={() => setViewing(null)} />
            <ModalBody>
              <ul className="flex flex-col gap-2.5 text-sm leading-5">
                {ALERT_TYPES.filter((t) => !t.ownerOnly).map((t, i) => (
                  <li key={t.key} className="flex items-center justify-between gap-3">
                    <span className="text-fg">{t.managerTitle ?? t.title}</span>
                    {i < 5 ? <StatusPill tone="success">On</StatusPill> : <StatusPill tone="neutral">Off</StatusPill>}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[13px] leading-5 text-muted">Each person chooses their own alert types. You can see them here but not change them.</p>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setViewing(null)}>
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </Dialog>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        id="tg-disconnect"
        icon={<Unlink size={20} aria-hidden />}
        title="Disconnect Telegram for Mekong Mart?"
        confirmLabel="Disconnect"
        confirmVariant="danger"
        focusCancel
        onConfirm={() => {
          update((s) => {
            s.telegramBusiness = false;
          });
          setConfirm(false);
          toast({ title: "Telegram disconnected", body: "Invoices and reminders go by email only." });
        }}
      >
        Invoices and reminders stop going to customers on Telegram, and your team stops getting alerts there. Messages already sent stay in the chats.
      </ConfirmDialog>
    </Page>
  );
}
