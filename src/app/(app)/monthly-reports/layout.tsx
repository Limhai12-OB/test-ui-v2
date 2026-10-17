import { ReportsProvider } from "@/components/reports/reports-store";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ReportsProvider>{children}</ReportsProvider>;
}
