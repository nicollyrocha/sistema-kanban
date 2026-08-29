"use client";

import { useState } from "react";
import { DeleteButton } from "./DeleteButton";
import { CardDetailPanel } from "./CardDetailPanel";
import { deleteCard } from "@/app/boards/actions";

type LabelData = { id: string; name: string; color: string };
type CardData = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  labels: LabelData[];
};

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

  return (
    <>
      {/* A native <button> can't contain another interactive element (the
          delete button below), so this is a div with role="button" plus
          manual Enter/Space handling, not a shortcut around semantics. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setDetailOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDetailOpen(true);
          }
        }}
        className="glass flex cursor-pointer flex-col gap-1 rounded-lg border border-border bg-card p-2 text-left text-sm"
      >
        <div className="flex items-start justify-between gap-2">
          <span>{card.title}</span>
          <span onClick={(e) => e.stopPropagation()}>
            <DeleteButton label="Excluir card" onDelete={deleteCard.bind(null, boardId, card.id)} />
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
