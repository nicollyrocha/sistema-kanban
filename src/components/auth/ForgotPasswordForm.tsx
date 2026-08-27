"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { forgotPasswordSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }
    setLoading(true);
    const { error } = await authClient.requestPasswordReset({
      email: parsed.data.email,
      redirectTo: "/reset-password",
    });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Não foi possível enviar o email.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        Se existir uma conta com esse email, enviamos um link para redefinir
        a senha.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? "Enviando..." : "Enviar link de recuperação"}
      </Button>
    </form>
  );
}
