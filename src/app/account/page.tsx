import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { AvatarUploader } from "@/components/account/AvatarUploader";
import { ProfileForm } from "@/components/account/ProfileForm";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Minha conta</h1>
          <Link href="/boards" className="text-sm text-muted-foreground hover:text-foreground">
            Voltar
          </Link>
        </div>
        <AvatarUploader initialImage={session.user.image ?? null} name={session.user.name} />
        <div className="my-6 h-px bg-border" />
        <ProfileForm initialName={session.user.name} initialEmail={session.user.email} />
        <div className="my-6 h-px bg-border" />
        <ChangePasswordForm />
      </Card>
    </main>
  );
}
