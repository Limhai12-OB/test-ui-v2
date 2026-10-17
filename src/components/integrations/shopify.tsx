"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Calendar, Check, CircleAlert, Ellipsis, ExternalLink, Info, Landmark, LoaderCircle, Package, Plug, RefreshCw, X } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, MobileRow, type Column } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextField } from "@/components/ui/fields";
import { FilterMenu, Pagination, paginate } from "@/components/ui/filters";
import { Menu } from "@/components/ui/menu";
import { ModalBody, ModalFooter, ModalHeader, useToast } from "@/components/ui/overlay";
import { Notice, Page, PageHeader, Tabs } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat";
import { useAdmin } from "@/lib/admin-store";
import { useFinance } from "@/lib/finance-store";
import { cn, fmtDate } from "@/lib/format";
import { SHOPIFY_RUNS, UNMAPPED, type SyncRun, type UnmappedProduct } from "@/lib/mock/admin-data";
import { useOps } from "@/lib/ops-store";
import { IntegrationStatus, KeyValues, SyncedTable } from "./integrations-shared";

const FREQUENCIES = ["Every 15 minutes", "Every hour", "Every 6 hours", "Once a day"];

function usePayoutAccounts() {
  const { state } = useFinance();
  return state.accounts.filter((a) => a.status === "active" && a.kind === "bank").map((a) => `${a.name} •••• ${a.last4}`);
}

export function ShopifyPage() {
  const { state } = useAdmin();
  return state.shopify.status === "not_connected" ? <ShopifyConnect /> : <ShopifyConnected />;
}

/* ---------- 15.2 Not connected ---------- */

function ShopifyConnect() {
  const { state, update } = useAdmin();
  const router = useRouter();
  const toast = useToast();
  const payouts = usePayoutAccounts();
  const branches = state.branches.filter((b) => b.status === "active");
  const [store, setStore] = useState(state.shopify.store);
  const [branch, setBranch] = useState(state.shopify.branch);
  const [payout, setPayout] = useState(payouts.includes(state.shopify.payout) ? state.shopify.payout : payouts[0]);
  const [from, setFrom] = useState(state.shopify.from);
  const [frequency, setFrequency] = useState(state.shopify.frequency);
  const [error, setError] = useState<string>();

  const connect = (event: React.FormEvent) => {
    event.preventDefault();
    const name = store.trim().toLowerCase().replace(/\.myshopify\.com$/, "");
    if (!/^[a-z0-9][a-z0-9-]{2,59}$/.test(name)) return setError("Use the name from your Shopify admin address: letters, numbers and dashes.");
    update((draft) => {
      Object.assign(draft.shopify, { status: "syncing", store: name, branch, payout, from, frequency, connectedOn: "31 Oct 2026", progress: 3 });
      draft.shopify.runs = [{ id: "first", started: "31 Oct, 19:02", day: 31, type: "First sync", what: "Orders, products, payouts", sub: `From ${fmtDate(from)}`, duration: "4 min", result: "running" }];
      draft.shopify.unmapped = structuredClone(UNMAPPED);
    });
    toast({ title: "Shopify connected", body: "The first sync has started. You can leave this page." });
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Integrations", href: "/integrations" }, { label: "Shopify" }]}
        title="Shopify"
        badges={<IntegrationStatus status="not_connected" />}
        subtitle="Bring your online orders, products and payouts into LuyFlow automatically."
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="Connect your store" />
            <form onSubmit={connect} noValidate className="flex flex-col gap-5 p-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="shopify-store" className="text-sm leading-5 font-medium text-fg">
                  Shopify store address
                </label>
                <div className="flex gap-2">
                  <input
                    id="shopify-store"
                    value={store}
                    onChange={(e) => {
                      setStore(e.target.value);
                      setError(undefined);
                    }}
                    aria-invalid={Boolean(error) || undefined}
                    aria-describedby="shopify-store-help"
                    className={cn("h-10 min-w-0 flex-1 rounded-md border bg-surface px-3 text-sm text-fg outline-none focus:ring-2 focus:ring-primary/20", error ? "border-error" : "border-icon-subtle focus:border-primary")}
                  />
                  <span className="inline-flex h-10 items-center rounded-md border border-line bg-muted-bg px-3 text-sm text-body">.myshopify.com</span>
                </div>
                <p id="shopify-store-help" className={cn("text-[13px] leading-5", error ? "text-error-fg" : "text-muted")}>
                  {error ?? "The name in your Shopify admin address, before “.myshopify.com”."}
                </p>
              </div>
              <div className="grid gap-4 border-t border-line pt-5 md:grid-cols-2">
                <SelectField label="Record online sales under" icon={Building2} value={branch} onChange={(e) => setBranch(e.target.value)} message="Online orders are fulfilled from this branch." options={branches.map((b) => ({ value: b.name, label: b.main ? `${b.name} (Main)` : b.name }))} />
                <SelectField label="Payouts arrive in" icon={Landmark} value={payout} onChange={(e) => setPayout(e.target.value)} message="Used to match Shopify payouts to bank lines." options={payouts.map((p) => ({ value: p, label: p }))} />
                <TextField size="md" label="Import orders from" icon={Calendar} type="date" value={from} max="2026-10-31" onChange={(e) => setFrom(e.target.value)} message="Earlier orders are not imported." />
                <SelectField label="Sync frequency" icon={RefreshCw} value={frequency} onChange={(e) => setFrequency(e.target.value)} message="You can also sync manually at any time." options={FREQUENCIES.map((f) => ({ value: f, label: f }))} />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="mr-auto flex items-center gap-1.5 text-[13px] leading-5 text-muted">
                  <ExternalLink size={14} aria-hidden />
                  You approve the connection on Shopify itself. (Simulated in this demo.)
                </p>
                <Button variant="secondary" onClick={() => router.push("/integrations")}>
                  Cancel
                </Button>
                <Button type="submit" iconRight={ExternalLink}>
                  Connect to Shopify
                </Button>
              </div>
            </form>
          </Card>
          <Card>
            <CardHeader title="What will be synced" />
            <SyncedTable
              rows={[
                ["Orders", "Sales", "/sales", "Each paid order becomes an online sale with its items, discount and tax."],
                ["Products", "Items & Inventory", "/inventory", "Matched to your items by SKU. Unmatched products wait for you to map them."],
                ["Refunds", "Sales", "/sales", "Recorded against the original sale. The original amount is kept."],
                ["Payouts", "Banking", "/banking", "Matched to the deposit on your bank statement, with Shopify fees as an expense."],
              ]}
            />
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="h-fit">
            <CardHeader title="Access LuyFlow asks for" />
            <ul className="flex flex-col gap-3 p-5 text-sm leading-5 text-body">
              {["Read orders and refunds", "Read products and stock levels", "Read payouts and fees"].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check size={16} className="mt-0.5 shrink-0 text-icon-success" aria-label="Allowed" />
                  {t}
                </li>
              ))}
              <li className="border-t border-line" aria-hidden />
              {["No permission to change products, prices or orders", "No access to customer payment details"].map((t) => (
                <li key={t} className="flex gap-3">
                  <X size={16} className="mt-0.5 shrink-0 text-icon-error" aria-label="Not allowed" />
                  {t}
                </li>
              ))}
            </ul>
          </Card>
          <Notice tone="neutral" icon={<Info size={18} aria-hidden />} title="One-way sync">
            LuyFlow reads from Shopify. Stock sold in your branches is not pushed back to the online store.
          </Notice>
        </div>
      </div>
    </Page>
  );
}

/* ---------- 15.3 / 15.4 / 15.5 Connected, syncing, error ---------- */

function ShopifyConnected() {
  const { state, update } = useAdmin();
  const toast = useToast();
  const { shopify } = state;
  const [tab, setTab] = useState("status");
  const [checking, setChecking] = useState(false);
  const [disconnect, setDisconnect] = useState(false);
  const [mapping, setMapping] = useState<UnmappedProduct | null>(null);
  const syncing = shopify.status === "syncing";
  const error = shopify.status === "error";

  // First sync: advance the simulated progress while the page is open.
  useEffect(() => {
    if (!syncing) return;
    const timer = setInterval(() => {
      update((draft) => {
        const s = draft.shopify;
        if (s.status !== "syncing") return;
        s.progress = Math.min(100, s.progress + 6);
        if (s.progress >= 100) {
          s.status = "connected";
          s.runs = structuredClone(SHOPIFY_RUNS);
        }
      });
    }, 700);
    return () => clearInterval(timer);
  }, [syncing, update]);

  const reconnect = () => {
    update((draft) => {
      draft.shopify.status = "connected";
    });
    toast({ title: "Shopify reconnected", body: "Syncing resumes at the next scheduled run. (Simulated in this demo.)" });
  };

  const syncNow = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      toast({ title: "Shopify is up to date", body: "No new orders since 18:45. Runs with nothing new are not listed." });
    }, 1800);
  };

  const menu = (
    <Menu
      align="end"
      width={260}
      triggerLabel="More Shopify actions"
      triggerClassName="inline-flex size-10 items-center justify-center rounded-md border border-line-strong bg-surface text-icon-strong hover:bg-subtle"
      trigger={<Ellipsis size={18} aria-hidden />}
      items={[
        { id: "settings", label: "Sync settings", onSelect: () => setTab("settings") },
        ...(shopify.status === "connected"
          ? [
              {
                id: "expire",
                label: "Simulate expired access",
                description: "Demo: shows the Error state",
                onSelect: () => {
                  update((draft) => {
                    draft.shopify.status = "error";
                    draft.shopify.runs = draft.shopify.runs.map((r) => (r.id === "r12" ? { ...r, what: "Could not connect", sub: "Access removed or expired", duration: "2 s", result: "failed" as const } : r));
                  });
                },
              },
            ]
          : []),
        { id: "disconnect", label: "Disconnect Shopify", onSelect: () => setDisconnect(true) },
      ]}
    />
  );

  const unmapped = shopify.unmapped.length;
  const matched = 48 - unmapped;

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Integrations", href: "/integrations" }, { label: "Shopify" }]}
        title="Shopify"
        badges={<IntegrationStatus status={shopify.status} />}
        subtitle={`Online store · ${shopify.store}.myshopify.com`}
        actions={
          <>
            {error ? (
              <Button icon={Plug} onClick={reconnect}>
                Reconnect
              </Button>
            ) : (
              <Button variant="secondary" onClick={syncNow} disabled={syncing || checking} aria-busy={syncing || checking || undefined}>
                {syncing || checking ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <RefreshCw size={16} aria-hidden />}
                {syncing || checking ? "Syncing…" : "Sync now"}
              </Button>
            )}
            {menu}
          </>
        }
      />
      <Tabs
        label="Shopify sections"
        className="mt-6"
        value={tab}
        onChange={setTab}
        items={[
          { id: "status", label: "Sync status" },
          { id: "mapping", label: "Product mapping", count: !syncing && unmapped ? unmapped : undefined },
          { id: "settings", label: "Settings" },
        ]}
      />

      {tab === "status" && (
        <>
          {syncing && <FirstSyncProgress progress={shopify.progress} from={shopify.from} />}
          {error && (
            <Notice
              tone="error"
              className="mt-6"
              icon={<CircleAlert size={18} aria-hidden />}
              title="The last sync failed at 18:45"
              action={
                <button type="button" onClick={reconnect} className="focus-ring cursor-pointer rounded-xs text-sm font-medium text-error-fg hover:underline">
                  Reconnect
                </button>
              }
            >
              Shopify says LuyFlow’s access was removed or has expired. Nothing was half-imported: records up to 31 Oct 2026, 18:30 are complete. Reconnect to continue syncing.
            </Notice>
          )}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {syncing ? (
              <>
                <StatCard label="Last successful sync" value="—" lines={["First sync running", "Started today, 19:02"]} />
                <StatCard label="Orders synced · October" value="—" lines={["Importing…", "Available after the first sync"]} />
                <StatCard label="Products matched" value="—" lines={["Matching by SKU…", "Available after the first sync"]} />
                <StatCard label="Payouts matched" value="—" lines={["Matching to bank lines…", "Available after the first sync"]} />
              </>
            ) : (
              <>
                <StatCard label="Last successful sync" value={error ? "18:30" : "18:45"} valueTone={error ? "error" : undefined} tone={error ? "error" : "default"} lines={["31 Oct 2026", error ? "1 failed attempt since" : "Next automatic sync at 19:00"]} />
                <StatCard label="Orders synced · October" value={error ? 314 : 318} lines={[error ? "$3,768.20 USD online sales" : "$3,820.00 USD online sales", "3 refunds · $36.40"]} />
                <StatCard label="Products matched" value={`${matched} of 48`} lines={[unmapped ? `${unmapped} need mapping` : "All products matched", "Matched by SKU"]} />
                <StatCard label="Payouts matched" value="4 of 4" lines={["$3,702.10 after fees", "ABA Business USD"]} />
              </>
            )}
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <SyncHistory runs={shopify.runs} />
            <div className="flex min-w-0 flex-col gap-6">
              {!syncing && <ProductsToMap items={shopify.unmapped} onMap={setMapping} />}
              <ConnectionCard />
            </div>
          </div>
        </>
      )}

      {tab === "mapping" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          {syncing ? (
            <Card className="p-8 text-center text-sm text-muted">Products are matched when the first sync finishes.</Card>
          ) : (
            <ProductsToMap items={shopify.unmapped} onMap={setMapping} wide />
          )}
          <Notice tone="neutral" icon={<Info size={18} aria-hidden />} title="How matching works" className="self-start">
            Shopify products are matched to your items by SKU. A product that sells a pack of an item (such as × 6) can be mapped to the item it contains.
          </Notice>
        </div>
      )}

      {tab === "settings" && <ShopifySettings onDisconnect={() => setDisconnect(true)} />}

      <Dialog open={Boolean(mapping)} onClose={() => setMapping(null)} labelledBy="map-title" width={520}>
        {mapping && <MapForm product={mapping} onClose={() => setMapping(null)} />}
      </Dialog>
      <ConfirmDialog
        open={disconnect}
        onClose={() => setDisconnect(false)}
        id="shopify-disconnect"
        icon={<Plug size={20} aria-hidden />}
        title="Disconnect Shopify?"
        confirmLabel="Disconnect"
        confirmVariant="danger"
        focusCancel
        onConfirm={() => {
          update((draft) => {
            draft.shopify.status = "not_connected";
          });
          setDisconnect(false);
          toast({ title: "Shopify disconnected", body: "Orders already synced stay in Sales. New orders are no longer imported." });
        }}
      >
        New online orders and payouts stop coming in. Orders already synced stay in Sales and Banking.
      </ConfirmDialog>
    </Page>
  );
}

function FirstSyncProgress({ progress, from }: { progress: number; from: string }) {
  const p = progress / 100;
  const minutes = Math.max(1, Math.round((1 - p) * 5));
  return (
    <section className="mt-6 rounded-lg border border-icon-info/25 bg-info-subtle px-5 py-4" aria-live="polite">
      <div className="flex items-start gap-3">
        <LoaderCircle size={20} className="mt-0.5 shrink-0 animate-spin text-icon-info" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-5 font-semibold text-fg">First sync in progress</p>
          <p className="text-sm leading-5 text-body">Importing orders from {fmtDate(from)}. You can leave this page; we will notify you when it finishes.</p>
        </div>
        <span className="text-xl leading-7 font-semibold text-info-fg">{progress}%</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-icon-info/20" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="First sync progress">
        <div className="h-full rounded-full bg-icon-info transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-[13px] leading-5">
        {[
          ["Orders read", `${Math.round(2406 * p).toLocaleString("en-US")} of 2,406`],
          ["Products read", `${Math.min(48, Math.round(48 * p * 1.6))} of 48`],
          ["Payouts read", `${Math.round(35 * p)} of 35`],
          ["Estimated time left", `About ${minutes} minute${minutes === 1 ? "" : "s"}`],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted">{label}</dt>
            <dd className="font-medium text-fg">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SyncHistory({ runs }: { runs: SyncRun[] }) {
  const [result, setResult] = useState<string | null>(null);
  const [range, setRange] = useState<string | null>("7");
  const [page, setPage] = useState(1);
  const rows = runs.filter((r) => (!result || r.result === result) && (!range || range === "30" || 31 - r.day < 7));
  const { current, slice } = paginate(rows, page, 7);
  const columns: Column<SyncRun>[] = [
    { key: "started", header: "Started", width: "21%", cell: (r) => <span className="text-muted">{r.started}</span> },
    { key: "type", header: "Type", width: "17%", cell: (r) => <span className="text-fg">{r.type}</span> },
    {
      key: "what",
      header: "What was synced",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] leading-5 font-medium text-fg">{r.what}</p>
          <p className="truncate text-xs leading-4 text-muted">{r.sub}</p>
        </div>
      ),
    },
    { key: "duration", header: "Duration", width: "13%", cell: (r) => <span className="text-muted">{r.duration}</span> },
    { key: "result", header: "Result", width: "19%", cell: (r) => <IntegrationStatus status={r.result === "review" ? "needs_review" : r.result} /> },
  ];
  return (
    <Card aria-labelledby="history-title" className="h-fit">
      <CardHeader
        title="Sync history"
        titleId="history-title"
        subtitle="Runs with nothing new are not listed; failed runs are."
        divided
        className="flex-wrap"
        actions={
          <>
            <FilterMenu
              label="Result"
              value={result}
              onChange={(v) => {
                setResult(v);
                setPage(1);
              }}
              options={[
                { value: "completed", label: "Completed" },
                { value: "failed", label: "Failed" },
                { value: "running", label: "Running" },
              ]}
            />
            <FilterMenu
              label="Date"
              icon="calendar"
              value={range}
              onChange={(v) => {
                setRange(v);
                setPage(1);
              }}
              options={[
                { value: "7", label: "Last 7 days" },
                { value: "30", label: "Last 30 days" },
              ]}
            />
          </>
        }
      />
      <DataTable
        caption="Sync history"
        columns={columns}
        rows={slice}
        rowKey={(r) => r.id}
        minWidth={640}
        empty="No runs match these filters."
        mobileRow={(r) => <MobileRow title={r.what} sub={`${r.started} · ${r.type} · ${r.sub}`} value={<IntegrationStatus status={r.result === "review" ? "needs_review" : r.result} />} />}
      />
      {rows.length > 7 && <Pagination page={current} pageSize={7} total={rows.length} noun="runs" onPage={setPage} />}
    </Card>
  );
}

function ProductsToMap({ items, onMap, wide }: { items: UnmappedProduct[]; onMap: (p: UnmappedProduct) => void; wide?: boolean }) {
  return (
    <Card aria-labelledby="map-list-title" className="h-fit">
      <CardHeader
        title="Products to map"
        titleId="map-list-title"
        badge={items.length ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning-subtle px-1.5 text-xs font-medium text-warning-fg">{items.length}</span> : undefined}
        subtitle={items.length ? "Orders with these products are synced as “Unmapped item” until you map them." : "Every Shopify product is matched to an item."}
      />
      <ul className={cn("flex flex-col px-5 pb-3", wide ? "pt-2" : "pt-1")}>
        {items.map((p) => (
          <li key={p.id} className="flex items-center gap-3 border-b border-line-subtle py-3.5 last:border-b-0">
            <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-warning-subtle text-icon-warning">
              <Package size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm leading-5 font-medium text-fg">{p.name}</span>
              <span className="block text-xs leading-4 text-muted">SKU {p.sku}</span>
              <span className="block text-xs leading-4 text-muted">{p.hint}</span>
            </span>
            <Button variant="secondary" size="sm" onClick={() => onMap(p)}>
              Map
            </Button>
          </li>
        ))}
        {!items.length && (
          <li className="flex items-center gap-2 py-3 text-[13px] leading-5 text-success-fg">
            <Check size={16} aria-hidden />
            Nothing to map
          </li>
        )}
      </ul>
    </Card>
  );
}

function MapForm({ product, onClose }: { product: UnmappedProduct; onClose: () => void }) {
  const { update } = useAdmin();
  const { state } = useOps();
  const toast = useToast();
  const [itemId, setItemId] = useState(product.suggestion ?? "");
  const [qty, setQty] = useState(product.sku.endsWith("-6") ? "6" : "1");
  const item = state.items.find((i) => i.id === itemId);
  const save = () => {
    if (!item) return;
    update((draft) => {
      draft.shopify.unmapped = draft.shopify.unmapped.filter((p) => p.id !== product.id);
    });
    toast({ title: "Product mapped", body: `${product.name} now sells ${qty === "1" ? "" : `${qty} × `}${item?.name}. Earlier orders were updated.` });
    onClose();
  };
  return (
    <>
      <ModalHeader id="map-title" title="Map product" description={`${product.name} · SKU ${product.sku}`} icon={<Package size={20} aria-hidden />} onClose={onClose} />
      <ModalBody className="flex flex-col gap-4">
        <SelectField label="LuyFlow item" value={itemId} onChange={(e) => setItemId(e.target.value)} options={[{ value: "", label: "Choose an item", disabled: true }, ...state.items.filter((i) => i.active).map((i) => ({ value: i.id, label: `${i.name} · ${i.sku}` }))]} />
        <TextField size="md" label="Units of the item in one product" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, "") || "1")} message="For example 6 for a six-pack of single cans." />
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} disabled={!item}>
          Map product
        </Button>
      </ModalFooter>
    </>
  );
}

function ConnectionCard() {
  const { state } = useAdmin();
  const s = state.shopify;
  return (
    <Card aria-labelledby="connection-title" className="h-fit">
      <CardHeader title="Connection" titleId="connection-title" />
      <div className="p-5">
        <KeyValues
          rows={[
            ["Store", `${s.store}.myshopify.com`],
            ["Connected by", `Sokha Chan · ${s.connectedOn}`],
            ["Online sales branch", s.branch === "Central Market" ? "Central Market (Main)" : s.branch],
            ["Payout account", s.payout],
            ["Frequency", s.frequency],
            ["Access", "Read-only"],
          ]}
        />
      </div>
    </Card>
  );
}

function ShopifySettings({ onDisconnect }: { onDisconnect: () => void }) {
  const { state, update } = useAdmin();
  const toast = useToast();
  const payouts = usePayoutAccounts();
  const [branch, setBranch] = useState(state.shopify.branch);
  const [payout, setPayout] = useState(state.shopify.payout);
  const [frequency, setFrequency] = useState(state.shopify.frequency);
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <Card>
        <CardHeader title="Sync settings" subtitle="Changes apply from the next sync." />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <SelectField label="Record online sales under" icon={Building2} value={branch} onChange={(e) => setBranch(e.target.value)} options={state.branches.filter((b) => b.status === "active").map((b) => ({ value: b.name, label: b.main ? `${b.name} (Main)` : b.name }))} />
          <SelectField label="Payouts arrive in" icon={Landmark} value={payout} onChange={(e) => setPayout(e.target.value)} options={payouts.map((p) => ({ value: p, label: p }))} />
          <SelectField label="Sync frequency" icon={RefreshCw} value={frequency} onChange={(e) => setFrequency(e.target.value)} options={FREQUENCIES.map((f) => ({ value: f, label: f }))} />
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">
          <Button variant="ghost" className="text-error-fg hover:bg-error-subtle" onClick={onDisconnect}>
            Disconnect Shopify
          </Button>
          <Button
            className="ml-auto"
            onClick={() => {
              update((draft) => Object.assign(draft.shopify, { branch, payout, frequency }));
              toast({ title: "Shopify settings saved", body: "They apply from the next sync." });
            }}
          >
            Save settings
          </Button>
        </div>
      </Card>
      <ConnectionCard />
    </div>
  );
}
