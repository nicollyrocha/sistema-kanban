"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { updateProfileSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const parsed = updateProfileSchema.safeParse({ name, email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    setLoading(true);
    try {
      if (parsed.data.name !== initialName) {
        const { error: nameError } = await authClient.updateUser({ name: parsed.data.name });
        if (nameError) {
          setError(nameError.message ?? "Não foi possível atualizar o nome.");
          return;
        }
      }

      if (parsed.data.email !== initialEmail) {
        const { error: emailError } = await authClient.changeEmail({
          newEmail: parsed.data.email,
          callbackURL: "/account",
        });
        if (emailError) {
          setError(emailError.message ?? "Não foi possível trocar o email.");
          return;
        }
        setMessage("Enviamos um link de confirmação para o novo email.");
      } else {
        setMessage("Perfil atualizado.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
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
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
