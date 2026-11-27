import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Monogram3D } from "@/components/three/monogram-3d";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div data-theme="app" className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,40rem)]">
      <div className="relative flex flex-col px-5 py-6 sm:px-10">
        <Link href="/" className="w-fit" aria-label="Home">
          <Logo tag="Foodstuff" />
        </Link>
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[25rem] animate-fade-up">{children}</div>
        </div>
        <p className="text-center font-mono text-[0.6875rem] text-ink-400 lg:text-left">Payments are processed securely by Paystack.</p>
      </div>
      <aside className="relative hidden overflow-hidden bg-night text-cream lg:flex lg:flex-col">
        <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-50 invert [mask-image:radial-gradient(ellipse_80%_60%_at_50%_35%,black,transparent)]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(50%_50%_at_50%_45%,rgb(194_232_108/0.14),transparent)]" />
        <div className="relative min-h-0 flex-1">
          <Monogram3D tone="light" fresh className="absolute inset-0" />
        </div>
        <div className="relative px-14 pb-14">
          <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-leaf-300">Luxuriate Foodstuff</p>
          <p className="mt-4 max-w-md text-[2.125rem] font-bold leading-[1.1] tracking-[-0.035em]">
            Every month, a little closer to a <span className="text-leaf-300">full pantry.</span>
          </p>
          <div className="mt-9 grid max-w-md grid-cols-3 gap-2.5">
            {[
              ["Jan", "Paid"],
              ["Feb", "Paid"],
              ["Mar", "Due"],
            ].map(([m, s], i) => (
              <div key={m} className="rounded-xl bg-white/[0.05] p-3.5 ring-1 ring-inset ring-white/10">
                <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-400">{m}</p>
                <p className={i < 2 ? "mt-1.5 text-sm font-semibold text-leaf-300" : "mt-1.5 text-sm font-semibold text-tide-300"}>{s}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
