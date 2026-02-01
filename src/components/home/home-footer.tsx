"use client";

import Link from "next/link";

export function HomeFooter() {
  return (
    <footer className="mt-16 py-8 border-t border-border">
      <nav
        className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground"
        aria-label="Footer navigation"
      >
        <Link
          href="/capabilities"
          className="hover:text-foreground transition-colors"
        >
          Capabilities
        </Link>
        <Link
          href="/autonomy"
          className="hover:text-foreground transition-colors"
        >
          Autonomy & Risk
        </Link>
        <Link
          href="/timeline"
          className="hover:text-foreground transition-colors"
        >
          Timeline
        </Link>
        <Link
          href="/signals"
          className="hover:text-foreground transition-colors"
        >
          Signals
        </Link>
        <Link href="/news" className="hover:text-foreground transition-colors">
          News
        </Link>
        <Link href="/about" className="hover:text-foreground transition-colors">
          About
        </Link>
        <Link
          href="/methodology"
          className="hover:text-foreground transition-colors"
        >
          Methodology
        </Link>
        <Link
          href="/sources"
          className="hover:text-foreground transition-colors"
        >
          Data sources
        </Link>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          GitHub
        </a>
      </nav>
    </footer>
  );
}
