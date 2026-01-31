/**
 * Server-side auth helpers for admin API routes.
 * Middleware already protects /api/admin; this is defense-in-depth.
 * @see docs/AUTH.md
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Ensures the request is authenticated. Returns 401 JSON if not.
 * Use at the start of admin API route handlers.
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
