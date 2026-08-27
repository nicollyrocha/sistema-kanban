import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "glass rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/20",
        className
      )}
      {...props}
    />
  );
}
