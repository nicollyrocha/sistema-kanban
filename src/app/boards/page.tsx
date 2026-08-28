import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { board } from "@/db/schema";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { InlineCreateForm } from "@/components/boards/InlineCreateForm";
import { createBoard } from "./actions";

export default async function BoardsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const boards = await db
    .select()
    .from(board)
    .where(eq(board.userId, session.user.id))
    .orderBy(board.createdAt);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Meus quadros</h1>
        <div className="flex items-center gap-4">
          <Link href="/account" className="text-sm text-muted-foreground hover:text-foreground">
            Minha conta
          </Link>
          <SignOutButton />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {boards.map((b) => (
          <Link
            key={b.id}
            href={`/boards/${b.id}`}
            className="glass flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm hover:bg-accent"
          >
            <span>{b.title}</span>
            <span className="text-muted-foreground">→</span>
          </Link>
        ))}
        {boards.length === 0 && (
          <p className="text-sm text-muted-foreground">Você ainda não tem nenhum quadro.</p>
        )}
      </div>
      <InlineCreateForm placeholder="Nome do quadro" buttonLabel="+ Novo quadro" onCreate={createBoard} />
    </main>
  );
}
