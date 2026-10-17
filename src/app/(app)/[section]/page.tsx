import { notFound } from "next/navigation";
import { EXTRA_SECTIONS, findNavItem, NAV_GROUPS, SETTINGS_ITEM } from "@/components/shell/nav";
import { NotBuiltYet } from "./not-built-yet";

export function generateStaticParams() {
  return [...NAV_GROUPS.flatMap((group) => group.items), SETTINGS_ITEM, ...EXTRA_SECTIONS]
    .filter((item) => item.href !== "/dashboard" && !item.built)
    .map((item) => ({ section: item.href.slice(1) }));
}

/** Screens linked from the shell that are designed in Figma but not built in this pass. */
export default async function SectionPage({ params }: PageProps<"/[section]">) {
  const { section } = await params;
  const item = findNavItem(section);
  if (!item || item.href === "/dashboard" || item.built) notFound();
  return (
    <>
      <title>{`${item.label} · FinanceSight`}</title>
      <NotBuiltYet label={item.label} figmaSection={item.figmaSection} ownerOnly={item.ownerOnly} />
    </>
  );
}
