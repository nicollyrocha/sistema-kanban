"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const { error } = await authClient.signOut();
    if (error) {
      setLoading(false);
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={handleSignOut} loading={loading}>
      {loading ? "Saindo..." : "Sair"}
    </Button>
  );
}
