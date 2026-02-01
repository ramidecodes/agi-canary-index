"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNavSheet } from "./mobile-nav-sheet";
import { HEADER_NAV_GROUPS } from "@/lib/layout/nav-config";
import { cn } from "@/lib/utils";
import logoImg from "@/app/logo.png";

interface SiteHeaderProps {
  /** Optional slot below title (e.g. status badges on home). */
  children?: React.ReactNode;
  className?: string;
}

const navLinkClass =
  "text-sm text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background";

export function SiteHeader({ children, className }: SiteHeaderProps) {
  const pathname = usePathname();

  return (
    <header className={className}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/"
            className="shrink-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded"
            aria-label="AGI Canary home"
          >
            <Image
              src={logoImg}
              alt="AGI Canary"
              height={40}
              width={40}
              className="size-10 object-contain"
              priority
            />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl flex items-baseline gap-1 flex-wrap">
              <Link
                href="/"
                className={cn(
                  "hover:text-foreground/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded"
                )}
              >
                <span className="text-foreground">AGI</span>{" "}
                <span className="text-canary-accent">Canary</span>
              </Link>
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Epistemic instrumentation for AGI progress
            </p>
          </div>
        </div>

        <nav
          className="hidden lg:flex items-center gap-1"
          aria-label="Primary navigation"
        >
          <ul className="flex items-center gap-1">
            <li>
              <Link
                href="/"
                className={cn(
                  navLinkClass,
                  pathname === "/" && "text-foreground font-medium"
                )}
                aria-current={pathname === "/" ? "page" : undefined}
              >
                Home
              </Link>
            </li>
            {HEADER_NAV_GROUPS.map((group) => {
              const isGroupActive = group.items.some(
                (item) =>
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href))
              );
              return (
                <li key={group.label}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          navLinkClass,
                          "h-auto py-2 px-2 font-normal",
                          isGroupActive && "text-foreground font-medium"
                        )}
                        aria-label={`${group.label} menu`}
                      >
                        {group.label}
                        <ChevronDown className="ml-0.5 size-4 shrink-0 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-40">
                      {group.items.map((item) => (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link href={item.href}>{item.label}</Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden lg:inline-flex">
            <ThemeToggle />
          </span>
          <MobileNavSheet withTrigger />
        </div>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}
