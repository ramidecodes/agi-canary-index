"use client";

import Link from "next/link";
import { getFooterNavItems } from "@/lib/layout/nav-config";

interface SiteFooterProps {
  className?: string;
}

export function SiteFooter({ className }: SiteFooterProps) {
  const items = getFooterNavItems();

  return (
    <footer
      className={`mt-16 py-8 border-t border-border hidden sm:block ${
        className ?? ""
      }`}
    >
      <nav
        className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground"
        aria-label="Footer navigation"
      >
        {items.map((item) =>
          item.href.startsWith("http") ? (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors py-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
            >
              {item.label}
            </a>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-foreground transition-colors py-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
            >
              {item.label}
            </Link>
          ),
        )}
      </nav>
    </footer>
  );
}
