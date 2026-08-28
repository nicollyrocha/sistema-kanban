import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { board, boardColumn, card } from "@/db/schema";

export async function getOwnedBoard(boardId: string, userId: string) {
  const [row] = await db
    .select()
    .from(board)
    .where(and(eq(board.id, boardId), eq(board.userId, userId)));
  return row ?? null;
}

export async function getOwnedColumn(boardId: string, columnId: string, userId: string) {
  const [row] = await db
    .select({ column: boardColumn })
    .from(boardColumn)
    .innerJoin(board, eq(boardColumn.boardId, board.id))
    .where(
      and(
        eq(boardColumn.id, columnId),
        eq(boardColumn.boardId, boardId),
        eq(board.userId, userId)
      )
    );
  return row?.column ?? null;
}

export async function getOwnedCard(boardId: string, cardId: string, userId: string) {
  const [row] = await db
    .select({ card })
    .from(card)
    .innerJoin(boardColumn, eq(card.columnId, boardColumn.id))
    .innerJoin(board, eq(boardColumn.boardId, board.id))
    .where(
      and(eq(card.id, cardId), eq(boardColumn.boardId, boardId), eq(board.userId, userId))
    );
  return row?.card ?? null;
}
