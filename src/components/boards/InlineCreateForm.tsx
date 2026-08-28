"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

export function InlineCreateForm({
  placeholder,
  buttonLabel,
  onCreate,
}: {
  placeholder: string;
  buttonLabel: string;
  onCreate: (title: string) => Promise<{ error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const result = await onCreate(trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTitle("");
      setError(null);
    } catch (err) {
      console.error("Failed to create:", err);
      setError("Não foi possível salvar.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        {buttonLabel}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <Input
        autoFocus
        placeholder={placeholder}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            setTitle("");
            setError(null);
          }
        }}
        onBlur={() => {
          if (!title.trim()) setOpen(false);
        }}
        disabled={loading}
      />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
