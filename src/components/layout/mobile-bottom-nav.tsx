"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gauge, Newspaper, Timer, Activity } from "lucide-react";
import { PRIMARY_NAV } from "@/lib/layout/nav-config";
import { cn } from "@/lib/utils";

const ICON_MAP = {
  home: Home,
  gauge: Gauge,
  newspaper: Newspaper,
  timeline: Timer,
  activity: Activity,
} as const;

/** Minimum 44px touch targets per docs/features/12-mobile-design.md */
const TOUCH_TARGET = "min-h-[44px] min-w-[44px]";

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 sm:hidden pb-[env(safe-area-inset-bottom)] pt-2"
      aria-label="Primary navigation"
    >
      {PRIMARY_NAV.map((item) => {
        const Icon = item.icon ? ICON_MAP[item.icon] : null;
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 rounded-md px-3 py-2 text-xs transition-colors",
              TOUCH_TARGET,
              isActive
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {Icon ? <Icon className="size-5 shrink-0" /> : null}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
