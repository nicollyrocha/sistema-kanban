"use client";

import { useState } from "react";

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
        aria-label={variant === "icon" ? label : undefined}
        className={
          variant === "text"
            ? "w-fit text-sm font-medium text-destructive hover:underline disabled:opacity-50"
            : "text-muted-foreground hover:text-destructive disabled:opacity-50"
        }
      >
        {variant === "text" ? label : "×"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
