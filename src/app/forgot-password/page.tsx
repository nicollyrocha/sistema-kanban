import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Card } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">Recuperar senha</h1>
        <ForgotPasswordForm />
      </Card>
    </main>
  );
}
