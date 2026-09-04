import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Card } from "@/components/ui/card";
import { Brand } from "@/components/Brand";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <Brand />
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">Redefinir senha</h1>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </Card>
    </main>
  );
}
