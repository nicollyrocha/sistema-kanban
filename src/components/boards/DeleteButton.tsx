"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";

export function DeleteButton({
  label,
  confirmMessage,
  onDelete,
  variant = "icon",
}: {
  label: string;
  confirmMessage?: string;
  onDelete: () => Promise<{ error?: string }>;
  // "icon": a bare × in a corner (board/column headers, the quick-delete on
  // a closed card). "text": a labeled, clearly destructive action -- used
  // where a plain × next to another × (e.g. a dialog's own close button)
  // would read as a second close/cancel control instead of "delete".
  variant?: "icon" | "text";
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setLoading(true);
    try {
      const result = await onDelete();
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Failed to delete:", err);
      setError("Não foi possível excluir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={variant === "text" ? "flex flex-col items-start gap-1" : "flex flex-col items-end gap-1"}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-busy={loading || undefined}
        aria-label={variant === "icon" ? label : undefined}
        className={
          variant === "text"
            ? "inline-flex w-fit items-center gap-1.5 text-sm font-medium text-destructive transition-colors hover:underline disabled:opacity-50"
            : "inline-flex items-center justify-center text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
        }
      >
        {variant === "text" ? (
          <>
            {loading && <Spinner className="h-3.5 w-3.5" />}
            {loading ? "Excluindo..." : label}
          </>
        ) : loading ? (
          <Spinner className="h-3.5 w-3.5" />
        ) : (
          "×"
        )}
      </button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
