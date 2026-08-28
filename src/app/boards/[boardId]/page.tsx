import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { boardColumn, card } from "@/db/schema";
import { getOwnedBoard } from "@/lib/board-auth";
import { InlineEditableText } from "@/components/boards/InlineEditableText";
import { InlineCreateForm } from "@/components/boards/InlineCreateForm";
import { DeleteButton } from "@/components/boards/DeleteButton";
import { Column } from "@/components/boards/Column";
import { renameBoard, deleteBoard, createColumn } from "../actions";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const owned = await getOwnedBoard(boardId, session.user.id);
  if (!owned) {
    notFound();
  }

  const columns = await db
    .select()
    .from(boardColumn)
    .where(eq(boardColumn.boardId, boardId))
    .orderBy(boardColumn.position);

  const cards = columns.length
    ? await db
        .select()
        .from(card)
        .where(
          inArray(
            card.columnId,
            columns.map((c) => c.id)
          )
        )
        .orderBy(card.position)
    : [];

  return (
    <main className="flex min-h-screen flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/boards" className="text-sm text-muted-foreground hover:text-foreground">
            <span aria-hidden="true">←</span> Meus quadros
          </Link>
          <InlineEditableText
            value={owned.title}
            onSave={renameBoard.bind(null, boardId)}
            label="Nome do quadro"
            className="text-xl font-semibold"
          />
        </div>
        <DeleteButton
          label="Excluir quadro"
          confirmMessage="Tem certeza? Isso vai excluir todas as colunas e cards deste quadro."
          onDelete={deleteBoard.bind(null, boardId)}
        />
      </div>
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <Column
            key={column.id}
            boardId={boardId}
            column={column}
            cards={cards.filter((c) => c.columnId === column.id)}
          />
        ))}
        <div className="w-64 shrink-0">
          <InlineCreateForm
            placeholder="Nome da coluna"
            buttonLabel="+ Adicionar coluna"
            onCreate={createColumn.bind(null, boardId)}
          />
        </div>
      </div>
    </main>
  );
}
