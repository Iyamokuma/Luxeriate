import { ArcsMotif } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="relative mb-5">
        <ArcsMotif className="absolute left-1/2 top-1/2 h-[5.5rem] -translate-x-1/2 -translate-y-1/2 rotate-0 text-honey-300/60" />
        <div className="relative flex size-14 items-center justify-center rounded-full bg-forest-50 text-forest-600 ring-1 ring-forest-100 [&_svg]:size-6">
          {icon}
        </div>
      </div>
      <h3 className="font-display text-lg font-semibold text-ink-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
