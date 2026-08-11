import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/sidebar/sidebar";
import { ThemeProvider } from "@/components/theme-provider";

// Inter — the gold standard for premium desktop applications
// Used by: Figma, Linear, Notion, Vercel, GitHub
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "pdflexity — PDF Command Center",
  description: "The fast, intelligent desktop PDF productivity suite.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)} suppressHydrationWarning>
      <body className="flex h-screen overflow-hidden antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Drag strip — mirrors sidebar's app-drag h-8, makes full title bar draggable */}
            <div className="app-drag h-8 w-full shrink-0 bg-background" />
            <main className="flex flex-1 flex-col overflow-hidden bg-background text-foreground">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
