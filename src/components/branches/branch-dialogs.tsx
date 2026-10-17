"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Ban,
  Building2,
  ChartLine,
  Check,
  History,
  Info,
  Mail,
  Send,
  ShieldAlert,
  TriangleAlert,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, SelectField, TextField } from "@/components/ui/fields";
import { ModalBody, ModalFooter, ModalHeader, useToast } from "@/components/ui/overlay";
import { Notice } from "@/components/ui/page";
import { branchManager, firstName, pendingManager, useAdmin } from "@/lib/admin-store";
import { billBalance, billStatus, useFinance } from "@/lib/finance-store";
import { addDays, cn, fmtDate, initialsOf, money, TODAY } from "@/lib/format";
import type { AdminState, BranchRec, ManagerRec } from "@/lib/mock/admin-data";
import { invoiceBalance, invoiceStatus, useOps } from "@/lib/ops-store";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ---------- Invite manager (07.6) ---------- */

export function InviteDialog({ open, onClose, onSent }: { open: boolean; onClose: () => void; onSent?: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="invite-title" width={560}>
      {open && <InviteForm onClose={onClose} onSent={onSent} />}
    </Dialog>
  );
}

function InviteForm({ onClose, onSent }: { onClose: () => void; onSent?: () => void }) {
  const { state, update } = useAdmin();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [branchId, setBranchId] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const branch = state.branches.find((b) => b.id === branchId);
  const current = branch ? branchManager(state, branch.id) : null;
  const newFirst = firstName(name.trim()) || "the new manager";

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Enter their full name.";
    const mail = email.trim().toLowerCase();
    if (!EMAIL.test(mail)) next.email = "Enter a valid email address.";
    else if (mail === "sokha@mekongmart.com.kh" || state.managers.some((m) => m.email === mail && m.status !== "deactivated"))
      next.email = "This person already has access to Mekong Mart.";
    setErrors(next);
    if (next.name || next.email) return;
    const expires = addDays(TODAY, 7);
    update((draft) => {
      draft.managers.forEach((m) => {
        m.fresh = false;
        if (branchId && m.status === "invited" && m.pendingBranchId === branchId) m.pendingBranchId = null;
      });
      draft.managers.unshift({
        id: `m-${Date.now()}`,
        name: name.trim(),
        email: mail,
        status: "invited",
        branchId: null,
        pendingBranchId: branchId || null,
        lastActive: "",
        added: TODAY,
        expires,
        fresh: true,
      });
    });
    toast({ title: "Invitation sent", body: `Sent to ${mail}. The link expires on ${fmtDate(expires)}.` });
    onClose();
    onSent?.();
  };

  return (
    <form onSubmit={submit} noValidate>
      <ModalHeader
        id="invite-title"
        title="Invite manager"
        description="They will get an email with a link to set their password. The link expires in 7 days."
        icon={<UserPlus size={20} aria-hidden />}
        onClose={onClose}
      />
      <ModalBody className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField size="md" label="Full name" value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} state={errors.name ? "error" : "default"} message={errors.name} />
          <TextField size="md" label="Email" type="email" icon={Mail} value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} state={errors.email ? "error" : "default"} message={errors.email} />
        </div>
        <SelectField
          label="Branch"
          labelHint="(optional)"
          icon={Building2}
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          message="Leave this empty to invite now and assign a branch later."
          options={[{ value: "", label: "No branch yet" }, ...state.branches.filter((b) => b.status === "active").map((b) => ({ value: b.id, label: b.main ? `${b.name} (Main)` : b.name }))]}
        />
        {branch && current && (
          <Notice tone="warning" icon={<TriangleAlert size={18} aria-hidden />} title={`${branch.name} already has a manager`}>
            {current.name} keeps managing {branch.name} until {newFirst} accepts the invitation. After that {firstName(current.name)} keeps their account but has no
            branch until you assign one.
          </Notice>
        )}
        {branch?.main && !current && (
          <Notice tone="info" icon={<Info size={18} aria-hidden />}>
            You run {branch.name} yourself now. {newFirst} takes over once they accept.
          </Notice>
        )}
        <AccessList />
      </ModalBody>
      <ModalFooter note={<span className="text-muted">Email delivery is simulated in this demo.</span>}>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" icon={Send}>
          Send invitation
        </Button>
      </ModalFooter>
    </form>
  );
}

function AccessList() {
  const rows: [boolean, string][] = [
    [true, "Sales, invoices, bills, stock and transactions for their branch"],
    [true, "Submit till balancing and reconciliation for your sign-off"],
    [false, "Other branches, forecasting, integrations and business settings"],
  ];
  return (
    <div className="rounded-lg bg-subtle px-4 py-3.5">
      <p className="text-[13px] leading-5 font-medium text-fg">Access for Branch Managers</p>
      <ul className="mt-2 flex flex-col gap-2">
        {rows.map(([yes, text]) => (
          <li key={text} className="flex items-start gap-2.5 text-[13px] leading-5 text-body">
            {yes ? <Check size={16} className="mt-0.5 shrink-0 text-icon-success" aria-label="Allowed" /> : <X size={16} className="mt-0.5 shrink-0 text-icon-error" aria-label="Not allowed" />}
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Reassign manager for a branch (07.8) ---------- */

type Choice = { id: string; kind: "invited" | "active" | "none" };

function choicesFor(state: AdminState, branch: BranchRec) {
  const current = branchManager(state, branch.id);
  const invited = state.managers.filter((m) => m.status === "invited");
  const others = state.managers.filter((m) => m.status === "active" && m.id !== current?.id);
  return { current, invited, others };
}

export function ReassignDialog({ branch, open, onClose }: { branch: BranchRec; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="reassign-title" width={560}>
      {open && <ReassignForm branch={branch} onClose={onClose} />}
    </Dialog>
  );
}

function ReassignForm({ branch, onClose }: { branch: BranchRec; onClose: () => void }) {
  const { state, update } = useAdmin();
  const toast = useToast();
  const { current, invited, others } = choicesFor(state, branch);
  const pending = pendingManager(state, branch.id);
  const initial: Choice = pending ? { id: pending.id, kind: "invited" } : invited[0] ? { id: invited[0].id, kind: "invited" } : others[0] ? { id: others[0].id, kind: "active" } : { id: "none", kind: "none" };
  const [choice, setChoice] = useState<Choice>(initial);
  const chosen = state.managers.find((m) => m.id === choice.id);
  const branchOf = (m: ManagerRec) => state.branches.find((b) => b.id === m.branchId && b.status === "active");
  const curFirst = current ? firstName(current.name) : null;

  const submit = () => {
    update((draft) => {
      const cur = draft.managers.find((m) => m.id === current?.id);
      draft.managers.forEach((m) => {
        if (m.status === "invited" && m.pendingBranchId === branch.id) m.pendingBranchId = null;
      });
      if (choice.kind === "invited") {
        draft.managers.find((m) => m.id === choice.id)!.pendingBranchId = branch.id;
      } else if (choice.kind === "active") {
        if (cur) cur.branchId = null;
        draft.managers.find((m) => m.id === choice.id)!.branchId = branch.id;
      } else if (cur) {
        cur.branchId = null;
      }
    });
    toast({
      title: "Manager reassigned",
      body:
        choice.kind === "invited"
          ? `${chosen?.name} takes over ${branch.name} once the invitation is accepted.`
          : choice.kind === "active"
            ? `${chosen?.name} now manages ${branch.name}.`
            : `${branch.name} has no manager. You run it yourself for now.`,
    });
    onClose();
  };

  const option = (c: Choice, title: string, sub: React.ReactNode, avatar: React.ReactNode, warn = false) => {
    const selected = choice.id === c.id;
    return (
      <label
        key={c.id}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-[10px] px-4 py-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30",
          selected ? "border border-primary bg-primary-subtle/60" : "border border-line hover:border-line-strong",
        )}
      >
        <input
          type="radio"
          name="reassign"
          checked={selected}
          onChange={() => setChoice(c)}
          className="size-[18px] shrink-0 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface checked:border-[5px] checked:border-primary"
        />
        {avatar}
        <span className="min-w-0">
          <span className="block text-sm leading-5 font-medium text-fg">{title}</span>
          <span className={cn("block text-[13px] leading-5", warn ? "text-warning-fg" : "text-muted")}>{sub}</span>
        </span>
      </label>
    );
  };

  let info: { title: string; body: string; tone: "info" | "warning" };
  if (choice.kind === "invited" && chosen) {
    const f = firstName(chosen.name);
    info = {
      tone: "info",
      title: `Nothing changes until ${f} accepts`,
      body: current
        ? `${current.name} keeps managing ${branch.name} until ${f} sets a password. From then on ${f} manages the branch and ${curFirst} has no branch until you assign one.`
        : `You keep running ${branch.name} until ${f} sets a password. From then on ${f} manages the branch.`,
    };
  } else if (choice.kind === "active" && chosen) {
    const from = branchOf(chosen);
    info = {
      tone: from ? "warning" : "info",
      title: `${firstName(chosen.name)} takes over now`,
      body: `${chosen.name} starts managing ${branch.name} right away.${from ? ` ${from.name} will have no manager until you assign one.` : ""}${current ? ` ${current.name} keeps an account with no branch.` : ""}`,
    };
  } else {
    info = {
      tone: "info",
      title: "You run the branch yourself",
      body: current ? `${current.name} loses access to ${branch.name} now and keeps an account with no branch.` : `${branch.name} stays without a manager.`,
    };
  }

  return (
    <>
      <ModalHeader
        id="reassign-title"
        title={`Reassign manager for ${branch.name}`}
        description="A branch has one manager at a time. An invited manager takes over when the invitation is accepted."
        icon={<ArrowLeftRight size={20} aria-hidden />}
        onClose={onClose}
      />
      <ModalBody className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-sm leading-5 font-medium text-fg">Current manager</p>
          <div className="flex flex-wrap items-center gap-3 rounded-[10px] bg-subtle px-4 py-3">
            <Avatar initials={current ? initialsOf(current.name) : "—"} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-5 font-medium text-fg">{current?.name ?? "No manager"}</p>
              <p className="text-[13px] leading-5 text-muted">{current ? `Manager since ${fmtDate(current.added)}` : `You run ${branch.name} yourself`}</p>
            </div>
            {current && choice.kind === "invited" && chosen && (
              <Badge tone="sky" dot>
                Keeps access until {firstName(chosen.name)} accepts
              </Badge>
            )}
          </div>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm leading-5 font-medium text-fg">New manager</legend>
          <div className="flex flex-col gap-2.5">
            {invited.map((m) =>
              option(
                { id: m.id, kind: "invited" },
                m.name,
                m.pendingBranchId && m.pendingBranchId !== branch.id
                  ? `Invited · would move from ${state.branches.find((b) => b.id === m.pendingBranchId)?.name}`
                  : "Invited · takes over when the invitation is accepted",
                <Avatar initials={initialsOf(m.name)} size={40} />,
              ),
            )}
            {others.map((m) => {
              const from = branchOf(m);
              return option(
                { id: m.id, kind: "active" },
                m.name,
                from ? `Manages ${from.name} — that branch would have no manager` : "Active · no branch at the moment",
                <Avatar initials={initialsOf(m.name)} size={40} />,
                Boolean(from),
              );
            })}
            {option(
              { id: "none", kind: "none" },
              "No manager",
              `You run ${branch.name} yourself for now`,
              <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-muted-bg text-icon-strong">
                <UserX size={18} />
              </span>,
            )}
          </div>
        </fieldset>
        <Notice tone={info.tone} icon={<Info size={18} aria-hidden />} title={info.title}>
          {info.body}
        </Notice>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={choice.kind === "none" && !current && !pending}>
          Reassign manager
        </Button>
      </ModalFooter>
    </>
  );
}

/* ---------- Move a manager to a branch (Branch Managers tab) ---------- */

export function ManagerBranchDialog({ manager, open, onClose }: { manager: ManagerRec; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="move-title" width={520}>
      {open && <ManagerBranchForm manager={manager} onClose={onClose} />}
    </Dialog>
  );
}

function ManagerBranchForm({ manager, onClose }: { manager: ManagerRec; onClose: () => void }) {
  const { state, update } = useAdmin();
  const toast = useToast();
  const invited = manager.status === "invited";
  const currentId = invited ? manager.pendingBranchId ?? "" : manager.branchId ?? "";
  const [target, setTarget] = useState(currentId);
  const branches = state.branches.filter((b) => b.status === "active");
  const targetBranch = branches.find((b) => b.id === target);
  const holder = targetBranch ? branchManager(state, targetBranch.id) : null;
  const displaced = holder && holder.id !== manager.id ? holder : null;

  const submit = () => {
    update((draft) => {
      const m = draft.managers.find((x) => x.id === manager.id)!;
      if (invited) {
        draft.managers.forEach((x) => {
          if (x.status === "invited" && target && x.pendingBranchId === target) x.pendingBranchId = null;
        });
        m.pendingBranchId = target || null;
      } else {
        if (displaced) draft.managers.find((x) => x.id === displaced.id)!.branchId = null;
        m.branchId = target || null;
      }
    });
    toast({ title: "Branch updated", body: target ? `${manager.name} ${invited ? "takes over" : "now manages"} ${targetBranch?.name}${invited ? " once the invitation is accepted" : ""}.` : `${manager.name} has no branch now.` });
    onClose();
  };

  return (
    <>
      <ModalHeader id="move-title" title={`Reassign ${manager.name}`} description="A manager runs one branch at a time." icon={<ArrowLeftRight size={20} aria-hidden />} onClose={onClose} />
      <ModalBody className="flex flex-col gap-4">
        <SelectField
          label="Branch"
          icon={Building2}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          options={[
            { value: "", label: "No branch" },
            ...branches.map((b) => {
              const h = branchManager(state, b.id);
              return { value: b.id, label: `${b.main ? `${b.name} (Main)` : b.name}${h && h.id !== manager.id ? ` · ${h.name}` : ""}` };
            }),
          ]}
        />
        {displaced && (
          <Notice tone="warning" icon={<TriangleAlert size={18} aria-hidden />} title={`${targetBranch?.name} already has a manager`}>
            {invited
              ? `${displaced.name} keeps managing ${targetBranch?.name} until ${firstName(manager.name)} accepts, then has no branch until you assign one.`
              : `${displaced.name} will have no branch until you assign one.`}
          </Notice>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={target === currentId}>
          Save
        </Button>
      </ModalFooter>
    </>
  );
}

/* ---------- Deactivate a branch (07.9) / main branch protected (07.10) ---------- */

export function DeactivateDialog({ branch, open, onClose }: { branch: BranchRec; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { state } = useAdmin();
  if (branch.main) {
    const next = state.branches.find((b) => !b.main && b.status === "active");
    return (
      <ConfirmDialog
        open={open}
        onClose={onClose}
        id="main-branch-title"
        icon={<ShieldAlert size={20} aria-hidden />}
        title="The main branch cannot be deactivated"
        cancelLabel="Close"
        confirmLabel="Choose a new main branch"
        onConfirm={() => {
          onClose();
          if (next) router.push(`/branches/${next.id}/edit#main-branch`);
        }}
      >
        {branch.name} (Main) is your main branch. Its address and details appear on your invoices and reports. To deactivate it, first open another branch, choose
        Edit branch and turn on “Main branch”.
      </ConfirmDialog>
    );
  }
  return (
    <Dialog open={open} onClose={onClose} labelledBy="deactivate-title" width={580}>
      {open && <DeactivateForm branch={branch} onClose={onClose} />}
    </Dialog>
  );
}

function DeactivateForm({ branch, onClose }: { branch: BranchRec; onClose: () => void }) {
  const { state, update } = useAdmin();
  const ops = useOps().state;
  const finance = useFinance().state;
  const toast = useToast();
  const [sure, setSure] = useState(false);
  const manager = branchManager(state, branch.id);
  const openInvoices = ops.invoices.filter((i) => i.branch === branch.name && ["sent", "partial", "overdue"].includes(invoiceStatus(i)));
  const openBills = finance.bills.filter((b) => b.branch === branch.name && ["open", "partial", "overdue"].includes(billStatus(b)));
  const invTotal = openInvoices.reduce((s, i) => s + invoiceBalance(i), 0);
  const billTotalUsd = openBills.reduce((s, b) => s + (b.currency === "KHR" ? billBalance(b) / 4100 : billBalance(b)), 0);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const rows = [
    { icon: History, tone: "bg-muted-bg text-icon-strong", title: "History is kept", sub: "All past sales, bills, stock movements and reports stay available." },
    { icon: Ban, tone: "bg-error-subtle text-icon-error", title: "No new transactions", sub: "Sales, invoices, bills and stock changes can no longer be recorded here." },
    manager
      ? { icon: UserX, tone: "bg-error-subtle text-icon-error", title: `${manager.name} loses access`, sub: "The manager keeps an account, with no branch until reassigned." }
      : { icon: UserX, tone: "bg-muted-bg text-icon-strong", title: "No manager to remove", sub: "Nobody else has access to this branch." },
    { icon: ChartLine, tone: "bg-warning-subtle text-icon-warning", title: "Left out of forecasts", sub: "Deactivated branches are not part of revenue or cash forecasts." },
  ];

  const submit = () => {
    update((draft) => {
      const b = draft.branches.find((x) => x.id === branch.id)!;
      b.status = "deactivated";
      b.deactivatedOn = TODAY;
      draft.managers.forEach((m) => {
        if (m.status === "active" && m.branchId === branch.id) m.branchId = null;
        if (m.status === "invited" && m.pendingBranchId === branch.id) m.pendingBranchId = null;
      });
    });
    toast({ title: `${branch.name} deactivated`, body: manager ? `${manager.name} no longer has access. History is kept.` : "History is kept. You can reactivate it at any time." });
    onClose();
  };

  return (
    <>
      <ModalHeader
        id="deactivate-title"
        title={`Deactivate ${branch.name}?`}
        description="You can reactivate the branch later. Nothing is deleted."
        icon={<TriangleAlert size={20} aria-hidden />}
        iconTone="error"
        onClose={onClose}
      />
      <ModalBody className="flex flex-col gap-5">
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.title} className="flex gap-3">
              <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-md", row.tone)}>
                <row.icon size={18} aria-hidden />
              </span>
              <span>
                <span className="block text-sm leading-5 font-medium text-fg">{row.title}</span>
                <span className="block text-[13px] leading-5 text-muted">{row.sub}</span>
              </span>
            </li>
          ))}
        </ul>
        {(openInvoices.length > 0 || openBills.length > 0) && (
          <Notice tone="warning" icon={<TriangleAlert size={18} aria-hidden />} title="Still open at this branch">
            {[
              openInvoices.length ? `${plural(openInvoices.length, "invoice")} (${money(invTotal)})` : null,
              openBills.length ? `${plural(openBills.length, "bill")} (${money(billTotalUsd)})` : null,
            ]
              .filter(Boolean)
              .join(" and ")}{" "}
            remain open. You can still record payments against them.
          </Notice>
        )}
        <Checkbox checked={sure} onChange={setSure}>
          I understand that {branch.name} will stop accepting new records
        </Checkbox>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Keep branch active
        </Button>
        <Button variant="danger" onClick={submit} disabled={!sure}>
          Deactivate branch
        </Button>
      </ModalFooter>
    </>
  );
}
