"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUp,
  Building2,
  Calendar,
  ChevronDown,
  FileText,
  Eye,
  History,
  Languages,
  Lock,
  MessageSquare,
  MessageSquarePlus,
  Mic,
  ReceiptText,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { ScopeNotice, PAGE_CLASS } from "@/components/ui/page";
import { ChatNotice } from "@/components/hairline/chat-notice";
import { PromptComposer } from "@/components/hairline/prompt-composer";
import { FollowUps as HairlineFollowUps } from "@/components/hairline/streaming-answer";
import { ThinkingTrace } from "@/components/hairline/thinking-trace";
import { useToast } from "@/components/ui/overlay";
import { useShell } from "@/components/shell/shell-context";
import { cn, fmtDate, TODAY } from "@/lib/format";
import {
  answerFor,
  answerText,
  isKhmer,
  messageAnswer,
  seedConversations,
  suggestionsFor,
  type AdvisorLang,
  type AdvisorRecord,
  type AdvisorScope,
  type Answer,
  type Conversation,
  type Message,
  type SuggestionGroup,
} from "@/lib/mock/advisor-data";
import { useSession } from "@/lib/session";
import { AdvisorAvatar, advisorCopy, AiPill, AnswerCard, ReadOnlyPill } from "./answer";
import { RecordsSheet } from "./records-sheet";

const STEP_MS = 750;
const GROUPS: Conversation["group"][] = ["Today", "Yesterday", "Previous 7 days"];

type Pending = { convId: string; question: string; answer: Answer; step: number; frozen?: boolean; startedAt: number };
/** The answer whose text is still streaming in, and how many words have arrived. */
type Streaming = { messageId: string; words: number; total: number };
const WORD_MS = 28;
/** Wall clock for the trace timers; only called from event handlers and effects. */
const clockMs = () => Date.now();

const now = () => new Date().toTimeString().slice(0, 5);
const newId = () => `n-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const titleOf = (question: string) => {
  const clean = question.replace(/[?？។]+$/u, "").trim();
  return clean.length > 34 ? `${clean.slice(0, 32).trimEnd()}…` : clean;
};

/**
 * AI Advisor (section 11). `?c=<id>` opens a conversation; `?state=working`
 * or `?state=error` pins frames 11.7 and 11.8 for review.
 */
export function Advisor() {
  const { user } = useSession();
  const shell = useShell();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const activeId = params.get("c");
  const forced = params.get("state");

  const role = user?.role ?? "owner";
  const isManager = role === "manager";
  const branchName = user?.branch ?? "Toul Kork";
  const storageKey = `fs-advisor-${role}`;

  const [conversations, setConversations] = useState<Conversation[]>(() => seedConversations(role, branchName));
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [streaming, setStreaming] = useState<Streaming | null>(null);
  const [lang, setLang] = useState<AdvisorLang>("en");
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sheet, setSheet] = useState<{ messageId: string; recordId: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Follows the branch chosen in the top bar; only All branches and Toul Kork have demo records.
  const scope: AdvisorScope = isManager || shell.branch === "toul-kork" ? "toul-kork" : "all";
  const scopeLabel = scope === "all" ? "All branches" : `${isManager ? branchName : "Toul Kork"} Branch`;

  // Restore this tab's conversations (and pin the review states) once the session is known.
  useEffect(() => {
    if (!user || loadedFor === storageKey) return;
    let list = seedConversations(role, branchName);
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) list = JSON.parse(stored) as Conversation[];
    } catch {}
    if (forced === "working" || forced === "error") {
      const id = isManager ? "m-unpaid" : "c-overdue";
      const conv = list.find((c) => c.id === id);
      const question = conv?.messages[0]?.role === "user" ? conv.messages[0].text : "Which invoices are overdue?";
      list = list.map((c) =>
        c.id !== id
          ? c
          : {
              ...c,
              messages:
                forced === "error"
                  ? [c.messages[0], { id: `${id}-err`, role: "advisor", question, time: c.time, status: "error" } as Message]
                  : [c.messages[0]],
            },
      );
      // Session storage and the review states are only known after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (forced === "working") setPending({ convId: id, question, answer: answerFor(question, scope, role, branchName), step: 2, frozen: true, startedAt: Date.now() - 2400 });
      if (activeId !== id) router.replace(`/ai-advisor?c=${id}&state=${forced}`, { scroll: false });
    }
    setConversations(list);
    setLoadedFor(storageKey);
  }, [user, loadedFor, storageKey, role, branchName, forced, isManager, activeId, router, scope]);

  useEffect(() => {
    if (loadedFor !== storageKey || forced) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(conversations));
    } catch {}
  }, [conversations, loadedFor, storageKey, forced]);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  const append = useCallback((convId: string, message: Message) => {
    setConversations((list) => list.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, message] } : c)));
  }, []);

  // Walk through the "working" steps, then post the answer (or the 11.8 error when offline).
  useEffect(() => {
    if (!pending || pending.frozen) return;
    const timer = setTimeout(() => {
      if (pending.step < pending.answer.steps.length) {
        setPending({ ...pending, step: pending.step + 1 });
        return;
      }
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      const id = newId();
      append(
        pending.convId,
        offline
          ? { id, role: "advisor", question: pending.question, time: now(), status: "error" }
          : { id, role: "advisor", question: pending.question, time: now(), status: "done", answer: pending.answer, duration: Date.now() - pending.startedAt },
      );
      if (!offline) setStreaming({ messageId: id, words: 0, total: pending.answer.text.split(/\s+/).length });
      setPending(null);
    }, STEP_MS);
    return () => clearTimeout(timer);
  }, [pending, append]);

  // Stream the text in a couple of words at a time.
  useEffect(() => {
    if (!streaming) return;
    if (streaming.words >= streaming.total) {
      const t = setTimeout(() => setStreaming(null), 120);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStreaming({ ...streaming, words: streaming.words + 2 }), WORD_MS * 2);
    return () => clearTimeout(t);
  }, [streaming]);

  const streamDone = streaming === null;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [active?.messages.length, pending?.convId, pending?.step, streamDone]);

  const openConversation = (id: string | null) => {
    setHistoryOpen(false);
    router.replace(id ? `/ai-advisor?c=${id}` : "/ai-advisor", { scroll: false });
  };

  const ask = (raw: string, fresh = false) => {
    const question = raw.trim();
    if (!question || pending || streaming) return;
    if (isKhmer(question)) setLang("km");
    const answer = answerFor(question, scope, role, branchName);
    const userMessage: Message = { id: newId(), role: "user", text: question };
    let convId = fresh ? undefined : active?.id;
    if (!convId) {
      convId = newId();
      const conv: Conversation = { id: convId, title: titleOf(question), time: now(), group: "Today", messages: [userMessage] };
      setConversations((list) => [conv, ...list]);
      router.replace(`/ai-advisor?c=${convId}`, { scroll: false });
    } else {
      append(convId, userMessage);
    }
    setDraft("");
    setPending({ convId, question, answer, step: 0, startedAt: clockMs() });
  };

  const stop = () => {
    if (streaming && active) {
      // Stopping mid-answer turns it into a stopped answer that can be asked again.
      setConversations((list) =>
        list.map((c) =>
          c.id === active.id
            ? { ...c, messages: c.messages.map((m): Message => (m.id === streaming.messageId && m.role === "advisor" ? { id: m.id, role: "advisor", question: m.question, time: m.time, status: "stopped" } : m)) }
            : c,
        ),
      );
      setStreaming(null);
      return;
    }
    if (!pending) return;
    append(pending.convId, { id: newId(), role: "advisor", question: pending.question, time: now(), status: "stopped" });
    setPending(null);
    if (forced) router.replace(`/ai-advisor?c=${pending.convId}`, { scroll: false });
  };

  const retry = (message: Message) => {
    if (!active || message.role !== "advisor" || pending || streaming) return;
    setConversations((list) => list.map((c) => (c.id === active.id ? { ...c, messages: c.messages.filter((m) => m.id !== message.id) } : c)));
    setPending({ convId: active.id, question: message.question, answer: answerFor(message.question, scope, role, branchName), step: 0, startedAt: clockMs() });
    if (forced) router.replace(`/ai-advisor?c=${active.id}`, { scroll: false });
  };

  const hrefFor = (record: AdvisorRecord) => (isManager && record.href.startsWith("/branches") ? "/dashboard" : record.href);

  const sheetMessage = active?.messages.find((m) => m.id === sheet?.messageId);
  const sheetAnswer = sheetMessage?.role === "advisor" && sheetMessage.status === "done" ? messageAnswer(sheetMessage) : undefined;

  const filtered = conversations.filter((c) => !search.trim() || c.title.toLowerCase().includes(search.trim().toLowerCase()));
  const pendingHere = pending && pending.convId === active?.id ? pending : null;

  if (!user) return null;
  const firstName = user.name.split(" ")[0];

  const busy = Boolean(pending || streaming);
  const suggestionGroups = suggestionsFor(isManager || scope === "toul-kork" ? "manager" : "owner");
  const composer = (
    <div className="flex flex-col gap-2">
      {!busy && <SuggestionBar groups={suggestionGroups} onAsk={(q) => ask(q)} compact={Boolean(active)} />}
    <Composer
      value={draft}
      onChange={setDraft}
      onSend={(text) => ask(text)}
      onStop={stop}
      busy={busy}
      status={pending ? "submitted" : streaming ? "streaming" : "ready"}
      lang={lang}
      onLang={setLang}
      scopeLabel={scopeLabel}
      onVoiceUnavailable={() => toast({ title: "Voice input is not available", body: "Your browser does not support speech recognition. Type your question instead.", tone: "error" })}
    />
    </div>
  );

  return (
    <div className={PAGE_CLASS}>
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-[22px] leading-8 font-semibold tracking-[-0.12px] text-fg md:text-2xl">AI Advisor</h1>
            <span className="inline-flex h-6 items-center gap-1 rounded-full border border-icon-ai/25 bg-ai-subtle px-2 text-xs leading-4 font-medium text-ai-fg">
              <Sparkles size={12} aria-hidden />
              AI
            </span>
            <ReadOnlyPill />
          </div>
          <p className="mt-1 max-w-[760px] text-sm leading-[22px] text-muted">
            {isManager
              ? `Ask about ${branchName} Branch in Khmer or English. Answers come from your branch records and always show where the numbers came from.`
              : "Ask about your finances in Khmer or English. Answers come from the records in LuyFlow and always show where the numbers came from."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {isManager ? (
            <span className="inline-flex h-10 items-center gap-2 rounded-md bg-muted-bg px-4 text-sm leading-5 font-medium text-fg">
              <Lock size={16} className="text-icon" aria-hidden />
              {branchName} Branch
            </span>
          ) : (
            <Menu
              width={240}
              align="end"
              triggerLabel={`Branch: ${scopeLabel}`}
              triggerClassName="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-surface px-4 text-sm leading-5 font-medium text-fg hover:bg-subtle"
              trigger={
                <>
                  <Building2 size={16} className="text-icon-strong" aria-hidden />
                  {scope === "all" ? "All branches" : "Toul Kork"}
                  <ChevronDown size={16} className="text-icon-strong" aria-hidden />
                </>
              }
              items={[
                { id: "all", label: "All branches", selected: scope === "all", onSelect: () => shell.setBranch("all") },
                { id: "toul-kork", label: "Toul Kork", selected: scope === "toul-kork", onSelect: () => shell.setBranch("toul-kork") },
                { id: "central-market", label: "Central Market", description: "No demo data yet", disabled: true },
                { id: "siem-reap", label: "Siem Reap", description: "No demo data yet", disabled: true },
              ]}
            />
          )}
          <Menu
            width={220}
            align="end"
            triggerLabel="Reporting month"
            triggerClassName="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-surface px-4 text-sm leading-5 font-medium text-fg hover:bg-subtle"
            trigger={
              <>
                <Calendar size={16} className="text-icon-strong" aria-hidden />
                October 2026
                <ChevronDown size={16} className="text-icon-strong" aria-hidden />
              </>
            }
            items={[
              { id: "2026-10", label: "October 2026", selected: true },
              { id: "2026-09", label: "September 2026", description: "No demo data yet", disabled: true },
            ]}
          />
        </div>
      </header>

      {isManager && <ScopeNotice branch={branchName} className="mt-6" />}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[288px_minmax(0,1fr)]">
        <div className="lg:hidden">
          <Button variant="secondary" icon={History} iconRight={ChevronDown} onClick={() => setHistoryOpen((v) => !v)} aria-expanded={historyOpen} className="w-full justify-between">
            {active ? active.title : "Conversations"}
          </Button>
        </div>
        <aside className={cn("lg:sticky lg:top-6", historyOpen ? "block" : "hidden lg:block")} aria-label="Conversations">
          <ConversationList
            conversations={filtered}
            activeId={active?.id ?? null}
            search={search}
            onSearch={setSearch}
            onOpen={openConversation}
          />
        </aside>

        <section aria-label={active ? active.title : "New conversation"} className="min-w-0">
          {active ? (
            <div className="flex flex-col gap-5">
              {active.messages.map((message) =>
                message.role === "user" ? (
                  <UserBubble key={message.id} text={message.text} />
                ) : (
                  <AdvisorTurn key={message.id} time={message.status === "done" || message.status === "error" ? message.time : undefined}>
                    {message.status === "done" ? (
                      <DoneAnswer
                        message={message}
                        busy={busy}
                        streamWords={streaming?.messageId === message.id ? streaming.words : undefined}
                        onAsk={ask}
                        onRegenerate={() => retry(message)}
                        onOpenRecord={(recordId) => setSheet({ messageId: message.id, recordId })}
                      />
                    ) : message.status === "error" ? (
                      <ErrorAnswer fallback={answerFor(message.question, scope, role, branchName).fallback} onRetry={() => retry(message)} busy={busy} />
                    ) : (
                      <StoppedAnswer onRetry={() => retry(message)} busy={busy} />
                    )}
                  </AdvisorTurn>
                ),
              )}
              {pendingHere && (
                <>
                  <AdvisorTurn working>
                    <Working steps={pendingHere.answer.steps} step={pendingHere.step} startedAt={pendingHere.startedAt} />
                  </AdvisorTurn>
                </>
              )}
              <div ref={endRef} />
              <div className="sticky bottom-[84px] z-10 md:bottom-4">{composer}</div>
            </div>
          ) : (
            <StartScreen
              name={firstName}
              isManager={isManager}
              branchName={branchName}
              composer={composer}
            />
          )}
        </section>
      </div>

      {sheet && sheetAnswer && sheetMessage?.role === "advisor" && (
        <RecordsSheet
          key={`${sheet.messageId}-${sheet.recordId}`}
          open
          onClose={() => setSheet(null)}
          records={sheetAnswer.records}
          initialId={sheet.recordId}
          context={`Used for “${sheetMessage.question}” · ${/^\d\d:\d\d$/.test(sheetMessage.time) ? `${fmtDate(TODAY)}, ${sheetMessage.time}` : sheetMessage.time}`}
          hrefFor={hrefFor}
        />
      )}
    </div>
  );
}

/* ---------- Conversation list ---------- */

function ConversationList({
  conversations,
  activeId,
  search,
  onSearch,
  onOpen,
}: {
  conversations: Conversation[];
  activeId: string | null;
  search: string;
  onSearch: (value: string) => void;
  onOpen: (id: string | null) => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface shadow-xs">
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <Button variant="secondary" icon={MessageSquarePlus} onClick={() => onOpen(null)} className="w-full">
          New conversation
        </Button>
        <label className="flex h-10 items-center gap-2 rounded-md border border-icon-subtle bg-surface px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Search size={16} className="shrink-0 text-icon" aria-hidden />
          <span className="sr-only">Search conversations</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search conversations"
            className="min-w-0 flex-1 bg-transparent text-sm leading-5 text-fg outline-none placeholder:text-placeholder [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button type="button" onClick={() => onSearch("")} aria-label="Clear search" className="focus-ring cursor-pointer rounded-xs text-icon hover:text-icon-strong">
              <X size={14} aria-hidden />
            </button>
          )}
        </label>
      </div>
      <div className="flex flex-col gap-4 px-2 py-4">
        {conversations.length === 0 && <p className="px-2 text-[13px] leading-5 text-muted">No conversations match “{search}”.</p>}
        {GROUPS.map((group) => {
          const items = conversations.filter((c) => c.group === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              <h2 className="px-2 text-[11px] leading-4 font-semibold tracking-[0.6px] text-muted uppercase">{group}</h2>
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {items.map((c) => {
                  const current = c.id === activeId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(c.id)}
                        aria-current={current ? "page" : undefined}
                        className={cn(
                          "focus-ring flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm leading-5",
                          current ? "bg-primary-subtle font-medium text-brand" : "text-fg hover:bg-muted-bg",
                        )}
                      >
                        <MessageSquare size={16} className={cn("shrink-0", current ? "text-brand" : "text-icon")} aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{c.title}</span>
                        <span className={cn("shrink-0 text-xs leading-4", current ? "text-brand" : "text-muted")}>{c.time}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="flex items-start gap-2 border-t border-line px-4 py-3 text-xs leading-4 text-muted">
        <History size={14} className="mt-px shrink-0" aria-hidden />
        Conversations are private to you and kept for 90 days.
      </p>
    </div>
  );
}

/* ---------- Thread ---------- */

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[min(560px,88%)] rounded-[14px] rounded-br-sm bg-primary px-4 py-3 text-sm leading-5 text-white md:text-[15px] md:leading-[22px]">{text}</p>
    </div>
  );
}

function AdvisorTurn({ time, working, children }: { time?: string; working?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="hidden pt-0.5 sm:block">
        <AdvisorAvatar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="flex items-center gap-2 text-sm leading-5">
          <span className="font-medium text-fg">LuyFlow Advisor</span>
          <AiPill />
          <span className="text-xs leading-4 text-muted">{working ? "Working…" : time}</span>
        </p>
        {children}
      </div>
    </div>
  );
}

function DoneAnswer({
  message,
  busy,
  streamWords,
  onAsk,
  onRegenerate,
  onOpenRecord,
}: {
  message: Extract<Message, { status: "done" }>;
  busy: boolean;
  streamWords?: number;
  onAsk: (q: string) => void;
  onRegenerate: () => void;
  onOpenRecord: (recordId: string) => void;
}) {
  const answer = messageAnswer(message);
  if (!answer) return null;
  const km = answer.lang === "km";
  const duration = message.duration ?? 1600 + answer.steps.length * 650;
  return (
    <>
      {/* What the advisor did to get here, folded away (Hairline UI thinking trace). */}
      <ThinkingTrace
        variant="steps"
        status="done"
        steps={answer.steps.map((label) => ({ label }))}
        duration={duration}
        doneLabel={km ? "បានអានកំណត់ត្រារបស់អ្នក" : `Read your records · ${(duration / 1000).toFixed(1)}s`}
        defaultOpen={false}
      />
      <AnswerCard answer={answer} copyText={answerText(answer)} onOpenRecord={onOpenRecord} onRegenerate={onRegenerate} streamWords={streamWords} busy={busy} />
      {streamWords === undefined && answer.followUps.length > 0 && (
        <HairlineFollowUps items={answer.followUps} label={advisorCopy(answer.lang).askNext} onSelect={onAsk} className="mt-1 animate-[ui-fade-up_420ms_ease-out_both] motion-reduce:animate-none" />
      )}
    </>
  );
}

/** Frame 11.7: the steps tick off live while the answer is worked out (Hairline UI thinking trace). */
function Working({ steps, step, startedAt }: { steps: string[]; step: number; startedAt: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite">
      <ThinkingTrace
        variant="steps"
        status="running"
        label={steps[Math.min(step, steps.length - 1)]}
        startedAt={startedAt}
        defaultOpen
        steps={steps.map((label, i) => ({ label, status: i < step ? "done" : i === step ? "running" : "pending" }))}
      />
      <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-4 shadow-xs md:p-5" aria-hidden>
        <span className="skeleton h-2.5 w-full" />
        <span className="skeleton h-2.5 w-[92%]" />
        <span className="skeleton h-2.5 w-2/3" />
      </div>
    </div>
  );
}

/** Frame 11.8, as a Hairline UI chat notice. */
function ErrorAnswer({ fallback, onRetry, busy }: { fallback: Answer["fallback"]; onRetry: () => void; busy: boolean }) {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  return (
    <div className="flex flex-col gap-2">
      <ChatNotice
        kind={offline ? "offline" : "error"}
        title="I couldn’t finish this answer"
        description="The connection dropped while I was reading your records. Nothing was changed. Your question is saved, so you can try again."
        onRetry={busy ? undefined : onRetry}
        details="advisor.read_records: connection reset (demo)"
      />
      <ButtonLink href={fallback.href} variant="ghost" size="sm" iconRight={ArrowRight} className="self-start">
        {fallback.label}
      </ButtonLink>
    </div>
  );
}

function StoppedAnswer({ onRetry, busy }: { onRetry: () => void; busy: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-xs">
      <p className="text-sm leading-5 text-muted">You stopped this answer. Nothing was changed.</p>
      <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry} disabled={busy}>
        Ask again
      </Button>
    </div>
  );
}

/* ---------- Suggested questions ---------- */

/**
 * Suggested questions sit right above the question box: pick a topic, then a
 * question. In a conversation it is a single quiet row so the chat stays in view.
 */
function SuggestionBar({ groups, onAsk, compact }: { groups: SuggestionGroup[]; onAsk: (q: string) => void; compact: boolean }) {
  const [topic, setTopic] = useState(groups[0]?.id);
  const [open, setOpen] = useState(!compact);
  const group = groups.find((g) => g.id === topic) ?? groups[0];
  if (!group) return null;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface/95 px-3 py-2.5 shadow-xs backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted">
          <Sparkles size={13} className="text-icon-ai" aria-hidden />
          Suggested
        </span>
        <div role="tablist" aria-label="Suggestion topics" className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
          {groups.map((g) => {
            const Icon = GROUP_ICON[g.id];
            const on = g.id === group.id && open;
            return (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={on}
                lang={g.id === "khmer" ? "km" : undefined}
                onClick={() => {
                  setTopic(g.id);
                  setOpen(!(on && compact));
                }}
                className={cn("focus-ring inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap transition-colors", on ? "bg-ai-subtle text-ai-fg" : "text-muted hover:bg-muted-bg hover:text-fg")}
              >
                <Icon size={12} aria-hidden />
                {g.label}
              </button>
            );
          })}
        </div>
        {compact && (
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? "Hide suggestions" : "Show suggestions"} className="focus-ring inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-muted-bg">
            <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} aria-hidden />
          </button>
        )}
      </div>
      {open && (
        <div key={group.id} className="flex flex-wrap gap-2 animate-[ui-fade-up_240ms_ease-out_both] motion-reduce:animate-none">
          {group.questions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onAsk(q)}
              lang={group.id === "khmer" ? "km" : undefined}
              className="focus-ring group inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-left text-[13px] leading-5 text-fg transition-colors hover:border-icon-ai/40 hover:bg-ai-subtle/60"
            >
              {q}
              <ArrowUp size={13} className="shrink-0 rotate-45 text-icon group-hover:text-icon-ai" aria-hidden />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Composer ---------- */

type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function Composer({
  value,
  onChange,
  onSend,
  onStop,
  busy,
  status,
  lang,
  onLang,
  scopeLabel,
  onVoiceUnavailable,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  busy: boolean;
  status: "ready" | "submitted" | "streaming";
  lang: AdvisorLang;
  onLang: (lang: AdvisorLang) => void;
  scopeLabel: string;
  onVoiceUnavailable: () => void;
}) {
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const km = lang === "km";

  const toggleVoice = () => {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return onVoiceUnavailable();
    const rec = new Ctor();
    rec.lang = km ? "km-KH" : "en-US";
    rec.interimResults = true;
    rec.onresult = (event) => onChange(Array.from(event.results, (r) => r[0].transcript).join(""));
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognition.current = rec;
    setListening(true);
    rec.start();
  };

  const segment = (active: boolean) =>
    cn("focus-ring inline-flex h-7 cursor-pointer items-center rounded-[5px] px-2.5 text-xs leading-4 font-medium", active ? "bg-surface text-fg shadow-xs" : "text-muted hover:text-fg");

  // Hairline UI prompt composer: grows as you type, Enter sends, and Send turns into Stop while answering.
  return (
    <PromptComposer
      value={value}
      onValueChange={onChange}
      onSubmit={(text) => {
        if (!busy && text.trim()) onSend(text);
      }}
      onStop={onStop}
      status={status}
      aria-label="Ask the AI Advisor"
      placeholder={km ? "សួរអំពីចំណូល ចំណាយ វិក្កយបត្រ ឬស្តុក…" : "Ask about your revenue, expenses, invoices or stock…"}
      className="shadow-md"
      toolbar={
        <div className="flex min-w-0 items-center gap-2">
          <div role="group" aria-label="Answer language" className="inline-flex rounded-md bg-muted-bg p-0.5">
            <button type="button" aria-pressed={!km} onClick={() => onLang("en")} className={segment(!km)}>
              EN
            </button>
            <button type="button" aria-pressed={km} onClick={() => onLang("km")} className={segment(km)} lang="km">
              ខ្មែរ
            </button>
          </div>
          <span className="hidden h-8 min-w-0 items-center gap-1.5 rounded-md bg-muted-bg px-2.5 text-xs leading-4 font-medium text-body sm:inline-flex">
            <Building2 size={14} className="shrink-0 text-icon" aria-hidden />
            <span className="truncate">{km ? `វិសាលភាព៖ ${scopeLabel === "All branches" ? "គ្រប់សាខា" : scopeLabel}` : `Scope: ${scopeLabel}`}</span>
          </span>
          <button
            type="button"
            onClick={toggleVoice}
            aria-pressed={listening}
            aria-label={listening ? "Stop voice input" : "Ask by voice"}
            title={listening ? "Stop voice input" : "Ask by voice"}
            className={cn(
              "focus-ring inline-flex size-8 cursor-pointer items-center justify-center rounded-md",
              listening ? "animate-pulse bg-error-subtle text-icon-error" : "text-icon hover:bg-muted-bg hover:text-icon-strong",
            )}
          >
            <Mic size={16} aria-hidden />
          </button>
        </div>
      }
    />
  );
}

/* ---------- Start screen (11.1, 11.9) ---------- */

const GROUP_ICON: Record<SuggestionGroup["id"], typeof TrendingUp> = { profit: TrendingUp, expenses: Wallet, invoices: ReceiptText, khmer: Languages };

function StartScreen({
  name,
  isManager,
  branchName,
  composer,
}: {
  name: string;
  isManager: boolean;
  branchName: string;
  composer: React.ReactNode;
}) {
  const principles = [
    { icon: Eye, title: "Read-only", body: "The advisor never creates, edits, pays or deletes anything. It links you to the right screen instead." },
    { icon: FileText, title: "Shows its sources", body: "Every figure links to the invoices, bills, transactions or report it was calculated from." },
    isManager
      ? { icon: Lock, title: "Limited to your branch", body: `Answers use ${branchName} records only. Other branches and forecasts are not available to you.` }
      : { icon: Building2, title: "Follows your access", body: "You can ask about any branch. Branch Managers only get answers about their own branch." },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-line bg-surface px-4 py-8 shadow-xs md:px-10 md:py-10">
        <div className="mx-auto flex max-w-[740px] flex-col items-center text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-xl border border-icon-ai/20 bg-ai-subtle text-icon-ai">
            <Sparkles size={26} aria-hidden />
          </span>
          <h2 className="mt-5 text-[22px] leading-8 font-semibold tracking-[-0.2px] text-fg md:text-[28px] md:leading-9">
            {isManager ? `What would you like to know about ${branchName}, ${name}?` : `What would you like to know, ${name}?`}
          </h2>
          <p className="mt-2 text-sm leading-[22px] text-muted md:text-[15px]">
            {isManager
              ? `I read the sales, bills, transactions and stock recorded for your branch up to today, ${fmtDate(TODAY)}.`
              : `I read the invoices, bills, transactions, stock and reports recorded in LuyFlow up to today, ${fmtDate(TODAY)}.`}
          </p>
          <p className="mt-2 text-sm leading-[22px] text-muted" lang="km">
            សួរជាភាសាខ្មែរ ឬអង់គ្លេសបាន
          </p>

        </div>
        <div className="mx-auto mt-6 max-w-[740px] text-left">{composer}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {principles.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-3 rounded-lg border border-line bg-surface p-4 shadow-xs md:p-5">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-ai-subtle text-icon-ai">
              <Icon size={18} aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-[15px] leading-[22px] font-semibold text-fg">{title}</h3>
              <p className="mt-1 text-[13px] leading-5 text-muted">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
