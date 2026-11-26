import Link from "next/link";
import { Lock } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function JoinLayout({ children }: LayoutProps<"/join">) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-cream/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Home">
            <Logo />
          </Link>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-500 sm:text-sm">
            <Lock className="size-3.5 text-forest-600" /> Secure registration
          </p>
        </div>
      </header>
      {children}
    </div>
  );
}
