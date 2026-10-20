"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CloudUpload, Ellipsis, Lock, Plus } from "lucide-react";
import { AccountAvatar, accountBalanceLines, accountKindLabel, StatusPill } from "@/components/finance/common";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { PageHeader } from "@/components/ui/page";
import { useToast } from "@/components/ui/overlay";
import { useFinance } from "@/lib/finance-store";
import { cn } from "@/lib/format";
import type { Account } from "@/lib/mock/finance-types";
import { useSession } from "@/lib/session";

/** "Banking" page header and tab bar shared by the four Banking tabs. */
export function BankingHeader({ onAdd }: { onAdd?: () => void }) {
  const { user } = useSession();
  const router = useRouter();
  const isManager = user?.role === "manager";
  return (
    <>
      <PageHeader
        title="Banking"
        subtitle={
          isManager
            ? `Accounts assigned to ${user?.branch} Branch. Only the Business Owner can add accounts.`
            : "Cash, bank and wallet accounts across all branches."
        }
        actions={
          <>
            <Button variant="secondary" icon={CloudUpload} onClick={() => router.push("/banking/import")}>
              Import statement
            </Button>
            {isManager ? (
              <Button variant="secondary" icon={Lock} disabled title="Only the Business Owner can add accounts">
                Add account
              </Button>
            ) : (
              <Button icon={Plus} onClick={onAdd ?? (() => router.push("/banking/accounts?add=1"))}>
                Add account
              </Button>
            )}
          </>
        }
      />
    </>
  );
}

/** Account card from 06.2 (Cards view) and the Branch Manager overview. */
export function AccountCard({ account }: { account: Account }) {
  const { user } = useSession();
  const { update } = useFinance();
  const toast = useToast();
  const router = useRouter();
  const lines = accountBalanceLines(account);
  const deactivated = account.status === "deactivated";
  const href = `/banking/accounts/${account.id}`;
  return (
    <article className="relative flex flex-col rounded-lg border border-line bg-surface p-5 shadow-xs transition-colors focus-within:border-line-strong hover:border-line-strong">
      <div className="flex items-start gap-3">
        <AccountAvatar provider={account.provider} muted={deactivated} />
        <div className="min-w-0 flex-1">
          <h3 className={cn("truncate text-[15px] leading-[22px] font-semibold", deactivated ? "text-body" : "text-fg")}>
            <Link href={href} className="focus-ring rounded-xs after:absolute after:inset-0 after:content-['']">
              {account.name}
            </Link>
          </h3>
          <p className="truncate text-[13px] leading-[18px] text-muted">{accountKindLabel(account)}</p>
        </div>
        <div className="relative z-10">
          <Menu
            align="end"
            width={200}
            triggerLabel={`Actions for ${account.name}`}
            triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-icon hover:bg-muted-bg"
            trigger={<Ellipsis size={16} aria-hidden />}
            items={[
              { id: "open", label: "View account", onSelect: () => router.push(href) },
              { id: "import", label: "Import statement", disabled: deactivated || account.kind === "till", onSelect: () => router.push(`/banking/import?account=${account.id}`) },
              ...(user?.role === "owner"
                ? [
                    {
                      id: "toggle",
                      label: deactivated ? "Reactivate account" : "Deactivate account",
                      onSelect: () => {
                        update((draft) => {
                          const target = draft.accounts.find((a) => a.id === account.id)!;
                          target.status = deactivated ? "active" : "deactivated";
                          target.recon = deactivated ? { label: "Not reconciled yet", tone: "neutral" } : { label: "Deactivated", tone: "neutral" };
                        });
                        toast({ title: deactivated ? "Account reactivated" : "Account deactivated", body: `${account.name} ${deactivated ? "is active again" : "is hidden from new records. Its history is kept"}.` });
                      },
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </div>
      <p className="mt-4 flex items-baseline gap-1.5">
        <span className={cn("text-[22px] leading-8 font-semibold tracking-[-0.12px]", deactivated ? "text-body" : "text-fg")}>{lines.main}</span>
        <span className="text-xs leading-4 font-medium text-muted">{lines.unit}</span>
      </p>
      <p className="text-[13px] leading-5 text-muted">{lines.sub}</p>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-4">
        <span className="flex min-w-0 items-center gap-2 text-[13px] leading-5 text-muted">
          <Building2 size={16} className="shrink-0 text-icon" aria-hidden />
          <span className="truncate">{account.branch}</span>
        </span>
        <StatusPill tone={account.recon.tone === "neutral" ? "neutral" : account.recon.tone}>{account.recon.label}</StatusPill>
      </div>
    </article>
  );
}
