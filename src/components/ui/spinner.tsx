import { cn } from "@/lib/utils";

// Shared loading indicator — used by Button's `loading` prop and anywhere
// else in the app that needs the same "in flight" visual (e.g.
// DeleteButton's icon variant, AvatarUploader). Purely decorative next to
// text that already announces the state ("Salvando...", aria-busy on the
// control itself), so it stays aria-hidden rather than duplicating that
// announcement.
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-4 w-4 animate-spin motion-reduce:animate-none", className)}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        className="opacity-25"
      />
      <path
        fill="currentColor"
        className="opacity-90"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
