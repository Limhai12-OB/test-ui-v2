"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CloudUpload, FileChartColumn, Keyboard, Landmark, Mail, MessageCircle, ReceiptText, Search, ShoppingCart, Sparkles, X } from "lucide-react";
import { FaqAccordion } from "@/components/hairline/faq-accordion";
import { Card, CardHeader } from "@/components/ui/card";
import { Page, PageHeader } from "@/components/ui/page";
import { useSession } from "@/lib/session";

type Faq = { question: string; answer: string; topic: string; owner?: boolean };

const FAQS: Faq[] = [
  { topic: "Getting started", question: "What is the difference between a Business Owner and a Branch Manager?", answer: "The Business Owner sees every branch and can manage branches, integrations, forecasts and monthly reports. A Branch Manager only sees the branch they were invited to, and owner-only screens show a lock." },
  { topic: "Getting started", question: "Can I switch between USD and KHR?", answer: "Yes. The USD / KHR switch in the top bar changes how amounts are shown. Records keep the currency they were made in; KHR figures are display conversions at 4,100 KHR per USD." },
  { topic: "Banking", question: "How do I import a bank statement?", answer: "Open Banking → Import statement, choose the bank and account, and upload the CSV or Excel export from ABA, ACLEDA or Wing. AI suggests a category for each line and you confirm the uncertain ones before anything is saved." },
  { topic: "Banking", question: "What does reconciliation sign-off mean?", answer: "A Branch Manager submits a reconciliation or till count, and the Business Owner signs it off. Signed-off periods are locked: imports and edits never change them." },
  { topic: "Sales", question: "How do I record a payment from a payment slip?", answer: "Use Scan receipt → Payment slip, or open the invoice and choose Record payment. The slip is attached as proof, and the invoice becomes Paid or Partially paid." },
  { topic: "Sales", question: "Can I create an invoice by voice?", answer: "Yes. Sales → Invoices → Voice to invoice lets you describe the order in Khmer or English. AI drafts the invoice; you check every line before it is saved." },
  { topic: "Expenses", question: "How do I scan a receipt?", answer: "Tap the round scan button at the bottom of the phone screen, or use Scan receipt in the search. Take the photo, check the fields AI filled in, and save. The receipt photo is attached to the expense." },
  { topic: "Expenses", question: "How do I import old expenses from a spreadsheet?", answer: "Data Import → Expenses walks you through 11 steps: upload, AI reading, column matching, cleanup, duplicates and validation. Nothing is saved until you confirm, and the whole import can be undone for 30 days." },
  { topic: "Reports", question: "Why is a monthly report marked Incomplete?", answer: "A report is Complete only when all 12 checks pass, for example every account and till is signed off and no drafts are left. The Completeness tab lists what is open and links to the screen that fixes it.", owner: true },
  { topic: "Reports", question: "How reliable are the forecasts?", answer: "Each forecast shows a range (P10 to P90) and a reliability level from backtests on your recorded months. They describe past performance, not a guarantee.", owner: true },
  { topic: "AI Advisor", question: "Can the AI Advisor change my records?", answer: "No. The advisor is read-only. It answers from your records, shows which records it used, and links you to the right screen when something needs changing." },
  { topic: "AI Advisor", question: "Does the advisor understand Khmer?", answer: "Yes. Ask in Khmer or English; answers come back in the language you asked in." },
];

const TOPICS = [
  { name: "Getting started", icon: BookOpen, href: "/dashboard", text: "Dashboard, roles and currencies" },
  { name: "Banking", icon: Landmark, href: "/banking", text: "Accounts, statements and reconciliation" },
  { name: "Sales", icon: ShoppingCart, href: "/sales", text: "Walk-in sales, invoices and customers" },
  { name: "Expenses", icon: ReceiptText, href: "/financial-records", text: "Bills, receipts and categories" },
  { name: "Reports", icon: FileChartColumn, href: "/monthly-reports", text: "Monthly reports and forecasts", owner: true },
  { name: "AI Advisor", icon: Sparkles, href: "/ai-advisor", text: "Questions about your numbers" },
];

const SHORTCUTS: [string[], string][] = [
  [["⌘", "K"], "Search pages, invoices, customers and bills"],
  [["Esc"], "Close a dialog, menu or the search"],
  [["Enter"], "Send a question to the AI Advisor"],
  [["Shift", "Enter"], "New line in a question"],
];

/** Help & support (no Figma frame; built in the app's style). */
export function Help() {
  const { user } = useSession();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const isManager = user?.role === "manager";

  const faqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.filter((f) => (!isManager || !f.owner) && (!topic || f.topic === topic) && (!q || `${f.question} ${f.answer}`.toLowerCase().includes(q)));
  }, [query, topic, isManager]);

  if (!user) return null;
  const topics = TOPICS.filter((t) => !isManager || !t.owner);

  return (
    <Page>
      <PageHeader title="Help & support" subtitle="Answers to common questions about LuyFlow, in plain language." />

      <label className="mt-6 flex h-12 max-w-[720px] items-center gap-3 rounded-lg border border-line-strong bg-surface px-4 shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <Search size={18} className="shrink-0 text-icon" aria-hidden />
        <span className="sr-only">Search help</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help, e.g. “reconciliation” or “receipt”"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-placeholder [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="focus-ring cursor-pointer rounded-xs text-icon hover:text-icon-strong">
            <X size={16} aria-hidden />
          </button>
        )}
      </label>

      <section aria-labelledby="topics-title" className="mt-6">
        <h2 id="topics-title" className="sr-only">
          Topics
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {topics.map(({ name, icon: Icon, text }) => {
            const active = topic === name;
            return (
              <button
                key={name}
                type="button"
                aria-pressed={active}
                onClick={() => setTopic(active ? null : name)}
                className={`lift focus-ring flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-left shadow-xs ${active ? "border-primary bg-primary-subtle/60 ring-1 ring-primary" : "border-line bg-surface hover:bg-subtle"}`}
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-brand">
                  <Icon size={19} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-fg">{name}</span>
                  <span className="block truncate text-[13px] text-muted">{text}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card aria-labelledby="faq-title">
          <CardHeader
            title={topic ? `${topic} questions` : "Frequently asked questions"}
            titleId="faq-title"
            subtitle={`${faqs.length} answer${faqs.length === 1 ? "" : "s"}${query ? ` for “${query}”` : ""}`}
            actions={
              topic ? (
                <button type="button" onClick={() => setTopic(null)} className="focus-ring cursor-pointer rounded-xs text-[13px] font-medium text-brand hover:underline">
                  Show all topics
                </button>
              ) : undefined
            }
          />
          <div className="px-5 pt-2 pb-5">
            {faqs.length ? (
              <FaqAccordion key={`${topic}-${query}`} items={faqs.map((f) => ({ question: f.question, answer: f.answer }))} defaultOpen={query ? [0] : []} />
            ) : (
              <p className="py-10 text-center text-sm text-muted">No answers match “{query}”. Try a shorter word, or ask the AI Advisor.</p>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card aria-labelledby="contact-title">
            <CardHeader title="Still stuck?" titleId="contact-title" subtitle="Other places to get an answer." />
            <div className="flex flex-col gap-2 p-5">
              <Link href="/ai-advisor" className="lift focus-ring flex items-center gap-3 rounded-md border border-line px-4 py-3 hover:bg-subtle">
                <Sparkles size={18} className="text-icon-ai" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">Ask the AI Advisor</span>
                  <span className="block text-xs text-muted">About your own numbers</span>
                </span>
                <ArrowRight size={16} className="text-icon" aria-hidden />
              </Link>
              <Link href={isManager ? "/settings" : "/settings/security"} className="lift focus-ring flex items-center gap-3 rounded-md border border-line px-4 py-3 hover:bg-subtle">
                <Mail size={18} className="text-icon" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">{isManager ? "Contact the Business Owner" : "Account and security"}</span>
                  <span className="block text-xs text-muted">{isManager ? "Sokha Chan · sokha@mekongmart.com.kh" : "Password, sign-in and linked accounts"}</span>
                </span>
                <ArrowRight size={16} className="text-icon" aria-hidden />
              </Link>
              <Link href="/notifications/telegram" className="lift focus-ring flex items-center gap-3 rounded-md border border-line px-4 py-3 hover:bg-subtle">
                <MessageCircle size={18} className="text-icon" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">Telegram alerts</span>
                  <span className="block text-xs text-muted">Get reminders where you already chat</span>
                </span>
                <ArrowRight size={16} className="text-icon" aria-hidden />
              </Link>
            </div>
          </Card>

          <Card aria-labelledby="keys-title">
            <CardHeader title="Keyboard shortcuts" titleId="keys-title" badge={<Keyboard size={16} className="text-icon" aria-hidden />} />
            <dl className="flex flex-col gap-3 p-5 text-sm">
              {SHORTCUTS.map(([keys, label]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <dt className="text-body">{label}</dt>
                  <dd className="flex shrink-0 gap-1">
                    {keys.map((k) => (
                      <kbd key={k} className="rounded-xs border border-line bg-subtle px-1.5 py-0.5 font-sans text-xs text-fg">
                        {k}
                      </kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          {!isManager && (
            <Link href="/data-import" className="lift focus-ring flex items-center gap-3 rounded-lg border border-icon-ai/20 bg-ai-subtle p-4">
              <CloudUpload size={20} className="shrink-0 text-icon-ai" aria-hidden />
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-semibold text-fg">Moving from spreadsheets?</span>
                <span className="block text-body">Data Import brings your old records in, step by step.</span>
              </span>
              <ArrowRight size={16} className="text-icon" aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </Page>
  );
}
