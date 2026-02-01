/**
 * R2 S3-compatible client for document fetch and acquisition.
 * Used by Next.js app to retrieve document content from R2 and store scraped content.
 * @see docs/INFRASTRUCTURE.md
 */

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/** R2 bucket interface compatible with acquisition pipeline (matches Workers R2Binding shape). */
export interface R2Bucket {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<void>;
  get(key: string): Promise<{
    body: ReadableStream;
    metadata?: Record<string, unknown>;
  } | null>;
}

function getR2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const endpoint =
    process.env.R2_ENDPOINT ?? `https://${accountId}.r2.cloudflarestorage.com`;

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export interface FetchDocumentOptions {
  bucketName: string;
  key: string;
}

/**
 * Fetch document content from R2 via S3-compatible API.
 * Returns markdown string or null if not found.
 */
export async function fetchDocumentFromR2(
  options: FetchDocumentOptions
): Promise<string | null> {
  const client = getR2Client();
  if (!client) {
    throw new Error("R2 credentials not configured");
  }

  const { bucketName, key } = options;

  const result = await client.send(
    new GetObjectCommand({ Bucket: bucketName, Key: key })
  );

  if (!result.Body) {
    return null;
  }

  const bytes = await result.Body.transformToByteArray();
  return new TextDecoder().decode(bytes);
}

/**
 * Create R2Bucket adapter for acquisition pipeline.
 * Uses S3-compatible API; requires R2_* env vars and R2_BUCKET_NAME.
 */
export function createR2Bucket(): R2Bucket {
  const client = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!client || !bucketName) {
    throw new Error(
      "R2 credentials and R2_BUCKET_NAME must be configured for acquisition"
    );
  }

  return {
    async put(
      key: string,
      value: ReadableStream | ArrayBuffer | string,
      options?: { httpMetadata?: { contentType?: string } }
    ): Promise<void> {
      const body =
        typeof value === "string"
          ? new TextEncoder().encode(value)
          : value instanceof ArrayBuffer
          ? new Uint8Array(value)
          : value;
      await client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: body,
          ContentType: options?.httpMetadata?.contentType,
        })
      );
    },
    async get(key: string): Promise<{
      body: ReadableStream;
      metadata?: Record<string, unknown>;
    } | null> {
      const result = await client.send(
        new GetObjectCommand({ Bucket: bucketName, Key: key })
      );
      if (!result.Body) return null;
      return {
        body: result.Body as ReadableStream,
        metadata: result.Metadata as Record<string, unknown> | undefined,
      };
    },
  };
}
