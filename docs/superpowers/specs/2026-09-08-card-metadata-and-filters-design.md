# Design: Card metadata (priority, type, estimate) & board filters

## Contexto

The user asked to reposition sistema-kanban as a kanban tool for tech
projects, aligned with current market conventions (Linear/Jira-style). That
request was too broad to design directly — it named four candidate
additions (priority, type, sprint/cycle, estimate), and "sprint/cycle" is
architecturally a new entity (start/end dates, groups many cards, likely
needs its own view), not just another card field. It was split into two
plans during brainstorming:

1. **This plan** — three new card fields (priority, type, estimate) plus a
   board-level filter by priority/type/label. Purely additive to the
   existing `card` table and the existing board/column/card UI.
2. **A future plan** — sprints/cycles, not designed here.

## Data model

Three new columns on `card` (`src/db/schema.ts`), no new tables:

```ts
priority: text("priority"), // "urgente" | "alta" | "media" | "baixa" | null
type: text("type").notNull().default("tarefa"), // "bug" | "feature" | "tarefa" | "melhoria"
estimate: integer("estimate"), // 1 | 2 | 3 | 5 | 8 | 13 | null
```

Same pattern as `label.color` — a plain `text` column with the allowed
values enforced by a zod schema at the Server Action layer, not a native
Postgres enum (nothing else in this schema uses one, and adding an enum
type means a separate migration step for every future value change).

- **`priority`**: nullable, no default — a card starts with no priority
  set, same as `dueDate` today. Confirmed with the user explicitly (not
  defaulted to a "medium" value).
- **`type`**: NOT NULL, defaults to `"tarefa"` — every card always has a
  type, starting as the generic one. Also confirmed explicitly (unlike
  priority, this one *does* default rather than starting empty).
- **`estimate`**: nullable, no default, one of the Fibonacci values
  `1, 2, 3, 5, 8, 13` — same "starts unset" shape as priority.

**Shared constants**, following `src/lib/label-colors.ts`'s exact shape:

```ts
// src/lib/priority.ts
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

```ts
// src/lib/card-type.ts
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

```ts
// src/lib/estimate.ts
export const ESTIMATES = [1, 2, 3, 5, 8, 13] as const;
```

Emoji, not SVG icons — the same call already made for the landing page's
feature icons: no new dependency, consistent with the app's existing use of
emoji elsewhere (📅 on the due date, label swatches).

**Validation** (`src/lib/validation.ts`, next to `labelSchema`):

```ts
export const cardPrioritySchema = z.object({
  priority: z.enum(PRIORITIES, { error: "Prioridade inválida" }).nullable(),
});

export const cardTypeSchema = z.object({
  type: z.enum(CARD_TYPES, { error: "Tipo inválido" }),
});

export const cardEstimateSchema = z.object({
  estimate: z.union([z.literal(ESTIMATES[0]), ...]).nullable(), // exact literal union of ESTIMATES
});
```

**`CardData`** (`src/lib/board-types.ts`) gains the three fields:

```ts
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

**Server Actions** (`src/app/boards/actions.ts`), three new ones mirroring
`updateCardDueDate`'s exact shape (ownership check via `getOwnedCard`, zod
validation, `revalidatePath`):

```ts
updateCardPriority(boardId, cardId, priority: string | null)
updateCardType(boardId, cardId, type: string)
updateCardEstimate(boardId, cardId, estimate: number | null)
```

## Where each field shows up

**Closed card face** (`CardItem.tsx`): a new compact badge row, placed
above the existing labels row (title → badges → labels → due date). Each
badge only renders when its field is set — `type` always renders (it's
never null), `priority`/`estimate` only when chosen. Example:
`🐛 Bug  🔴 Urgente  5`.

**Detail panel** (`CardDetailPanel.tsx`): three new sections, each a row of
clickable buttons — the exact interaction pattern the label color picker
already uses (`aria-pressed`, ring highlight on the selected one). Type has
no "none" option (always exactly one selected); priority and estimate each
get an extra "nenhuma" button to clear back to `null`. Each selection saves
immediately via its Server Action, same as the due date does today — no
separate confirm step.

**Board filter**: a new filter bar in `BoardView.tsx`, above the columns,
with three groups of multi-select chips — Priority, Type, Label (existing
board labels, which had no filter UI before this). Filtering combines with
AND across the three groups and OR within a group (e.g. "Priority: Urgente
OR Alta" AND "Type: Bug"). Purely client-side: `BoardView` already holds
every card for the board in local state for drag-and-drop, so the filter
just controls which cards each `Column` renders — no new query, no
Server Action. Filtered-out cards are hidden, not removed from state —
`Column` only renders the subset of its cards that currently match the
active filters, so drag-and-drop keeps working correctly on whatever's
visible (the underlying `columns` state driving the drag logic is
untouched by the filter). Clearing all filters shows every card again.

## Testing

Same split as every prior plan: pure logic gets a Vitest unit test (the
filter-matching function, extracted as its own pure function so it doesn't
need a browser), everything else — the new Server Actions, the panel
selectors, the badge row, the filter bar's actual interaction — verified
live against the real Neon DB, per this project's established pattern.

## Self-review

- **Placeholder scan:** no TBDs. `cardEstimateSchema`'s literal union is
  described by construction (`z.union([z.literal(1), z.literal(2), ...])`
  over `ESTIMATES`) rather than spelled out by hand, since the exact zod
  v4 call shape needing verification against the installed version is an
  implementation detail for the plan, not a design ambiguity.
- **Consistency:** `type`'s NOT NULL/defaulted shape vs. `priority`/
  `estimate`'s nullable shape is intentional and was confirmed explicitly
  with the user — not an oversight to reconcile.
- **Scope:** deliberately excludes sprints/cycles (a separate plan) and
  server-side filtering/sorting (client-side only, since the board already
  loads everything for drag-and-drop).
- **Ambiguity:** filter combination logic (AND across groups, OR within a
  group) is stated explicitly rather than left to "however feels right."
