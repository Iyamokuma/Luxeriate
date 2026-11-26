import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArcsMotif, Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_55%_at_50%_45%,black,transparent)]" />
      <header className="relative px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
      </header>
      <main className="relative mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="relative flex h-44 items-center justify-center">
          <ArcsMotif className="absolute left-1/2 top-1/2 h-44 -translate-x-1/2 -translate-y-1/2 rotate-0 text-honey-400/70" />
          <p className="relative font-mono text-6xl font-medium tracking-[-0.06em] text-ink-950">404</p>
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-[-0.035em] text-ink-950">We couldn&apos;t find that page</h1>
        <p className="mt-3 text-ink-500">It may have moved, or the package may no longer be available.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="ink" size="lg" className="rounded-xl">
            <Link href="/">Back to the homepage</Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="rounded-xl">
            <Link href="/dashboard">My dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
