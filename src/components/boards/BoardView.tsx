"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Column } from "./Column";
import { InlineCreateForm } from "./InlineCreateForm";
import type { CardData, ColumnData, LabelData } from "@/lib/board-types";
import { createColumn, moveCard } from "@/app/boards/actions";

function findColumnId(columns: Record<string, CardData[]>, cardId: string): string | null {
  for (const columnId of Object.keys(columns)) {
    if (columns[columnId].some((c) => c.id === cardId)) return columnId;
  }
  return null;
}

export function BoardView({
  boardId,
  columns: columnOrder,
  cardsByColumn,
  boardLabels,
}: {
  boardId: string;
  columns: ColumnData[];
  cardsByColumn: Record<string, CardData[]>;
  boardLabels: LabelData[];
}) {
  const [columns, setColumns] = useState(cardsByColumn);
  const [activeCard, setActiveCard] = useState<CardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const snapshotRef = useRef<Record<string, CardData[]> | null>(null);
  const dragStartRef = useRef<{ columnId: string; index: number } | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: [KeyboardCode.Space],
        cancel: [KeyboardCode.Esc],
        end: [KeyboardCode.Space],
      },
    })
  );

  function showError(message: string) {
    setError(message);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => setError(null), 4000);
  }

  function handleDragStart(event: DragStartEvent) {
    const cardId = String(event.active.id);
    const columnId = findColumnId(columns, cardId);
    if (!columnId) return;
    const index = columns[columnId].findIndex((c) => c.id === cardId);
    snapshotRef.current = columns;
    dragStartRef.current = { columnId, index };
    setActiveCard(columns[columnId][index] ?? null);
  }

  // Moves the dragged card between/within the in-memory column lists as the
  // pointer (or keyboard focus) passes over a new spot, so the board reflows
  // live during the drag -- persistence only happens once, in handleDragEnd.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const sourceColumnId = findColumnId(columns, activeId);
    const targetColumnId = columnOrder.some((c) => c.id === overId)
      ? overId
      : findColumnId(columns, overId);
    if (!sourceColumnId || !targetColumnId) return;

    setColumns((prev) => {
      const sourceCards = prev[sourceColumnId];
      const activeIndex = sourceCards.findIndex((c) => c.id === activeId);
      if (activeIndex === -1) return prev;

      if (sourceColumnId === targetColumnId) {
        const overIndex = sourceCards.findIndex((c) => c.id === overId);
        const insertAt = overIndex >= 0 ? overIndex : sourceCards.length - 1;
        if (insertAt === activeIndex) return prev;
        const reordered = [...sourceCards];
        const [moved] = reordered.splice(activeIndex, 1);
        reordered.splice(insertAt, 0, moved);
        return { ...prev, [sourceColumnId]: reordered };
      }

      const movedCard = sourceCards[activeIndex];
      const newSource = sourceCards.filter((c) => c.id !== activeId);
      const targetCards = prev[targetColumnId] ?? [];
      const overIndex = targetCards.findIndex((c) => c.id === overId);
      const insertAt = overIndex >= 0 ? overIndex : targetCards.length;
      const newTarget = [...targetCards];
      newTarget.splice(insertAt, 0, movedCard);
      return { ...prev, [sourceColumnId]: newSource, [targetColumnId]: newTarget };
    });
  }

  function handleDragCancel() {
    setActiveCard(null);
    if (snapshotRef.current) setColumns(snapshotRef.current);
    snapshotRef.current = null;
    dragStartRef.current = null;
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active } = event;
    setActiveCard(null);
    const snapshot = snapshotRef.current;
    const start = dragStartRef.current;
    snapshotRef.current = null;
    dragStartRef.current = null;
    if (!snapshot || !start) return;
    const dragStart = start;

    const activeId = String(active.id);
    const targetColumnId = findColumnId(columns, activeId);
    if (!targetColumnId) {
      setColumns(snapshot);
      return;
    }
    const finalIndex = columns[targetColumnId].findIndex((c) => c.id === activeId);
    if (finalIndex === -1) {
      setColumns(snapshot);
      return;
    }

    // Nothing actually moved (e.g. picked up and dropped back in place) --
    // skip the round trip.
    if (dragStart.columnId === targetColumnId && dragStart.index === finalIndex) {
      return;
    }

    // On failure, revert only this card back to where it started, rather than
    // restoring the whole pre-drag snapshot -- a second drag can finish (and
    // persist to the database) while this one's request is still in flight,
    // and a full-snapshot revert would silently undo that other, already-
    // successful move in the UI. This only touches the two columns involved
    // in *this* card's move, leaving any other concurrent change intact.
    function revertToStart() {
      setColumns((prev) => {
        const currentColumnId = findColumnId(prev, activeId);
        if (!currentColumnId) return prev;
        const movedCard = prev[currentColumnId].find((c) => c.id === activeId);
        if (!movedCard) return prev;
        const withoutCard = prev[currentColumnId].filter((c) => c.id !== activeId);
        const origColumnCards =
          currentColumnId === dragStart.columnId ? withoutCard : (prev[dragStart.columnId] ?? []);
        const insertAt = Math.min(dragStart.index, origColumnCards.length);
        const restoredOrigColumn = [...origColumnCards];
        restoredOrigColumn.splice(insertAt, 0, movedCard);
        return {
          ...prev,
          [currentColumnId]: withoutCard,
          [dragStart.columnId]: restoredOrigColumn,
        };
      });
    }

    try {
      const result = await moveCard(boardId, activeId, targetColumnId, finalIndex);
      if (result.error) {
        showError(result.error);
        revertToStart();
      }
    } catch (err) {
      console.error("Failed to move card:", err);
      showError("Não foi possível mover o card.");
      revertToStart();
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {columnOrder.map((column) => (
          <Column
            key={column.id}
            boardId={boardId}
            column={column}
            cards={columns[column.id] ?? []}
            boardLabels={boardLabels}
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
      <DragOverlay>
        {activeCard ? (
          <div className="glass flex flex-col gap-1 rounded-lg border border-border bg-card p-2 text-left text-sm shadow-lg">
            <span>{activeCard.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
