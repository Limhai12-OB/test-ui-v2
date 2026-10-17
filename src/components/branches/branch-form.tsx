"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, Calendar, ChartLine, Banknote, History, MapPin, Phone, UserPlus, Users, Mail } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { SelectField, TextField } from "@/components/ui/fields";
import { Switch } from "@/components/ui/flow";
import { useToast } from "@/components/ui/overlay";
import { Page, PageHeader } from "@/components/ui/page";
import { branchManager, pendingManager, useAdmin } from "@/lib/admin-store";
import { addDays, cn, initialsOf, TODAY } from "@/lib/format";
import { CITIES, NEW_BRANCH_IDS, type BranchRec } from "@/lib/mock/admin-data";
import { DeactivateDialog, ReassignDialog } from "./branch-dialogs";

const PHONE = /^\+855\d{8,9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Fields = { name: string; phone: string; address: string; city: string; opened: string };
type Errors = Partial<Record<keyof Fields | "inviteName" | "inviteEmail", string>>;

function validate(fields: Fields, branches: BranchRec[], selfId?: string): Errors {
  const errors: Errors = {};
  const name = fields.name.trim();
  if (!name) errors.name = "Enter a branch name.";
  else if (branches.some((b) => b.id !== selfId && b.name.toLowerCase() === name.toLowerCase())) errors.name = "Another branch already uses this name.";
  if (fields.phone.trim() && !PHONE.test(fields.phone.replace(/[\s-]/g, ""))) errors.phone = "Enter a Cambodian number, for example +855 23 991 507.";
  if (!fields.address.trim()) errors.address = "Enter the street address.";
  if (!fields.city) errors.city = "Choose a city or province.";
  if (!fields.opened) errors.opened = "Choose the opening date.";
  return errors;
}

function DetailsCard({ fields, set, errors }: { fields: Fields; set: (patch: Partial<Fields>) => void; errors: Errors }) {
  return (
    <Card>
      <CardHeader title="Branch details" />
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <TextField size="md" label="Branch name" placeholder="e.g. Sen Sok" value={fields.name} onChange={(e) => set({ name: e.target.value })} state={errors.name ? "error" : "default"} message={errors.name ?? "Shown in filters, reports and on invoices."} />
        <TextField size="md" label="Contact phone" labelHint="(optional)" icon={Phone} type="tel" placeholder="+855 …" value={fields.phone} onChange={(e) => set({ phone: e.target.value })} state={errors.phone ? "error" : "default"} message={errors.phone} />
        <TextField size="md" className="md:col-span-2" label="Address" icon={MapPin} placeholder="Street, commune, district, city" value={fields.address} onChange={(e) => set({ address: e.target.value })} state={errors.address ? "error" : "default"} message={errors.address} />
        <SelectField
          label="City or province"
          value={fields.city}
          onChange={(e) => set({ city: e.target.value })}
          state={errors.city ? "error" : "default"}
          message={errors.city}
          options={[{ value: "", label: "Select", disabled: true }, ...CITIES.map((c) => ({ value: c, label: c }))]}
        />
        <TextField size="md" label="Opening date" icon={Calendar} type="date" value={fields.opened} onChange={(e) => set({ opened: e.target.value })} state={errors.opened ? "error" : "default"} message={errors.opened} />
      </div>
    </Card>
  );
}

function SideList({ title, rows }: { title: string; rows: [React.ReactNode, string][] }) {
  return (
    <Card className="h-fit">
      <CardHeader title={title} />
      <ul className="flex flex-col gap-4 p-5">
        {rows.map(([icon, text]) => (
          <li key={text} className="flex items-start gap-3 text-sm leading-5 text-body">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-brand">{icon}</span>
            <span className="pt-1.5">{text}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const radioClass = "mt-0.5 size-[18px] shrink-0 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface checked:border-[5px] checked:border-primary";

/* ---------- 07.3 Add branch ---------- */

export function AddBranch() {
  const { state, update } = useAdmin();
  const router = useRouter();
  const toast = useToast();
  const [fields, setFields] = useState<Fields>({ name: "", phone: "", address: "", city: "", opened: addDays(TODAY, 1) });
  const [errors, setErrors] = useState<Errors>({});
  const [mode, setMode] = useState<"later" | "existing" | "invite">("later");
  const unassigned = state.managers.filter((m) => (m.status === "invited" && !m.pendingBranchId) || (m.status === "active" && !m.branchId));
  const [existing, setExisting] = useState(unassigned[0]?.id ?? "");
  const [invite, setInvite] = useState({ name: "", email: "" });
  const set = (patch: Partial<Fields>) => {
    setFields((f) => ({ ...f, ...patch }));
    setErrors({});
  };
  const ready = fields.name.trim() && fields.address.trim() && fields.city && fields.opened && (mode !== "invite" || (invite.name.trim() && invite.email.trim())) && (mode !== "existing" || existing);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = validate(fields, state.branches);
    if (mode === "invite") {
      if (!invite.name.trim()) next.inviteName = "Enter their full name.";
      if (!EMAIL.test(invite.email.trim())) next.inviteEmail = "Enter a valid email address.";
      else if (state.managers.some((m) => m.email === invite.email.trim().toLowerCase())) next.inviteEmail = "This person already has access to Mekong Mart.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    const id = NEW_BRANCH_IDS.find((x) => !state.branches.some((b) => b.id === x));
    if (!id) {
      toast({ title: "Branch not added", body: "This demo can add up to 4 branches per session.", tone: "error" });
      return;
    }
    const name = fields.name.trim();
    update((draft) => {
      draft.branches.push({
        id, name, main: false, address: fields.address.trim(), city: fields.city, phone: fields.phone.trim(), opened: fields.opened, staff: 0, status: "active",
        revenue: 0, expenses: 0, revDelta: 0, expDelta: 0, profitDelta: 0, shareDelta: 0, q: [0, 0], ytd: [0, 0],
      });
      if (mode === "existing") {
        const m = draft.managers.find((x) => x.id === existing)!;
        if (m.status === "invited") m.pendingBranchId = id;
        else m.branchId = id;
      }
      if (mode === "invite") {
        draft.managers.forEach((m) => (m.fresh = false));
        draft.managers.unshift({ id: `m-${Date.now()}`, name: invite.name.trim(), email: invite.email.trim().toLowerCase(), status: "invited", branchId: null, pendingBranchId: id, lastActive: "", added: TODAY, expires: addDays(TODAY, 7), fresh: true });
      }
    });
    toast({ title: `${name} added`, body: mode === "invite" ? `Invitation sent to ${invite.email.trim()}.` : "You can assign items and opening stock from Items & Inventory." });
    router.push(`/branches/${id}`);
  };

  const existingManager = unassigned.find((m) => m.id === existing);

  return (
    <Page>
      <PageHeader breadcrumbs={[{ label: "Branches", href: "/branches" }, { label: "Add branch" }]} title="Add branch" subtitle="A branch has its own sales, stock, cash till and reports." />
      <form onSubmit={submit} noValidate className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <div className="flex min-w-0 flex-col gap-6">
          <DetailsCard fields={fields} set={set} errors={errors} />
          <Card>
            <CardHeader title="Branch Manager" subtitle="Optional. You can run the branch yourself and assign someone later." />
            <fieldset className="flex flex-col gap-3 p-5">
              <legend className="sr-only">Branch Manager</legend>
              {(
                [
                  ["later", "Assign later", "You manage this branch until someone is assigned."],
                  ["existing", "Choose an existing manager", existingManager ? `${existingManager.name} is ${existingManager.status === "invited" ? "invited" : "active"} and not assigned to a branch yet.` : "Everyone already has a branch."],
                  ["invite", "Invite someone new", "They get an email invitation after the branch is added."],
                ] as const
              ).map(([value, title, sub]) => (
                <div key={value} className={cn("rounded-[10px]", mode === value ? "border border-primary bg-primary-subtle/60" : "border border-line")}>
                  <label className={cn("flex items-start gap-3 px-4 py-3", value === "existing" && !unassigned.length ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
                    <input type="radio" name="manager-mode" checked={mode === value} disabled={value === "existing" && !unassigned.length} onChange={() => setMode(value)} className={radioClass} />
                    <span>
                      <span className="block text-sm leading-5 font-medium text-fg">{title}</span>
                      <span className="block text-[13px] leading-5 text-muted">{sub}</span>
                    </span>
                  </label>
                  {mode === "existing" && value === "existing" && unassigned.length > 1 && (
                    <div className="px-4 pb-4 pl-[46px]">
                      <SelectField label="Manager" value={existing} onChange={(e) => setExisting(e.target.value)} options={unassigned.map((m) => ({ value: m.id, label: `${m.name} · ${m.status === "invited" ? "invited" : "active"}` }))} />
                    </div>
                  )}
                  {mode === "invite" && value === "invite" && (
                    <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2 sm:pl-[46px]">
                      <TextField size="md" label="Full name" value={invite.name} onChange={(e) => setInvite((v) => ({ ...v, name: e.target.value }))} state={errors.inviteName ? "error" : "default"} message={errors.inviteName} />
                      <TextField size="md" label="Email" icon={Mail} type="email" value={invite.email} onChange={(e) => setInvite((v) => ({ ...v, email: e.target.value }))} state={errors.inviteEmail ? "error" : "default"} message={errors.inviteEmail} />
                    </div>
                  )}
                </div>
              ))}
            </fieldset>
          </Card>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/branches" variant="secondary">
              Cancel
            </ButtonLink>
            <p className="ml-auto text-[13px] leading-5 text-muted">All fields are required unless marked optional.</p>
            <Button type="submit" disabled={!ready}>
              Add branch
            </Button>
          </div>
        </div>
        <SideList
          title="What happens next"
          rows={[
            [<Banknote key="i" size={16} aria-hidden />, "A cash till account is created"],
            [<Box key="i" size={16} aria-hidden />, "Assign items and opening stock from Items & Inventory"],
            [<UserPlus key="i" size={16} aria-hidden />, "Assign a Branch Manager at any time"],
            [<ChartLine key="i" size={16} aria-hidden />, "Forecasts include the branch after 30 days of sales"],
          ]}
        />
      </form>
    </Page>
  );
}

/* ---------- 07.4 Edit branch ---------- */

export function EditBranch() {
  const { id } = useParams<{ id: string }>();
  const { state, update } = useAdmin();
  const router = useRouter();
  const toast = useToast();
  const branch = state.branches.find((b) => b.id === id);
  const [fields, setFields] = useState<Fields | null>(branch ? { name: branch.name, phone: branch.phone, address: branch.address, city: branch.city, opened: branch.opened } : null);
  const [main, setMain] = useState(branch?.main ?? false);
  const [errors, setErrors] = useState<Errors>({});
  const [dialog, setDialog] = useState<"reassign" | "deactivate" | null>(null);

  if (!branch || !fields) {
    return (
      <Page>
        <PageHeader title="Branch not found" breadcrumbs={[{ label: "Branches", href: "/branches" }, { label: "Not found" }]} />
        <ButtonLink href="/branches" variant="secondary" className="mt-6">
          Back to branches
        </ButtonLink>
      </Page>
    );
  }

  const manager = branchManager(state, branch.id);
  const pending = pendingManager(state, branch.id);
  const currentMain = state.branches.find((b) => b.main);
  const set = (patch: Partial<Fields>) => {
    setFields((f) => ({ ...f!, ...patch }));
    setErrors({});
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = validate(fields, state.branches, branch.id);
    setErrors(next);
    if (Object.keys(next).length) return;
    update((draft) => {
      const b = draft.branches.find((x) => x.id === branch.id)!;
      Object.assign(b, { name: fields.name.trim(), phone: fields.phone.trim(), address: fields.address.trim(), city: fields.city, opened: fields.opened });
      if (main && !branch.main) draft.branches.forEach((x) => (x.main = x.id === branch.id));
    });
    toast({ title: "Branch saved", body: main && !branch.main ? `${fields.name.trim()} is now the main branch.` : "Changes apply to new records." });
    router.push(`/branches/${branch.id}`);
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Branches", href: "/branches" }, { label: branch.name, href: `/branches/${branch.id}` }, { label: "Edit" }]}
        title={`Edit ${branch.name}`}
        subtitle="Changes apply as soon as you save. History and past records are not affected."
      />
      <form onSubmit={submit} noValidate className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <div className="flex min-w-0 flex-col gap-6">
          <DetailsCard fields={fields} set={set} errors={errors} />
          <Card>
            <CardHeader title="Branch Manager" subtitle="Optional. You can run the branch yourself and assign someone later." />
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-line px-4 py-3">
                <Avatar initials={manager ? initialsOf(manager.name) : "SC"} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-5 font-medium text-fg">{manager?.name ?? "No manager"}</p>
                  <p className="truncate text-[13px] leading-5 text-muted">
                    {manager ? `${manager.email} · Active` : pending ? `${pending.name} is invited and takes over when the invitation is accepted` : "You run this branch yourself"}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setDialog("reassign")} disabled={branch.status !== "active"}>
                  {manager || pending ? "Reassign" : "Assign"}
                </Button>
                {manager && (
                  <button
                    type="button"
                    className="focus-ring cursor-pointer rounded-xs px-2 text-[13px] leading-5 font-medium text-error-fg hover:underline"
                    onClick={() => {
                      update((draft) => {
                        draft.managers.find((m) => m.id === manager.id)!.branchId = null;
                      });
                      toast({ title: "Manager removed", body: `${manager.name} keeps an account with no branch.` });
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </Card>
          <Card id="main-branch">
            <CardHeader title="Main branch" />
            <div className="flex items-start gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-5 font-medium text-fg">Use {fields.name.trim() || branch.name} as the main branch</p>
                <p className="mt-0.5 text-[13px] leading-5 text-muted">
                  The address and details of the main branch appear on invoices and reports.{" "}
                  {branch.main ? "This is the main branch now. Choose another branch to change it." : `The main branch is ${currentMain?.name} (Main) now.`}
                </p>
              </div>
              <Switch label="Main branch" checked={main} onChange={setMain} disabled={branch.main || branch.status !== "active"} />
            </div>
          </Card>
          {branch.status === "active" ? (
            <section className="flex flex-wrap items-center gap-4 rounded-lg border border-error/30 bg-surface p-5">
              <div className="min-w-0 flex-1">
                <h2 className="text-base leading-6 font-semibold text-fg">Deactivate this branch</h2>
                <p className="mt-0.5 text-[13px] leading-5 text-muted">History is kept, but nothing new can be recorded and the manager loses access.</p>
              </div>
              <Button variant="danger" onClick={() => setDialog("deactivate")}>
                Deactivate branch
              </Button>
            </section>
          ) : (
            <section className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface p-5">
              <div className="min-w-0 flex-1">
                <h2 className="text-base leading-6 font-semibold text-fg">This branch is deactivated</h2>
                <p className="mt-0.5 text-[13px] leading-5 text-muted">Reactivate it to record sales, bills and stock again.</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  update((draft) => {
                    const b = draft.branches.find((x) => x.id === branch.id)!;
                    b.status = "active";
                    b.deactivatedOn = undefined;
                  });
                  toast({ title: `${branch.name} reactivated`, body: "New records can be added again." });
                }}
              >
                Reactivate branch
              </Button>
            </section>
          )}
          <div className="flex items-center justify-between gap-3">
            <ButtonLink href={`/branches/${branch.id}`} variant="secondary">
              Cancel
            </ButtonLink>
            <Button type="submit">Save changes</Button>
          </div>
        </div>
        <SideList
          title="What stays the same"
          rows={[
            [<History key="i" size={16} aria-hidden />, "Past records keep the branch name used at the time"],
            [<Users key="i" size={16} aria-hidden />, "The manager keeps their access"],
            [<Box key="i" size={16} aria-hidden />, "Stock levels and item assignments are unchanged"],
          ]}
        />
      </form>
      <ReassignDialog branch={branch} open={dialog === "reassign"} onClose={() => setDialog(null)} />
      {dialog === "deactivate" && <DeactivateDialog branch={branch} open onClose={() => setDialog(null)} />}
    </Page>
  );
}
