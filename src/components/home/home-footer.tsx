"use client";

/**
 * @deprecated Use SiteFooter from @/components/layout instead.
 * Footer nav is now provided by the (main) layout; this re-export exists for backward compatibility.
 */
import { SiteFooter } from "@/components/layout/site-footer";

export function HomeFooter() {
  return <SiteFooter />;
}
