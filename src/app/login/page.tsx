import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/card";
import { Brand } from "@/components/Brand";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/boards");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <Brand />
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">Entrar</h1>
        <LoginForm />
      </Card>
    </main>
  );
}
