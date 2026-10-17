"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  Check,
  CircleAlert,
  CircleCheck,
  Info,
  KeyRound,
  LayoutGrid,
  Lock,
  Mail,
  Monitor,
  Pencil,
  Phone,
  PiggyBank,
  ReceiptText,
  RefreshCw,
  Send,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Unlink,
  Upload,
} from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { StatusPill } from "@/components/finance/common";
import { AlertGlyph } from "@/components/notifications/notification-shared";
import { TelegramTile } from "@/components/notifications/telegram";
import { Badge } from "@/components/ui/badge";
import { StatusButton, type ActionStatus } from "@/components/hairline/status-button";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox, GoogleMark, SelectField, TextField } from "@/components/ui/fields";
import { Switch } from "@/components/ui/flow";
import { useToast } from "@/components/ui/overlay";
import { Notice } from "@/components/ui/page";
import { useAdmin } from "@/lib/admin-store";
import { cn, initialsOf } from "@/lib/format";
import { DEMO_PASSWORD } from "@/lib/mock/auth";
import { ALERT_TYPES, type Profile } from "@/lib/mock/admin-data";
import { useSession } from "@/lib/session";
import { SectionHeader, SettingRow } from "./settings-shell";
import { readImage } from "./upload";

const TIMEZONES = ["Phnom Penh (UTC+7)", "Bangkok (UTC+7)", "Ho Chi Minh City (UTC+7)", "Singapore (UTC+8)"];
const PHONE = /^\+855\d{8,9}$/;
const linkCls = "focus-ring inline-flex items-center gap-1 rounded-xs text-sm leading-5 font-medium whitespace-nowrap text-brand hover:underline";

export function ProfileAvatar({ profile, size = 56 }: { profile: Pick<Profile, "name" | "photo">; size?: 56 | 40 }) {
  return profile.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={profile.photo} alt="" className={cn("shrink-0 rounded-full object-cover", size === 56 ? "size-14" : "size-10")} />
  ) : (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-primary-subtle font-semibold text-brand", size === 56 ? "size-14 text-base" : "size-10 text-[13px]")}>
      {initialsOf(profile.name)}
    </span>
  );
}

function TwoColumns({ left, right }: { left: [string, React.ReactNode][]; right: [string, React.ReactNode][] }) {
  const list = (rows: [string, React.ReactNode][]) => (
    <dl className="grid grid-cols-[132px_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm leading-5">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="min-w-0 break-words text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  );
  return (
    <div className="grid gap-x-10 gap-y-3 md:grid-cols-2">
      {list(left)}
      {list(right)}
    </div>
  );
}

/* ---------- 17.1 / 17.15 My profile ---------- */

export function MyProfile() {
  const { state } = useAdmin();
  const { user } = useSession();
  const owner = user?.role === "owner";
  const p = state.profile;
  const activeBranches = state.branches.filter((b) => b.status === "active").length;
  const signedIn = p.devices.filter((d) => !d.signedOut).length;

  return (
    <>
      <SectionHeader
        title="My profile"
        subtitle="How you appear to your team and on records you create."
        action={
          <ButtonLink href="/settings/profile/edit" variant="secondary" icon={Pencil}>
            Edit profile
          </ButtonLink>
        }
      />
      <Card>
        <div className="flex flex-wrap items-start gap-4 border-b border-line p-5">
          <ProfileAvatar profile={p} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-xl leading-7 font-semibold text-fg">
              {p.name}
              <Badge tone={owner ? "info" : "sky"}>{owner ? "Business Owner" : "Branch Manager"}</Badge>
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm leading-5 text-muted">
              {p.email}
              <StatusPill tone="success">Verified</StatusPill>
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[13px] leading-5 text-muted">Last sign-in</p>
            <p className="text-sm leading-5 font-medium text-fg">{p.lastSignIn}</p>
          </div>
        </div>
        <div className="p-5">
          <TwoColumns
            left={[
              ["Full name", p.name],
              ["Name in Khmer", <span key="k" className="font-khmer">{p.khmerName || "—"}</span>],
              ["Email", p.email],
              ["Mobile phone", p.phone],
            ]}
            right={[
              ["Role", owner ? "Business Owner" : "Branch Manager"],
              ["Access", owner ? `All branches · ${activeBranches} active` : `${user?.branch ?? "Toul Kork"} Branch only`],
              ["Language", p.language === "Khmer" ? "ខ្មែរ (Khmer)" : "English"],
              ["Member since", p.memberSince],
            ]}
          />
        </div>
      </Card>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Sign-in and security" />
          <div className="px-5 pb-2">
            <SettingRow icon={<Lock size={18} aria-hidden />} title="Password" sub={`Last changed ${p.passwordChanged}`} action={<Link href="/settings/security" className={linkCls}>Change<ArrowRight size={14} aria-hidden /></Link>} />
            <SettingRow
              icon={<GoogleMark />}
              tile="border border-line bg-surface"
              title="Google"
              sub={p.googleLinked ? `Linked · ${p.email}` : "Not linked"}
              action={<Link href="/settings/linked-accounts" className={linkCls}>{p.googleLinked ? "Manage" : "Link"}<ArrowRight size={14} aria-hidden /></Link>}
            />
            <SettingRow icon={<Monitor size={18} aria-hidden />} title="Signed-in devices" sub={`${signedIn} ${signedIn === 1 ? "device" : "devices"} signed in`} action={<Link href="/settings/security#devices" className={linkCls}>Review<ArrowRight size={14} aria-hidden /></Link>} />
          </div>
        </Card>
        {owner ? (
          <Card>
            <CardHeader title="Recent activity" />
            <ol className="flex flex-col p-5">
              {[
                { icon: <RefreshCw size={14} aria-hidden />, tone: "bg-primary-subtle text-brand", title: "Signed in · Chrome on Windows", meta: "Today, 08:02 · Phnom Penh" },
                { icon: <CircleCheck size={14} aria-hidden />, tone: "bg-success-subtle text-icon-success", title: "Signed off till balance · Central Market", meta: "Yesterday, 18:40" },
                { icon: <Pencil size={14} aria-hidden />, tone: "bg-muted-bg text-icon-strong", title: "Changed display rate to 4,100 KHR per USD", meta: "1 Oct 2026, 09:00" },
              ].map((item, index, list) => (
                <li key={item.title} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < list.length - 1 && <span aria-hidden className="absolute top-8 bottom-1 left-[13px] w-0.5 bg-line" />}
                  <span className={cn("relative inline-flex size-7 shrink-0 items-center justify-center rounded-full", item.tone)}>{item.icon}</span>
                  <span className="pt-0.5">
                    <span className="block text-sm leading-5 font-medium text-fg">{item.title}</span>
                    <span className="block text-xs leading-4 text-muted">{item.meta}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        ) : (
          <Card>
            <CardHeader title="What your role can do" subtitle="Set by the Business Owner" />
            <ul className="flex flex-col gap-3 p-5 text-sm leading-5">
              {[
                [true, `Record sales, invoices, bills and transactions for ${user?.branch ?? "Toul Kork"}`],
                [true, "Import statements and submit reconciliations and till balances"],
                [true, `Ask the AI Advisor about ${user?.branch ?? "Toul Kork"}`],
                [false, "See other branches or business-wide totals"],
                [false, "Sign off reconciliations and till balances"],
                [false, "Forecasting, integrations and business settings"],
              ].map(([yes, text]) => (
                <li key={String(text)} className={cn("flex gap-3", yes ? "text-body" : "text-muted")}>
                  {yes ? <Check size={16} className="mt-0.5 shrink-0 text-icon-success" aria-label="Allowed" /> : <Lock size={16} className="mt-0.5 shrink-0 text-icon" aria-label="Not allowed" />}
                  {text}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}

/* ---------- 17.2 Edit profile ---------- */

export function EditProfile() {
  const { state, update } = useAdmin();
  const { user, signIn } = useSession();
  const owner = user?.role === "owner";
  const router = useRouter();
  const toast = useToast();
  const p = state.profile;
  const [form, setForm] = useState({ name: p.name, khmerName: p.khmerName, phone: p.phone, timezone: p.timezone });
  const [photo, setPhoto] = useState(p.photo);
  const [photoError, setPhotoError] = useState<string>();
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors({});
  };

  const [saveStatus, setSaveStatus] = useState<ActionStatus>("idle");
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (saveStatus === "pending") return;
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Enter your full name.";
    if (!PHONE.test(form.phone.replace(/[\s-]/g, ""))) next.phone = "Enter a full Cambodian number, for example +855 12 880 142.";
    setErrors(next);
    if (next.name || next.phone) return setSaveStatus("error");
    // Hairline UI status button: Saving, then the check draws itself before going back.
    setSaveStatus("pending");
    setTimeout(() => {
      update((s) => {
        Object.assign(s.profile, { name: form.name.trim(), khmerName: form.khmerName.trim(), phone: form.phone.trim(), timezone: form.timezone, photo });
      });
      if (user && user.name !== form.name.trim()) signIn({ ...user, name: form.name.trim() });
      setSaveStatus("success");
      toast({ title: "Profile saved", body: "New records show your updated details." });
      setTimeout(() => router.push("/settings"), 900);
    }, 650);
  };
  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <form onSubmit={save} noValidate>
      <SectionHeader title="Edit profile" subtitle="Changes apply to new records. Past records keep the name they were created with." />
      <Card>
        <CardHeader title="Photo" />
        <div className="flex flex-wrap items-center gap-4 p-5">
          <ProfileAvatar profile={{ name: form.name || p.name, photo }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-5 text-body">Shown on records you create and in the team list. {photo ? "" : "No photo yet: your initials are used."}</p>
            <p className={cn("text-xs leading-4", photoError ? "text-error-fg" : "text-muted")} role={photoError ? "alert" : undefined}>
              {photoError ?? "JPG or PNG, at least 200 × 200 px, up to 2 MB."}
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            aria-label="Choose a photo"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const result = await readImage(file, { types: ["image/png", "image/jpeg"], maxBytes: 2 * 1048576, minSide: 200 });
              if (result.ok) {
                setPhoto(result.url);
                setPhotoError(undefined);
              } else setPhotoError(result.error);
            }}
          />
          {photo && (
            <Button variant="ghost" size="sm" onClick={() => setPhoto(undefined)}>
              Remove
            </Button>
          )}
          <Button variant="secondary" size="sm" icon={Upload} onClick={() => fileRef.current?.click()}>
            {photo ? "Change photo" : "Upload photo"}
          </Button>
        </div>
      </Card>
      <Card className="mt-6">
        <CardHeader title="Personal details" />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <TextField size="md" label="Full name" value={form.name} onChange={(e) => set({ name: e.target.value })} state={errors.name ? "error" : "default"} message={errors.name} autoComplete="name" />
          <TextField size="md" label="Name in Khmer" labelHint="(optional)" lang="km" className="font-khmer" value={form.khmerName} onChange={(e) => set({ khmerName: e.target.value })} />
          <TextField size="md" label="Email" icon={Mail} value={p.email} disabled message={p.googleLinked ? "Linked to Google. Change it from Linked accounts." : "Your sign-in email. Ask the Business Owner to change it."} />
          <TextField size="md" label="Mobile phone" icon={Phone} type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} state={errors.phone ? "error" : "default"} message={errors.phone} autoComplete="tel" />
          <SelectField label="Role" value={owner ? "owner" : "manager"} disabled message={owner ? "There is one Business Owner per business." : "Your role is set by the Business Owner."} options={[{ value: "owner", label: "Business Owner" }, { value: "manager", label: "Branch Manager" }]} />
          <SelectField label="Time zone" value={form.timezone} onChange={(e) => set({ timezone: e.target.value })} options={TIMEZONES.map((z) => ({ value: z, label: z }))} />
        </div>
      </Card>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {errorCount > 0 && (
          <p className="mr-auto flex items-center gap-1.5 text-[13px] leading-5 text-error-fg" role="alert">
            <CircleAlert size={14} aria-hidden />
            Fix {errorCount} {errorCount === 1 ? "field" : "fields"} before saving.
          </p>
        )}
        <ButtonLink href="/settings" variant="secondary" className="ml-auto">
          Cancel
        </ButtonLink>
        <StatusButton type="submit" status={saveStatus} onReset={() => setSaveStatus("idle")} labels={{ idle: "Save changes", pending: "Saving", success: "Saved", error: "Check the fields" }} />
      </div>
    </form>
  );
}

/* ---------- 17.3 / 17.4 Password & security ---------- */

const COMMON = ["password", "password123", "1234567890", "qwertyuiop", "mekong2026", "mekongmart", "iloveyou12", "abc1234567"];

export function Security() {
  const { state, update } = useAdmin();
  const toast = useToast();
  const p = state.profile;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [error, setError] = useState<string>();
  const rules = [
    { id: "len", label: "At least 10 characters", met: next.length >= 10 },
    { id: "case", label: "Upper and lower case letters", met: /[a-z]/.test(next) && /[A-Z]/.test(next) },
    { id: "num", label: "A number", met: /\d/.test(next) },
    { id: "common", label: "Not a commonly used password", met: next.length > 0 && !COMMON.includes(next.toLowerCase()) },
  ];
  const score = rules.filter((r) => r.met).length;
  const strong = score === 4;
  const matches = confirm.length > 0 && confirm === next;
  const ready = current && strong && matches;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    if (current !== DEMO_PASSWORD) return setError("The current password is not correct.");
    if (next === current) return setError("Choose a password you have not used before.");
    update((s) => {
      s.profile.passwordChanged = "31 Oct 2026";
      if (signOutOthers)
        s.profile.devices.forEach((d) => {
          if (!d.current) d.signedOut = true;
        });
    });
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(undefined);
    toast({ title: "Password changed", body: signOutOthers ? "Your other devices were signed out. Use the new password next time." : "Use the new password next time." });
  };

  return (
    <>
      <SectionHeader title="Password & security" subtitle="Use a password you do not use anywhere else." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="h-fit">
          <CardHeader title="Change password" />
          <form onSubmit={submit} noValidate className="flex flex-col gap-4 p-5">
            <TextField
              size="md"
              label="Current password"
              password
              placeholder="Enter your current password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => {
                setCurrent(e.target.value);
                setError(undefined);
              }}
              state={error ? "error" : "default"}
              message={error}
            />
            <div>
              <TextField size="md" label="New password" password placeholder="At least 10 characters" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} state={strong ? "success" : "default"} message={next ? (strong ? "Strong password." : score >= 2 ? "Almost there." : "Too weak.") : undefined} />
              {next && (
                <>
                  <div className="mt-2 grid grid-cols-4 gap-1.5" aria-hidden>
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={cn("h-1 rounded-full", i < score ? (strong ? "bg-success" : score >= 2 ? "bg-warning" : "bg-error") : "bg-line")} />
                    ))}
                  </div>
                  <ul className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2" aria-label="Password requirements">
                    {rules.map((r) => (
                      <li key={r.id} className={cn("flex items-center gap-1.5 text-[13px] leading-5", r.met ? "text-body" : "text-muted")}>
                        {r.met ? <CircleCheck size={14} className="text-icon-success" aria-hidden /> : <span aria-hidden className="size-3.5 rounded-full border border-icon-subtle" />}
                        {r.label}
                        <span className="sr-only">{r.met ? "(met)" : "(not met)"}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <TextField
              size="md"
              label="Confirm new password"
              password
              placeholder="Type the new password again"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              state={confirm && !matches ? "error" : "default"}
              message={confirm && !matches ? "The passwords do not match." : undefined}
            />
            <Checkbox checked={signOutOthers} onChange={setSignOutOthers}>
              Sign out of my other devices
            </Checkbox>
            <Link href="/forgot-password" className="focus-ring w-fit rounded-xs text-sm leading-5 font-medium text-brand hover:underline">
              Forgot your current password?
            </Link>
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setCurrent("");
                  setNext("");
                  setConfirm("");
                  setError(undefined);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" icon={Lock} disabled={!ready}>
                Change password
              </Button>
            </div>
            <p className="text-xs leading-4 text-muted">Demo: the current password is the demo password, and sign-in keeps using it after a change.</p>
          </form>
        </Card>
        <div className="flex min-w-0 flex-col gap-6">
          <Card id="devices" className="h-fit scroll-mt-24">
            <CardHeader title="Signed-in devices" />
            <ul className="px-5 pb-2">
              {p.devices.map((d) => (
                <li key={d.id} className="flex items-center gap-3 border-b border-line-subtle py-3.5 last:border-b-0">
                  <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-md", d.current ? "bg-success-subtle text-icon-success" : "bg-muted-bg text-icon-strong")}>
                    {d.kind === "desktop" ? <Monitor size={18} aria-hidden /> : <Smartphone size={18} aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm leading-5 font-medium text-fg">
                      {d.name}
                      {d.current && <StatusPill tone="success">This device</StatusPill>}
                    </span>
                    <span className="block text-[13px] leading-5 text-muted">{d.signedOut ? d.where.replace(/·.*$/, "· signed out just now") : d.where}</span>
                  </span>
                  {!d.current &&
                    (d.signedOut ? (
                      <Badge className="border border-line-strong bg-surface text-fg">Signed out</Badge>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          update((s) => {
                            const x = s.profile.devices.find((y) => y.id === d.id);
                            if (x) x.signedOut = true;
                          });
                          toast({ title: "Device signed out", body: `${d.name} needs to sign in again.` });
                        }}
                      >
                        Sign out
                      </Button>
                    ))}
                </li>
              ))}
            </ul>
          </Card>
          {p.googleLinked && (
            <Notice tone="neutral" icon={<Info size={18} aria-hidden />} title="Signed in with Google?">
              You can use either Google or your password. A new password does not change Google sign-in.
            </Notice>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------- 17.5 / 17.6 Linked accounts ---------- */

export function LinkedAccounts() {
  const { state, update } = useAdmin();
  const { user } = useSession();
  const owner = user?.role === "owner";
  const toast = useToast();
  const [unlink, setUnlink] = useState(false);
  const p = state.profile;

  return (
    <>
      <SectionHeader title="Linked accounts" subtitle="Other accounts you can use to sign in or receive alerts." />
      <Card>
        <CardHeader title="Sign-in" />
        <div className="px-5 pb-2">
          <SettingRow
            icon={<GoogleMark />}
            tile="border border-line bg-surface"
            title="Google"
            sub={
              p.googleLinked ? (
                <>
                  {p.email} · linked {p.googleLinkedOn}
                  <span className="block text-xs leading-4">Used for “Continue with Google”. LuyFlow only receives your name, email and photo.</span>
                </>
              ) : (
                "Not linked. Link Google to use “Continue with Google”."
              )
            }
            action={
              p.googleLinked ? (
                <span className="flex items-center gap-3">
                  <StatusPill tone="success" className="hidden sm:inline-flex">
                    Connected
                  </StatusPill>
                  <Button variant="secondary" size="sm" onClick={() => setUnlink(true)}>
                    Unlink
                  </Button>
                </span>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    update((s) => {
                      s.profile.googleLinked = true;
                      s.profile.googleLinkedOn = "31 Oct 2026";
                    });
                    toast({ title: "Google linked", body: `You can now use “Continue with Google” with ${p.email}. (Simulated in this demo.)` });
                  }}
                >
                  Link Google
                </Button>
              )
            }
          />
          <SettingRow icon={<KeyRound size={18} aria-hidden />} title="Email and password" sub={`${p.email} · password set`} action={<Link href="/settings/security" className={linkCls}>Change password<ArrowRight size={14} aria-hidden /></Link>} />
        </div>
      </Card>
      <Card className="mt-6">
        <CardHeader title="Alerts" />
        <div className="px-5 pb-2">
          <SettingRow
            icon={<TelegramTile size={40} />}
            tile="bg-transparent"
            title="Telegram"
            sub={state.telegram.linked ? `${state.telegram.handle} · receives ${Object.entries(state.prefs.alerts).filter(([k, a]) => a.telegram && (owner || (k !== "cash" && k !== "budget"))).length} alert types` : "Not linked"}
            action={
              <span className="flex items-center gap-3">
                {state.telegram.linked && (
                  <StatusPill tone="success" className="hidden sm:inline-flex">
                    Connected
                  </StatusPill>
                )}
                <ButtonLink href="/notifications/telegram" variant="secondary" size="sm">
                  {state.telegram.linked ? "Manage" : "Connect"}
                </ButtonLink>
              </span>
            }
          />
        </div>
      </Card>
      <Notice
        tone="neutral"
        className="mt-6"
        icon={<Info size={18} aria-hidden />}
        title="Business connections are separate"
        action={
          owner ? (
            <Link href="/integrations" className="focus-ring rounded-xs text-sm font-medium text-brand hover:underline">
              Open Integrations
            </Link>
          ) : undefined
        }
      >
        Shopify, WeBill365 and the business Telegram connection are managed in Integrations{owner ? "." : " by the Business Owner."}
      </Notice>
      <ConfirmDialog
        open={unlink}
        onClose={() => setUnlink(false)}
        id="unlink-google"
        icon={<Unlink size={20} aria-hidden />}
        title="Unlink your Google account?"
        cancelLabel="Keep linked"
        confirmLabel="Unlink Google"
        confirmVariant="secondary"
        focusCancel
        onConfirm={() => {
          update((s) => {
            s.profile.googleLinked = false;
          });
          setUnlink(false);
          toast({ title: "Google unlinked", body: `Sign in with ${p.email} and your password.` });
        }}
      >
        You will no longer be able to use “Continue with Google”. You can still sign in with {p.email} and your password, and you can link Google again later.
      </ConfirmDialog>
    </>
  );
}

/* ---------- 17.7 Language & region ---------- */

export function LanguageRegion() {
  const { state, update } = useAdmin();
  const toast = useToast();
  const p = state.profile;
  const [draft, setDraft] = useState({ language: p.language, aiLanguage: p.aiLanguage, invoiceLanguage: p.invoiceLanguage, alertLanguage: p.alertLanguage });
  const option = (value: Profile["language"], title: string, sub: string, items: [React.ReactNode, string][], khmer = false) => {
    const on = draft.language === value;
    return (
      <label className={cn("flex cursor-pointer flex-col rounded-xl p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30", on ? "border-2 border-primary bg-primary-subtle/60 p-[15px]" : "border border-line hover:border-line-strong")}>
        <span className="flex items-center justify-between gap-3">
          <span className={cn("text-base leading-6 font-semibold text-fg", khmer && "font-khmer")}>{title}</span>
          <input type="radio" name="app-language" checked={on} onChange={() => setDraft((d) => ({ ...d, language: value }))} className="size-5 shrink-0 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface checked:border-[6px] checked:border-primary" />
        </span>
        <span className={cn("mt-2 text-sm leading-5 text-body", khmer && "font-khmer")}>{sub}</span>
        <ul className="mt-3 flex flex-col gap-1.5 rounded-lg border border-line bg-surface px-3 py-2.5">
          {items.map(([icon, text]) => (
            <li key={text} className={cn("flex items-center gap-2 text-[13px] leading-5 text-fg", khmer && "font-khmer")}>
              {icon}
              {text}
            </li>
          ))}
        </ul>
      </label>
    );
  };
  const icons: React.ReactNode[] = [
    <LayoutGrid key="1" size={14} className="text-icon" aria-hidden />,
    <ShoppingCart key="2" size={14} className="text-icon" aria-hidden />,
    <ReceiptText key="3" size={14} className="text-icon" aria-hidden />,
    <PiggyBank key="4" size={14} className="text-icon" aria-hidden />,
  ];

  return (
    <>
      <SectionHeader title="Language & region" subtitle="Choose the language you work in. Your team members choose their own." />
      <Card>
        <CardHeader title="App language" />
        <fieldset className="p-5">
          <legend className="sr-only">App language</legend>
          <div className="grid gap-4 md:grid-cols-2">
            {option("English", "English", "Menus, messages and reports in English.", ["Dashboard", "Sales", "Invoice", "Net profit"].map((t, i) => [icons[i], t]))}
            {option("Khmer", "ខ្មែរ", "ម៉ឺនុយ សារ និងរបាយការណ៍ជាភាសាខ្មែរ។", ["ផ្ទាំងគ្រប់គ្រង", "ការលក់", "វិក្កយបត្រ", "ប្រាក់ចំណេញសុទ្ធ"].map((t, i) => [icons[i], t]), true)}
          </div>
          <p className="mt-3 flex items-center gap-2 text-[13px] leading-5 text-muted">
            <Info size={14} aria-hidden />
            Names you typed, such as customers and items, are never translated.
          </p>
        </fieldset>
      </Card>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="AI and documents" />
          <div className="flex flex-col gap-4 p-5">
            <SelectField label="AI Advisor replies in" icon={Sparkles} value={draft.aiLanguage} onChange={(e) => setDraft((d) => ({ ...d, aiLanguage: e.target.value }))} message="Ask in Khmer and the answer is in Khmer." options={["The language of my question", "Always English", "Always Khmer"].map((v) => ({ value: v, label: v }))} />
            <SelectField label="New invoices are written in" icon={ReceiptText} value={draft.invoiceLanguage} onChange={(e) => setDraft((d) => ({ ...d, invoiceLanguage: e.target.value }))} message="You can change this for each customer." options={["English and Khmer (bilingual)", "English", "Khmer"].map((v) => ({ value: v, label: v }))} />
            <SelectField label="Telegram and email alerts" icon={Bell} value={draft.alertLanguage} onChange={(e) => setDraft((d) => ({ ...d, alertLanguage: e.target.value }))} options={["English", "Khmer"].map((v) => ({ value: v, label: v === "Khmer" ? "ខ្មែរ (Khmer)" : v }))} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Formats" subtitle="The same in both languages" />
          <dl className="grid grid-cols-[150px_minmax(0,1fr)] gap-x-4 gap-y-3 p-5 text-sm leading-5">
            {[
              ["Dates", "12 Oct 2026"],
              ["Time", "18:45 · 24-hour"],
              ["USD amounts", "$1,250.00"],
              ["KHR amounts", "៛5,125,000"],
              ["Negative amounts", "−$86.00"],
              ["Time zone", p.timezone],
              ["Week starts on", "Monday"],
            ].map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className="text-fg">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={() => setDraft({ language: p.language, aiLanguage: p.aiLanguage, invoiceLanguage: p.invoiceLanguage, alertLanguage: p.alertLanguage })}>
          Cancel
        </Button>
        <Button
          icon={Check}
          onClick={() => {
            update((s) => {
              Object.assign(s.profile, draft);
              s.prefs.language = draft.alertLanguage === "Khmer" ? "Khmer" : "English";
            });
            toast({
              title: "Preferences saved",
              body: draft.language === "Khmer" ? "Saved. Khmer menus are not translated in this build yet, so the app stays in English." : "Your language settings are saved.",
            });
          }}
        >
          Save preferences
        </Button>
      </div>
    </>
  );
}

/* ---------- 17.12 Notifications (summary) ---------- */

export function NotificationSettings() {
  const { state, update } = useAdmin();
  const { user } = useSession();
  const owner = user?.role === "owner";
  const toast = useToast();
  const prefs = state.prefs;
  const types = ALERT_TYPES.filter((t) => owner || !t.ownerOnly);

  return (
    <>
      <SectionHeader
        title="Notifications"
        subtitle="How you are alerted. Open the full preferences to change alert types."
        action={
          <ButtonLink href="/notifications/preferences" variant="secondary" iconRight={ArrowRight}>
            Open notification preferences
          </ButtonLink>
        }
      />
      <Card>
        <CardHeader title="Channels" />
        <div className="px-5 pb-2">
          <SettingRow icon={<Bell size={18} aria-hidden />} tile="bg-primary-subtle text-brand" title="In the app" sub="Always on. Unread alerts show on the bell in the top bar." action={<StatusPill tone="success">On</StatusPill>} />
          <SettingRow
            icon={<Send size={18} aria-hidden />}
            tile="bg-[#0088cc] text-white"
            title="Telegram"
            sub={state.telegram.linked ? `${state.telegram.handle} · ${types.filter((t) => prefs.alerts[t.key].telegram).length} of ${types.length} alert types` : <Link href="/notifications/telegram" className="font-medium text-brand hover:underline">Link Telegram first</Link>}
            action={
              <Switch
                label="Telegram alerts"
                checked={state.telegram.linked && prefs.telegramOn}
                disabled={!state.telegram.linked}
                onChange={(v) => {
                  update((s) => {
                    s.prefs.telegramOn = v;
                  });
                  toast({ title: v ? "Telegram alerts on" : "Telegram alerts paused", body: v ? "Alerts you chose are sent to Telegram again." : "Nothing is sent to Telegram until you turn it back on." });
                }}
              />
            }
          />
          <SettingRow
            icon={<Mail size={18} aria-hidden />}
            title="Email"
            sub={`${state.profile.email}${prefs.dailySummary ? " · daily summary at 08:00" : ""}`}
            action={
              <Switch
                label="Email alerts"
                checked={prefs.emailOn}
                onChange={(v) => {
                  update((s) => {
                    s.prefs.emailOn = v;
                  });
                  toast({ title: v ? "Email alerts on" : "Email alerts off", body: v ? "Alerts you chose are emailed again." : "Nothing is emailed until you turn it back on." });
                }}
              />
            }
          />
        </div>
      </Card>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Alert types" badge={<span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted-bg px-1.5 text-xs font-medium text-body">{types.length}</span>} />
          <ul className="px-5 pt-2 pb-3">
            {types.map((t) => {
              const a = prefs.alerts[t.key];
              const channels = ["App", a.telegram && state.telegram.linked && prefs.telegramOn ? "Telegram" : null, a.email && prefs.emailOn ? "Email" : null].filter(Boolean).join(" · ");
              return (
                <li key={t.key} className="flex items-center gap-3 border-b border-line-subtle py-2.5 last:border-b-0">
                  <AlertGlyph icon={t.icon} className="text-icon-strong" />
                  <span className="flex-1 text-sm leading-5 text-fg">{!owner && t.managerTitle ? t.managerTitle : t.title}</span>
                  <span className="text-[13px] leading-5 text-muted">{channels}</span>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card className="h-fit">
          <CardHeader title="Quiet hours" />
          <dl className="grid grid-cols-[150px_minmax(0,1fr)] gap-x-4 gap-y-3 p-5 text-sm leading-5">
            <dt className="text-muted">Telegram and email</dt>
            <dd className="text-fg">{prefs.quiet ? `Paused ${prefs.quietFrom} – ${prefs.quietUntil}` : "Not paused"}</dd>
            {owner && (
              <>
                <dt className="text-muted">Cash warnings</dt>
                <dd className="text-fg">{prefs.cashThroughQuiet || !prefs.quiet ? "Always delivered" : "Wait for the morning"}</dd>
              </>
            )}
            <dt className="text-muted">Alert language</dt>
            <dd className="text-fg">{prefs.language === "Khmer" ? "ខ្មែរ (Khmer)" : "English"}</dd>
          </dl>
        </Card>
      </div>
    </>
  );
}
