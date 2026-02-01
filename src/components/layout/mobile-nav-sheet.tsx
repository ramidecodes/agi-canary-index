"use client";

import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu } from "lucide-react";
import { getMobileMenuNavItems, EXTERNAL_NAV } from "@/lib/layout/nav-config";
import { cn } from "@/lib/utils";

const TOUCH_TARGET_MIN = "min-h-[44px] min-w-[44px]";

interface MobileNavSheetProps {
  /** Controlled open state; when provided, trigger is not rendered (caller renders it). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, render trigger (hamburger) inside this component. */
  withTrigger?: boolean;
  className?: string;
}

export function MobileNavSheet({
  open,
  onOpenChange,
  withTrigger = true,
  className,
}: MobileNavSheetProps) {
  const menuItems = getMobileMenuNavItems();
  const content = (
    <>
      <SheetHeader className="sr-only">
        <SheetTitle>Menu</SheetTitle>
      </SheetHeader>
      <nav
        className="flex flex-col gap-1 py-4"
        aria-label="Secondary navigation"
      >
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center rounded-md px-4 py-3 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
              TOUCH_TARGET_MIN,
            )}
            onClick={() => onOpenChange?.(false)}
          >
            {item.label}
          </Link>
        ))}
        {EXTERNAL_NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center rounded-md px-4 py-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
              TOUCH_TARGET_MIN,
            )}
            onClick={() => onOpenChange?.(false)}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <div className="mt-auto border-t border-border pt-4 flex items-center justify-between px-4">
        <span className="text-sm text-muted-foreground">Theme</span>
        <ThemeToggle />
      </div>
    </>
  );

  if (withTrigger) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("lg:hidden", TOUCH_TARGET_MIN, className)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="flex flex-col w-[min(100vw-2rem,320px)] sm:max-w-sm"
          showCloseButton={true}
        >
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex flex-col w-[min(100vw-2rem,320px)] sm:max-w-sm"
        showCloseButton={true}
      >
        {content}
      </SheetContent>
    </Sheet>
  );
}
