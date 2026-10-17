"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Clock, Languages, Lock, Send, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, SelectField } from "@/components/ui/fields";
import { Switch } from "@/components/ui/flow";
import { ModalBody, ModalFooter, ModalHeader, useToast } from "@/components/ui/overlay";
import { Notice, Page, PageHeader } from "@/components/ui/page";
import { useAdmin } from "@/lib/admin-store";
import { cn } from "@/lib/format";
import { ALERT_TYPES, defaultPrefs, type AlertKey, type NotificationPrefs } from "@/lib/mock/admin-data";
import { useSession } from "@/lib/session";
import { AlertTile } from "./notification-shared";

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
const TIMEZONES = ["Phnom Penh (UTC+7)", "Bangkok (UTC+7)", "Ho Chi Minh City (UTC+7)", "Singapore (UTC+8)"];

export function NotificationPreferences() {
  const { state, update } = useAdmin();
  const { user } = useSession();
  const owner = user?.role === "owner";
  const toast = useToast();
  const [draft, setDraft] = useState<NotificationPrefs>(() => structuredClone(state.prefs));
  const [editing, setEditing] = useState<AlertKey | null>(null);
  const telegramLinked = state.telegram.linked;

  const setAlert = (key: AlertKey, patch: Partial<NotificationPrefs["alerts"][AlertKey]>) => setDraft((d) => ({ ...d, alerts: { ...d.alerts, [key]: { ...d.alerts[key], ...patch } } }));
  const set = (patch: Partial<NotificationPrefs>) => setDraft((d) => ({ ...d, ...patch }));
  const save = () => {
    update((s) => {
      s.prefs = draft;
    });
    toast({ title: "Preferences saved", body: "Your alert settings apply from now on." });
  };
  const editingType = ALERT_TYPES.find((t) => t.key === editing);

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: "Notifications", href: "/notifications" }, { label: "Preferences" }]}
        title="Notification preferences"
        subtitle={owner ? "Choose which alerts you receive and where. These settings apply only to you, not to Branch Managers." : `Choose which ${user?.branch ?? "Toul Kork"} alerts you receive and where. These settings apply only to you.`}
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setDraft(defaultPrefs(user?.role ?? "owner"));
                toast({ title: "Defaults restored", body: "Save preferences to keep them." });
              }}
              className="focus-ring cursor-pointer rounded-xs px-2 text-sm leading-5 font-medium text-brand hover:underline"
            >
              Reset to defaults
            </button>
            <Button icon={Check} onClick={save}>
              Save preferences
            </Button>
          </>
        }
      />

      {!telegramLinked && (
        <Notice tone="info" icon={<Send size={18} aria-hidden />} title="Telegram is not linked" className="mt-6" action={<Link href="/notifications/telegram" className="focus-ring rounded-xs text-sm font-medium text-brand hover:underline">Connect Telegram</Link>}>
          Telegram switches are saved but nothing is delivered there until you link your account.
        </Notice>
      )}

      <Card className="mt-6" aria-labelledby="types-title">
        <CardHeader title="Alert types" titleId="types-title" subtitle="In-app alerts are always on so nothing is missed." divided />
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[820px] table-fixed border-collapse text-left">
            <caption className="sr-only">Alert types and where they are sent</caption>
            <colgroup>
              <col />
              <col style={{ width: 96 }} />
              <col style={{ width: 96 }} />
              <col style={{ width: 96 }} />
              <col style={{ width: 120 }} />
            </colgroup>
            <thead>
              <tr className="h-11 border-b border-line bg-subtle text-xs leading-4 font-medium text-muted">
                <th scope="col" className="px-5">Alert</th>
                <th scope="col" className="text-center">In the app</th>
                <th scope="col" className="text-center">Telegram</th>
                <th scope="col" className="text-center">Email</th>
                <th scope="col"><span className="sr-only">Rule</span></th>
              </tr>
            </thead>
            <tbody>
              {ALERT_TYPES.map((t) => {
                const p = draft.alerts[t.key];
                const locked = !owner && t.ownerOnly;
                const title = !owner && t.managerTitle ? t.managerTitle : t.title;
                const rules = !owner && t.managerRules ? t.managerRules : t.rules;
                return (
                  <tr key={t.key} className={cn("border-b border-line-subtle last:border-b-0", locked && "bg-subtle")}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-start gap-3">
                        <AlertTile icon={t.icon} muted={locked} />
                        <div className="min-w-0">
                          <p className={cn("flex flex-wrap items-center gap-2 text-sm leading-5 font-medium", locked ? "text-muted" : "text-fg")}>
                            {title}
                            {locked && <span className="inline-flex h-5 items-center rounded-full border border-line-strong bg-surface px-2 text-xs font-normal text-fg">Business Owner only</span>}
                          </p>
                          <p className="text-[13px] leading-5 text-muted">{rules[Math.min(p.rule, rules.length - 1)]}</p>
                        </div>
                      </div>
                    </td>
                    {locked ? (
                      <td colSpan={4} className="px-4 text-[13px] leading-5 text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <Lock size={14} aria-hidden />
                          Not available for your role
                        </span>
                      </td>
                    ) : (
                      <>
                        <td className="text-center">
                          <span className="inline-flex" title="In-app alerts are always on">
                            <Switch label={`${title} in the app (always on)`} checked disabled onChange={() => {}} />
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="inline-flex">
                            <Switch label={`${title} on Telegram`} checked={p.telegram} onChange={(v) => setAlert(t.key, { telegram: v })} />
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="inline-flex">
                            <Switch label={`${title} by email`} checked={p.email} onChange={(v) => setAlert(t.key, { email: v })} />
                          </span>
                        </td>
                        <td className="pr-5 text-right">
                          <button type="button" onClick={() => setEditing(t.key)} disabled={rules.length < 2} className="focus-ring cursor-pointer rounded-xs text-sm leading-5 font-medium text-brand hover:underline disabled:cursor-default disabled:text-icon-subtle disabled:no-underline" title={rules.length < 2 ? "This alert has one rule" : undefined}>
                            Edit rule
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card aria-labelledby="quiet-title">
          <CardHeader title="Quiet hours" titleId="quiet-title" subtitle="Telegram and email alerts wait until the morning. In-app alerts still appear." />
          <div className="flex flex-col gap-4 p-5">
            <label className="flex cursor-pointer items-center gap-3 text-sm leading-5 text-fg">
              <Switch label="Pause Telegram and email overnight" checked={draft.quiet} onChange={(v) => set({ quiet: v })} />
              Pause Telegram and email overnight
            </label>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1.5fr]">
              <SelectField label="From" icon={Clock} value={draft.quietFrom} disabled={!draft.quiet} onChange={(e) => set({ quietFrom: e.target.value })} options={HOURS.map((h) => ({ value: h, label: h }))} />
              <SelectField label="Until" icon={Clock} value={draft.quietUntil} disabled={!draft.quiet} onChange={(e) => set({ quietUntil: e.target.value })} options={HOURS.map((h) => ({ value: h, label: h }))} />
              <SelectField label="Time zone" value={draft.timezone} onChange={(e) => set({ timezone: e.target.value })} options={TIMEZONES.map((z) => ({ value: z, label: z }))} />
            </div>
            {owner && (
              <Checkbox checked={draft.cashThroughQuiet} onChange={(v) => set({ cashThroughQuiet: v })} disabled={!draft.quiet}>
                Let cash warnings through during quiet hours
              </Checkbox>
            )}
          </div>
        </Card>
        <Card aria-labelledby="lang-title">
          <CardHeader title="Language and summary" titleId="lang-title" />
          <div className="flex flex-col gap-4 p-5">
            <SelectField
              label="Alert language"
              icon={Languages}
              value={draft.language}
              onChange={(e) => set({ language: e.target.value as NotificationPrefs["language"] })}
              message="Telegram and email alerts use this language. You can choose ខ្មែរ."
              options={[
                { value: "English", label: "English" },
                { value: "Khmer", label: "ខ្មែរ (Khmer)" },
              ]}
            />
            <label className="flex cursor-pointer items-center gap-3 text-sm leading-5 text-fg">
              <Switch label="Email me a daily summary at 08:00" checked={draft.dailySummary} onChange={(v) => set({ dailySummary: v, sundaySummary: v ? draft.sundaySummary : false })} />
              Email me a daily summary at 08:00
            </label>
            <label className={cn("flex items-center gap-3 text-sm leading-5", draft.dailySummary ? "cursor-pointer text-fg" : "text-muted")}>
              <Switch label="Also send the summary on Sundays" checked={draft.sundaySummary} disabled={!draft.dailySummary} onChange={(v) => set({ sundaySummary: v })} />
              Also send the summary on Sundays
            </label>
          </div>
        </Card>
      </div>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} labelledBy="rule-title" width={520}>
        {editingType && editing && (
          <RuleForm
            title={!owner && editingType.managerTitle ? editingType.managerTitle : editingType.title}
            rules={!owner && editingType.managerRules ? editingType.managerRules : editingType.rules}
            value={draft.alerts[editing].rule}
            onClose={() => setEditing(null)}
            onSave={(rule) => {
              setAlert(editing, { rule });
              setEditing(null);
            }}
          />
        )}
      </Dialog>
    </Page>
  );
}

function RuleForm({ title, rules, value, onClose, onSave }: { title: string; rules: string[]; value: number; onClose: () => void; onSave: (rule: number) => void }) {
  const [rule, setRule] = useState(value);
  return (
    <>
      <ModalHeader id="rule-title" title={`Edit rule · ${title}`} description="Choose when this alert is sent. Save preferences to apply it." icon={<SlidersHorizontal size={20} aria-hidden />} onClose={onClose} />
      <ModalBody>
        <fieldset className="flex flex-col gap-2.5">
          <legend className="sr-only">When to alert</legend>
          {rules.map((text, index) => (
            <label key={text} className={cn("flex cursor-pointer items-start gap-3 rounded-[10px] px-4 py-3 text-sm leading-5 text-fg", rule === index ? "border border-primary bg-primary-subtle/60" : "border border-line hover:border-line-strong")}>
              <input type="radio" name="rule" checked={rule === index} onChange={() => setRule(index)} className="mt-0.5 size-[18px] shrink-0 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface checked:border-[5px] checked:border-primary" />
              {text}
            </label>
          ))}
        </fieldset>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onSave(rule)}>Use this rule</Button>
      </ModalFooter>
    </>
  );
}
