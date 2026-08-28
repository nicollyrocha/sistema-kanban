"use client";

import { useState } from "react";

export function DeleteButton({
  label,
  confirmMessage,
  onDelete,
}: {
  label: string;
  confirmMessage?: string;
  onDelete: () => Promise<{ error?: string }>;
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
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-label={label}
        className="text-muted-foreground hover:text-destructive disabled:opacity-50"
      >
        ×
      </button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
