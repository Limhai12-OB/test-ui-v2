import type { Metadata } from "next";
import { Kantumruy_Pro, Mulish, Poppins } from "next/font/google";
import { SessionProvider } from "@/lib/session";
import "./globals.css";

// Figma text styles use Poppins for UI text, Mulish SemiBold for tabular
// figures and Kantumruy Pro for the riel sign / Khmer text.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ["600"],
});

const kantumruy = Kantumruy_Pro({
  variable: "--font-kantumruy",
  subsets: ["khmer"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "FinanceSight",
  description: "Business finances for every branch, in USD and KHR.",
};

/**
 * Applies the saved theme before first paint so dark mode never flashes light. Key matches <ThemeToggle storageKey>.
 * Also adds `js` to <html>, which the landing page scroll-reveal CSS waits for (content stays visible without JS).
 */
const THEME_SCRIPT = `document.documentElement.classList.add("js");try{var t=localStorage.getItem("fs-theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${mulish.variable} ${kantumruy.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
