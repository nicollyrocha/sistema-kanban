"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { changePasswordSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    setLoading(true);
    const { error } = await authClient.changePassword(parsed.data);
    setLoading(false);
    if (error) {
      setError(error.message ?? "Não foi possível trocar a senha.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setMessage("Senha atualizada.");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <Label htmlFor="currentPassword">Senha atual</Label>
        <Input
          id="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="newPassword">Nova senha</Label>
        <Input
          id="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
