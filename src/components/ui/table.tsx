import { cn } from "@/lib/utils";

export function TableWrap({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("-mx-px overflow-x-auto", className)} {...props} />;
}

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return <table className={cn("w-full border-separate border-spacing-0 text-sm", className)} {...props} />;
}

export function THead({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("", className)} {...props} />;
}

export function TH({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "sticky top-0 z-[1] whitespace-nowrap border-b border-line bg-sand/70 px-4 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-500 backdrop-blur first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6",
        className,
      )}
      {...props}
    />
  );
}

export function TR({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("group transition-colors hover:bg-sand/50", className)} {...props} />;
}

export function TD({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn(
        "whitespace-nowrap border-b border-line/70 px-4 py-3 align-middle text-ink-700 group-last:border-b-0 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6",
        className,
      )}
      {...props}
    />
  );
}
