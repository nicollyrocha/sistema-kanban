# Card Detail Panel & Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking a card opens a detail panel (modal on desktop, bottom sheet on mobile) where its title, description, due date, and labels can be edited, and it can be deleted (with confirmation). Labels are created directly from the panel, assigned/removed per card, and deletable board-wide.

**Architecture:** One new responsive client component (`CardDetailPanel`) owns all the panel's editing UI; `CardItem` holds a local "is my panel open?" boolean (same pattern `InlineCreateForm` already uses) and renders the panel conditionally — no new routes, no shared/global open-card state. Six new Server Actions in the existing `src/app/boards/actions.ts` follow the exact same shape as the nine already there (auth → validate → ownership check → mutate → revalidate). No schema migration: `card.description`, `card.dueDate`, `label`, and `card_label` already exist from the board foundation plan, just unused until now.

**Tech Stack:** Next.js Server Actions, Drizzle ORM, Zod, existing Tailwind/`cva` UI primitives, Vitest.

---

## Context for the engineer

This plan builds on the kanban board foundation plan (`docs/superpowers/plans/2026-08-28-kanban-board-foundation.md`, fully implemented). Relevant existing pieces:

- `src/app/boards/actions.ts` has 9 Server Actions (`createBoard`, `renameBoard`, `deleteBoard`, `createColumn`, `renameColumn`, `deleteColumn`, `createCard`, `renameCard`, `deleteCard`). This plan adds 6 more to the same file — `renameCard` and `deleteCard` are reused as-is, not modified.
- `src/lib/board-auth.ts` has `getOwnedBoard`/`getOwnedColumn`/`getOwnedCard`, each baking the ownership check into the query's own `WHERE` clause. This plan adds a fourth, `getOwnedLabel`, following the identical pattern.
- `src/components/boards/{InlineEditableText,InlineCreateForm,DeleteButton}.tsx` are reused as-is — no changes to any of them.
- `src/db/schema.ts` already has `label` (`id`, `boardId`, `name`, `color`) and `cardLabel` (composite PK `cardId`+`labelId`) from the board foundation plan — this plan is the first thing to actually query/write them.

**Interaction change:** today, clicking a card's title renames it inline (`InlineEditableText` in `CardItem`). This plan removes that — clicking anywhere on a closed card (except its quick-delete `×`) now opens the detail panel, and title editing moves inside the panel. The existing quick-delete `×` on the closed card stays exactly as it was (no confirmation) — the panel gets its own, separate delete action that **does** confirm.

You are on `master` in `C:\Users\Nic\Documents\sistema-kanban`, explicit standing consent to work directly on `master`. Windows + Git Bash. A real Neon database is connected via `.env.local` — no placeholder `DATABASE_URL` needed for `npm run build`/`npm run dev`.

## File Structure

```
src/
├── lib/
│   ├── label-colors.ts                  # NEW: shared LABEL_COLORS constant
│   ├── validation.ts                    # + descriptionSchema, dueDateSchema, labelSchema
│   └── board-auth.ts                    # + getOwnedLabel
├── app/
│   └── boards/
│       ├── actions.ts                   # + 6 Server Actions
│       └── [boardId]/
│           └── page.tsx                 # MODIFY: fetch labels + card-label joins, pass down
└── components/
    └── boards/
        ├── CardDetailPanel.tsx          # NEW
        ├── CardItem.tsx                 # MODIFY: click opens panel, title edit moves inside it
        └── Column.tsx                   # MODIFY: thread boardLabels through
```

---

### Task 1: Label colors constant and validation schemas

**Files:**
- Create: `src/lib/label-colors.ts`
- Modify: `src/lib/validation.ts`
- Modify: `src/lib/validation.test.ts`

- [ ] **Step 1: Create `src/lib/label-colors.ts`**

```ts
export const LABEL_COLORS = [
  "#ff6bd6",
  "#7c5cff",
  "#39ff88",
  "#ffd803",
  "#5c9dff",
  "#ff9d5c",
] as const;
```

This is the single source of truth for the fixed label color palette — both the Zod schema (Task 1, below) and the color picker UI (Task 3) import from here, so they can never drift out of sync with each other.

- [ ] **Step 2: Check the installed zod version's date-string validation API**

Before writing `dueDateSchema`, check `node_modules/zod`'s actual exports for validating an ISO date string (`YYYY-MM-DD`). This codebase already discovered once (in the foundation plan) that this installed zod v4 deprecates `z.string().email()` in favor of top-level `z.email()` — the equivalent may be true here too (e.g. a deprecated `z.string().date()` vs. a newer `z.iso.date()` or similar top-level/namespaced export). Read the relevant `.d.ts` file to confirm the current, non-deprecated way to validate a `YYYY-MM-DD` string in this exact installed version, and use that in Step 5 below instead of guessing.

- [ ] **Step 3: Write the failing tests**

Add `descriptionSchema, dueDateSchema, labelSchema` to the existing named import at the top of `src/lib/validation.test.ts`. Append:
```ts
describe("descriptionSchema", () => {
  it("accepts an empty description", () => {
    const result = descriptionSchema.safeParse({ description: "" });
    expect(result.success).toBe(true);
  });

  it("accepts a normal description", () => {
    const result = descriptionSchema.safeParse({ description: "Ligar antes de assinar." });
    expect(result.success).toBe(true);
  });

  it("rejects a description longer than 2000 characters", () => {
    const result = descriptionSchema.safeParse({ description: "a".repeat(2001) });
    expect(result.success).toBe(false);
  });
});

describe("dueDateSchema", () => {
  it("accepts a valid ISO date string", () => {
    const result = dueDateSchema.safeParse({ dueDate: "2026-08-28" });
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = dueDateSchema.safeParse({ dueDate: null });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed date string", () => {
    const result = dueDateSchema.safeParse({ dueDate: "not-a-date" });
    expect(result.success).toBe(false);
  });
});

describe("labelSchema", () => {
  it("accepts a valid label", () => {
    const result = labelSchema.safeParse({ name: "urgente", color: "#ff6bd6" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = labelSchema.safeParse({ name: "", color: "#ff6bd6" });
    expect(result.success).toBe(false);
  });

  it("rejects a color outside the fixed palette", () => {
    const result = labelSchema.safeParse({ name: "urgente", color: "#000000" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run:
```bash
npx vitest run src/lib/validation.test.ts
```
Expected: the existing 17 tests still pass; the 8 new tests FAIL (none of the three schemas exist yet).

- [ ] **Step 5: Add the schemas to `src/lib/validation.ts`**

Add `import { LABEL_COLORS } from "@/lib/label-colors";` near the top (alongside the existing `import { z } from "zod";`). Append the schemas (adapt `dueDateSchema`'s date-validation call to whatever Step 2 found to be the correct, non-deprecated API for this zod version — the shape below assumes `z.string().date(...)` works as shown, but verify first):
```ts
export const descriptionSchema = z.object({
  description: z.string().max(2000, "Descrição muito longa"),
});

export const dueDateSchema = z.object({
  dueDate: z.string().date("Data inválida").nullable(),
});

export const labelSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome").max(50, "Nome muito longo"),
  color: z.enum(LABEL_COLORS, { message: "Cor inválida" }),
});

export type DescriptionInput = z.infer<typeof descriptionSchema>;
export type DueDateInput = z.infer<typeof dueDateSchema>;
export type LabelInput = z.infer<typeof labelSchema>;
```

- [ ] **Step 6: Run tests to verify they pass**

Run:
```bash
npx vitest run src/lib/validation.test.ts
```
Expected: PASS (25 tests — 17 existing + 8 new).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: label colors constant and description/due-date/label validation schemas"
```

---

### Task 2: Ownership helper and Server Actions

**Files:**
- Modify: `src/lib/board-auth.ts`
- Modify: `src/app/boards/actions.ts`

- [ ] **Step 1: Add `getOwnedLabel` to `src/lib/board-auth.ts`**

Change the schema import line from:
```ts
import { board, boardColumn, card } from "@/db/schema";
```
to:
```ts
import { board, boardColumn, card, label } from "@/db/schema";
```

Append this function (keep `getOwnedBoard`/`getOwnedColumn`/`getOwnedCard` exactly as they are):
```ts
export async function getOwnedLabel(boardId: string, labelId: string, userId: string) {
  const [row] = await db
    .select({ label })
    .from(label)
    .innerJoin(board, eq(label.boardId, board.id))
    .where(and(eq(label.id, labelId), eq(label.boardId, boardId), eq(board.userId, userId)));
  return row?.label ?? null;
}
```

- [ ] **Step 2: Update `src/app/boards/actions.ts`'s imports**

Change these three lines:
```ts
import { eq } from "drizzle-orm";
```
```ts
import { board, boardColumn, card } from "@/db/schema";
```
```ts
import { getOwnedBoard, getOwnedColumn, getOwnedCard } from "@/lib/board-auth";
```
```ts
import { titleSchema } from "@/lib/validation";
```
to:
```ts
import { and, eq } from "drizzle-orm";
```
```ts
import { board, boardColumn, card, label, cardLabel } from "@/db/schema";
```
```ts
import { getOwnedBoard, getOwnedColumn, getOwnedCard, getOwnedLabel } from "@/lib/board-auth";
```
```ts
import { titleSchema, descriptionSchema, dueDateSchema, labelSchema } from "@/lib/validation";
```
Everything else in the file (the 9 existing actions, `requireUserId`, `parseTitle`) stays exactly as it is.

- [ ] **Step 3: Append the 6 new Server Actions**

```ts
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

  const [newLabel] = await db
    .insert(label)
    .values({ boardId, name: parsed.data.name, color: parsed.data.color })
    .returning({ id: label.id });

  await db.insert(cardLabel).values({ cardId, labelId: newLabel.id });
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
```

Ownership audit for these 6 (same discipline as the board foundation plan's Task 3): `updateCardDescription`/`updateCardDueDate` check `getOwnedCard` before writing. `createLabel` checks `getOwnedCard` (the card it's about to attach to) before inserting — a label can only ever be created by someone who owns the card they're labeling. `assignLabel` checks **both** `getOwnedCard` (the card) **and** `getOwnedLabel` (the label) — without the second check, a user could assign another board's label ID to their own card. `unassignLabel` only needs `getOwnedCard` (deleting a `card_label` row scoped to a card you own is safe regardless of who "owns" the label side, since it only ever removes *your* card's association). `deleteLabel` checks `getOwnedLabel`.

- [ ] **Step 4: Verify**

Run:
```bash
npm run build
npx tsc --noEmit
```
Expected: both exit 0. (Nothing imports these 6 new actions yet — Task 3-4 wire them up.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: description/due-date/label Server Actions and getOwnedLabel helper"
```

---

### Task 3: Card detail panel component

**Files:**
- Create: `src/components/boards/CardDetailPanel.tsx`

- [ ] **Step 1: Create `src/components/boards/CardDetailPanel.tsx`**

```tsx
"use client";

import { useState } from "react";
import { InlineEditableText } from "./InlineEditableText";
import { DeleteButton } from "./DeleteButton";
import { LABEL_COLORS } from "@/lib/label-colors";
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

type LabelData = { id: string; name: string; color: string };
type CardData = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  labels: LabelData[];
};

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
      <div className="glass relative z-10 flex max-h-[85vh] w-full flex-col gap-4 overflow-y-auto rounded-t-2xl border border-border bg-card p-4 sm:max-w-md sm:rounded-2xl">
        <div className="flex items-start justify-between gap-2">
          <InlineEditableText
            value={card.title}
            onSave={renameCard.bind(null, boardId, card.id)}
            label="Título do card"
            className="text-lg font-semibold"
          />
          <button
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
                  aria-label={`Cor ${c}`}
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
```

Notes for whoever reviews this:
- The due-date round-trip (`new Date("2026-08-28")` on write, `.toISOString().slice(0, 10)` on read) relies on both directions consistently treating the date as UTC midnight — `new Date("YYYY-MM-DD")` parses as UTC midnight, and `.toISOString()` renders in UTC, so they agree regardless of the server/browser's local timezone. This only holds because the app never mixes in a time-of-day component; if that ever changes, this logic needs to change with it.
- `onDelete` for the panel's `DeleteButton` is an inline async function (not a direct `.bind()` like everywhere else) because it needs to call `onClose()` after a successful delete — `DeleteButton` itself has no "on success" callback, so this wraps `deleteCard` to add that one extra step while still returning the same `{ error?: string }` shape `DeleteButton` expects.

- [ ] **Step 2: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0. (Not used by any page yet — Task 4 wires it in.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: card detail panel component"
```

---

### Task 4: Wire the panel into the board

**Files:**
- Modify: `src/components/boards/CardItem.tsx`
- Modify: `src/components/boards/Column.tsx`
- Modify: `src/app/boards/[boardId]/page.tsx`

- [ ] **Step 1: Replace `src/components/boards/CardItem.tsx`**

```tsx
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
```

- [ ] **Step 2: Update `src/components/boards/Column.tsx`**

Change the `CardData` type and the component's props/render to thread `boardLabels` through:
```tsx
"use client";

import { InlineEditableText } from "./InlineEditableText";
import { InlineCreateForm } from "./InlineCreateForm";
import { DeleteButton } from "./DeleteButton";
import { CardItem } from "./CardItem";
import { renameColumn, deleteColumn, createCard } from "@/app/boards/actions";

type LabelData = { id: string; name: string; color: string };
type ColumnData = { id: string; title: string };
type CardData = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  labels: LabelData[];
};

export function Column({
  boardId,
  column,
  cards,
  boardLabels,
}: {
  boardId: string;
  column: ColumnData;
  cards: CardData[];
  boardLabels: LabelData[];
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
          <CardItem key={c.id} boardId={boardId} card={c} boardLabels={boardLabels} />
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
```

- [ ] **Step 3: Update `src/app/boards/[boardId]/page.tsx`**

Change the schema import line from:
```ts
import { boardColumn, card } from "@/db/schema";
```
to:
```ts
import { boardColumn, card, label, cardLabel } from "@/db/schema";
```

After the existing `cards` query (the one using `inArray(card.columnId, ...)`), add:
```ts
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
```

Then change the `columns.map((column) => ...)` block's `<Column>` usage from:
```tsx
          <Column
            key={column.id}
            boardId={boardId}
            column={column}
            cards={cards.filter((c) => c.columnId === column.id)}
          />
```
to:
```tsx
          <Column
            key={column.id}
            boardId={boardId}
            column={column}
            cards={cardsWithLabels.filter((c) => c.columnId === column.id)}
            boardLabels={boardLabels}
          />
```
Nothing else in this file changes (session check, `getOwnedBoard`/`notFound()`, the board title/delete header, the "+ Adicionar coluna" form all stay exactly as they are).

- [ ] **Step 4: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0, `/boards/[boardId]` still in the route table.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire card detail panel and labels into the board view"
```

---

### Task 5: Verify against the real database

No code changes — a live, controller-run end-to-end check against the already-connected real Neon database.

- [ ] **Step 1: Start the dev server, sign in, open an existing board (or create one with a column and a card)**

- [ ] **Step 2: Verify the panel opens/closes correctly**

Click anywhere on a card (not the quick-delete `×`) — expected: the panel opens (bottom sheet on a narrow/mobile viewport, centered modal on desktop). Click the backdrop, or the panel's own "×" close button — expected: it closes either way. Click the quick-delete `×` on a *closed* card — expected: deletes immediately, does **not** open the panel (confirms the `stopPropagation` works).

- [ ] **Step 3: Verify title, description, and due date editing inside the panel**

Click the title inside the panel, rename it, confirm it updates (and that the closed card's face reflects the new title after closing the panel). Type into the description textarea, click elsewhere to blur — expected: saved (reopen the panel or reload the page to confirm it persisted). Pick a due date — expected: saves immediately and the closed card face now shows the 📅 date. Click "Remover prazo" — expected: clears it, closed card face's date line disappears.

- [ ] **Step 4: Verify labels end to end**

With the panel open on a card with no labels yet: type a name into "+ nova etiqueta", pick a color, submit — expected: the label appears as an assigned chip on the card immediately, and the closed card face shows the colored chip too. Open a *second* card in the same board — expected: the label just created appears in its "available to assign" list (not yet assigned there). Click it to assign — expected: appears as assigned on this second card too. Go back to the first card, click the `×` on the assigned label chip — expected: removed from just this card (still exists on the board, still assigned to the second card). Click the `×` next to an *available* (not-yet-assigned) label in either card's panel — expected: a confirm dialog; confirming removes it from the whole board, including from any card it was still assigned to.

- [ ] **Step 5: Verify deleting a card from inside the panel**

Open a card's panel, click "Excluir card" — expected: a confirm dialog; confirming removes the card and closes the panel, and the card is gone from the column.

- [ ] **Step 6: Verify cross-user isolation still holds**

Sign in as a different user, confirm they cannot see or affect the first user's labels/card details in any way (this should already be guaranteed by the ownership checks audited in Task 2, but worth a quick sanity check — e.g. attempting to call `assignLabel`/`deleteLabel` with a label ID from another user's board, via the browser console with `fetch` against the Server Action's underlying endpoint, should fail; a full adversarial test isn't required here since this was already exhaustively audited at the code level).

---

## Self-Review Notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-08-28-card-detail-labels-design.md` maps to a task — interação (click-opens-panel, title moves inside) → Task 4, painel (tudo visível, campos) → Task 3, etiquetas (criar/aplicar/remover/excluir) → Tasks 2–3, paleta fixa → Task 1, Server Actions → Task 2.
- **Placeholder scan:** no TBDs. The one place a value can't be pinned down until implementation time — the exact zod API for date-string validation — is explicitly flagged as "verify against the installed version" (Task 1, Step 2) rather than left ambiguous, following the same precedent as the foundation plan's zod `.email()` discovery and the account-settings plan's `@vercel/blob` API checks.
- **Type consistency:** `CardData` (with `labels: LabelData[]`) and `LabelData` are declared identically in `CardItem.tsx`, `Column.tsx`, and `CardDetailPanel.tsx` — same field names and types everywhere. The data assembled in `[boardId]/page.tsx` (`cardsWithLabels`) matches this shape exactly (`id`, `title`, `description`, `dueDate`, `labels`). Every new Server Action returns `Promise<{ error?: string }>`, consistent with all 9 actions from the prior plan — no new return shape introduced.
