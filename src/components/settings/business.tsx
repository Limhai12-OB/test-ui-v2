"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Calendar, Check, Coins, Info, Lock, Mail, MapPin, Pencil, Phone, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { StatusPill } from "@/components/finance/common";
import { StatusButton, type ActionStatus } from "@/components/hairline/status-button";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextAreaField, TextField } from "@/components/ui/fields";
import { Switch } from "@/components/ui/flow";
import { ModalBody, ModalFooter, ModalHeader, useToast } from "@/components/ui/overlay";
import { Notice } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat";
import { branchManager, useAdmin } from "@/lib/admin-store";
import { cn, fmtDate, initialsOf, money, TODAY } from "@/lib/format";
import type { BusinessProfile, CurrencySettings } from "@/lib/mock/admin-data";
import { useSession } from "@/lib/session";
import { OwnerOnlySection, SectionHeader } from "./settings-shell";
import { readImage } from "./upload";

const TYPES = ["Retail · mini-marts and wholesale", "Retail · single shop", "Wholesale and distribution", "Restaurant or café", "Services"];
const VAT = /^[A-Z]\d{3}-\d{9}$/;
const PHONE = /^\+855\d{8,9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function BusinessLogo({ business, size = 72 }: { business: BusinessProfile; size?: 72 }) {
  return business.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={business.logo} alt={`${business.tradingName} logo`} className="size-[72px] shrink-0 rounded-xl border border-line bg-surface object-contain p-1" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className="inline-flex size-[72px] shrink-0 items-center justify-center rounded-xl bg-[#0f766e] text-2xl font-semibold text-white">
      {initialsOf(business.tradingName)}
    </span>
  );
}

export const currentRate = (c: CurrencySettings) => c.history.find((r) => r.from <= TODAY) ?? c.history[c.history.length - 1];

/* ---------- 17.8 / 17.16 Business profile ---------- */

export function BusinessProfileView() {
  const { state } = useAdmin();
  const { user } = useSession();
  const owner = user?.role === "owner";
  const b = state.business;
  const rate = currentRate(state.currency);
  const active = state.branches.filter((x) => x.status === "active");
  const inactive = state.branches.filter((x) => x.status === "deactivated");
  const managers = state.managers;
  const myBranch = state.branches.find((x) => x.name === (user?.branch ?? "Toul Kork"));

  const rows = (items: [string, React.ReactNode][], width = 132) => (
    <dl className="grid gap-x-4 gap-y-3 text-sm leading-5" style={{ gridTemplateColumns: `${width}px minmax(0,1fr)` }}>
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="min-w-0 break-words text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <>
      <SectionHeader
        title="Business profile"
        subtitle="These details appear on invoices, reports and exports."
        action={
          owner ? (
            <ButtonLink href="/settings/business/edit" variant="secondary" icon={Pencil}>
              Edit business profile
            </ButtonLink>
          ) : (
            <Button variant="secondary" icon={Lock} disabled title="Only the Business Owner can edit this">
              Edit business profile
            </Button>
          )
        }
      />
      {!owner && (
        <Notice tone="neutral" icon={<Info size={18} aria-hidden />} title="View only" className="mb-6">
          Business settings are managed by Sokha Chan (Business Owner). Ask them if something here needs changing.
        </Notice>
      )}
      <Card>
        <div className="flex flex-wrap items-start gap-4 border-b border-line p-5">
          <BusinessLogo business={b} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-xl leading-7 font-semibold text-fg">
              {b.tradingName}
              <StatusPill tone="success">Active</StatusPill>
            </p>
            <p className="mt-0.5 text-sm leading-5 text-muted">
              {b.legalName} · {b.type}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[13px] leading-5 text-muted">Using LuyFlow since</p>
            <p className="text-sm leading-5 font-medium text-fg">1 Mar 2026</p>
          </div>
        </div>
        <div className="grid gap-x-10 gap-y-3 p-5 md:grid-cols-2">
          {rows([
            ["Legal name", b.legalName],
            ["Trading name", b.tradingName],
            ["Name in Khmer", <span key="k" className="font-khmer">{b.khmerName || "—"}</span>],
            ["Registration no.", b.registration],
            ["VAT TIN", b.vat],
          ])}
          {rows([
            ["Address", b.address],
            ["Phone", b.phone],
            ["Email", b.email],
            ["Business Owner", "Sokha Chan"],
          ])}
        </div>
      </Card>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Financial defaults"
            actions={
              owner ? (
                <Link href="/settings/currency" className="focus-ring inline-flex items-center gap-1 rounded-xs text-[13px] leading-[18px] font-medium text-brand hover:underline">
                  Currency settings
                  <ArrowRight size={14} aria-hidden />
                </Link>
              ) : undefined
            }
          />
          <div className="p-5">
            {rows(
              [
                ["Base currency", "USD · United States dollar"],
                ["Second currency", "KHR · Cambodian riel"],
                ["Display rate", `${rate.rate.toLocaleString("en-US")} KHR per USD`],
                ["Financial year starts", "1 January"],
                ["Invoice payment terms", "14 days"],
                ["Invoice numbering", "INV-2026-0001"],
              ],
              170,
            )}
          </div>
        </Card>
        {owner ? (
          <Card>
            <CardHeader
              title="Branches and team"
              actions={
                <Link href="/branches" className="focus-ring inline-flex items-center gap-1 rounded-xs text-[13px] leading-[18px] font-medium text-brand hover:underline">
                  Manage
                  <ArrowRight size={14} aria-hidden />
                </Link>
              }
            />
            <div className="p-5">
              {rows(
                [
                  ["Active branches", `${active.length} · ${active.map((x) => x.name).join(", ")}`],
                  ["Deactivated", inactive.length ? `${inactive.length} · ${inactive.map((x) => x.name).join(", ")}` : "None"],
                  ["Branch Managers", `${managers.filter((m) => m.status === "active").length} active · ${managers.filter((m) => m.status === "invited").length} invited`],
                ],
                146,
              )}
            </div>
          </Card>
        ) : (
          <Card>
            <CardHeader title="Your branch" />
            <div className="p-5">
              {rows(
                [
                  ["Branch", myBranch?.name ?? "Toul Kork"],
                  ["Address", myBranch?.address ?? "—"],
                  ["Phone", myBranch?.phone ?? "—"],
                  ["Branch Manager", `${(myBranch && branchManager(state, myBranch.id)?.name) ?? user?.name} (you)`],
                ],
                146,
              )}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

/* ---------- 17.9 Edit business profile ---------- */

export function EditBusinessProfile() {
  const { state, update } = useAdmin();
  const { user, signIn } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<BusinessProfile>(() => ({ ...state.business }));
  const [errors, setErrors] = useState<Partial<Record<keyof BusinessProfile, string>>>({});
  const [logoError, setLogoError] = useState<string>();
  const [saveStatus, setSaveStatus] = useState<ActionStatus>("idle");
  const fileRef = useRef<HTMLInputElement>(null);
  if (user?.role !== "owner") return <OwnerOnlySection title="Business settings" />;

  const set = (patch: Partial<BusinessProfile>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors({});
  };
  const vatValid = VAT.test(form.vat.trim().toUpperCase());

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (saveStatus === "pending") return;
    const next: typeof errors = {};
    if (!form.legalName.trim()) next.legalName = "Enter the registered legal name.";
    if (!form.tradingName.trim()) next.tradingName = "Enter the name customers know you by.";
    if (form.vat.trim() && !vatValid) next.vat = "VAT TINs look like L001-901456782.";
    if (!form.address.trim()) next.address = "Enter the business address.";
    if (!PHONE.test(form.phone.replace(/[\s-]/g, ""))) next.phone = "Enter a Cambodian number, for example +855 23 880 142.";
    if (!EMAIL.test(form.email.trim())) next.email = "Enter a valid email address.";
    setErrors(next);
    if (Object.keys(next).length) return setSaveStatus("error");
    setSaveStatus("pending");
    const clean = { ...form, vat: form.vat.trim().toUpperCase(), tradingName: form.tradingName.trim(), legalName: form.legalName.trim() };
    setTimeout(() => {
    update((s) => {
      s.business = clean;
    });
    if (user && user.businessName !== clean.tradingName) signIn({ ...user, businessName: clean.tradingName });
    toast({ title: "Business profile saved", body: "New invoices, reports and exports use these details." });
    router.push("/settings/business");
      setSaveStatus("success");
    }, 650);
  };

  return (
    <form onSubmit={save} noValidate>
      <SectionHeader title="Edit business profile" subtitle="Sent invoices keep the details they were issued with. Changes apply to new documents." />
      <Card>
        <CardHeader title="Logo" />
        <div className="flex flex-wrap items-center gap-4 p-5">
          <BusinessLogo business={form} />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-5 text-body">Shown on invoices, reports and the sidebar. {form.logo ? "" : "No logo yet: the initials are used."}</p>
            <p className={cn("text-xs leading-4", logoError ? "text-error-fg" : "text-muted")} role={logoError ? "alert" : undefined}>
              {logoError ?? "PNG or SVG with a transparent background, up to 2 MB."}
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/svg+xml"
            className="sr-only"
            aria-label="Choose a logo"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const result = await readImage(file, { types: ["image/png", "image/svg+xml"], maxBytes: 2 * 1048576 });
              if (result.ok) {
                set({ logo: result.url });
                setLogoError(undefined);
              } else setLogoError(result.error);
            }}
          />
          {form.logo && (
            <Button variant="ghost" size="sm" onClick={() => set({ logo: undefined })}>
              Remove
            </Button>
          )}
          <Button variant="secondary" size="sm" icon={Upload} onClick={() => fileRef.current?.click()}>
            {form.logo ? "Change logo" : "Upload logo"}
          </Button>
        </div>
      </Card>
      <Card className="mt-6">
        <CardHeader title="Business details" />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <TextField size="md" label="Legal name" value={form.legalName} onChange={(e) => set({ legalName: e.target.value })} state={errors.legalName ? "error" : "default"} message={errors.legalName} />
          <TextField size="md" label="Trading name" value={form.tradingName} onChange={(e) => set({ tradingName: e.target.value })} state={errors.tradingName ? "error" : "default"} message={errors.tradingName} />
          <TextField size="md" label="Name in Khmer" labelHint="(optional)" lang="km" className="font-khmer" value={form.khmerName} onChange={(e) => set({ khmerName: e.target.value })} />
          <SelectField label="Type of business" value={form.type} onChange={(e) => set({ type: e.target.value })} options={TYPES.map((t) => ({ value: t, label: t }))} />
          <TextField size="md" label="Registration number" value={form.registration} onChange={(e) => set({ registration: e.target.value })} />
          <TextField
            size="md"
            label="VAT TIN"
            value={form.vat}
            onChange={(e) => set({ vat: e.target.value })}
            state={errors.vat ? "error" : form.vat && vatValid ? "success" : "default"}
            message={errors.vat ?? (form.vat && vatValid ? "Format looks right." : "For example L001-901456782.")}
          />
        </div>
      </Card>
      <Card className="mt-6">
        <CardHeader title="Contact details" />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <TextField size="md" className="md:col-span-2" label="Address" icon={MapPin} value={form.address} onChange={(e) => set({ address: e.target.value })} state={errors.address ? "error" : "default"} message={errors.address} />
          <TextField size="md" label="Phone" icon={Phone} type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} state={errors.phone ? "error" : "default"} message={errors.phone} />
          <TextField size="md" label="Email" icon={Mail} type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} state={errors.email ? "error" : "default"} message={errors.email} />
          <TextAreaField
            className="md:col-span-2"
            label="Invoice footer"
            rows={4}
            maxLength={200}
            value={form.footer}
            onChange={(e) => set({ footer: e.target.value })}
            message={`Printed at the bottom of every invoice. ${200 - form.footer.length} of 200 characters left.`}
          />
        </div>
      </Card>
      <div className="mt-6 flex justify-end gap-3">
        <ButtonLink href="/settings/business" variant="secondary">
          Cancel
        </ButtonLink>
        <StatusButton type="submit" status={saveStatus} onReset={() => setSaveStatus("idle")} labels={{ idle: "Save changes", pending: "Saving", success: "Saved", error: "Check the fields" }} />
      </div>
    </form>
  );
}

/* ---------- 17.10 / 17.11 Currency & exchange rate ---------- */

export function CurrencySettingsView() {
  const { state, update } = useAdmin();
  const { user } = useSession();
  const toast = useToast();
  const [draft, setDraft] = useState(() => structuredClone(state.currency));
  const [dialog, setDialog] = useState(false);
  if (user?.role !== "owner") return <OwnerOnlySection title="Currency settings" />;

  const rate = currentRate(state.currency);
  const scheduled = state.currency.history.filter((r) => r.from > TODAY).sort((a, b) => a.from.localeCompare(b.from))[0];
  const round = (khr: number) => (draft.rounding === "Nearest ៛1,000" ? Math.round(khr / 1000) * 1000 : draft.rounding === "Nearest ៛100" ? Math.round(khr / 100) * 100 : Math.round(khr));

  return (
    <>
      <SectionHeader
        title="Currency & exchange rate"
        subtitle="LuyFlow records every amount in the currency it happened in. The rate below is only used to show a converted amount beside it."
        action={
          <Button variant="secondary" icon={RefreshCw} onClick={() => setDialog(true)}>
            Update rate
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Base currency" value="USD" lines={["United States dollar", "Totals and reports use USD"]} />
        <StatCard label="Second currency" value="KHR" lines={["Cambodian riel", "Recorded as KHR, shown beside USD"]} />
        <StatCard
          label="Display rate"
          tone="primary"
          value={rate.rate.toLocaleString("en-US")}
          unit="KHR per USD"
          lines={[`${rate.source === "At setup" ? "Set at setup" : "Set manually"} by ${rate.by}`, scheduled ? `${scheduled.rate.toLocaleString("en-US")} from ${fmtDate(scheduled.from)}` : `In use since ${fmtDate(rate.from)}`]}
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="Where the rate comes from" />
            <fieldset className="flex flex-col gap-4 p-5">
              <legend className="sr-only">Rate source</legend>
              {(
                [
                  ["manual", "I set the rate myself", "The rate stays the same until you update it. Good when you follow your bank’s or your own rate."],
                  ["daily", "Use a daily reference rate", "LuyFlow updates the display rate every morning from a published reference rate. You can still override it."],
                ] as const
              ).map(([value, title, sub]) => (
                <label key={value} className="flex cursor-pointer gap-3">
                  <input type="radio" name="rate-source" checked={draft.rateSource === value} onChange={() => setDraft((d) => ({ ...d, rateSource: value }))} className="mt-0.5 size-[18px] shrink-0 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface checked:border-[5px] checked:border-primary" />
                  <span>
                    <span className="block text-sm leading-5 font-medium text-fg">{title}</span>
                    <span className="mt-1 block text-[13px] leading-5 text-muted">{sub}</span>
                  </span>
                </label>
              ))}
              {draft.rateSource === "daily" && <p className="text-xs leading-4 text-muted">The reference-rate service is not connected in this demo; the rate only changes when you update it.</p>}
            </fieldset>
          </Card>
          <Card>
            <CardHeader title="Display and rounding" />
            <div className="flex flex-col gap-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Default display currency" value={draft.displayCurrency} onChange={(e) => setDraft((d) => ({ ...d, displayCurrency: e.target.value as "USD" | "KHR" }))} message="Each person can switch between USD and KHR in the top bar." options={[{ value: "USD", label: "USD" }, { value: "KHR", label: "KHR" }]} />
                <SelectField label="Round converted KHR to" value={draft.rounding} onChange={(e) => setDraft((d) => ({ ...d, rounding: e.target.value }))} message="Matches the smallest note in daily use." options={["Nearest ៛100", "Nearest ៛1,000", "No rounding"].map((v) => ({ value: v, label: v }))} />
              </div>
              <label className="flex cursor-pointer items-center gap-3 text-sm leading-5 text-fg">
                <Switch label="Show the converted amount under recorded amounts" checked={draft.showConverted} onChange={(v) => setDraft((d) => ({ ...d, showConverted: v }))} />
                Show the converted amount under recorded amounts
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-sm leading-5 text-fg">
                <Switch label="Print both currencies on invoice totals" checked={draft.printBoth} onChange={(v) => setDraft((d) => ({ ...d, printBoth: v }))} />
                Print both currencies on invoice totals
              </label>
            </div>
          </Card>
          <Card>
            <CardHeader title="Rate history" subtitle="Past documents keep the rate that applied on their date." divided />
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[480px] text-left">
                <caption className="sr-only">Rate history</caption>
                <thead>
                  <tr className="h-11 border-b border-line bg-subtle text-xs leading-4 font-medium text-muted">
                    <th scope="col" className="px-4">In use from</th>
                    <th scope="col" className="px-4 text-right">Rate</th>
                    <th scope="col" className="px-4">Source</th>
                    <th scope="col" className="px-4">Set by</th>
                  </tr>
                </thead>
                <tbody>
                  {state.currency.history.map((r) => (
                    <tr key={r.from} className="h-12 border-b border-line-subtle text-sm last:border-b-0">
                      <td className="px-4 text-fg">
                        {fmtDate(r.from)}
                        {r.from > TODAY && <span className="ml-2 inline-flex h-5 items-center rounded-full bg-info-subtle px-2 text-xs font-medium text-info-fg">Scheduled</span>}
                      </td>
                      <td className="tabular px-4 text-right text-fg">{r.rate.toLocaleString("en-US")}</td>
                      <td className="px-4 text-body">{r.source}</td>
                      <td className="px-4 text-body">{r.by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="h-fit">
            <CardHeader title="How amounts are shown" />
            <div className="flex flex-col gap-3 p-5">
              <div className="rounded-lg bg-subtle px-4 py-3">
                <p className="text-[13px] leading-5 text-muted">Recorded in USD</p>
                <p className="text-xl leading-7 font-semibold text-fg">$1,250.00</p>
                {draft.showConverted && <p className="text-xs leading-4 text-muted">≈ ៛{round(1250 * rate.rate).toLocaleString("en-US")} · display conversion</p>}
              </div>
              <div className="rounded-lg bg-subtle px-4 py-3">
                <p className="text-[13px] leading-5 text-muted">Recorded in KHR</p>
                <p className="text-xl leading-7 font-semibold text-fg">៛860,000</p>
                {draft.showConverted && <p className="text-xs leading-4 text-muted">≈ {money(860000 / rate.rate)} · display conversion</p>}
              </div>
              <p className="flex gap-2 text-xs leading-4 text-muted">
                <ShieldCheck size={14} className="shrink-0" aria-hidden />
                The recorded amount never changes. Only the “≈” line follows the rate.
              </p>
            </div>
          </Card>
          <Notice tone="neutral" icon={<Info size={18} aria-hidden />} title="Reconciliation uses bank amounts">
            Bank statements are matched in the account’s own currency, so the display rate does not affect reconciliation.
          </Notice>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={() => setDraft(structuredClone(state.currency))}>
          Cancel
        </Button>
        <Button
          icon={Check}
          onClick={() => {
            update((s) => {
              s.currency = { ...draft, history: s.currency.history };
            });
            toast({ title: "Currency settings saved", body: "Display and rounding apply from now on." });
          }}
        >
          Save changes
        </Button>
      </div>
      <Dialog open={dialog} onClose={() => setDialog(false)} labelledBy="rate-title" width={520}>
        {dialog && <RateForm current={rate.rate} onClose={() => setDialog(false)} />}
      </Dialog>
    </>
  );
}

function RateForm({ current, onClose }: { current: number; onClose: () => void }) {
  const { update } = useAdmin();
  const { user } = useSession();
  const toast = useToast();
  const [value, setValue] = useState(String(current + 5));
  const [from, setFrom] = useState("2026-11-01");
  const [error, setError] = useState<string>();
  const n = Number(value);
  const valid = Number.isInteger(n) && n >= 3000 && n <= 6000;

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return setError("Enter a whole number between 3,000 and 6,000.");
    if (!from || from < TODAY) return setError("Choose today or a later date.");
    update((s) => {
      s.currency.history = [{ from, rate: n, source: "Set manually", by: user?.name ?? "Sokha Chan" }, ...s.currency.history.filter((r) => r.from !== from)].sort((a, b) => b.from.localeCompare(a.from));
    });
    toast({ title: "Display rate saved", body: `${n.toLocaleString("en-US")} KHR per USD from ${fmtDate(from)}.` });
    onClose();
  };

  return (
    <form onSubmit={save} noValidate>
      <ModalHeader id="rate-title" title="Update display rate" description="Converted amounts use it from the date you choose." icon={<Coins size={20} aria-hidden />} onClose={onClose} />
      <ModalBody className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            size="md"
            label="1 USD equals"
            inputMode="numeric"
            autoFocus
            className="[&_input]:text-right"
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/[^\d]/g, ""));
              setError(undefined);
            }}
            suffix={<span className="border-l border-line pl-3 text-sm font-medium text-fg">KHR</span>}
            state={error && !valid ? "error" : "default"}
            message={`Current rate: ${current.toLocaleString("en-US")}`}
          />
          <TextField
            size="md"
            label="In use from"
            icon={Calendar}
            type="date"
            min={TODAY}
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setError(undefined);
            }}
            message="Today or a later date."
          />
        </div>
        {error && (
          <p className="text-[13px] leading-5 text-error-fg" role="alert">
            {error}
          </p>
        )}
        <div className="rounded-lg bg-subtle px-4 py-3 text-sm leading-5">
          <p className="text-[13px] text-muted">Example with the new rate</p>
          <p className="mt-2 flex justify-between gap-3 text-fg">
            <span>$1,250.00</span>
            <span className="text-body">≈ ៛{valid ? (Math.round((1250 * n) / 100) * 100).toLocaleString("en-US") : "—"}</span>
          </p>
          <p className="mt-1 flex justify-between gap-3 text-fg">
            <span>៛860,000</span>
            <span className="text-body">≈ {valid ? money(860000 / n) : "—"}</span>
          </p>
        </div>
        <Notice tone="neutral" icon={<Info size={18} aria-hidden />} title="What does not change">
          Recorded amounts, sent invoices, signed-off reconciliations and documents dated before {from ? fmtDate(from) : "that date"} keep their values.
        </Notice>
        <p className="text-xs leading-4 text-muted">In this demo, other screens keep converting at 4,100 KHR per USD.</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" icon={Check}>
          Save rate
        </Button>
      </ModalFooter>
    </form>
  );
}
