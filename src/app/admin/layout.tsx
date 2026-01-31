/**
 * Admin layout: nav and container.
 * Theme from root ThemeProvider (defaultTheme="dark"); styles follow docs/base-descriptions/UI-guidelines.md.
 * Auth (Clerk) will wrap this when implemented.
 * @see docs/features/02-source-registry.md
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-3">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">← Home</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/sources">Sources</Link>
            </Button>
          </div>
          <ThemeToggle />
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
