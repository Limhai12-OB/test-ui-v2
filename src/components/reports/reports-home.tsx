"use client";

import { useSession } from "@/lib/session";
import { ReportsList } from "./reports-list";
import { ReportsOverview } from "./reports-overview";

/** `/monthly-reports`: the owner's overview (12.1); Branch Managers only get their list (12.12). */
export function ReportsHome() {
  const { user } = useSession();
  if (!user) return null;
  return user.role === "manager" ? <ReportsList /> : <ReportsOverview />;
}
