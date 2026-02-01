/**
 * Document content retrieval from R2.
 * GET /api/admin/documents/:id/content
 * Returns markdown content for display.
 * @see docs/features/04-acquisition-pipeline.md
 */

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { getDb, documents } from "@/lib/db";
import { fetchDocumentFromR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authRes = await requireAuth();
  if (authRes) return authRes;

  const { id } = await params;

  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) {
    return NextResponse.json(
      { error: "R2_BUCKET_NAME not configured" },
      { status: 500 },
    );
  }

  try {
    const db = getDb();
    const [doc] = await db
      .select({ cleanBlobKey: documents.cleanBlobKey })
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    if (!doc?.cleanBlobKey) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const content = await fetchDocumentFromR2({
      bucketName,
      key: doc.cleanBlobKey,
    });

    if (!content) {
      return NextResponse.json(
        { error: "Content not found in storage" },
        { status: 404 },
      );
    }

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("R2 credentials")) {
      return NextResponse.json({ error: "R2 not configured" }, { status: 503 });
    }
    const msg = err instanceof Error ? err.message : "Failed to fetch content";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
