# Card Metadata & Board Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every card a priority, type, and estimate, show them on the
card face and in the detail panel, and let the board be filtered by
priority/type/label.

**Architecture:** Three new nullable-or-defaulted columns on the existing
`card` table (no new tables). Shared constant modules (`priority.ts`,
`card-type.ts`, `estimate.ts`) mirror `label-colors.ts`'s exact shape. Three
new Server Actions mirror `updateCardDueDate`'s shape exactly. The filter is
entirely client-side — `BoardView` already holds every card for the board in
local state for drag-and-drop, so filtering just changes which cards get
passed down to each `Column`, via a new pure `cardMatchesFilters` function.

**Tech Stack:** Drizzle ORM / Neon Postgres (`db:push`, no migration files
in this project), Zod v4, React Server Actions, Vitest.

**Design doc:** `docs/superpowers/specs/2026-09-08-card-metadata-and-filters-design.md`

---

### Task 1: Schema, shared constants, validation, and types

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/lib/priority.ts`
- Create: `src/lib/card-type.ts`
- Create: `src/lib/estimate.ts`
- Modify: `src/lib/validation.ts`
- Modify: `src/lib/board-types.ts`

- [ ] **Step 1: Add the three columns to `card` in `src/db/schema.ts`**

Change:

```ts
export const card = pgTable(
  "card",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    columnId: uuid("column_id")
      .notNull()
      .references(() => boardColumn.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: timestamp("due_date"),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("card_column_id_idx").on(t.columnId)]
);
```

to:

```ts
export const card = pgTable(
  "card",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    columnId: uuid("column_id")
      .notNull()
      .references(() => boardColumn.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: timestamp("due_date"),
    priority: text("priority"),
    type: text("type").notNull().default("tarefa"),
    estimate: integer("estimate"),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("card_column_id_idx").on(t.columnId)]
);
```

`priority`/`estimate` are nullable with no default (a card starts with
neither set). `type` is `NOT NULL DEFAULT 'tarefa'` — every card always has
a type. None of the three use a native Postgres enum, matching how
`label.color` is validated at the application layer instead.

- [ ] **Step 2: Create `src/lib/priority.ts`**

```ts
export const PRIORITIES = ["urgente", "alta", "media", "baixa"] as const;

export const PRIORITY_LABELS: Record<(typeof PRIORITIES)[number], string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const PRIORITY_EMOJI: Record<(typeof PRIORITIES)[number], string> = {
  urgente: "🔴",
  alta: "🟠",
  media: "🟡",
  baixa: "🔵",
};
```

- [ ] **Step 3: Create `src/lib/card-type.ts`**

```ts
export const CARD_TYPES = ["bug", "feature", "tarefa", "melhoria"] as const;

export const CARD_TYPE_LABELS: Record<(typeof CARD_TYPES)[number], string> = {
  bug: "Bug",
  feature: "Feature",
  tarefa: "Tarefa",
  melhoria: "Melhoria",
};

export const CARD_TYPE_EMOJI: Record<(typeof CARD_TYPES)[number], string> = {
  bug: "🐛",
  feature: "✨",
  tarefa: "✅",
  melhoria: "🔧",
};
```

- [ ] **Step 4: Create `src/lib/estimate.ts`**

```ts
export const ESTIMATES = [1, 2, 3, 5, 8, 13] as const;
```

- [ ] **Step 5: Add validation schemas to `src/lib/validation.ts`**

Add these imports at the top, alongside the existing `LABEL_COLORS` import:

```ts
import { PRIORITIES } from "@/lib/priority";
import { CARD_TYPES } from "@/lib/card-type";
import { ESTIMATES } from "@/lib/estimate";
```

Add these schemas after `labelSchema` and before `moveCardSchema`:

```ts
export const cardPrioritySchema = z.object({
  priority: z.enum(PRIORITIES, { error: "Prioridade inválida" }).nullable(),
});

export const cardTypeSchema = z.object({
  type: z.enum(CARD_TYPES, { error: "Tipo inválido" }),
});

export const cardEstimateSchema = z.object({
  estimate: z
    .number()
    .refine((n) => (ESTIMATES as readonly number[]).includes(n), "Estimativa inválida")
    .nullable(),
});
```

`cardEstimateSchema` uses `.refine()` instead of a literal union — a union
of `z.literal()` values built from an array (`ESTIMATES.map((e) => z.literal(e))`)
doesn't satisfy `z.union`'s tuple type without a cast, and `.refine()` says
the same thing without that friction. Its second argument accepts a plain
string (confirmed against the installed version's
`node_modules/zod/v4/classic/schemas.d.ts`:
`refine(check, params?: string | core.$ZodCustomParams)`), so the bare
string above is correct as written — no `{ error: ... }` wrapper needed
here, unlike `z.enum`.

Add these type exports at the bottom, alongside the existing ones:

```ts
export type CardPriorityInput = z.infer<typeof cardPrioritySchema>;
export type CardTypeInput = z.infer<typeof cardTypeSchema>;
export type CardEstimateInput = z.infer<typeof cardEstimateSchema>;
```

- [ ] **Step 6: Update `CardData` in `src/lib/board-types.ts`**

Replace the whole file with:

```ts
import type { PRIORITIES } from "@/lib/priority";
import type { CARD_TYPES } from "@/lib/card-type";
import type { ESTIMATES } from "@/lib/estimate";

export type LabelData = { id: string; name: string; color: string };
export type ColumnData = { id: string; title: string };
export type CardData = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: (typeof PRIORITIES)[number] | null;
  type: (typeof CARD_TYPES)[number];
  estimate: (typeof ESTIMATES)[number] | null;
  labels: LabelData[];
};
```

- [ ] **Step 7: Push the schema change to the real database**

Run:

```bash
npm run db:push
```

Expected: drizzle-kit reports the `card` table gaining `priority`, `type`,
`estimate` columns, and applies them without prompting for confirmation —
`drizzle-kit push` only pauses for interactive confirmation on statements
it flags as potential data loss (verified via `npx drizzle-kit push --help`:
`--strict` — "always ask for confirmation" — defaults to `false`), and all
three new columns are purely additive (nullable, or `NOT NULL` with a
default), so existing rows fill in cleanly with no data-loss statement to
confirm. `type` backfills to `'tarefa'` for every existing card.

- [ ] **Step 8: Verify**

Run:

```bash
npx tsc --noEmit
```

Expected: exit code 0. (No behavior to test yet — this task is pure data
model plumbing; Task 2 onward exercises it.)

- [ ] **Step 9: Commit**

```bash
git add src/db/schema.ts src/lib/priority.ts src/lib/card-type.ts src/lib/estimate.ts src/lib/validation.ts src/lib/board-types.ts
git commit -m "feat: add priority, type, and estimate columns to card"
```

---

### Task 2: Server Actions for priority, type, and estimate

**Files:**
- Modify: `src/app/boards/actions.ts`

- [ ] **Step 1: Add the new schema imports**

Change:

```ts
import {
  titleSchema,
  descriptionSchema,
  dueDateSchema,
  labelSchema,
  moveCardSchema,
} from "@/lib/validation";
```

to:

```ts
import {
  titleSchema,
  descriptionSchema,
  dueDateSchema,
  labelSchema,
  moveCardSchema,
  cardPrioritySchema,
  cardTypeSchema,
  cardEstimateSchema,
} from "@/lib/validation";
```

- [ ] **Step 2: Add the three Server Actions**

Add these after `updateCardDueDate` and before `createLabel`:

```ts
export async function updateCardPriority(
  boardId: string,
  cardId: string,
  priority: string | null
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = cardPrioritySchema.safeParse({ priority });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Prioridade inválida." };
  }

  const owned = await getOwnedCard(boardId, cardId, userId);
  if (!owned) return { error: "Card não encontrado." };

  await db
    .update(card)
    .set({ priority: parsed.data.priority, updatedAt: new Date() })
    .where(eq(card.id, cardId));
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function updateCardType(
  boardId: string,
  cardId: string,
  type: string
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = cardTypeSchema.safeParse({ type });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Tipo inválido." };
  }

  const owned = await getOwnedCard(boardId, cardId, userId);
  if (!owned) return { error: "Card não encontrado." };

  await db
    .update(card)
    .set({ type: parsed.data.type, updatedAt: new Date() })
    .where(eq(card.id, cardId));
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function updateCardEstimate(
  boardId: string,
  cardId: string,
  estimate: number | null
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = cardEstimateSchema.safeParse({ estimate });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Estimativa inválida." };
  }

  const owned = await getOwnedCard(boardId, cardId, userId);
  if (!owned) return { error: "Card não encontrado." };

  await db
    .update(card)
    .set({ estimate: parsed.data.estimate, updatedAt: new Date() })
    .where(eq(card.id, cardId));
  revalidatePath(`/boards/${boardId}`);
  return {};
}
```

Each follows `updateCardDueDate`'s exact shape: validate, check ownership
via `getOwnedCard` (already scoped to the board/user in its own query, per
`src/lib/board-auth.ts`), update, revalidate.

- [ ] **Step 3: Verify**

Run:

```bash
npx tsc --noEmit
```

Expected: exit code 0.

Run:

```bash
npx vitest run
```

Expected: exit code 0, existing tests unaffected (no new tests in this
task — these Server Actions are verified live in Task 6).

- [ ] **Step 4: Commit**

```bash
git add src/app/boards/actions.ts
git commit -m "feat: add updateCardPriority/Type/Estimate Server Actions"
```

---

### Task 3: Show and edit priority/type/estimate in the UI

**Files:**
- Modify: `src/components/boards/CardDetailPanel.tsx`
- Modify: `src/components/boards/CardItem.tsx`

- [ ] **Step 1: Add imports to `CardDetailPanel.tsx`**

Change:

```tsx
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
```

to:

```tsx
import { LABEL_COLORS, LABEL_COLOR_NAMES } from "@/lib/label-colors";
import { PRIORITIES, PRIORITY_LABELS, PRIORITY_EMOJI } from "@/lib/priority";
import { CARD_TYPES, CARD_TYPE_LABELS, CARD_TYPE_EMOJI } from "@/lib/card-type";
import { ESTIMATES } from "@/lib/estimate";
import type { CardData, LabelData } from "@/lib/board-types";
import {
  renameCard,
  deleteCard,
  updateCardDescription,
  updateCardDueDate,
  updateCardPriority,
  updateCardType,
  updateCardEstimate,
  createLabel,
  assignLabel,
  unassignLabel,
  deleteLabel,
} from "@/app/boards/actions";
```

- [ ] **Step 2: Add error state for the three new fields**

Change:

```tsx
  const [labelError, setLabelError] = useState<string | null>(null);
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [saving, setSaving] = useState(false);
```

to:

```tsx
  const [labelError, setLabelError] = useState<string | null>(null);
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [priorityError, setPriorityError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
```

- [ ] **Step 3: Add the three handlers**

Add these after `handleDueDateChange` and before `handleCreateLabel`:

```tsx
  async function handlePriorityChange(priority: string | null) {
    setPriorityError(null);
    try {
      const result = await updateCardPriority(boardId, card.id, priority);
      if (result.error) setPriorityError(result.error);
    } catch (err) {
      console.error("Failed to update priority:", err);
      setPriorityError("Não foi possível salvar.");
    }
  }

  async function handleTypeChange(type: string) {
    setTypeError(null);
    try {
      const result = await updateCardType(boardId, card.id, type);
      if (result.error) setTypeError(result.error);
    } catch (err) {
      console.error("Failed to update type:", err);
      setTypeError("Não foi possível salvar.");
    }
  }

  async function handleEstimateChange(estimate: number | null) {
    setEstimateError(null);
    try {
      const result = await updateCardEstimate(boardId, card.id, estimate);
      if (result.error) setEstimateError(result.error);
    } catch (err) {
      console.error("Failed to update estimate:", err);
      setEstimateError("Não foi possível salvar.");
    }
  }
```

These render their "currently selected" state directly off the `card` prop
(`card.priority`, `card.type`, `card.estimate`), the same way the label
assign/unassign buttons already do — no local optimistic state, since
`revalidatePath` refreshing `card` after the Server Action resolves is
already how every other field in this panel behaves.

- [ ] **Step 4: Add the three selector sections to the JSX**

Insert this block right after the title/close `<div>` (the one containing
`InlineEditableText` and the `×` close button) and before the "Etiquetas"
`<div>`:

```tsx
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Tipo</span>
          <div className="flex flex-wrap gap-1">
            {CARD_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={card.type === t}
                onClick={() => handleTypeChange(t)}
                className={`rounded-full border px-2 py-1 text-xs transition-colors ${
                  card.type === t
                    ? "border-ring bg-accent text-foreground"
                    : "border-border text-muted-foreground hover:border-ring/40"
                }`}
              >
                <span aria-hidden="true">{CARD_TYPE_EMOJI[t]}</span> {CARD_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          {typeError && (
            <p role="alert" className="text-xs text-destructive">
              {typeError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Prioridade</span>
          <div className="flex flex-wrap gap-1">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={card.priority === p}
                onClick={() => handlePriorityChange(p)}
                className={`rounded-full border px-2 py-1 text-xs transition-colors ${
                  card.priority === p
                    ? "border-ring bg-accent text-foreground"
                    : "border-border text-muted-foreground hover:border-ring/40"
                }`}
              >
                <span aria-hidden="true">{PRIORITY_EMOJI[p]}</span> {PRIORITY_LABELS[p]}
              </button>
            ))}
            {card.priority && (
              <button
                type="button"
                onClick={() => handlePriorityChange(null)}
                className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-ring/40"
              >
                Nenhuma
              </button>
            )}
          </div>
          {priorityError && (
            <p role="alert" className="text-xs text-destructive">
              {priorityError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Estimativa</span>
          <div className="flex flex-wrap items-center gap-1">
            {ESTIMATES.map((e) => (
              <button
                key={e}
                type="button"
                aria-pressed={card.estimate === e}
                onClick={() => handleEstimateChange(e)}
                className={`h-7 w-7 rounded-full border text-xs transition-colors ${
                  card.estimate === e
                    ? "border-ring bg-accent text-foreground"
                    : "border-border text-muted-foreground hover:border-ring/40"
                }`}
              >
                {e}
              </button>
            ))}
            {card.estimate !== null && (
              <button
                type="button"
                onClick={() => handleEstimateChange(null)}
                className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-ring/40"
              >
                Nenhuma
              </button>
            )}
          </div>
          {estimateError && (
            <p role="alert" className="text-xs text-destructive">
              {estimateError}
            </p>
          )}
        </div>
```

Type has no "Nenhuma" button — it's always set, matching the schema's
`NOT NULL DEFAULT 'tarefa'`. Priority and estimate each get one, since both
are nullable and start unset.

- [ ] **Step 5: Add the badge row to `CardItem.tsx`**

Change the imports:

```tsx
import { DeleteButton } from "./DeleteButton";
import { CardDetailPanel } from "./CardDetailPanel";
import type { CardData, LabelData } from "@/lib/board-types";
import { deleteCard } from "@/app/boards/actions";
```

to:

```tsx
import { DeleteButton } from "./DeleteButton";
import { CardDetailPanel } from "./CardDetailPanel";
import { PRIORITY_EMOJI, PRIORITY_LABELS } from "@/lib/priority";
import { CARD_TYPE_EMOJI, CARD_TYPE_LABELS } from "@/lib/card-type";
import type { CardData, LabelData } from "@/lib/board-types";
import { deleteCard } from "@/app/boards/actions";
```

Insert this block right after the title/delete-button `<div>` (the one with
`<span>{card.title}</span>`) and before the existing labels block
(`{card.labels.length > 0 && ...}`):

```tsx
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            <span aria-hidden="true">{CARD_TYPE_EMOJI[card.type]}</span> {CARD_TYPE_LABELS[card.type]}
          </span>
          {card.priority && (
            <span>
              <span aria-hidden="true">{PRIORITY_EMOJI[card.priority]}</span>{" "}
              {PRIORITY_LABELS[card.priority]}
            </span>
          )}
          {card.estimate !== null && <span>{card.estimate}</span>}
        </div>
```

- [ ] **Step 6: Verify**

Run:

```bash
npx tsc --noEmit
```

Expected: exit code 0.

Run:

```bash
npm run build
```

Expected: exit code 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/boards/CardDetailPanel.tsx src/components/boards/CardItem.tsx
git commit -m "feat: show and edit priority/type/estimate on cards"
```

---

### Task 4: Filter-matching pure function

**Files:**
- Create: `src/lib/card-filters.ts`
- Test: `src/lib/card-filters.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { cardMatchesFilters } from "./card-filters";
import type { CardData } from "./board-types";

function makeCard(overrides: Partial<CardData> = {}): CardData {
  return {
    id: "1",
    title: "Card",
    description: null,
    dueDate: null,
    priority: null,
    type: "tarefa",
    estimate: null,
    labels: [],
    ...overrides,
  };
}

describe("cardMatchesFilters", () => {
  it("matches everything when no filters are active", () => {
    expect(cardMatchesFilters(makeCard(), { priorities: [], types: [], labelIds: [] })).toBe(true);
  });

  it("excludes a card with no priority when a priority filter is active", () => {
    const card = makeCard({ priority: null });
    expect(cardMatchesFilters(card, { priorities: ["alta"], types: [], labelIds: [] })).toBe(false);
  });

  it("includes a card whose priority is in the filter", () => {
    const card = makeCard({ priority: "alta" });
    expect(cardMatchesFilters(card, { priorities: ["alta"], types: [], labelIds: [] })).toBe(true);
  });

  it("excludes a card whose priority isn't in the filter", () => {
    const card = makeCard({ priority: "baixa" });
    expect(
      cardMatchesFilters(card, { priorities: ["alta", "urgente"], types: [], labelIds: [] })
    ).toBe(false);
  });

  it("filters by type", () => {
    const card = makeCard({ type: "bug" });
    expect(cardMatchesFilters(card, { priorities: [], types: ["bug"], labelIds: [] })).toBe(true);
    expect(cardMatchesFilters(card, { priorities: [], types: ["feature"], labelIds: [] })).toBe(
      false
    );
  });

  it("filters by label, matching if any assigned label is in the filter", () => {
    const card = makeCard({ labels: [{ id: "l1", name: "Urgente", color: "#fff" }] });
    expect(cardMatchesFilters(card, { priorities: [], types: [], labelIds: ["l1"] })).toBe(true);
    expect(cardMatchesFilters(card, { priorities: [], types: [], labelIds: ["l2"] })).toBe(false);
  });

  it("requires every active filter category to match (AND across categories)", () => {
    const card = makeCard({
      priority: "alta",
      type: "bug",
      labels: [{ id: "l1", name: "X", color: "#fff" }],
    });
    expect(
      cardMatchesFilters(card, { priorities: ["alta"], types: ["bug"], labelIds: ["l1"] })
    ).toBe(true);
    expect(
      cardMatchesFilters(card, { priorities: ["alta"], types: ["feature"], labelIds: ["l1"] })
    ).toBe(false);
  });
});
```

Save as `src/lib/card-filters.test.ts`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/card-filters.test.ts`
Expected: FAIL — `Cannot find module './card-filters'`.

- [ ] **Step 3: Implement `cardMatchesFilters`**

```ts
import type { CardData } from "@/lib/board-types";

export type CardFilters = {
  priorities: string[];
  types: string[];
  labelIds: string[];
};

export function cardMatchesFilters(card: CardData, filters: CardFilters): boolean {
  if (filters.priorities.length > 0) {
    if (!card.priority || !filters.priorities.includes(card.priority)) return false;
  }
  if (filters.types.length > 0) {
    if (!filters.types.includes(card.type)) return false;
  }
  if (filters.labelIds.length > 0) {
    if (!card.labels.some((l) => filters.labelIds.includes(l.id))) return false;
  }
  return true;
}
```

Save as `src/lib/card-filters.ts`. An empty array for a filter category
means "no constraint from that category" (matches everything); a non-empty
array requires the card to match at least one value in it (OR within a
category); all three categories must independently pass (AND across
categories).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/card-filters.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/card-filters.ts src/lib/card-filters.test.ts
git commit -m "feat: add cardMatchesFilters helper for board filtering"
```

---

### Task 5: Filter bar UI

**Files:**
- Create: `src/components/boards/FilterBar.tsx`
- Modify: `src/components/boards/Column.tsx`
- Modify: `src/components/boards/BoardView.tsx`

- [ ] **Step 1: Create `src/components/boards/FilterBar.tsx`**

```tsx
"use client";

import * as React from "react";
import { PRIORITIES, PRIORITY_LABELS, PRIORITY_EMOJI } from "@/lib/priority";
import { CARD_TYPES, CARD_TYPE_LABELS, CARD_TYPE_EMOJI } from "@/lib/card-type";
import type { LabelData } from "@/lib/board-types";
import type { CardFilters } from "@/lib/card-filters";

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-muted-foreground">{label}:</span>
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  style,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={style}
      className={`rounded-full border px-2 py-1 transition-colors ${
        active
          ? "border-ring bg-accent text-foreground"
          : "border-border text-muted-foreground hover:border-ring/40"
      }`}
    >
      {children}
    </button>
  );
}

export function FilterBar({
  boardLabels,
  filters,
  onTogglePriority,
  onToggleType,
  onToggleLabel,
  onClear,
}: {
  boardLabels: LabelData[];
  filters: CardFilters;
  onTogglePriority: (priority: string) => void;
  onToggleType: (type: string) => void;
  onToggleLabel: (labelId: string) => void;
  onClear: () => void;
}) {
  const hasActiveFilters =
    filters.priorities.length > 0 || filters.types.length > 0 || filters.labelIds.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white/5 p-3 text-xs">
      <FilterGroup label="Prioridade">
        {PRIORITIES.map((p) => (
          <FilterChip key={p} active={filters.priorities.includes(p)} onClick={() => onTogglePriority(p)}>
            <span aria-hidden="true">{PRIORITY_EMOJI[p]}</span> {PRIORITY_LABELS[p]}
          </FilterChip>
        ))}
      </FilterGroup>
      <FilterGroup label="Tipo">
        {CARD_TYPES.map((t) => (
          <FilterChip key={t} active={filters.types.includes(t)} onClick={() => onToggleType(t)}>
            <span aria-hidden="true">{CARD_TYPE_EMOJI[t]}</span> {CARD_TYPE_LABELS[t]}
          </FilterChip>
        ))}
      </FilterGroup>
      {boardLabels.length > 0 && (
        <FilterGroup label="Etiqueta">
          {boardLabels.map((l) => {
            const active = filters.labelIds.includes(l.id);
            return (
              <FilterChip
                key={l.id}
                active={active}
                onClick={() => onToggleLabel(l.id)}
                style={active ? { backgroundColor: l.color, borderColor: l.color, color: "#000" } : undefined}
              >
                {l.name}
              </FilterChip>
            );
          })}
        </FilterGroup>
      )}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="text-muted-foreground underline transition-colors hover:text-foreground"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add `hasHiddenCards` to `Column.tsx`**

Change:

```tsx
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
```

to:

```tsx
export function Column({
  boardId,
  column,
  cards,
  boardLabels,
  hasHiddenCards = false,
}: {
  boardId: string;
  column: ColumnData;
  cards: CardData[];
  boardLabels: LabelData[];
  hasHiddenCards?: boolean;
}) {
```

Change:

```tsx
          {cards.length === 0 && (
            <p className="rounded-lg border border-dashed border-border px-2 py-4 text-center text-xs text-muted-foreground">
              Sem cards ainda
            </p>
          )}
```

to:

```tsx
          {cards.length === 0 && (
            <p className="rounded-lg border border-dashed border-border px-2 py-4 text-center text-xs text-muted-foreground">
              {hasHiddenCards ? "Nenhum card corresponde ao filtro" : "Sem cards ainda"}
            </p>
          )}
```

`hasHiddenCards` distinguishes "this column genuinely has no cards" from
"this column has cards, but the active filter hides all of them" — the
default (`false`) keeps every other `<Column>` usage (there are none yet
outside `BoardView`, but the prop being optional means nothing else has to
change) showing the plain empty message.

- [ ] **Step 3: Wire filtering into `BoardView.tsx`**

Add these imports:

```tsx
import { FilterBar } from "./FilterBar";
import { cardMatchesFilters, type CardFilters } from "@/lib/card-filters";
```

Add filter state and handlers, right after the existing `dragSequenceRef`
declaration and before `const sensors = ...`:

```tsx
  const [filters, setFilters] = useState<CardFilters>({
    priorities: [],
    types: [],
    labelIds: [],
  });

  function toggleFilterValue(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function togglePriorityFilter(priority: string) {
    setFilters((prev) => ({ ...prev, priorities: toggleFilterValue(prev.priorities, priority) }));
  }

  function toggleTypeFilter(type: string) {
    setFilters((prev) => ({ ...prev, types: toggleFilterValue(prev.types, type) }));
  }

  function toggleLabelFilter(labelId: string) {
    setFilters((prev) => ({ ...prev, labelIds: toggleFilterValue(prev.labelIds, labelId) }));
  }

  function clearFilters() {
    setFilters({ priorities: [], types: [], labelIds: [] });
  }
```

Change the JSX that renders the filter-bar-and-columns area. Replace:

```tsx
      {error && (
        <p
          role="alert"
          className="w-fit rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
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
```

with:

```tsx
      {error && (
        <p
          role="alert"
          className="w-fit rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <FilterBar
        boardLabels={boardLabels}
        filters={filters}
        onTogglePriority={togglePriorityFilter}
        onToggleType={toggleTypeFilter}
        onToggleLabel={toggleLabelFilter}
        onClear={clearFilters}
      />
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {columnOrder.map((column) => {
          const allCards = columns[column.id] ?? [];
          const visibleCards = allCards.filter((c) => cardMatchesFilters(c, filters));
          return (
            <Column
              key={column.id}
              boardId={boardId}
              column={column}
              cards={visibleCards}
              boardLabels={boardLabels}
              hasHiddenCards={visibleCards.length !== allCards.length}
            />
          );
        })}
        <div className="w-64 shrink-0">
          <InlineCreateForm
            placeholder="Nome da coluna"
            buttonLabel="+ Adicionar coluna"
            onCreate={createColumn.bind(null, boardId)}
          />
        </div>
      </div>
```

This keeps `columns` (the drag-and-drop state) holding every card
regardless of the active filter — only the `cards` prop each `Column`
receives is filtered. `Column`'s `SortableContext` builds its `items` list
from that same (now filtered) `cards` prop, so dnd-kit only ever tracks
currently-visible cards as drop targets; `BoardView`'s own drag handlers
(`handleDragOver`/`handleDragEnd`) still look cards up by id in the full
`columns` state, so a drop is always positioned correctly among a column's
complete card list, filtered or not.

- [ ] **Step 4: Verify**

Run:

```bash
npx tsc --noEmit
```

Expected: exit code 0.

Run:

```bash
npm run build
```

Expected: exit code 0.

Run:

```bash
npx vitest run
```

Expected: exit code 0, all tests passing (including the 7 new
`cardMatchesFilters` tests from Task 4).

- [ ] **Step 5: Commit**

```bash
git add src/components/boards/FilterBar.tsx src/components/boards/Column.tsx src/components/boards/BoardView.tsx
git commit -m "feat: add board filter bar for priority/type/label"
```

---

### Task 6: Verify against the real database

No further code changes — a live, controller-run end-to-end check against
the already-connected real Neon database.

- [ ] **Step 1: Start the dev server, sign in, open a board with at least one column**

- [ ] **Step 2: Verify a new card starts with type "Tarefa" and no priority/estimate**

Create a card. Expected: the closed card face shows `✅ Tarefa` and nothing
else in the badge row (no priority, no estimate number). Open the panel —
Tipo shows "Tarefa" selected, Prioridade has nothing selected (no "Nenhuma"
button visible either, since there's nothing to clear yet), Estimativa has
nothing selected.

- [ ] **Step 3: Verify setting each field**

In the panel: click "Bug" under Tipo — expected: the card face immediately
shows `🐛 Bug` once you close the panel (or on the next render). Click
"Urgente" under Prioridade — expected: card face shows `🔴 Urgente`, and a
"Nenhuma" button now appears next to the priority options. Click "5" under
Estimativa — expected: card face shows `5`, and a "Nenhuma" button appears
there too.

- [ ] **Step 4: Verify clearing priority and estimate**

Click "Nenhuma" under Prioridade — expected: the badge disappears from the
card face, the "Nenhuma" button itself disappears (nothing left to clear).
Same for Estimativa's "Nenhuma".

- [ ] **Step 5: Verify the filter bar**

Create 2-3 more cards with different types/priorities/labels (reuse an
existing label from a prior plan's testing, or create one via the panel).
Click a Tipo chip in the filter bar (e.g. "Bug") — expected: only cards of
that type remain visible in each column; a column that had cards but none
matching shows "Nenhum card corresponde ao filtro" instead of "Sem cards
ainda". Click a second chip in a different category (e.g. a Prioridade
chip) — expected: now only cards matching *both* are shown (AND across
categories). Click a second chip in the *same* category (e.g. a second Tipo
chip) — expected: cards matching *either* type now show (OR within a
category). Click "Limpar filtros" — expected: every card reappears.

- [ ] **Step 6: Verify drag-and-drop still works with a filter active**

With a filter narrowing a column to 1-2 visible cards, drag one of the
visible cards to a new position (same column or a different one). Expected:
the move persists correctly (reload the page to confirm), and cards hidden
by the filter keep their relative position among themselves (clear the
filter afterward and confirm the full column order still looks sane, not
scrambled).

- [ ] **Step 7: Verify cross-user isolation still holds**

Sign in as a different user, confirm the three new Server Actions
(`updateCardPriority`/`updateCardType`/`updateCardEstimate`) reject a
card ID that belongs to the first user's board the same way every other
card action already does (this is inherited for free from `getOwnedCard`,
already exhaustively audited in prior plans — a quick sanity check is
enough here, not a full re-audit).

---

## Self-Review Notes

- **Spec coverage:** every section of
  `docs/superpowers/specs/2026-09-08-card-metadata-and-filters-design.md`
  maps to a task — data model (3 columns, constants, validation, `CardData`)
  → Task 1, Server Actions → Task 2, card face badge row + panel selectors
  → Task 3, filter-matching logic → Task 4, filter bar UI + `BoardView`/
  `Column` wiring → Task 5. The design doc's explicit exclusions
  (sprints/cycles, server-side filtering) aren't implemented anywhere in
  this plan, matching that scope boundary.
- **Placeholder scan:** no TBDs. The one place a detail can't be fully
  pinned down until implementation time — whether `cardEstimateSchema`'s
  `.refine()` call accepts a bare string as its second argument on the
  installed zod version — is explicitly flagged as "verify and adjust"
  rather than left ambiguous, following the same precedent as prior plans'
  zod-API-version discoveries.
- **Type consistency:** `CardFilters`'s shape (`{ priorities: string[];
  types: string[]; labelIds: string[] }`) is defined once in
  `card-filters.ts` and imported everywhere else that needs it (`FilterBar`,
  `BoardView`) rather than redeclared. `cardMatchesFilters(card, filters)`'s
  parameter order and names match between its definition (Task 4) and every
  call site (Task 5). The three Server Actions' signatures
  (`(boardId, cardId, value)`) match exactly between their definition
  (Task 2) and their call sites in `CardDetailPanel.tsx` (Task 3).
- **Card face layout:** the new badge row sits between the title row and
  the existing labels row on `CardItem.tsx`, and between the title row and
  "Etiquetas" in `CardDetailPanel.tsx` — consistent placement in both
  places, decided during brainstorming (badges take priority visually over
  labels, which are more free-form/numerous).
