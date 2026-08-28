"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function InlineEditableText({
  value,
  onSave,
  className,
}: {
  value: string;
  onSave: (newValue: string) => Promise<{ error?: string }>;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  async function commit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setDraft(value);
      setEditing(false);
      setError(null);
      return;
    }
    try {
      const result = await onSave(trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      setError(null);
    } catch (err) {
      console.error("Failed to save:", err);
      setError("Não foi possível salvar.");
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
    setError(null);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          className={cn(
            "rounded border border-input bg-white/5 px-2 py-1 text-sm outline-none",
            className
          )}
        />
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn("text-left hover:underline", className)}
    >
      {value}
    </button>
  );
}
