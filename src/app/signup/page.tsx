import { SignupForm } from "@/components/auth/SignupForm";
import { Card } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">Criar conta</h1>
        <SignupForm />
      </Card>
    </main>
  );
}
