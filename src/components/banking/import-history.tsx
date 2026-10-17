"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, RotateCcw } from "lucide-react";
import { AccountAvatar, StatusPill } from "@/components/finance/common";
import { DataTable, MobileRow, TwoLine, type SortState } from "@/components/ui/data-table";
import { FilterBar, FilterMenu, Pagination, paginate, SearchInput } from "@/components/ui/filters";
import { Page, ScopeNotice } from "@/components/ui/page";
import { useFinance } from "@/lib/finance-store";
import { downloadCsv } from "@/lib/format";
import type { ImportRecord } from "@/lib/mock/finance-types";
import { useSession } from "@/lib/session";
import { BankingHeader } from "./banking-shared";

const STATUS = {
  review: { label: "Needs Review", tone: "warning" as const },
  completed: { label: "Completed", tone: "success" as const },
  failed: { label: "Failed", tone: "error" as const },
};

function fmtStamp(iso: string) {
  const [date, time] = iso.split("T");
  const [y, m, d] = date.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}, ${time}`;
}

/** Frame 06.9 "Import History". */
export function ImportHistory() {
  const { state } = useFinance();
  const { user } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [period, setPeriod] = useState<string | null>("3");
  const [sort, setSort] = useState<SortState>({ key: "imported", dir: "desc" });
  const [page, setPage] = useState(1);

  const cutoff = period === "3" ? "2026-08-01" : period === "6" ? "2026-05-01" : "0000";
  const rows = state.imports
    .filter((row) => (!query || row.file.toLowerCase().includes(query.toLowerCase())) && (!account || row.accountId === account) && (!status || row.status === status) && row.importedAt >= cutoff)
    .sort((a, b) => (sort.dir === "desc" ? b.importedAt.localeCompare(a.importedAt) : a.importedAt.localeCompare(b.importedAt)));
  const { current, slice } = paginate(rows, page, 8);
  const accountOf = (row: ImportRecord) => state.accounts.find((a) => a.id === row.accountId);

  const open = (row: ImportRecord) => {
    if (row.status === "review") router.push("/banking/import/review");
    else if (row.status === "failed") router.push(`/banking/import?account=${row.accountId}`);
    else router.push(`/banking/accounts/${row.accountId}/transactions`);
  };

  return (
    <Page>
      <BankingHeader />
      {user?.role === "manager" && <ScopeNotice branch={user.branch} className="mt-6" />}
      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-label="Import history">
        <FilterBar className="border-b border-line">
          <SearchInput value={query} onChange={setQuery} placeholder="Search file name" />
          <FilterMenu label="Account" value={account} onChange={setAccount} options={state.accounts.filter((a) => a.kind !== "till").map((a) => ({ value: a.id, label: a.name }))} />
          <FilterMenu label="Status" value={status} onChange={setStatus} options={Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label }))} />
          <FilterMenu
            label="Period"
            icon="calendar"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "3", label: "Last 3 months" },
              { value: "6", label: "Last 6 months" },
            ]}
          />
        </FilterBar>
        <DataTable
          caption="Statement imports"
          rows={slice}
          rowKey={(row) => row.id}
          sort={sort}
          sortable={["imported"]}
          onSort={setSort}
          empty="No imports match these filters."
          minWidth={980}
          columns={[
            { key: "imported", header: "Imported", width: "170px", cell: (row) => <span className="whitespace-nowrap text-muted">{fmtStamp(row.importedAt)}</span> },
            { key: "period", header: "Statement period", width: "150px", cell: (row) => <span className="whitespace-nowrap text-fg">{row.period}</span> },
            {
              key: "account",
              header: "Bank account",
              cell: (row) => {
                const a = accountOf(row);
                return a ? (
                  <div className="flex items-center gap-2.5">
                    <AccountAvatar provider={a.provider} size={32} />
                    <TwoLine title={a.name} sub={`•••• ${a.last4}`} />
                  </div>
                ) : null;
              },
            },
            { key: "file", header: "File", cell: (row) => <TwoLine title={row.file} titleClassName="font-normal" sub={row.note ?? `by ${row.by}`} /> },
            { key: "lines", header: "Lines", align: "right", width: "70px", cell: (row) => <span className="tabular text-fg">{row.lines}</span> },
            { key: "status", header: "Status", width: "140px", cell: (row) => <StatusPill tone={STATUS[row.status].tone}>{STATUS[row.status].label}</StatusPill> },
            {
              key: "actions",
              header: "Actions",
              srHeader: true,
              width: "88px",
              cell: (row) => (
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => open(row)}
                    aria-label={row.status === "failed" ? `Retry ${row.file}` : `View ${row.file}`}
                    title={row.status === "failed" ? "Try again" : "View"}
                    className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon-strong hover:bg-muted-bg"
                  >
                    {row.status === "failed" ? <RotateCcw size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadCsv(`${row.file.replace(/\.\w+$/, "")}-import-summary.csv`, [
                        ["File", "Account", "Statement period", "Imported", "Lines", "Status"],
                        [row.file, accountOf(row)?.name ?? "", row.period, fmtStamp(row.importedAt), row.lines, STATUS[row.status].label],
                      ])
                    }
                    aria-label={`Download import summary for ${row.file}`}
                    title="Download import summary"
                    className="focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-icon-strong hover:bg-muted-bg"
                  >
                    <Download size={16} aria-hidden />
                  </button>
                </div>
              ),
            },
          ]}
          onRowClick={open}
          mobileRow={(row) => {
            const a = accountOf(row);
            return (
              <MobileRow
                leading={a && <AccountAvatar provider={a.provider} size={32} />}
                title={row.file}
                sub={`${a?.name} · ${row.period}`}
                value={<StatusPill tone={STATUS[row.status].tone}>{STATUS[row.status].label}</StatusPill>}
                valueSub={`${row.lines} lines`}
              />
            );
          }}
        />
        <Pagination page={current} pageSize={8} total={rows.length} noun="imports" onPage={setPage} />
      </section>
    </Page>
  );
}
