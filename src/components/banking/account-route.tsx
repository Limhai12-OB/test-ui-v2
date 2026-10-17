"use client";

import { useParams } from "next/navigation";
import { AccountCategories, AccountOverview, AccountStatements, AccountTransactions } from "./account-detail";

/** Reads the account id from the URL so new accounts added in the browser also open. */
export function AccountRoute({ view }: { view: "overview" | "transactions" | "categories" | "statements" }) {
  const { id } = useParams<{ id: string }>();
  if (view === "transactions") return <AccountTransactions id={id} />;
  if (view === "categories") return <AccountCategories id={id} />;
  if (view === "statements") return <AccountStatements id={id} />;
  return <AccountOverview id={id} />;
}
