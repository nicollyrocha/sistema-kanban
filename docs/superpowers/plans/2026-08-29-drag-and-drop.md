# Drag-and-drop de cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user drag a card to reorder it within a column, or move it to
another column, with mouse, touch, or keyboard, persisted to the real
database.

**Architecture:** A new client component `BoardView.tsx` owns the whole
board's card state (grouped by column) and wraps everything in a dnd-kit
`DndContext`, so drags can cross column boundaries. `Column.tsx` becomes a
sortable+droppable container; `CardItem.tsx` becomes a sortable item. On
drop, `BoardView` updates local state optimistically and calls a new Server
Action, `moveCard`, which renumbers only the destination column's cards
(`0..n-1`) via `db.batch` and rolls back the local state on error.

**Tech Stack:** Next.js Server Actions, `@dnd-kit/core` + `@dnd-kit/sortable`
+ `@dnd-kit/utilities` (new dependency), Drizzle ORM / Neon (`db.batch`, no
`db.transaction()` on `neon-http`), Vitest.

**Design doc:** `docs/superpowers/specs/2026-08-29-drag-and-drop-design.md`

---

### Task 1: Pure reordering helper

**Files:**
- Create: `src/lib/reorder.ts`
- Test: `src/lib/reorder.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { reorderColumn } from "./reorder";

describe("reorderColumn", () => {
  it("inserts into an empty column", () => {
    expect(reorderColumn([], "a", 0)).toEqual(["a"]);
  });

  it("inserts before the only existing card", () => {
    expect(reorderColumn(["b"], "a", 0)).toEqual(["a", "b"]);
  });

  it("inserts after the only existing card", () => {
    expect(reorderColumn(["b"], "a", 1)).toEqual(["b", "a"]);
  });

  it("moves an existing card forward within the list", () => {
    expect(reorderColumn(["a", "b", "c"], "a", 2)).toEqual(["b", "c", "a"]);
  });

  it("moves an existing card backward within the list", () => {
    expect(reorderColumn(["a", "b", "c"], "c", 0)).toEqual(["c", "a", "b"]);
  });

  it("clamps an out-of-range index to the end", () => {
    expect(reorderColumn(["a", "b"], "c", 10)).toEqual(["a", "b", "c"]);
  });

  it("clamps a negative index to the start", () => {
    expect(reorderColumn(["a", "b"], "c", -5)).toEqual(["c", "a", "b"]);
  });
});
```

Save this as `src/lib/reorder.test.ts`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/reorder.test.ts`
Expected: FAIL — `Cannot find module './reorder'` (the file doesn't exist yet).

- [ ] **Step 3: Implement `reorderColumn`**

```ts
export function reorderColumn(
  cardIds: string[],
  movedCardId: string,
  newIndex: number
): string[] {
  const withoutMoved = cardIds.filter((id) => id !== movedCardId);
  const clampedIndex = Math.max(0, Math.min(newIndex, withoutMoved.length));
  return [
    ...withoutMoved.slice(0, clampedIndex),
    movedCardId,
    ...withoutMoved.slice(clampedIndex),
  ];
}
```

Save this as `src/lib/reorder.ts`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/reorder.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reorder.ts src/lib/reorder.test.ts
git commit -m "feat: add reorderColumn helper for card drag-and-drop"
```

---

### Task 2: `moveCard` Server Action

**Files:**
- Modify: `src/app/boards/actions.ts`

- [ ] **Step 1: Add the `reorderColumn` import**

At the top of `src/app/boards/actions.ts`, change:

```ts
import { nextPosition } from "@/lib/position";
```

to:

```ts
import { nextPosition } from "@/lib/position";
import { reorderColumn } from "@/lib/reorder";
```

- [ ] **Step 2: Add `moveCard` to the end of the file**

Append this function at the end of `src/app/boards/actions.ts` (after
`deleteLabel`):

```ts
export async function moveCard(
  boardId: string,
  cardId: string,
  targetColumnId: string,
  newIndex: number
): Promise<{ error?: string }> {
  const userId = await requireUserId();

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
    newIndex
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
```

This mirrors `createLabel`'s use of `db.batch` (the `neon-http` driver has no
real `db.transaction()`), and only renumbers the destination column's cards
— the source column (on a cross-column move) is left untouched, since
removing a card doesn't disturb the relative order of the ones that remain.

- [ ] **Step 3: Verify**

Run:

```bash
npx tsc --noEmit
```

Expected: exit code 0. If the `db.batch` cast in Step 2 doesn't satisfy the
installed `drizzle-orm` types, adjust the cast (check
`node_modules/drizzle-orm/neon-http/session.d.ts` for the exact `batch`
signature) until this passes — don't drop the batch call itself.

Run:

```bash
npx vitest run
```

Expected: exit code 0, all existing tests still pass (no new tests in this
task — `moveCard` is a Server Action, verified live in Task 4).

- [ ] **Step 4: Commit**

```bash
git add src/app/boards/actions.ts
git commit -m "feat: add moveCard Server Action"
```

---

### Task 3: Wire up dnd-kit in the board UI

**Files:**
- Modify: `package.json` (via `npm install`)
- Modify: `src/components/boards/CardItem.tsx`
- Modify: `src/components/boards/Column.tsx`
- Create: `src/components/boards/BoardView.tsx`
- Modify: `src/app/boards/[boardId]/page.tsx`

- [ ] **Step 1: Install dnd-kit**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: installs cleanly against React 19.2.8 (dnd-kit's peer range
covers React 16.8+) with no `--legacy-peer-deps`/`--force` needed. If npm
reports a peer conflict, read the exact message before reaching for a flag —
report it rather than silently forcing the install.

- [ ] **Step 2: Update `src/components/boards/CardItem.tsx`**

Replace the whole file with:

```tsx
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

  // Render the panel INSTEAD OF the closed card face, not alongside it.
  // Rendering both (closed card behind, panel on top via a fixed overlay)
  // looks fine visually, but leaves the closed card's role="button" div
  // mounted, focusable, and screen-reader-visible underneath — a keyboard
  // user tabbing out of the panel lands on an element that's invisible
  // under the backdrop. Swapping the whole return removes that trap.
  if (detailOpen) {
    return (
      <CardDetailPanel
        boardId={boardId}
        card={card}
        boardLabels={boardLabels}
        onClose={() => setDetailOpen(false)}
      />
    );
  }

  return (
    // A native <button> can't contain another interactive element (the
    // delete button below), so this is a div with role="button" plus
    // manual Enter handling, not a shortcut around semantics.
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...pointerListeners}
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
  );
}
```

- [ ] **Step 3: Update `src/components/boards/Column.tsx`**

Replace the whole file with:

```tsx
"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { InlineEditableText } from "./InlineEditableText";
import { InlineCreateForm } from "./InlineCreateForm";
import { DeleteButton } from "./DeleteButton";
import { CardItem } from "./CardItem";
import type { CardData, ColumnData, LabelData } from "@/lib/board-types";
import { renameColumn, deleteColumn, createCard } from "@/app/boards/actions";

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
  const { setNodeRef } = useDroppable({ id: column.id });

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
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-8 flex-col gap-2">
          {cards.map((c) => (
            <CardItem key={c.id} boardId={boardId} card={c} boardLabels={boardLabels} />
          ))}
        </div>
      </SortableContext>
      <InlineCreateForm
        placeholder="Título do card"
        buttonLabel="+ Adicionar card"
        onCreate={createCard.bind(null, boardId, column.id)}
      />
    </div>
  );
}
```

The only changes from the current file: the `useDroppable` hook (so an empty
column, or the gap below the last card, is still a valid drop target) and
wrapping the cards list in `SortableContext`. Props, the header, and the
"+ Adicionar card" form are unchanged.

- [ ] **Step 4: Create `src/components/boards/BoardView.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
        if (overIndex === -1 || overIndex === activeIndex) return prev;
        const reordered = [...sourceCards];
        const [moved] = reordered.splice(activeIndex, 1);
        reordered.splice(overIndex, 0, moved);
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
    if (start.columnId === targetColumnId && start.index === finalIndex) {
      return;
    }

    try {
      const result = await moveCard(boardId, activeId, targetColumnId, finalIndex);
      if (result.error) {
        setError(result.error);
        setColumns(snapshot);
        setTimeout(() => setError(null), 4000);
      }
    } catch (err) {
      console.error("Failed to move card:", err);
      setError("Não foi possível mover o card.");
      setColumns(snapshot);
      setTimeout(() => setError(null), 4000);
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
```

This component now owns the "+ Adicionar coluna" form too (moved out of
`page.tsx`, since it has to stay inside the same flex row as the columns).

- [ ] **Step 5: Update `src/app/boards/[boardId]/page.tsx`**

Change the import block from:

```tsx
import { InlineEditableText } from "@/components/boards/InlineEditableText";
import { InlineCreateForm } from "@/components/boards/InlineCreateForm";
import { DeleteButton } from "@/components/boards/DeleteButton";
import { Column } from "@/components/boards/Column";
import { renameBoard, deleteBoard, createColumn } from "../actions";
```

to:

```tsx
import { InlineEditableText } from "@/components/boards/InlineEditableText";
import { DeleteButton } from "@/components/boards/DeleteButton";
import { BoardView } from "@/components/boards/BoardView";
import { renameBoard, deleteBoard } from "../actions";
```

Then change the closing block of the returned JSX from:

```tsx
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <Column
            key={column.id}
            boardId={boardId}
            column={column}
            cards={cardsWithLabels.filter((c) => c.columnId === column.id)}
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
    </main>
  );
}
```

to:

```tsx
      <BoardView
        boardId={boardId}
        columns={columns}
        cardsByColumn={Object.fromEntries(
          columns.map((column) => [
            column.id,
            cardsWithLabels.filter((c) => c.columnId === column.id),
          ])
        )}
        boardLabels={boardLabels}
      />
    </main>
  );
}
```

Nothing else in this file changes (session check, `getOwnedBoard`/`notFound()`,
the data queries, the board title/delete header all stay exactly as they
are).

- [ ] **Step 6: Verify**

Run:

```bash
npm run build
```

Expected: exit code 0, `/boards/[boardId]` still in the route table.

Run:

```bash
npx vitest run
```

Expected: exit code 0, all tests pass (including the 7 new `reorderColumn`
tests from Task 1).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/components/boards/CardItem.tsx src/components/boards/Column.tsx src/components/boards/BoardView.tsx "src/app/boards/[boardId]/page.tsx"
git commit -m "feat: wire up drag-and-drop for cards"
```

---

### Task 4: Verify against the real database

No further code changes — a live, controller-run end-to-end check against
the already-connected real Neon database.

- [ ] **Step 1: Start the dev server, sign in, open a board with at least two columns and a few cards in each** (create one if needed — a fresh board with 2 columns, 2-3 cards each, is enough to exercise every case below).

- [ ] **Step 2: Verify same-column reordering (mouse)**

Drag a card to a different position within the same column. Expected: the
card visually moves as you drag (other cards make room), lands in the new
position on drop, and the new order survives a full page reload.

- [ ] **Step 3: Verify cross-column move (mouse)**

Drag a card from one column into another (including dropping it into an
empty column, and dropping it in the middle of an existing list in the
target column). Expected: the card leaves its original column, appears in
the target column at the dropped position, and this survives a full page
reload. Open the card's detail panel afterward — its description/due
date/labels should be unchanged (only its column/position moved).

- [ ] **Step 4: Verify a plain click still opens the card panel**

Click a card without dragging it (no mouse movement between mousedown and
mouseup). Expected: the detail panel opens, exactly as before this plan —
dragging did not break the existing click-to-open behavior.

- [ ] **Step 5: Verify keyboard drag**

Tab to a card so it's focused, press Space to lift it, use the arrow keys to
move it (within the column and across to an adjacent column), press Space
again to drop it. Expected: the move persists the same way as a mouse drag.
Then, separately, Tab to a card and press Enter (not Space) — expected: this
opens the detail panel instead of starting a drag.

- [ ] **Step 6: Verify drag cancel**

Start dragging a card (mouse) and press Escape before releasing. Expected:
the card returns to its original position, no network request is sent (or
if one is in flight, it doesn't change the final state — the important
thing is the card ends up back where it started).

- [ ] **Step 7: Verify error rollback**

In the browser devtools, throttle/block the network (or temporarily rename
`moveCard`'s export to force it to fail — whichever is easier), then drag a
card. Expected: the card appears to move optimistically, then snaps back to
its original position and a brief error message appears near the board
title. Undo whatever was used to force the failure afterward.

- [ ] **Step 8: Verify cross-user isolation**

Sign in as a different user. From that user's session, in the browser
console, call the `moveCard` Server Action (via its generated endpoint, or
by temporarily calling it from a card on one of this user's own boards
first to confirm the call shape, then substituting a card/column ID that
belongs to the *other* user's board) — expected: it fails with "Card não
encontrado."/"Coluna não encontrada." rather than moving the card. This
mirrors the ownership checks already audited for every other action in this
feature.

---

## Self-Review Notes

- **Spec coverage:** every section of
  `docs/superpowers/specs/2026-08-29-drag-and-drop-design.md` maps to a
  task — biblioteca (dnd-kit) → Task 3 Step 1, arquitetura (BoardView owns
  state, DndContext) → Task 3 Step 4, fluxo de dados/persistência
  (renumerar só a coluna destino, `db.batch`, UI otimista com rollback,
  `revalidatePath`) → Task 2 + Task 3 Step 4, teclado → Task 3 Steps 2 & 4 +
  Task 4 Step 5, visual (`DragOverlay`, placeholder) → Task 3 Step 4, testes
  → Task 1 (unit) + Task 4 (live), escopo excluído (reordenar colunas,
  mover entre boards) → not implemented anywhere in this plan, matching the
  spec's exclusion.
- **Placeholder scan:** no TBDs. The one place a detail can't be pinned down
  until implementation time — whether the `db.batch` array-to-tuple cast in
  Task 2 compiles as written against the installed `drizzle-orm` version —
  is explicitly flagged as "adjust if needed" rather than left ambiguous,
  following the same precedent as prior plans' zod-API-version and
  `db.batch` discoveries.
- **Type consistency:** `CardData`/`ColumnData`/`LabelData` (from
  `src/lib/board-types.ts`, unchanged) are used identically across
  `BoardView.tsx`, `Column.tsx`, and `CardItem.tsx`. `reorderColumn`'s
  signature (`cardIds: string[], movedCardId: string, newIndex: number`) is
  used identically in its test (Task 1) and in `moveCard` (Task 2).
  `moveCard`'s signature (`boardId, cardId, targetColumnId, newIndex`)
  matches the call site in `BoardView.tsx`'s `handleDragEnd`
  (`moveCard(boardId, activeId, targetColumnId, finalIndex)`) — same
  argument order, same types.
- **Keyboard conflict resolution:** the plan changes `CardItem`'s existing
  Enter/Space-opens-panel shortcut to Enter-only, reserving Space for
  dnd-kit's pick-up/drop gesture. This is a deliberate, minimal behavior
  change (not a regression) — flagged explicitly in Task 3 Step 2's code
  comment and re-verified in Task 4 Step 5.
