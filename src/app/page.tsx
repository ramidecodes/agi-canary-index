import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <main className="flex w-full max-w-3xl flex-col items-center gap-12 px-8 py-24 text-center">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            AGI Canary Index
          </h1>
          <p className="text-muted-foreground">
            Epistemic instrumentation for AGI progress
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/admin/sources"
            prefetch={false}
            className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-6 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Admin: Source Registry
          </Link>
        </div>
      </main>
    </div>
  );
}
