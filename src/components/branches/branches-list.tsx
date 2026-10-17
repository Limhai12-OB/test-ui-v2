"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Download, Ellipsis, FileText, Info, Plus, Trophy, UserPlus, UserRound, Users } from "lucide-react";
import { Restricted } from "@/components/admin/restricted";
import { StatusPill } from "@/components/finance/common";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, MobileRow, TwoLine, type Column, type SortState } from "@/components/ui/data-table";
import { FilterMenu, Pagination, SearchInput, paginate } from "@/components/ui/filters";
import { Segmented } from "@/components/ui/flow";
import { Menu } from "@/components/ui/menu";
import { LinkTabs, Notice, Page, PageHeader } from "@/components/ui/page";
import { Delta, StatCard } from "@/components/ui/stat";
import { useToast } from "@/components/ui/overlay";
import { branchLabel, branchManager, firstName, managerBranchText, pendingManager, useAdmin } from "@/lib/admin-store";
import { cn, downloadCsv, fmtDate, initialsOf, money, num } from "@/lib/format";
import type { BranchRec, ManagerRec } from "@/lib/mock/admin-data";
import { useSession } from "@/lib/session";
import { DeactivateDialog, InviteDialog, ManagerBranchDialog, ReassignDialog } from "./branch-dialogs";

/** Branch Managers see frame 07.11 instead of any branch management screen. */
export function OwnerOnlyBranches({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  if (user?.role !== "manager") return <>{children}</>;
  return (
    <Restricted
      title="Branches"
      heading="Branch management is for the Business Owner"
      footer={
        <div className="mx-auto grid max-w-[784px] gap-4 sm:grid-cols-2">
          <InfoTile icon={<Building2 size={18} aria-hidden />} label="Your branch" value={`${user.branch ?? "Toul Kork"} · Phnom Penh`} />
          <InfoTile icon={<UserRound size={18} aria-hidden />} label="Business Owner" value="Sokha Chan · sokha@mekongmart.com.kh" />
        </div>
      }
    >
      You manage {user.branch ?? "Toul Kork"} Branch. Adding branches and assigning managers is done by Sokha Chan.
    </Restricted>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line px-4 py-3.5 text-left">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-brand">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[13px] leading-5 text-muted">{label}</span>
        <span className="block text-sm leading-5 font-medium break-words text-fg">{value}</span>
      </span>
    </div>
  );
}

function BranchesHeader({ tab }: { tab: "branches" | "managers" }) {
  const { state } = useAdmin();
  const router = useRouter();
  const [invite, setInvite] = useState(false);
  return (
    <>
      <PageHeader
        title="Branches"
        subtitle="Your locations and the people who run them. Only the Business Owner can see and change this."
        actions={
          tab === "branches" ? (
            <>
              <Button variant="secondary" icon={UserPlus} onClick={() => setInvite(true)}>
                Invite manager
              </Button>
              <Button icon={Plus} onClick={() => router.push("/branches/new")}>
                Add branch
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" icon={Plus} onClick={() => router.push("/branches/new")}>
                Add branch
              </Button>
              <Button icon={UserPlus} onClick={() => setInvite(true)}>
                Invite manager
              </Button>
            </>
          )
        }
      />
      <LinkTabs
        className="mt-6"
        items={[
          { href: "/branches", label: "Branches", count: state.branches.length, exact: true },
          { href: "/branches/managers", label: "Branch Managers", count: state.managers.length },
        ]}
      />
      <InviteDialog open={invite} onClose={() => setInvite(false)} onSent={() => tab === "branches" && router.push("/branches/managers")} />
    </>
  );
}

/* ---------- 07.1 Branch list ---------- */

type Period = "month" | "quarter" | "ytd";
const PERIOD_LABEL: Record<Period, string> = { month: "October 2026", quarter: "August – October 2026", ytd: "January – October 2026" };

function figures(b: BranchRec, period: Period): [number, number] {
  if (period === "quarter") return b.q;
  if (period === "ytd") return b.ytd;
  return [b.revenue, b.expenses];
}

/** Round chart maximum with four even steps ($5k, $10k, $25k …). */
function niceMax(value: number) {
  const raw = Math.max(value, 1) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  return step * 4;
}
const short = (v: number) => (v >= 1000 ? `$${(v / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k` : `$${v}`);

export function BranchesList() {
  const { state } = useAdmin();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("month");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ key: "revenue", dir: "desc" });
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ kind: "reassign" | "deactivate"; branch: BranchRec } | null>(null);
  const toast = useToast();
  const { update } = useAdmin();

  const active = state.branches.filter((b) => b.status === "active");
  const managers = state.managers;
  const top = [...active].sort((a, b) => b.revenue - a.revenue)[0];
  const topExp = [...active].sort((a, b) => b.expenses - a.expenses)[0];
  const chartMax = niceMax(Math.max(...active.map((b) => Math.max(...figures(b, period)))));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = state.branches.filter(
      (b) =>
        (!q || `${b.name} ${b.address}`.toLowerCase().includes(q)) &&
        (!status || b.status === status) &&
        (!city || b.city === city),
    );
    const value = (b: BranchRec) => (sort.key === "expenses" ? b.expenses : sort.key === "profit" ? b.revenue - b.expenses : b.revenue);
    return list.sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      return (sort.dir === "desc" ? -1 : 1) * (value(a) - value(b));
    });
  }, [state.branches, query, status, city, sort]);
  const { current, slice } = paginate(rows, page, 10);

  const managerCell = (b: BranchRec) => {
    const m = branchManager(state, b.id);
    const pending = pendingManager(state, b.id);
    if (b.status === "deactivated") return { initials: "—", name: "No manager", sub: "Access removed" };
    if (m) return { initials: initialsOf(m.name), name: m.name, sub: pending ? `Until ${firstName(pending.name)} accepts` : "Branch Manager" };
    if (pending) return { initials: initialsOf(pending.name), name: pending.name, sub: "Invited · starts when accepted" };
    return b.main ? { initials: "SC", name: "Sokha Chan", sub: "Owner-managed" } : { initials: "SC", name: "Sokha Chan", sub: "Owner-managed · no manager" };
  };

  const actions = (b: BranchRec) => (
    <Menu
      align="end"
      width={210}
      triggerLabel={`Actions for ${b.name}`}
      triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-icon hover:bg-muted-bg"
      trigger={<Ellipsis size={16} aria-hidden />}
      items={[
        { id: "view", label: "View branch", onSelect: () => router.push(`/branches/${b.id}`) },
        { id: "edit", label: "Edit branch", onSelect: () => router.push(`/branches/${b.id}/edit`) },
        ...(b.status === "active"
          ? [
              { id: "reassign", label: "Reassign manager", onSelect: () => setDialog({ kind: "reassign", branch: b }) },
              { id: "deactivate", label: "Deactivate", onSelect: () => setDialog({ kind: "deactivate", branch: b }) },
            ]
          : [
              {
                id: "reactivate",
                label: "Reactivate",
                onSelect: () => {
                  update((draft) => {
                    const x = draft.branches.find((y) => y.id === b.id)!;
                    x.status = "active";
                    x.deactivatedOn = undefined;
                  });
                  toast({ title: `${b.name} reactivated`, body: "New records can be added again. Assign a manager when you are ready." });
                },
              },
            ]),
      ]}
    />
  );

  const muted = (b: BranchRec) => b.status === "deactivated";
  const columns: Column<BranchRec>[] = [
    { key: "branch", header: "Branch", width: "26%", cell: (b) => <TwoLine title={branchLabel(b)} sub={b.address} /> },
    {
      key: "manager",
      header: "Manager",
      width: "19%",
      cell: (b) => {
        const m = managerCell(b);
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar initials={m.initials} />
            <TwoLine title={m.name} sub={m.sub} />
          </div>
        );
      },
    },
    { key: "status", header: "Status", width: "13%", cell: (b) => (b.status === "active" ? <StatusPill tone="success">Active</StatusPill> : <StatusPill tone="neutral" className="border border-line-strong bg-surface">Deactivated</StatusPill>) },
    { key: "revenue", header: "Revenue (USD)", align: "right", width: "13%", cell: (b) => <span className="tabular text-fg">{muted(b) ? "—" : num(b.revenue)}</span> },
    { key: "expenses", header: "Expenses (USD)", align: "right", width: "13%", cell: (b) => <span className="tabular text-fg">{muted(b) ? "—" : num(b.expenses)}</span> },
    { key: "profit", header: "Net profit (USD)", align: "right", width: "13%", cell: (b) => <span className={cn("tabular", muted(b) ? "text-fg" : b.revenue - b.expenses >= 0 ? "text-success-fg" : "text-error-fg")}>{muted(b) ? "—" : num(b.revenue - b.expenses)}</span> },
    { key: "actions", header: "Actions", srHeader: true, width: "56px", align: "right", cell: actions },
  ];

  const exportCsv = () =>
    downloadCsv("branches-october-2026.csv", [
      ["Branch", "Address", "City", "Manager", "Status", "Revenue (USD)", "Expenses (USD)", "Net profit (USD)"],
      ...rows.map((b) => [branchLabel(b), b.address, b.city, managerCell(b).name, b.status === "active" ? "Active" : "Deactivated", b.revenue.toFixed(2), b.expenses.toFixed(2), (b.revenue - b.expenses).toFixed(2)]),
    ]);

  const invitedCount = managers.filter((m) => m.status === "invited").length;
  const deactivatedManagers = managers.filter((m) => m.status === "deactivated").length;

  return (
    <Page>
      <BranchesHeader tab="branches" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active branches" icon={<Building2 size={16} aria-hidden />} value={active.length} lines={[`${state.branches.length - active.length} deactivated`]} />
        <StatCard label="Active managers" icon={<Users size={16} aria-hidden />} value={managers.filter((m) => m.status === "active" && m.branchId).length} lines={[`${invitedCount} invited · ${deactivatedManagers} deactivated`]} />
        {top && (
          <StatCard
            label="Highest revenue · October"
            icon={<Trophy size={16} aria-hidden />}
            value={money(top.revenue)}
            unit="USD"
            lines={[
              <span key="d" className="flex items-center gap-2">
                <Delta value={`${Math.abs(top.revDelta)}%`} direction={top.revDelta >= 0 ? "up" : "down"} tone={top.revDelta >= 0 ? "success" : "error"} />
                {top.name}
              </span>,
            ]}
          />
        )}
        {topExp && (
          <StatCard
            label="Highest expenses · October"
            icon={<FileText size={16} aria-hidden />}
            value={money(topExp.expenses)}
            unit="USD"
            lines={[
              <span key="d" className="flex items-center gap-2">
                <Delta value={`${Math.abs(topExp.expDelta)}%`} direction={topExp.expDelta >= 0 ? "up" : "down"} tone={topExp.expDelta >= 0 ? "error" : "success"} />
                {topExp.name}
              </span>,
            ]}
          />
        )}
      </div>

      <Card className="mt-6" aria-labelledby="compare-title">
        <CardHeader
          title="Compare branches"
          titleId="compare-title"
          subtitle={`Revenue and expenses · ${PERIOD_LABEL[period]} · USD`}
          className="flex-wrap"
          actions={
            <div className="flex flex-wrap items-center gap-4">
              <ul className="flex items-center gap-4" aria-label="Legend">
                <li className="flex items-center gap-1.5 text-xs leading-4 text-muted">
                  <span aria-hidden className="size-2.5 rounded-[2px] bg-chart-revenue" />
                  Revenue
                </li>
                <li className="flex items-center gap-1.5 text-xs leading-4 text-muted">
                  <span aria-hidden className="size-2.5 rounded-[2px] bg-chart-expense" />
                  Expenses
                </li>
              </ul>
              <Segmented
                label="Period"
                value={period}
                onChange={setPeriod}
                options={[
                  { value: "month", label: "October" },
                  { value: "quarter", label: "Last 3 months" },
                  { value: "ytd", label: "Year to date" },
                ]}
              />
            </div>
          }
        />
        <figure className="relative mx-5 mt-4 mb-5 h-[230px] pb-6 pl-12" aria-label={`Revenue and expenses by branch, ${PERIOD_LABEL[period]}`}>
          <div className="relative h-full">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="absolute inset-x-0" style={{ top: `${(i / 4) * 100}%` }}>
                <span className={cn("absolute inset-x-0 h-px", i === 4 ? "bg-chart-axis" : "bg-chart-grid")} />
                <span className="absolute -top-[7px] -left-12 w-10 text-right text-[11px] leading-[14px] text-muted">{short((chartMax * (4 - i)) / 4)}</span>
              </div>
            ))}
            <div className="absolute inset-0 flex">
              {active.map((b) => {
                const [rev, exp] = figures(b, period);
                return (
                  <div key={b.id} className="relative flex flex-1 items-end justify-center gap-1 md:gap-1.5" title={`${b.name}: revenue ${money(rev)}, expenses ${money(exp)}`}>
                    <span className="w-[clamp(14px,4.5vw,52px)] rounded-t-[3px] bg-chart-revenue transition-[height]" style={{ height: `${(rev / chartMax) * 100}%` }} />
                    <span className="w-[clamp(14px,4.5vw,52px)] rounded-t-[3px] bg-chart-expense transition-[height]" style={{ height: `${(exp / chartMax) * 100}%` }} />
                    <span className="absolute -bottom-[22px] w-full truncate text-center text-[11px] leading-[14px] text-muted">{b.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <figcaption className="sr-only">
            {active.map((b) => `${b.name}: revenue ${money(figures(b, period)[0])}, expenses ${money(figures(b, period)[1])}`).join("; ")}
          </figcaption>
        </figure>
      </Card>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SearchInput value={query} onChange={(v) => {
            setQuery(v);
            setPage(1);
          }} placeholder="Search branches" />
          <FilterMenu
            label="Status"
            value={status}
            onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
            options={[
              { value: "active", label: "Active" },
              { value: "deactivated", label: "Deactivated" },
            ]}
          />
          <FilterMenu label="City" value={city} onChange={(v) => {
            setCity(v);
            setPage(1);
          }} options={[...new Set(state.branches.map((b) => b.city))].map((c) => ({ value: c, label: c }))} />
          <Button variant="secondary" icon={Download} onClick={exportCsv} className="md:ml-auto">
            Export
          </Button>
        </div>
        <DataTable
          caption="Branches"
          columns={columns}
          rows={slice}
          rowKey={(b) => b.id}
          onRowClick={(b) => router.push(`/branches/${b.id}`)}
          rowClassName={(b) => (b.status === "deactivated" ? "bg-subtle/70" : undefined)}
          sort={sort}
          sortable={["revenue", "expenses", "profit"]}
          onSort={setSort}
          minWidth={960}
          empty="No branches match these filters."
          mobileRow={(b) => (
            <MobileRow
              title={branchLabel(b)}
              sub={`${managerCell(b).name} · ${b.status === "active" ? "Active" : "Deactivated"}`}
              value={muted(b) ? "—" : money(b.revenue)}
              valueSub={muted(b) ? undefined : `Profit ${money(b.revenue - b.expenses)}`}
            />
          )}
        />
        <Pagination page={current} pageSize={10} total={rows.length} noun="branches" onPage={setPage} />
      </Card>

      {dialog?.kind === "reassign" && <ReassignDialog branch={dialog.branch} open onClose={() => setDialog(null)} />}
      {dialog?.kind === "deactivate" && <DeactivateDialog branch={dialog.branch} open onClose={() => setDialog(null)} />}
    </Page>
  );
}

/* ---------- 07.5 Branch Managers ---------- */

export function ManagersList() {
  const { state, update } = useAdmin();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [moving, setMoving] = useState<ManagerRec | null>(null);

  const rows = state.managers.filter((m) => {
    const q = query.trim().toLowerCase();
    const at = m.status === "invited" ? m.pendingBranchId : m.branchId;
    return (!q || `${m.name} ${m.email}`.toLowerCase().includes(q)) && (!status || m.status === status) && (!branch || (branch === "none" ? !at : at === branch));
  });
  const { current, slice } = paginate(rows, page, 10);

  const setManager = (id: string, change: (m: ManagerRec) => void) =>
    update((draft) => {
      draft.managers.forEach((m) => (m.fresh = false));
      change(draft.managers.find((m) => m.id === id)!);
    });

  const branchCell = (m: ManagerRec) => {
    const text = managerBranchText(state, m);
    if (m.status === "invited" && m.pendingBranchId) return <TwoLine title={text} sub="Starts when accepted" titleClassName="font-medium" />;
    const pending = m.status === "active" && m.branchId ? pendingManager(state, m.branchId) : null;
    if (pending) return <TwoLine title={text} sub={`Until ${firstName(pending.name)} accepts`} titleClassName="font-medium" />;
    return <span className="text-fg">{text}</span>;
  };

  const linkBtn = "focus-ring cursor-pointer rounded-xs text-[13px] leading-5 font-medium text-brand hover:underline";
  const columns: Column<ManagerRec>[] = [
    {
      key: "manager",
      header: "Manager",
      width: "23%",
      cell: (m) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar initials={initialsOf(m.name)} />
          <TwoLine title={m.name} sub={m.email} />
        </div>
      ),
    },
    { key: "branch", header: "Branch", width: "16%", cell: branchCell },
    {
      key: "status",
      header: "Status",
      width: "11%",
      cell: (m) =>
        m.status === "active" ? <StatusPill tone="success">Active</StatusPill> : m.status === "invited" ? <StatusPill tone="sky">Invited</StatusPill> : <StatusPill tone="neutral" className="border border-line-strong bg-surface">Deactivated</StatusPill>,
    },
    {
      key: "last",
      header: "Last active",
      width: "18%",
      cell: (m) => <span className="whitespace-nowrap text-muted">{m.status === "invited" ? (m.fresh ? "Invitation sent just now" : `Invitation expires ${fmtDate(m.expires!).replace(" 2026", "")}`) : m.lastActive}</span>,
    },
    { key: "added", header: "Added", width: "11%", cell: (m) => <span className="whitespace-nowrap text-muted">{fmtDate(m.added)}</span> },
    {
      key: "actions",
      header: "Actions",
      srHeader: true,
      width: "21%",
      align: "right",
      cell: (m) => (
        <div className="flex items-center justify-end gap-4">
          {m.status === "active" && (
            <>
              <button type="button" className={linkBtn} onClick={() => setMoving(m)}>
                Reassign
              </button>
              <Menu
                align="end"
                width={220}
                triggerLabel={`More actions for ${m.name}`}
                triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-icon hover:bg-muted-bg"
                trigger={<Ellipsis size={16} aria-hidden />}
                items={[
                  {
                    id: "remove",
                    label: "Remove from branch",
                    disabled: !m.branchId,
                    onSelect: () => {
                      setManager(m.id, (x) => (x.branchId = null));
                      toast({ title: "Removed from branch", body: `${m.name} keeps an account with no branch.` });
                    },
                  },
                  {
                    id: "deactivate",
                    label: "Deactivate access",
                    onSelect: () => {
                      setManager(m.id, (x) => {
                        x.status = "deactivated";
                        x.lastActive = "Today";
                      });
                      toast({ title: "Access deactivated", body: `${m.name} can no longer sign in.` });
                    },
                  },
                ]}
              />
            </>
          )}
          {m.status === "invited" && (
            <>
              <button
                type="button"
                className={linkBtn}
                onClick={() => {
                  setManager(m.id, (x) => {
                    x.expires = "2026-11-07";
                    x.fresh = true;
                  });
                  toast({ title: "Invitation sent again", body: `Sent to ${m.email}. The link expires on 7 Nov 2026.` });
                }}
              >
                Resend
              </button>
              <button
                type="button"
                className={linkBtn}
                onClick={() => {
                  update((draft) => {
                    draft.managers = draft.managers.filter((x) => x.id !== m.id);
                  });
                  toast({ title: "Invitation cancelled", body: `The link sent to ${m.email} no longer works.` });
                }}
              >
                Cancel invite
              </button>
            </>
          )}
          {m.status === "deactivated" && (
            <button
              type="button"
              className={linkBtn}
              onClick={() => {
                const b = state.branches.find((x) => x.id === m.branchId);
                setManager(m.id, (x) => {
                  x.status = "active";
                  if (!b || b.status !== "active" || branchManager(state, b.id)) x.branchId = null;
                });
                toast({ title: `${m.name} reactivated`, body: "They can sign in again. Assign a branch with Reassign." });
              }}
            >
              Reactivate
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Page>
      <BranchesHeader tab="managers" />
      <Card className="mt-6">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SearchInput value={query} onChange={(v) => {
            setQuery(v);
            setPage(1);
          }} placeholder="Search by name or email" />
          <FilterMenu
            label="Branch"
            value={branch}
            onChange={(v) => {
            setBranch(v);
            setPage(1);
          }}
            options={[...state.branches.map((b) => ({ value: b.id, label: b.name })), { value: "none", label: "Not assigned" }]}
          />
          <FilterMenu
            label="Status"
            value={status}
            onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
            options={[
              { value: "active", label: "Active" },
              { value: "invited", label: "Invited" },
              { value: "deactivated", label: "Deactivated" },
            ]}
          />
        </div>
        <DataTable
          caption="Branch Managers"
          columns={columns}
          rows={slice}
          rowKey={(m) => m.id}
          rowClassName={(m) => (m.fresh ? "bg-success-subtle/70" : m.status === "deactivated" ? "bg-subtle/70" : undefined)}
          minWidth={980}
          empty="No managers match these filters."
          mobileRow={(m) => (
            <MobileRow
              leading={<Avatar initials={initialsOf(m.name)} />}
              title={m.name}
              sub={`${managerBranchText(state, m)} · ${m.email}`}
              value={m.status === "active" ? "Active" : m.status === "invited" ? "Invited" : "Deactivated"}
              valueSub={m.status === "active" ? (
                <button type="button" className={linkBtn} onClick={() => setMoving(m)}>
                  Reassign
                </button>
              ) : undefined}
            />
          )}
        />
        <Pagination page={current} pageSize={10} total={rows.length} noun="managers" onPage={setPage} />
      </Card>
      <Notice tone="info" icon={<Info size={18} aria-hidden />} title="Branch Managers cannot register on their own" className="mt-6">
        They join from an email invitation that expires after 7 days. A manager runs one branch at a time; you can choose the branch when you invite them or later.
      </Notice>
      {moving && <ManagerBranchDialog manager={moving} open onClose={() => setMoving(null)} />}
    </Page>
  );
}
