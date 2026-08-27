import { SignOutButton } from "@/components/auth/SignOutButton";

export default function BoardsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Meus quadros</h1>
        <SignOutButton />
      </div>
      <p className="text-muted-foreground">
        A lista de quadros chega no próximo passo.
      </p>
    </main>
  );
}
