"use client";

import { InlineEditableText } from "./InlineEditableText";
import { DeleteButton } from "./DeleteButton";
import { renameCard, deleteCard } from "@/app/boards/actions";

type CardData = {
  id: string;
  title: string;
  dueDate: Date | null;
};

export function CardItem({ boardId, card }: { boardId: string; card: CardData }) {
  return (
    <div className="glass flex items-start justify-between gap-2 rounded-lg border border-border bg-card p-2 text-sm">
      <div className="flex flex-col gap-1">
        <InlineEditableText
          value={card.title}
          onSave={renameCard.bind(null, boardId, card.id)}
          label="Título do card"
        />
        {card.dueDate && (
          <span className="text-xs text-muted-foreground">
            <span aria-hidden="true">📅</span> {card.dueDate.toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>
      <DeleteButton label="Excluir card" onDelete={deleteCard.bind(null, boardId, card.id)} />
    </div>
  );
}
