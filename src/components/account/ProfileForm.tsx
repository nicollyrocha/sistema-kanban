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
  // "Committed" baseline — what the server actually has right now. Starts
  // from props but advances after each successful save, so re-submitting
  // unchanged values (or clicking Salvar twice without editing) doesn't
  // keep re-sending the same update.
  const [savedName, setSavedName] = useState(initialName);
  const [savedEmail, setSavedEmail] = useState(initialEmail);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const unchanged = name === savedName && email === savedEmail;

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
      let nameUpdated = false;

      if (parsed.data.name !== savedName) {
        const { error: nameError } = await authClient.updateUser({ name: parsed.data.name });
        if (nameError) {
          setError(nameError.message ?? "Não foi possível atualizar o nome.");
          return;
        }
        setSavedName(parsed.data.name);
        nameUpdated = true;
      }

      if (parsed.data.email !== savedEmail) {
        const { error: emailError } = await authClient.changeEmail({
          newEmail: parsed.data.email,
          callbackURL: "/account",
        });
        if (emailError) {
          // The name change above may already have succeeded even though
          // the email change failed — say so, don't just show a bare error
          // that makes it look like nothing happened.
          setError(
            nameUpdated
              ? `Nome atualizado. Não foi possível trocar o email: ${emailError.message ?? "tente novamente."}`
              : (emailError.message ?? "Não foi possível trocar o email.")
          );
          return;
        }
        // The account's real email doesn't change until the confirmation
        // link is clicked, but we still advance the baseline here — the
        // request itself succeeded, and re-submitting the same pending
        // address should not silently resend the confirmation email.
        setSavedEmail(parsed.data.email);
        setMessage("Enviamos um link de confirmação para o novo email.");
      } else if (nameUpdated) {
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
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
      <Button type="submit" disabled={loading || unchanged}>
        {loading ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
