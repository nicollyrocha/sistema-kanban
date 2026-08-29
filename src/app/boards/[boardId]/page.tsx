import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { boardColumn, card, label, cardLabel } from "@/db/schema";
import { getOwnedBoard } from "@/lib/board-auth";
import { InlineEditableText } from "@/components/boards/InlineEditableText";
import { DeleteButton } from "@/components/boards/DeleteButton";
import { BoardView } from "@/components/boards/BoardView";
import { renameBoard, deleteBoard } from "../actions";

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

  const boardLabels = await db.select().from(label).where(eq(label.boardId, boardId));

  const cardLabelRows = cards.length
    ? await db
        .select({ cardId: cardLabel.cardId, id: label.id, name: label.name, color: label.color })
        .from(cardLabel)
        .innerJoin(label, eq(cardLabel.labelId, label.id))
        .where(
          inArray(
            cardLabel.cardId,
            cards.map((c) => c.id)
          )
        )
    : [];

  const cardsWithLabels = cards.map((c) => ({
    ...c,
    labels: cardLabelRows
      .filter((cl) => cl.cardId === c.id)
      .map((cl) => ({ id: cl.id, name: cl.name, color: cl.color })),
  }));

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
      <BoardView
        boardId={boardId}
        columns={columns}
        cardsByColumn={Object.fromEntries(
          columns.map((column) => [
            column.id,
            cardsWithLabels.filter((c) => c.columnId === column.id),
          ])
        )}
        boardLabels={boardLabels}
      />
    </main>
  );
}
