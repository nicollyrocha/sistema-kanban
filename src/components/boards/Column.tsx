"use client";

import { InlineEditableText } from "./InlineEditableText";
import { InlineCreateForm } from "./InlineCreateForm";
import { DeleteButton } from "./DeleteButton";
import { CardItem } from "./CardItem";
import { renameColumn, deleteColumn, createCard } from "@/app/boards/actions";

type ColumnData = { id: string; title: string };
type CardData = { id: string; title: string; dueDate: Date | null };

export function Column({
  boardId,
  column,
  cards,
}: {
  boardId: string;
  column: ColumnData;
  cards: CardData[];
}) {
  return (
    <div className="flex w-64 shrink-0 flex-col gap-3 rounded-xl border border-border bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <InlineEditableText
          value={column.title}
          onSave={renameColumn.bind(null, boardId, column.id)}
          label="Nome da coluna"
          className="text-sm font-semibold"
        />
        <DeleteButton
          label="Excluir coluna"
          confirmMessage="Tem certeza? Isso vai excluir todos os cards desta coluna."
          onDelete={deleteColumn.bind(null, boardId, column.id)}
        />
      </div>
      <div className="flex flex-col gap-2">
        {cards.map((c) => (
          <CardItem key={c.id} boardId={boardId} card={c} />
        ))}
      </div>
      <InlineCreateForm
        placeholder="Título do card"
        buttonLabel="+ Adicionar card"
        onCreate={createCard.bind(null, boardId, column.id)}
      />
    </div>
  );
}
