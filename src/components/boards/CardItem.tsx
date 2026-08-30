"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DeleteButton } from "./DeleteButton";
import { CardDetailPanel } from "./CardDetailPanel";
import type { CardData, LabelData } from "@/lib/board-types";
import { deleteCard } from "@/app/boards/actions";

export function CardItem({
  boardId,
  card,
  boardLabels,
}: {
  boardId: string;
  card: CardData;
  boardLabels: LabelData[];
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });
  // dnd-kit's keyboard listener uses Space to pick up/drop a focused
  // draggable -- that collides with this card's previous Enter/Space
  // shortcut to open the detail panel. Space stays reserved for the drag
  // gesture (matches dnd-kit's own documented keyboard pattern); Enter alone
  // opens the panel now. Mouse/touch clicks are unaffected -- dnd-kit's
  // PointerSensor only intercepts a click once the pointer has moved past
  // its activation distance, so a plain click still opens the panel.
  const { onKeyDown: dragKeyDown, ...pointerListeners } = listeners ?? {};

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <>
      {/* Stays mounted (not replaced) while the panel is open, so the card
          keeps its slot in the column instead of visually vanishing and
          reflowing the rest of the column around the gap. `inert` (not just
          aria-hidden) makes the whole subtree -- including the nested
          delete button below -- unfocusable, unclickable, and invisible to
          assistive tech in one attribute; aria-hidden alone would still
          leave that nested <button> reachable by Tab. A native <button>
          can't contain another interactive element (the delete button), so
          this is a div with role="button" plus manual Enter handling, not a
          shortcut around semantics. */}
      <div
        ref={setNodeRef}
        style={style}
        inert={detailOpen || undefined}
        {...(!detailOpen && attributes)}
        {...(!detailOpen && pointerListeners)}
        role="button"
        tabIndex={0}
        onClick={() => setDetailOpen(true)}
        onKeyDown={(e) => {
          dragKeyDown?.(e);
          if (e.key === "Enter") {
            e.preventDefault();
            setDetailOpen(true);
          }
        }}
        className="glass flex cursor-pointer flex-col gap-1 rounded-lg border border-border bg-card p-2 text-left text-sm"
      >
        <div className="flex items-start justify-between gap-2">
          <span>{card.title}</span>
          <span onClick={(e) => e.stopPropagation()}>
            <DeleteButton
              label="Excluir card"
              confirmMessage="Tem certeza? Isso vai excluir o card."
              onDelete={deleteCard.bind(null, boardId, card.id)}
            />
          </span>
        </div>
        {card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.labels.map((l) => (
              <span
                key={l.id}
                className="rounded px-1.5 py-0.5 text-xs text-black/80"
                style={{ backgroundColor: l.color }}
              >
                {l.name}
              </span>
            ))}
          </div>
        )}
        {card.dueDate && (
          <span className="text-xs text-muted-foreground">
            <span aria-hidden="true">📅</span> {card.dueDate.toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>
      {detailOpen && (
        <CardDetailPanel
          boardId={boardId}
          card={card}
          boardLabels={boardLabels}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </>
  );
}
