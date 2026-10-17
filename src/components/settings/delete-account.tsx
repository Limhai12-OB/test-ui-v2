"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, Download, FileText, LogOut, Plug, ReceiptText, Trash2, TriangleAlert } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox, TextField } from "@/components/ui/fields";
import { useToast } from "@/components/ui/overlay";
import { Notice } from "@/components/ui/page";
import { useAdmin } from "@/lib/admin-store";
import { billBalance, billStatus, useFinance } from "@/lib/finance-store";
import { cn, downloadCsv, money } from "@/lib/format";
import { DEMO_PASSWORD } from "@/lib/mock/auth";
import { invoiceBalance, invoiceStatus, invoiceTotal, useOps } from "@/lib/ops-store";
import { useSession } from "@/lib/session";
import { SectionHeader } from "./settings-shell";

export function DeleteAccount() {
  const { state } = useAdmin();
  const ops = useOps().state;
  const finance = useFinance().state;
  const { user, signOut } = useSession();
  const owner = user?.role === "owner";
  const router = useRouter();
  const toast = useToast();
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [sure, setSure] = useState(false);
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState(false);
  const [exported, setExported] = useState(false);

  const business = state.business.tradingName;
  const target = owner ? business : state.profile.email;
  const matches = typed.trim() === target;
  const ready = matches && password.length > 0 && sure;
  const managers = state.managers.filter((m) => m.status === "active").length;

  const scope = (branch: string) => owner || branch === user?.branch;
  const openInvoices = ops.invoices.filter((i) => scope(i.branch) && ["sent", "partial", "overdue"].includes(invoiceStatus(i)));
  const openBills = finance.bills.filter((b) => scope(b.branch) && ["open", "partial", "overdue"].includes(billStatus(b)));
  const invTotal = openInvoices.reduce((s, i) => s + invoiceBalance(i), 0);
  const billTotal = openBills.reduce((s, b) => s + (b.currency === "KHR" ? billBalance(b) / 4100 : billBalance(b)), 0);
  const integrations = [state.shopify.status !== "not_connected" && "Shopify", state.webill.status !== "not_connected" && "WeBill365", state.telegramBusiness && "Telegram"].filter(Boolean) as string[];

  const exportAll = () => {
    downloadCsv(`${business.toLowerCase().replace(/\s+/g, "-")}-records.csv`, [
      ["Record", "Number", "Party", "Branch", "Date", "Currency", "Total", "Status"],
      ...ops.invoices.filter((i) => scope(i.branch)).map((i) => ["Invoice", i.id, ops.customers.find((c) => c.id === i.customerId)?.name ?? "", i.branch, i.issued, i.currency, invoiceTotal(i).toFixed(2), invoiceStatus(i)]),
      ...finance.bills.filter((b) => scope(b.branch)).map((b) => ["Bill", b.id, b.supplier, b.branch, b.billDate, b.currency, b.lines.reduce((s, l) => s + l.qty * l.price, 0).toFixed(2), billStatus(b)]),
    ]);
    setExported(true);
    toast({ title: "Export downloaded", body: "Invoices and bills as a CSV file. PDFs and statements need the export service, which is not connected in this demo." });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    if (password !== DEMO_PASSWORD) return setError("The password is not correct.");
    setConfirm(true);
  };

  return (
    <>
      <SectionHeader
        title="Delete account"
        subtitle={owner ? `Deleting the Business Owner account closes ${business} in LuyFlow for everyone.` : `Deleting your account removes your access to ${business}. Your records stay with the business.`}
      />
      {owner ? (
        <Notice tone="error" icon={<CircleAlert size={18} aria-hidden />} title="This affects the whole business">
          You are the Business Owner. Deleting your account closes the business workspace, removes access for {managers} Branch Managers and schedules all records for permanent deletion.
        </Notice>
      ) : (
        <Notice tone="warning" icon={<TriangleAlert size={18} aria-hidden />} title="Your records stay with Mekong Mart">
          Sales, bills and counts you recorded stay in the business. Sokha Chan can invite you again later with the same email.
        </Notice>
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="Before you delete" />
            <ul className="px-5 pb-2">
              <Row
                icon={<Download size={18} aria-hidden />}
                tile="bg-primary-subtle text-brand"
                title="Export your data"
                sub={`Download every record as spreadsheets. Last export: ${exported ? "today" : "never"}.`}
                action={
                  <Button variant="secondary" size="sm" icon={Download} onClick={exportAll}>
                    Export all data
                  </Button>
                }
              />
              <Row icon={<FileText size={18} aria-hidden />} tile="bg-warning-subtle text-icon-warning" title={`${openInvoices.length} open invoices · ${money(invTotal)}`} sub="Customers still owe this. After deletion you can no longer record payments here." action={<ViewLink href="/sales/invoices" />} />
              <Row icon={<ReceiptText size={18} aria-hidden />} tile="bg-warning-subtle text-icon-warning" title={`${openBills.length} unpaid bills · ${money(billTotal)}`} sub="Make sure you have a copy of what you owe." action={<ViewLink href="/financial-records/bills" />} />
              {owner && (
                <Row
                  icon={<Plug size={18} aria-hidden />}
                  tile="bg-warning-subtle text-icon-warning"
                  title={`${integrations.length} connected integrations`}
                  sub={integrations.length ? `All ${integrations.length === 3 ? "three" : integrations.length} will be disconnected: ${integrations.join(", ").replace(/, ([^,]*)$/, " and $1")}.` : "Nothing is connected."}
                  action={<ViewLink href="/integrations" />}
                />
              )}
            </ul>
          </Card>
          <Card className="border-error/30">
            <CardHeader title="Confirm deletion" />
            <form onSubmit={submit} noValidate className="flex flex-col gap-4 p-5">
              <p className="text-sm leading-[22px] text-body">
                {owner ? "Type the business name to confirm that you want to close it and delete your account." : "Type your email to confirm that you want to delete your account."}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField size="md" label={`Type “${target}”`} placeholder={target} value={typed} onChange={(e) => setTyped(e.target.value)} state={typed && matches ? "success" : "default"} message={typed && matches ? (owner ? "Name matches." : "Email matches.") : undefined} autoComplete="off" />
                <TextField
                  size="md"
                  label="Your password"
                  password
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(undefined);
                  }}
                  state={error ? "error" : "default"}
                  message={error}
                />
              </div>
              <Checkbox checked={sure} onChange={setSure}>
                {owner ? "I understand everything is deleted after 30 days" : "I understand I lose access to Mekong Mart"}
              </Checkbox>
              <div className="flex flex-wrap justify-end gap-3">
                <ButtonLink href="/settings" variant="secondary">
                  Cancel
                </ButtonLink>
                <Button type="submit" variant="danger" icon={Trash2} disabled={!ready}>
                  {owner ? "Delete account and close business" : "Delete my account"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="h-fit">
            <CardHeader title="What happens" />
            <dl className="flex flex-col gap-3 p-5 text-sm leading-5">
              {(owner
                ? [
                    ["Today", `The business is closed. The ${managers} Branch Managers are signed out and can no longer sign in.`],
                    ["For 30 days", "Only you, the Business Owner, can still sign in: to cancel the deletion or to export data. Nothing else can be changed."],
                    ["After 30 Nov 2026", "All records, files and backups are deleted. This cannot be undone."],
                  ]
                : [
                    ["Today", "You are signed out on every device and can no longer sign in."],
                    ["Your records", "Everything you recorded stays with Mekong Mart under your name."],
                    ["Later", "Sokha Chan can invite you again with the same email."],
                  ]
              ).map(([title, text]) => (
                <div key={title}>
                  <dt className="font-medium text-fg">{title}</dt>
                  <dd className="mt-0.5 text-muted">{text}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="h-fit">
            <CardHeader title="Not what you wanted?" />
            <div className="flex flex-col gap-3 p-5">
              {owner && (
                <ButtonLink href="/branches" variant="secondary" className="w-full">
                  Deactivate a branch instead
                </ButtonLink>
              )}
              <Button
                variant="secondary"
                icon={LogOut}
                className="w-full"
                onClick={() => {
                  signOut();
                  router.push("/sign-in");
                }}
              >
                Sign out
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        id="delete-final"
        tone="error"
        icon={<TriangleAlert size={20} aria-hidden />}
        title={owner ? "Delete account and close business?" : "Delete your account?"}
        cancelLabel="Keep my account"
        confirmLabel={owner ? "Delete and close business" : "Delete my account"}
        confirmVariant="danger"
        onConfirm={() => {
          setConfirm(false);
          toast({
            title: "Nothing was deleted",
            body: "Deleting an account needs the backend, which this frontend does not have. Your demo data is unchanged.",
            tone: "error",
          });
        }}
      >
        {owner
          ? `${business} closes now and ${managers} Branch Managers lose access. Records are kept until 30 Nov 2026 and are then permanently deleted. Until then only you can sign in, to cancel the deletion.`
          : "You are signed out everywhere and can no longer open Mekong Mart. Your records stay with the business."}
      </ConfirmDialog>
    </>
  );
}

function Row({ icon, tile, title, sub, action }: { icon: React.ReactNode; tile: string; title: string; sub: string; action: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-start gap-4 border-b border-line-subtle py-4 last:border-b-0 sm:flex-nowrap">
      <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-md", tile)}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-5 font-medium text-fg">{title}</span>
        <span className="block text-[13px] leading-5 text-muted">{sub}</span>
      </span>
      <span className="ml-14 shrink-0 self-center sm:ml-0">{action}</span>
    </li>
  );
}

function ViewLink({ href }: { href: string }) {
  return (
    <Link href={href} className="focus-ring inline-flex items-center gap-1 rounded-xs text-sm leading-5 font-medium text-brand hover:underline">
      View
      <ArrowRight size={14} aria-hidden />
    </Link>
  );
}
