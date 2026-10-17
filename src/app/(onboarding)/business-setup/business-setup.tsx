"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CircleCheck,
  Globe,
  Info,
  Mail,
  MapPin,
  Phone,
  Send,
  Store,
  X,
} from "lucide-react";
import { OnboardingHeader, OnboardingPage } from "@/components/onboarding/onboarding-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, SelectField, TextField } from "@/components/ui/fields";
import { cn } from "@/lib/format";
import {
  COUNTRIES,
  saveBusiness,
  sendInvite,
  type BusinessDetails,
  type CurrencyAndBranch,
  type InviteInput,
} from "@/lib/mock/onboarding";
import { initials, useSession } from "@/lib/session";

const STEPS = ["Business details", "Currency and main branch", "Invite a Branch Manager"];
const EMAIL = /^\S+@\S+\.\S+$/;

type Errors = Partial<Record<string, string>>;

/** Frames 04.7 Business Setup — steps 1–3 and "Complete". */
export function BusinessSetup() {
  const router = useRouter();
  const { user, ready, signIn } = useSession();
  const [step, setStep] = useState(0);
  const [business, setBusiness] = useState<BusinessDetails>({ name: "", email: "", phone: "", country: "Cambodia", address: "" });
  const [branch, setBranch] = useState<CurrencyAndBranch>({
    currency: "USD",
    branchName: "Central Market (Main)",
    branchPhone: "",
    sameAddress: true,
    branchAddress: "",
  });
  const [invite, setInvite] = useState<InviteInput>({ name: "", email: "", branch: "main" });
  const [invited, setInvited] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (ready && !user) router.replace("/sign-in");
  }, [ready, user, router]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  if (!ready || !user) return <OnboardingPage><OnboardingHeader steps={STEPS} /></OnboardingPage>;

  const finish = async (inviteSent: string | null) => {
    await saveBusiness({ ...business, ...branch });
    setInvited(inviteSent);
    setStep(3);
  };

  return (
    <OnboardingPage>
      <OnboardingHeader steps={STEPS} current={step} account />
      <main className="px-4 pt-8 pb-16 md:px-6 md:pt-12">
        {step === 3 ? (
          <Complete
            businessName={business.name}
            currency={branch.currency}
            branchName={branch.branchName}
            invited={invited}
            onContinue={() => {
              signIn({ ...user, businessName: business.name, firstRun: true });
              router.push("/dashboard");
            }}
          />
        ) : (
          <div className="mx-auto w-full max-w-[760px]">
            <p className="text-overline text-brand">
              Step {step + 1} of {STEPS.length}
            </p>
            <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-[28px] leading-9 font-semibold tracking-[-0.5px] text-fg outline-none">
              {["Tell us about your business", "Set your currency and main branch", "Invite a Branch Manager"][step]}
            </h1>
            <p className="mt-2 text-sm leading-[22px] text-muted">
              {
                [
                  "This appears on invoices, reports and exports. You can change it later in Settings.",
                  "Totals and reports are shown in the default currency. You can still record any transaction in USD or KHR.",
                  "Optional. A Branch Manager works with one branch only. You can invite people later from Branches.",
                ][step]
              }
            </p>
            {step === 0 && <DetailsStep value={business} onChange={setBusiness} onNext={() => setStep(1)} />}
            {step === 1 && (
              <CurrencyStep value={branch} onChange={setBranch} businessAddress={business.address} onBack={() => setStep(0)} onNext={() => setStep(2)} />
            )}
            {step === 2 && (
              <InviteStep
                value={invite}
                onChange={setInvite}
                branchName={branch.branchName}
                onBack={() => setStep(1)}
                onSkip={() => finish(null)}
                onSend={async () => {
                  const result = await sendInvite(invite);
                  if (result.ok) await finish(invite.email);
                  return result.ok;
                }}
              />
            )}
          </div>
        )}
      </main>
    </OnboardingPage>
  );
}

function SetupCard({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 rounded-lg border border-line bg-surface p-5 shadow-xs md:p-8">{children}</div>;
}

function DetailsStep({ value, onChange, onNext }: { value: BusinessDetails; onChange: (value: BusinessDetails) => void; onNext: () => void }) {
  const [errors, setErrors] = useState<Errors>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (key: keyof BusinessDetails) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [key]: event.target.value });

  useEffect(() => () => {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
  }, [logoUrl]);

  const onLogo = (file?: File) => {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setErrors((current) => ({ ...current, logo: "Use a PNG or JPG file." }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((current) => ({ ...current, logo: "The logo must be 2 MB or smaller." }));
      return;
    }
    setErrors((current) => ({ ...current, logo: undefined }));
    setLogoUrl(URL.createObjectURL(file));
    onChange({ ...value, logoName: file.name });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (!value.name.trim()) next.name = "Enter your business name.";
    if (!EMAIL.test(value.email.trim())) next.email = "Enter a valid email, like finance@business.com.";
    if (!value.phone.trim()) next.phone = "Enter a phone number.";
    if (!value.address.trim()) next.address = "Enter the business address.";
    setErrors(next);
    if (!Object.values(next).some(Boolean)) onNext();
  };

  return (
    <form onSubmit={submit} noValidate>
      <SetupCard>
        <div className="grid gap-x-5 gap-y-6 md:grid-cols-2">
          <TextField
            size="md"
            label="Business name"
            placeholder="e.g. Mekong Mart Co., Ltd."
            autoComplete="organization"
            value={value.name}
            onChange={set("name")}
            state={errors.name ? "error" : "default"}
            message={errors.name ?? "Shown on invoices and reports."}
          />
          <TextField
            size="md"
            label="Business email"
            icon={Mail}
            type="email"
            placeholder="finance@business.com"
            value={value.email}
            onChange={set("email")}
            state={errors.email ? "error" : "default"}
            message={errors.email}
          />
          <TextField
            size="md"
            label="Phone number"
            icon={Phone}
            type="tel"
            placeholder="+855 23 880 142"
            autoComplete="tel"
            value={value.phone}
            onChange={set("phone")}
            state={errors.phone ? "error" : "default"}
            message={errors.phone}
          />
          <SelectField
            label="Country"
            icon={Globe}
            value={value.country}
            onChange={set("country")}
            options={COUNTRIES.map((country) => ({ value: country, label: country }))}
          />
          <TextField
            size="md"
            className="md:col-span-2"
            label="Address"
            icon={MapPin}
            placeholder="Street, district, city"
            autoComplete="street-address"
            value={value.address}
            onChange={set("address")}
            state={errors.address ? "error" : "default"}
            message={errors.address}
          />
          <div className="md:col-span-2">
            <p className="mb-1.5 text-sm leading-5 font-medium text-fg">
              Logo <span className="ml-1 font-normal text-muted">Optional</span>
            </p>
            <div
              className={cn(
                "flex flex-wrap items-center gap-4 rounded-lg border border-dashed bg-subtle p-4",
                errors.logo ? "border-error" : "border-line-strong",
              )}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                onLogo(event.dataTransfer.files[0]);
              }}
            >
              <span className="inline-flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-secondary-strong text-base font-medium text-white">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo preview" className="size-full object-cover" />
                ) : value.name.trim() ? (
                  initials(value.name)
                ) : (
                  <Store size={22} aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm leading-5 font-medium text-fg">{value.logoName ?? "No logo yet"}</p>
                <p className={cn("text-xs leading-4", errors.logo ? "text-error-fg" : "text-muted")}>
                  {errors.logo ?? "PNG or JPG · up to 2 MB · square works best"}
                </p>
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(event) => onLogo(event.target.files?.[0])} aria-label="Upload logo" />
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                {value.logoName ? "Replace" : "Upload logo"}
              </Button>
              {value.logoName && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoUrl(null);
                    onChange({ ...value, logoName: undefined });
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="focus-ring cursor-pointer rounded-xs px-2 text-sm leading-5 font-medium text-brand hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </SetupCard>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[13px] leading-5 text-muted">All fields are required unless marked optional.</p>
        <Button type="submit" iconRight={ArrowRight}>
          Continue
        </Button>
      </div>
    </form>
  );
}

function CurrencyStep({
  value,
  onChange,
  businessAddress,
  onBack,
  onNext,
}: {
  value: CurrencyAndBranch;
  onChange: (value: CurrencyAndBranch) => void;
  businessAddress: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<Errors>({});

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (!value.branchName.trim()) next.branchName = "Enter a branch name.";
    if (!value.branchPhone.trim()) next.branchPhone = "Enter a contact phone.";
    if (!value.sameAddress && !value.branchAddress.trim()) next.branchAddress = "Enter the branch address.";
    setErrors(next);
    if (!Object.values(next).some(Boolean)) onNext();
  };

  const options = [
    { id: "USD" as const, title: "US Dollar", code: "USD", mark: "$", body: "Most wholesale invoices and supplier bills in Cambodia use USD." },
    { id: "KHR" as const, title: "Cambodian Riel", code: "KHR", mark: "៛", body: "Choose this if most of your sales and expenses are in riel." },
  ];

  return (
    <form onSubmit={submit} noValidate>
      <SetupCard>
        <fieldset>
          <legend className="mb-2 text-sm leading-5 font-medium text-fg">Default currency</legend>
          <div className="grid gap-4 md:grid-cols-2">
            {options.map((option) => {
              const selected = value.currency === option.id;
              return (
                <label
                  key={option.id}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-3 rounded-[10px] p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30",
                    selected ? "border-2 border-primary bg-primary-subtle/60 p-[15px]" : "border border-line bg-surface hover:border-line-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="currency"
                    value={option.id}
                    checked={selected}
                    onChange={() => onChange({ ...value, currency: option.id })}
                    className="peer absolute top-5 right-5 size-[18px] cursor-pointer appearance-none rounded-full border border-line-strong bg-surface checked:border-[5px] checked:border-primary"
                  />
                  <span className="flex items-center gap-3 pr-8">
                    <span
                      className={cn(
                        "inline-flex size-10 items-center justify-center rounded-md text-base font-semibold",
                        selected ? "bg-primary text-white" : "bg-muted-bg text-body",
                        option.id === "KHR" && "font-khmer",
                      )}
                    >
                      {option.mark}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[15px] leading-[22px] font-semibold text-fg">{option.title}</span>
                      <span className="text-xs leading-4 text-body">{option.code}</span>
                    </span>
                  </span>
                  <span className={cn("text-[13px] leading-5", selected ? "text-body" : "text-muted")}>{option.body}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-6 flex gap-3 rounded-[10px] border border-icon-info/25 bg-info-subtle px-4 py-3">
          <Info size={18} className="mt-0.5 shrink-0 text-icon-info" aria-hidden />
          <div className="text-[13px] leading-5 text-body">
            <p className="font-medium text-fg">Recorded amounts never change</p>
            <p>An amount entered in KHR stays in KHR. The default currency only decides how totals are converted for display.</p>
          </div>
        </div>

        <hr className="my-6 border-line" />

        <div className="flex gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-brand">
            <Store size={20} aria-hidden />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base leading-6 font-semibold text-fg">Your main branch</h2>
              <Badge tone="info" size="sm" className="bg-info-subtle text-icon-info">
                Created automatically
              </Badge>
            </div>
            <p className="mt-0.5 text-[13px] leading-5 text-muted">Every business starts with one branch. Add more later from Branches.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-x-5 gap-y-5 md:grid-cols-2">
          <TextField
            size="md"
            label="Branch name"
            value={value.branchName}
            onChange={(event) => onChange({ ...value, branchName: event.target.value })}
            state={errors.branchName ? "error" : "default"}
            message={errors.branchName}
          />
          <TextField
            size="md"
            label="Contact phone"
            icon={Phone}
            type="tel"
            placeholder="+855 23 880 142"
            value={value.branchPhone}
            onChange={(event) => onChange({ ...value, branchPhone: event.target.value })}
            state={errors.branchPhone ? "error" : "default"}
            message={errors.branchPhone}
          />
        </div>
        <div className="mt-4">
          <Checkbox checked={value.sameAddress} onChange={(checked) => onChange({ ...value, sameAddress: checked })}>
            Same as business address
          </Checkbox>
        </div>
        {value.sameAddress ? (
          <div className="mt-4">
            <p className="text-[13px] leading-5 text-muted">Branch address</p>
            <p className="mt-1 text-sm leading-5 text-fg">{businessAddress || "—"}</p>
          </div>
        ) : (
          <TextField
            size="md"
            className="mt-4"
            label="Branch address"
            icon={MapPin}
            value={value.branchAddress}
            onChange={(event) => onChange({ ...value, branchAddress: event.target.value })}
            state={errors.branchAddress ? "error" : "default"}
            message={errors.branchAddress}
          />
        )}
      </SetupCard>
      <div className="mt-6 flex items-center justify-between gap-4">
        <Button variant="secondary" icon={ArrowLeft} onClick={onBack}>
          Back
        </Button>
        <Button type="submit" iconRight={ArrowRight}>
          Continue
        </Button>
      </div>
    </form>
  );
}

function InviteStep({
  value,
  onChange,
  branchName,
  onBack,
  onSkip,
  onSend,
}: {
  value: InviteInput;
  onChange: (value: InviteInput) => void;
  branchName: string;
  onBack: () => void;
  onSkip: () => Promise<void>;
  onSend: () => Promise<boolean>;
}) {
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<"send" | "skip" | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (!value.name.trim()) next.name = "Enter the manager’s full name.";
    if (!EMAIL.test(value.email.trim())) next.email = "Enter a valid email address.";
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setBusy("send");
    if (!(await onSend())) setBusy(null);
  };

  const access = [
    { ok: true, text: "Record sales, invoices, bills and stock changes for their branch" },
    { ok: true, text: "Submit till balancing and bank reconciliation for your sign-off" },
    { ok: true, text: "Ask the AI Advisor about their branch" },
    { ok: false, text: "No access to other branches, forecasts, integrations or business settings" },
  ];

  return (
    <form onSubmit={submit} noValidate>
      <SetupCard>
        <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
          <TextField
            size="md"
            label="Full name"
            placeholder="First and last name"
            value={value.name}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            state={errors.name ? "error" : "default"}
            message={errors.name}
          />
          <TextField
            size="md"
            label="Email"
            icon={Mail}
            type="email"
            placeholder="name@business.com"
            value={value.email}
            onChange={(event) => onChange({ ...value, email: event.target.value })}
            state={errors.email ? "error" : "default"}
            message={errors.email}
          />
          <SelectField
            className="md:col-span-2"
            label="Assigned branch"
            icon={Building2}
            value={value.branch}
            onChange={(event) => onChange({ ...value, branch: event.target.value })}
            options={[{ value: "main", label: branchName || "Main branch" }]}
            message="Your only branch so far. For another branch, add the branch first and invite its manager from Branches."
          />
        </div>
        <div className="mt-6 rounded-[10px] bg-subtle px-4 py-4">
          <p className="text-sm leading-5 font-medium text-fg">Access for Branch Managers</p>
          <ul className="mt-2.5 flex flex-col gap-2.5">
            {access.map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-sm leading-5 text-body">
                {item.ok ? (
                  <Check size={16} className="mt-0.5 shrink-0 text-icon-success" aria-label="Allowed" />
                ) : (
                  <X size={16} className="mt-0.5 shrink-0 text-icon-error" aria-label="Not allowed" />
                )}
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      </SetupCard>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <Button variant="secondary" icon={ArrowLeft} onClick={onBack} disabled={busy !== null}>
          Back
        </Button>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <button
            type="button"
            disabled={busy !== null}
            onClick={async () => {
              setBusy("skip");
              await onSkip();
            }}
            className="focus-ring cursor-pointer rounded-xs text-sm leading-5 font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:text-muted"
          >
            {busy === "skip" ? "Finishing…" : "Skip for now"}
          </button>
          <Button type="submit" icon={Send} disabled={busy !== null}>
            {busy === "send" ? "Sending invite…" : "Send invite and finish"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Complete({
  businessName,
  currency,
  branchName,
  invited,
  onContinue,
}: {
  businessName: string;
  currency: string;
  branchName: string;
  invited: string | null;
  onContinue: () => void;
}) {
  return (
    <div className="mx-auto mt-4 w-full max-w-[520px] rounded-xl border border-line bg-surface px-6 py-10 text-center shadow-md md:mt-[170px] md:px-10" role="status">
      <span className="inline-flex size-[72px] items-center justify-center rounded-full bg-success-subtle text-icon-success">
        <CircleCheck size={28} aria-hidden />
      </span>
      <h1 className="mt-6 text-[28px] leading-9 font-semibold tracking-[-0.5px] text-fg">{businessName} is ready</h1>
      <p className="mt-3 text-sm leading-[22px] text-muted">
        Default currency {currency} · {branchName} created
      </p>
      <p className="mt-2 text-sm leading-[22px] text-muted">
        {invited ? `Invitation sent to ${invited}. It is valid for 7 days.` : "You can invite Branch Managers later from Branches."}
      </p>
      <Button size="lg" iconRight={ArrowRight} onClick={onContinue} className="mt-6 w-full">
        Go to dashboard
      </Button>
    </div>
  );
}
