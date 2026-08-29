"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { board, boardColumn, card, label, cardLabel } from "@/db/schema";
import { getOwnedBoard, getOwnedColumn, getOwnedCard, getOwnedLabel } from "@/lib/board-auth";
import { nextPosition } from "@/lib/position";
import { reorderColumn } from "@/lib/reorder";
import {
  titleSchema,
  descriptionSchema,
  dueDateSchema,
  labelSchema,
  moveCardSchema,
} from "@/lib/validation";

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
  revalidatePath(`/boards/${boardId}`);
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

export async function updateCardDescription(
  boardId: string,
  cardId: string,
  description: string
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = descriptionSchema.safeParse({ description });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Descrição inválida." };
  }

  const owned = await getOwnedCard(boardId, cardId, userId);
  if (!owned) return { error: "Card não encontrado." };

  await db
    .update(card)
    .set({ description: parsed.data.description || null, updatedAt: new Date() })
    .where(eq(card.id, cardId));
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function updateCardDueDate(
  boardId: string,
  cardId: string,
  dueDate: string | null
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = dueDateSchema.safeParse({ dueDate });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data inválida." };
  }

  const owned = await getOwnedCard(boardId, cardId, userId);
  if (!owned) return { error: "Card não encontrado." };

  await db
    .update(card)
    .set({
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      updatedAt: new Date(),
    })
    .where(eq(card.id, cardId));
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function createLabel(
  boardId: string,
  cardId: string,
  name: string,
  color: string
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = labelSchema.safeParse({ name, color });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Etiqueta inválida." };
  }

  const owned = await getOwnedCard(boardId, cardId, userId);
  if (!owned) return { error: "Card não encontrado." };

  // `drizzle-orm/neon-http`'s db.transaction() throws unconditionally --
  // this driver is stateless HTTP, no session to hold a transaction open
  // across two round trips. db.batch(...) is the primitive it does support
  // (Neon's HTTP batch/transaction endpoint), so the label's id is
  // generated here instead of relying on .returning() after a first insert
  // -- that's what makes it possible to build both inserts up front and
  // send them as one atomic batch.
  const labelId = crypto.randomUUID();
  await db.batch([
    db.insert(label).values({
      id: labelId,
      boardId,
      name: parsed.data.name,
      color: parsed.data.color,
    }),
    db.insert(cardLabel).values({ cardId, labelId }),
  ]);
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function assignLabel(
  boardId: string,
  cardId: string,
  labelId: string
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const owned = await getOwnedCard(boardId, cardId, userId);
  if (!owned) return { error: "Card não encontrado." };

  const ownedLabel = await getOwnedLabel(boardId, labelId, userId);
  if (!ownedLabel) return { error: "Etiqueta não encontrada." };

  await db.insert(cardLabel).values({ cardId, labelId }).onConflictDoNothing();
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function unassignLabel(
  boardId: string,
  cardId: string,
  labelId: string
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const owned = await getOwnedCard(boardId, cardId, userId);
  if (!owned) return { error: "Card não encontrado." };

  await db
    .delete(cardLabel)
    .where(and(eq(cardLabel.cardId, cardId), eq(cardLabel.labelId, labelId)));
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function deleteLabel(boardId: string, labelId: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const owned = await getOwnedLabel(boardId, labelId, userId);
  if (!owned) return { error: "Etiqueta não encontrada." };

  await db.delete(label).where(eq(label.id, labelId));
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function moveCard(
  boardId: string,
  cardId: string,
  targetColumnId: string,
  newIndex: number
): Promise<{ error?: string }> {
  const userId = await requireUserId();

  const parsed = moveCardSchema.safeParse({ newIndex });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Posição inválida." };
  }

  const owned = await getOwnedCard(boardId, cardId, userId);
  if (!owned) return { error: "Card não encontrado." };

  const ownedColumn = await getOwnedColumn(boardId, targetColumnId, userId);
  if (!ownedColumn) return { error: "Coluna não encontrada." };

  const existing = await db
    .select({ id: card.id })
    .from(card)
    .where(eq(card.columnId, targetColumnId))
    .orderBy(card.position);

  const newOrder = reorderColumn(
    existing.map((c) => c.id),
    cardId,
    parsed.data.newIndex
  );

  const updates = newOrder.map((id, index) =>
    id === cardId
      ? db
          .update(card)
          .set({ columnId: targetColumnId, position: index, updatedAt: new Date() })
          .where(eq(card.id, id))
      : db.update(card).set({ position: index }).where(eq(card.id, id))
  );

  // newOrder always contains at least cardId (reorderColumn always inserts
  // it), so `updates` always has at least one element -- db.batch's type
  // requires a non-empty tuple, hence the cast. If the installed drizzle-orm
  // version rejects this cast, adjust it to match the actual db.batch
  // signature rather than switching to a loop of individual awaits (that
  // would give up the atomicity this is here for).
  await db.batch(updates as [(typeof updates)[number], ...(typeof updates)[number][]]);

  revalidatePath(`/boards/${boardId}`);
  return {};
}
