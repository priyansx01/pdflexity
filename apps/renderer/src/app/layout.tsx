import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { BackendProvider } from "@/components/backend-provider";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: "PDFlexity",
  description: "A fast, privacy-first PDF toolkit. Everything runs locally.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <BackendProvider>
            <AppShell>{children}</AppShell>
          </BackendProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
