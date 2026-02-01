import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { HomeStatusBadges } from "@/components/layout/home-status-badges";

/**
 * Main app layout for public pages (home, autonomy, news, timeline, capabilities, signals).
 * Provides shared header, footer, and mobile navigation.
 * @see docs/features/12-mobile-design.md
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <SiteHeader>
          <HomeStatusBadges />
        </SiteHeader>
        <main id="main-content" className="min-h-0 pb-20 sm:pb-0">
          {children}
        </main>
        <SiteFooter />
      </div>
      <MobileBottomNav />
    </div>
  );
}
