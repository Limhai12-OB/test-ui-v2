/**
 * MOCK authentication service.
 *
 * There is no backend in this project yet. These functions simulate network
 * latency and return the outcomes shown in the Figma auth screens (section 04)
 * so the UI states can be exercised. Replace each function with a real API
 * call when the backend exists; the UI only depends on the return shapes.
 */
import type { SessionUser } from "@/lib/session";

export const DEMO_PASSWORD = "Mekong2026";
export const DEMO_CODE = "482017";
export const MAX_SIGN_IN_ATTEMPTS = 5;

const DEMO_USERS: Record<string, SessionUser> = {
  "sokha@mekongmart.com.kh": {
    name: "Sokha Chan",
    email: "sokha@mekongmart.com.kh",
    role: "owner",
    businessName: "Mekong Mart",
  },
  "dara@mekongmart.com.kh": {
    name: "Dara Sok",
    email: "dara@mekongmart.com.kh",
    role: "manager",
    businessName: "Mekong Mart",
    branch: "Toul Kork",
  },
};

export const GOOGLE_ACCOUNT = DEMO_USERS["sokha@mekongmart.com.kh"];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function signInWithPassword(email: string, password: string): Promise<Result<SessionUser>> {
  await wait(900);
  const user = DEMO_USERS[email.trim().toLowerCase()];
  if (!user || password !== DEMO_PASSWORD) return { ok: false, error: "invalid_credentials" };
  return { ok: true, data: user };
}

export async function signInWithGoogle(): Promise<Result<SessionUser>> {
  await wait(1400);
  return { ok: true, data: GOOGLE_ACCOUNT };
}

export async function signUp(input: { name: string; email: string; password: string }): Promise<Result> {
  await wait(800);
  if (DEMO_USERS[input.email.trim().toLowerCase()]) return { ok: false, error: "email_exists" };
  return { ok: true, data: undefined };
}

export async function sendResetCode(email: string): Promise<Result> {
  await wait(700);
  if (!email) return { ok: false, error: "missing_email" };
  return { ok: true, data: undefined };
}

export async function verifyCode(code: string): Promise<Result> {
  await wait(700);
  return code === DEMO_CODE ? { ok: true, data: undefined } : { ok: false, error: "invalid_code" };
}

export async function resendCode(): Promise<Result> {
  await wait(500);
  return { ok: true, data: undefined };
}

export async function updatePassword(password: string): Promise<Result> {
  await wait(800);
  // The design checks "Different from your last password"; the demo account's
  // current password stands in for that history.
  if (password === DEMO_PASSWORD) return { ok: false, error: "reused_password" };
  return { ok: true, data: undefined };
}
