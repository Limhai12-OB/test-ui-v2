/**
 * MOCK onboarding service: Business Setup (04.7) and Branch Manager
 * invitations (04.8, 04.9). Nothing is sent or stored on a server; these
 * functions only simulate latency and the outcomes shown in Figma.
 */
import type { SessionUser } from "@/lib/session";
import type { Result } from "./auth";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type BusinessDetails = {
  name: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  logoName?: string;
};

export type CurrencyAndBranch = {
  currency: "USD" | "KHR";
  branchName: string;
  branchPhone: string;
  sameAddress: boolean;
  branchAddress: string;
};

export type InviteInput = { name: string; email: string; branch: string };

export const COUNTRIES = ["Cambodia", "Thailand", "Vietnam", "Laos", "Other"];

export async function saveBusiness(details: BusinessDetails & CurrencyAndBranch): Promise<Result> {
  await wait(900);
  if (!details.name) return { ok: false, error: "missing_name" };
  return { ok: true, data: undefined };
}

export async function sendInvite(input: InviteInput): Promise<Result> {
  await wait(800);
  if (!input.email) return { ok: false, error: "missing_email" };
  return { ok: true, data: undefined };
}

export type Invitation = {
  token: string;
  inviterName: string;
  businessName: string;
  role: "Branch Manager";
  branch: string;
  email: string;
  inviteeName: string;
  expires: string;
  daysLeft: number;
  expired: boolean;
};

/** Demo links: /invitation?token=demo (valid) and /invitation?token=expired. */
const INVITATIONS: Record<string, Invitation> = {
  demo: {
    token: "demo",
    inviterName: "Sokha Chan",
    businessName: "Mekong Mart",
    role: "Branch Manager",
    branch: "Siem Reap",
    email: "chanthy.pov@gmail.com",
    inviteeName: "Chanthy Pov",
    expires: "7 Nov 2026",
    daysLeft: 7,
    expired: false,
  },
  expired: {
    token: "expired",
    inviterName: "Sokha Chan",
    businessName: "Mekong Mart",
    role: "Branch Manager",
    branch: "Siem Reap",
    email: "chanthy.pov@gmail.com",
    inviteeName: "Chanthy Pov",
    expires: "24 Oct 2026",
    daysLeft: 0,
    expired: true,
  },
};

export async function getInvitation(token: string): Promise<Invitation | null> {
  await wait(500);
  return INVITATIONS[token] ?? null;
}

export async function declineInvitation(token: string): Promise<Result> {
  await wait(600);
  return INVITATIONS[token] ? { ok: true, data: undefined } : { ok: false, error: "not_found" };
}

export async function requestNewInvitation(token: string): Promise<Result> {
  await wait(700);
  return INVITATIONS[token] ? { ok: true, data: undefined } : { ok: false, error: "not_found" };
}

export async function acceptInvitation(
  token: string,
  input: { name: string; password?: string; language: "en" | "km" },
): Promise<Result<SessionUser>> {
  await wait(900);
  const invite = INVITATIONS[token];
  if (!invite || invite.expired) return { ok: false, error: "expired" };
  return {
    ok: true,
    data: {
      name: input.name || invite.inviteeName,
      email: invite.email,
      role: "manager",
      businessName: invite.businessName,
      branch: invite.branch,
    },
  };
}
