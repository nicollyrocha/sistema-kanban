import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-3 focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[var(--gradient-accent-start)] to-[var(--gradient-accent-end)] text-primary-foreground shadow-lg shadow-black/20 hover:opacity-90 hover:shadow-xl active:opacity-95",
        outline:
          "border border-border bg-transparent hover:border-ring/40 hover:bg-accent active:bg-accent/70",
        ghost: "hover:bg-accent active:bg-accent/70",
        destructive:
          "bg-destructive/20 text-destructive hover:bg-destructive/30 active:bg-destructive/40",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  // Shows a spinner alongside the button's content and disables it, without
  // taking over the label text — callers still swap their own copy (e.g.
  // "Entrando...") so the loading state stays specific to the action.
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
