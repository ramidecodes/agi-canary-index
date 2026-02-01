/**
 * Single source of truth for site navigation.
 * Used by SiteHeader, SiteFooter, MobileBottomNav, and MobileNavSheet.
 * @see docs/features/12-mobile-design.md
 */

export interface NavItem {
  href: string;
  label: string;
}

export interface PrimaryNavItem extends NavItem {
  /** Icon name for bottom nav (lucide). */
  icon?: "home" | "gauge" | "newspaper" | "timeline" | "activity";
  /** On mobile, show as "link to desktop" instead of in-app tab. */
  desktopOnlyOnMobile?: boolean;
}

/** Primary tabs: bottom bar on mobile, part of footer on desktop. */
export const PRIMARY_NAV: PrimaryNavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/autonomy", label: "Autonomy", icon: "gauge" },
  { href: "/news", label: "News", icon: "newspaper" },
  { href: "/timeline", label: "Timeline", icon: "timeline" },
  { href: "/signals", label: "Signals", icon: "activity" },
];

/** Secondary links: hamburger menu on mobile, footer on desktop. */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/capabilities", label: "Capabilities" },
  { href: "/about", label: "About" },
  { href: "/methodology", label: "Methodology" },
  { href: "/sources", label: "Data sources" },
];

/** External links (e.g. GitHub). */
export const EXTERNAL_NAV: NavItem[] = [
  { href: "https://github.com", label: "GitHub" },
];

/** All footer links in order: primary + secondary + external. */
export function getFooterNavItems(): NavItem[] {
  return [
    ...PRIMARY_NAV.map(({ href, label }) => ({ href, label })),
    ...SECONDARY_NAV,
    ...EXTERNAL_NAV,
  ];
}

/** Primary items for mobile bottom bar (exclude desktop-only on mobile). */
export function getMobileBottomNavItems(): PrimaryNavItem[] {
  return PRIMARY_NAV.filter((item) => !item.desktopOnlyOnMobile);
}

/** Items for hamburger sheet: secondary + primary (for consistency) or just secondary. */
export function getMobileMenuNavItems(): NavItem[] {
  return [...SECONDARY_NAV];
}
