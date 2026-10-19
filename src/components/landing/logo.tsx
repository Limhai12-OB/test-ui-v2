import Image from "next/image";
import s from "./landing.module.css";
import { BRAND } from "./content";

/** Brand mark: the FinanceSight Figma asset (the original page drew its own LedgerVision mark). */
export function LogoMark({ size = 26 }: { size?: number }) {
  return <Image src="/figma/logo-mark.svg" alt="" width={size} height={size} unoptimized />;
}

export default function Logo() {
  return (
    <a href="#top" className={s.logo} aria-label={`${BRAND} home`}>
      <LogoMark />
      <span>{BRAND}</span>
    </a>
  );
}
