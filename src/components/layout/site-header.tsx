"use client";

import Link from "next/link";
import { MobileNavSheet } from "./mobile-nav-sheet";

interface SiteHeaderProps {
  /** Optional slot below title (e.g. status badges on home). */
  children?: React.ReactNode;
  className?: string;
}

export function SiteHeader({ children, className }: SiteHeaderProps) {
  return (
    <header className={className}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2 flex-wrap">
            <Link
              href="/"
              className="hover:text-foreground/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded"
            >
              AGI CANARY WATCHER
            </Link>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Epistemic instrumentation for AGI progress
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/sources"
            className="hidden lg:inline-flex text-xs text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            Admin →
          </Link>
          <MobileNavSheet withTrigger />
        </div>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}
