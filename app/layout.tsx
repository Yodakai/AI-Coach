import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moneyline Hacks — AI Coach",
  description: "Your receipts-first betting coach with personas, risk modes, and built-in guides."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <header className="sticky top-0 z-20 backdrop-blur bg-bg/70 border-b border-slate-800">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <div className="font-bold tracking-tight">MLH • AI Coach</div>
            <div className="text-sm text-muted">
              Receipts-first • Mobile-perfect • Easy mode
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted">
          © {new Date().getFullYear()} Moneyline Hacks
        </footer>
      </body>
    </html>
  );
}

