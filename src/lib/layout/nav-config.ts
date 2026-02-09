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

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Desktop header: grouped dropdowns. Home is standalone; Explore and About are groups. */
export const HEADER_NAV_GROUPS: NavGroup[] = [
  {
    label: "Explore",
    items: [
      { href: "/autonomy", label: "Autonomy" },
      { href: "/news", label: "News" },
      { href: "/timeline", label: "Timeline" },
      { href: "/signals", label: "Signals" },
    ],
  },
  {
    label: "About",
    items: [
      { href: "/about", label: "About" },
      { href: "/capabilities", label: "Capabilities" },
      { href: "/methodology", label: "Methodology" },
      { href: "/sources", label: "Data sources" },
    ],
  },
];

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
  { href: "https://ramilabs.com", label: "Rami Labs" },
];

/** Footer-only links (e.g. Admin; not in header More or mobile sheet). */
export const FOOTER_NAV: NavItem[] = [
  { href: "/admin/sources", label: "Admin" },
];

/** Minimal footer links: Admin, About, and external. */
export function getFooterNavItems(): NavItem[] {
  return [...FOOTER_NAV, { href: "/about", label: "About" }, ...EXTERNAL_NAV];
}

/** Primary items for mobile bottom bar (exclude desktop-only on mobile). */
export function getMobileBottomNavItems(): PrimaryNavItem[] {
  return PRIMARY_NAV.filter((item) => !item.desktopOnlyOnMobile);
}

/** Items for hamburger sheet: all links from the desktop header, grouped. */
export function getMobileMenuNavGroups(): {
  standalone: NavItem[];
  groups: NavGroup[];
  external: NavItem[];
} {
  return {
    standalone: [{ href: "/", label: "Home" }],
    groups: HEADER_NAV_GROUPS,
    external: EXTERNAL_NAV,
  };
}
