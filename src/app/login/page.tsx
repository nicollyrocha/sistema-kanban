import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">Entrar</h1>
        <LoginForm />
      </Card>
    </main>
  );
}
