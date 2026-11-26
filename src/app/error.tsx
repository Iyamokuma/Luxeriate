"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-clay-50 text-clay-600">
        <RotateCcw className="size-6" />
      </span>
      <h1 className="mt-6 font-display text-3xl font-semibold text-ink-900">Something went wrong</h1>
      <p className="mt-3 text-ink-500">
        Sorry about that. Your payments and records are safe. Please try again, and if it keeps happening, contact us.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-ink-400">Reference: {error.digest}</p>}
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="secondary">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
