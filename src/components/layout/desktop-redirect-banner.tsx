"use client";

import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";

interface DesktopRedirectBannerProps {
  /** Optional path for "view on desktop" link; defaults to current pathname. */
  path?: string;
  className?: string;
}

/**
 * On mobile, shows a non-intrusive banner: "For full analysis, view on desktop".
 * @see docs/features/12-mobile-design.md
 */
export function DesktopRedirectBanner({
  path,
  className,
}: DesktopRedirectBannerProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const targetPath = path ?? pathname ?? "/";

  if (!isMobile) return null;

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}${targetPath}`
      : targetPath;

  return (
    <div
      className={`border-t border-border bg-muted/30 py-3 px-4 text-center text-sm text-muted-foreground ${
        className ?? ""
      }`}
    >
      <p>
        For full analysis,{" "}
        <a
          href={url}
          className="underline hover:text-foreground transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          view on desktop
        </a>
      </p>
    </div>
  );
}
