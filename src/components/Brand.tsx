import Link from "next/link";
import { cn } from "@/lib/utils";

// The app's wordmark + icon mark, reused wherever a page needs to establish
// identity: the landing nav and every auth page (which, unlike the landing
// page, previously had nothing above their form Card to anchor them to the
// product). Always links home.
export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 text-lg font-semibold text-foreground transition-opacity hover:opacity-80",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--gradient-accent-start)] to-[var(--gradient-accent-end)] text-sm font-bold text-primary-foreground"
      >
        K
      </span>
      Kanban
    </Link>
  );
}
