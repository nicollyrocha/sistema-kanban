"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { board, boardColumn, card } from "@/db/schema";
import { getOwnedBoard, getOwnedColumn, getOwnedCard } from "@/lib/board-auth";
import { nextPosition } from "@/lib/position";
import { titleSchema } from "@/lib/validation";

async function requireUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  return session.user.id;
}

function parseTitle(title: string) {
  const parsed = titleSchema.safeParse({ title });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Título inválido." } as const;
  }
  return { title: parsed.data.title } as const;
}

export async function createBoard(title: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = parseTitle(title);
  if ("error" in parsed) return { error: parsed.error };

  await db.insert(board).values({ userId, title: parsed.title });
  revalidatePath("/boards");
  return {};
}

export async function renameBoard(boardId: string, title: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = parseTitle(title);
  if ("error" in parsed) return { error: parsed.error };

  const owned = await getOwnedBoard(boardId, userId);
  if (!owned) return { error: "Quadro não encontrado." };

  await db
    .update(board)
    .set({ title: parsed.title, updatedAt: new Date() })
    .where(eq(board.id, boardId));
  revalidatePath("/boards");
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function deleteBoard(boardId: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const owned = await getOwnedBoard(boardId, userId);
  if (!owned) return { error: "Quadro não encontrado." };

  await db.delete(board).where(eq(board.id, boardId));
  revalidatePath("/boards");
  return {};
}

export async function createColumn(boardId: string, title: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = parseTitle(title);
  if ("error" in parsed) return { error: parsed.error };

  const owned = await getOwnedBoard(boardId, userId);
  if (!owned) return { error: "Quadro não encontrado." };

  const existing = await db
    .select({ position: boardColumn.position })
    .from(boardColumn)
    .where(eq(boardColumn.boardId, boardId));
  const position = nextPosition(existing.map((c) => c.position));

  await db.insert(boardColumn).values({ boardId, title: parsed.title, position });
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function renameColumn(
  boardId: string,
  columnId: string,
  title: string
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = parseTitle(title);
  if ("error" in parsed) return { error: parsed.error };

  const owned = await getOwnedColumn(boardId, columnId, userId);
  if (!owned) return { error: "Coluna não encontrada." };

  await db.update(boardColumn).set({ title: parsed.title }).where(eq(boardColumn.id, columnId));
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function deleteColumn(
  boardId: string,
  columnId: string
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const owned = await getOwnedColumn(boardId, columnId, userId);
  if (!owned) return { error: "Coluna não encontrada." };

  await db.delete(boardColumn).where(eq(boardColumn.id, columnId));
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function createCard(
  boardId: string,
  columnId: string,
  title: string
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = parseTitle(title);
  if ("error" in parsed) return { error: parsed.error };

  const owned = await getOwnedColumn(boardId, columnId, userId);
  if (!owned) return { error: "Coluna não encontrada." };

  const existing = await db
    .select({ position: card.position })
    .from(card)
    .where(eq(card.columnId, columnId));
  const position = nextPosition(existing.map((c) => c.position));

  await db.insert(card).values({ columnId, title: parsed.title, position });
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function renameCard(
  boardId: string,
  cardId: string,
  title: string
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = parseTitle(title);
  if ("error" in parsed) return { error: parsed.error };

  const owned = await getOwnedCard(boardId, cardId, userId);
  if (!owned) return { error: "Card não encontrado." };

  await db
    .update(card)
    .set({ title: parsed.title, updatedAt: new Date() })
    .where(eq(card.id, cardId));
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function deleteCard(boardId: string, cardId: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const owned = await getOwnedCard(boardId, cardId, userId);
  if (!owned) return { error: "Card não encontrado." };

  await db.delete(card).where(eq(card.id, cardId));
  revalidatePath(`/boards/${boardId}`);
  return {};
}
