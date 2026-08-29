"use client";

import { useEffect, useRef, useState } from "react";
import { InlineEditableText } from "./InlineEditableText";
import { DeleteButton } from "./DeleteButton";
import { LABEL_COLORS, LABEL_COLOR_NAMES } from "@/lib/label-colors";
import type { CardData, LabelData } from "@/lib/board-types";
import {
  renameCard,
  deleteCard,
  updateCardDescription,
  updateCardDueDate,
  createLabel,
  assignLabel,
  unassignLabel,
  deleteLabel,
} from "@/app/boards/actions";

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function CardDetailPanel({
  boardId,
  card,
  boardLabels,
  onClose,
}: {
  boardId: string;
  card: CardData;
  boardLabels: LabelData[];
  onClose: () => void;
}) {
  const [description, setDescription] = useState(card.description ?? "");
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [dueDateValue, setDueDateValue] = useState(toDateInputValue(card.dueDate));
  const [dueDateError, setDueDateError] = useState<string | null>(null);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState<string>(LABEL_COLORS[0]);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [creatingLabel, setCreatingLabel] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Move focus into the panel once, when it first mounts (it was opened via
  // click or Enter/Space on the card, so nothing inside the panel has focus
  // yet). Deliberately `[]`, not `[onClose]` — `onClose` is an inline arrow
  // function from the caller (`() => setDetailOpen(false)`), a fresh
  // reference on every parent re-render, and this panel re-renders on every
  // label/description/due-date save (each one revalidates the board and
  // flows new props down). Depending on `onClose` here would re-run
  // `.focus()` on every such save, yanking focus back to the close button
  // out from under whatever field the user is actively editing.
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Let Escape close the panel — the conventional dismiss key for a dialog.
  // This doesn't trap Tab inside the panel (no full focus trap), so a
  // keyboard user can still Tab past it into the board behind the overlay;
  // a complete trap would need either manual first/last-focusable cycling
  // or the native <dialog> element, both out of scope for this pass.
  // Unlike the focus effect above, re-registering this listener whenever
  // `onClose` changes identity is harmless — it just keeps the handler's
  // closure current, with no visible side effect.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleDescriptionBlur() {
    if (description === (card.description ?? "")) return;
    setDescriptionError(null);
    try {
      const result = await updateCardDescription(boardId, card.id, description);
      if (result.error) setDescriptionError(result.error);
    } catch (err) {
      console.error("Failed to save description:", err);
      setDescriptionError("Não foi possível salvar.");
    }
  }

  async function handleDueDateChange(value: string) {
    setDueDateValue(value);
    setDueDateError(null);
    try {
      const result = await updateCardDueDate(boardId, card.id, value || null);
      if (result.error) setDueDateError(result.error);
    } catch (err) {
      console.error("Failed to save due date:", err);
      setDueDateError("Não foi possível salvar.");
    }
  }

  async function handleCreateLabel(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = labelName.trim();
    if (!trimmed) return;
    setCreatingLabel(true);
    setLabelError(null);
    try {
      const result = await createLabel(boardId, card.id, trimmed, labelColor);
      if (result.error) {
        setLabelError(result.error);
        return;
      }
      setLabelName("");
    } catch (err) {
      console.error("Failed to create label:", err);
      setLabelError("Não foi possível criar a etiqueta.");
    } finally {
      setCreatingLabel(false);
    }
  }

  async function handleAssignLabel(labelId: string) {
    setLabelError(null);
    try {
      const result = await assignLabel(boardId, card.id, labelId);
      if (result.error) setLabelError(result.error);
    } catch (err) {
      console.error("Failed to assign label:", err);
      setLabelError("Não foi possível aplicar a etiqueta.");
    }
  }

  async function handleUnassignLabel(labelId: string) {
    setLabelError(null);
    try {
      const result = await unassignLabel(boardId, card.id, labelId);
      if (result.error) setLabelError(result.error);
    } catch (err) {
      console.error("Failed to remove label:", err);
      setLabelError("Não foi possível remover a etiqueta.");
    }
  }

  async function handleDeleteLabel(labelId: string) {
    if (!window.confirm("Tem certeza? Isso vai remover a etiqueta de todos os cards que a usam.")) {
      return;
    }
    setLabelError(null);
    try {
      const result = await deleteLabel(boardId, labelId);
      if (result.error) setLabelError(result.error);
    } catch (err) {
      console.error("Failed to delete label:", err);
      setLabelError("Não foi possível excluir a etiqueta.");
    }
  }

  const assignedIds = new Set(card.labels.map((l) => l.id));
  const availableLabels = boardLabels.filter((l) => !assignedIds.has(l.id));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes do card ${card.title}`}
        className="glass relative z-10 flex max-h-[85vh] w-full flex-col gap-4 overflow-y-auto rounded-t-2xl border border-border bg-card p-4 sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-2">
          <InlineEditableText
            value={card.title}
            onSave={renameCard.bind(null, boardId, card.id)}
            label="Título do card"
            className="text-lg font-semibold"
          />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Etiquetas</span>
          {card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {card.labels.map((l) => (
                <span
                  key={l.id}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-black/80"
                  style={{ backgroundColor: l.color }}
                >
                  {l.name}
                  <button
                    type="button"
                    onClick={() => handleUnassignLabel(l.id)}
                    aria-label={`Remover etiqueta ${l.name} deste card`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {availableLabels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {availableLabels.map((l) => (
                <span
                  key={l.id}
                  className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-xs"
                >
                  <button type="button" onClick={() => handleAssignLabel(l.id)}>
                    {l.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLabel(l.id)}
                    aria-label={`Excluir etiqueta ${l.name} do quadro`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <form onSubmit={handleCreateLabel} className="flex items-center gap-2">
            <input
              aria-label="Nome da nova etiqueta"
              placeholder="+ nova etiqueta"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              disabled={creatingLabel}
              className="h-8 flex-1 rounded border border-input bg-white/5 px-2 text-xs outline-none"
            />
            <div className="flex gap-1">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${LABEL_COLOR_NAMES[c]}`}
                  aria-pressed={labelColor === c}
                  onClick={() => setLabelColor(c)}
                  className={`h-4 w-4 rounded-full ${
                    labelColor === c ? "ring-2 ring-foreground ring-offset-1 ring-offset-card" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              type="submit"
              disabled={creatingLabel}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Adicionar
            </button>
          </form>
          {labelError && (
            <p role="alert" className="text-xs text-destructive">
              {labelError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Prazo</span>
          <input
            type="date"
            aria-label="Prazo do card"
            value={dueDateValue}
            onChange={(e) => handleDueDateChange(e.target.value)}
            className="h-8 w-fit rounded border border-input bg-white/5 px-2 text-xs outline-none"
          />
          {dueDateValue && (
            <button
              type="button"
              onClick={() => handleDueDateChange("")}
              className="w-fit text-xs text-muted-foreground hover:text-foreground"
            >
              Remover prazo
            </button>
          )}
          {dueDateError && (
            <p role="alert" className="text-xs text-destructive">
              {dueDateError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Descrição</span>
          <textarea
            aria-label="Descrição do card"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            rows={4}
            className="rounded border border-input bg-white/5 px-2 py-1 text-sm outline-none"
          />
          {descriptionError && (
            <p role="alert" className="text-xs text-destructive">
              {descriptionError}
            </p>
          )}
        </div>

        <DeleteButton
          label="Excluir card"
          confirmMessage="Tem certeza? Isso vai excluir o card."
          onDelete={async () => {
            const result = await deleteCard(boardId, card.id);
            if (!result.error) onClose();
            return result;
          }}
        />
      </div>
    </div>
  );
}
