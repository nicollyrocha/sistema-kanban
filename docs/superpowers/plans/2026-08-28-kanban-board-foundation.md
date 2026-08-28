# Kanban Board Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/boards` placeholder with a real boards list, and build `/boards/[boardId]` — a board with columns and cards, all creatable/renamable/deletable inline (no modals, no drag-and-drop yet — that's a separate follow-up plan).

**Architecture:** Server Components read board/column/card data directly via Drizzle in `page.tsx` files. All mutations are Next.js Server Actions (`"use server"`) in a single `src/app/boards/actions.ts`, called directly from client components (no hand-written API routes, no manual `fetch`). Every action re-verifies that the target board (and, for column/card actions, that the specific column/card) belongs to the calling user before touching any row — never trusts an ID from the client alone. Three small shared client components (`InlineEditableText`, `InlineCreateForm`, `DeleteButton`) implement the "click to create/rename, confirm before destructive deletes" interaction pattern once, reused everywhere.

**Tech Stack:** Next.js (App Router) Server Components + Server Actions, Drizzle ORM, Zod, existing Tailwind/`cva` UI primitives, Vitest.

---

## Context for the engineer

This plan builds on the foundation and account-settings plans (both fully implemented — see `docs/superpowers/plans/2026-08-27-foundation-auth.md` and `docs/superpowers/plans/2026-08-28-account-settings.md`). Relevant things that already exist and should be reused, not recreated:

- `src/db/schema.ts` has `user`/`session`/`account`/`verification` (Better Auth) tables. This plan adds `board`/`boardColumn`/`card`/`label`/`cardLabel` to the same file.
- `src/lib/auth.ts` exports `auth` (Better Auth server instance, `auth.api.getSession`). `src/lib/validation.ts` has the established Zod pattern (`z.email()` not `.email()`, this plan adds one more schema to the same file, same conventions).
- `src/app/boards/page.tsx` currently exists as a placeholder (from the foundation plan) — a static "Meus quadros" heading, a `SignOutButton`, and placeholder text. This plan replaces its body with a real boards list; keep the `SignOutButton`.
- `.env.local` already has a real `DATABASE_URL` pointing at a live Neon database (set up during the foundation plan's Task 13) — `npm run build`/`npm run dev` load it automatically (Next.js does this natively), so **no placeholder `DATABASE_URL` workaround is needed for those commands in this plan**, unlike earlier plans before a real database existed. `drizzle-kit` (used by `npm run db:push`) does **not** auto-load `.env.local` on its own — Task 1 below shows the exact command to extract and pass it inline.
- The `InlineEditableText`/`InlineCreateForm`/`DeleteButton` submit handlers in this plan wrap their `authClient`-equivalent (here, Server Action) calls in `try/catch`. This is a deliberate improvement over a gap a reviewer found in the account-settings plan (some of those forms could leave a button stuck on "Salvando..." forever if the server call threw instead of resolving) — don't drop the `try/catch` when implementing.

You are on `master` in `C:\Users\Nic\Documents\sistema-kanban`, explicit standing consent to work directly on `master`. Windows + Git Bash.

## File Structure

```
src/
├── db/
│   └── schema.ts                          # + board, boardColumn, card, label, cardLabel
├── lib/
│   ├── position.ts                        # nextPosition() — pure function, TDD
│   ├── validation.ts                      # + titleSchema
│   └── board-auth.ts                      # getOwnedBoard/getOwnedColumn/getOwnedCard
├── app/
│   └── boards/
│       ├── actions.ts                     # all Server Actions (create/rename/delete × board/column/card)
│       ├── page.tsx                       # MODIFY: replace placeholder with real boards list
│       └── [boardId]/
│           └── page.tsx                   # NEW: the board itself
└── components/
    └── boards/
        ├── InlineEditableText.tsx         # click-to-rename, shared
        ├── InlineCreateForm.tsx           # click-to-create, shared
        ├── DeleteButton.tsx                # optional-confirm delete, shared
        ├── Column.tsx
        └── CardItem.tsx
```

---

### Task 1: Database schema

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add the new tables**

Append to `src/db/schema.ts` (keep every existing table — `user`, `session`, `account`, `verification` — completely unchanged; only add new imports and new exports):

```ts
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  index,
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";
```
(This replaces the existing `import { pgTable, text, timestamp, boolean, index, unique } from "drizzle-orm/pg-core";` line — just adding `integer`, `uuid`, `primaryKey` to it. Don't touch anything else about the import.)

```ts
export const board = pgTable(
  "board",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("board_user_id_idx").on(t.userId)]
);

// Named "board_column" (not "column") because COLUMN is a reserved SQL
// keyword — Drizzle would quote it correctly either way, but avoiding
// reserved words in identifiers sidesteps any tooling/raw-SQL surprises.
export const boardColumn = pgTable(
  "board_column",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => board.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("board_column_board_id_idx").on(t.boardId)]
);

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

// label/cardLabel have no UI in this plan (that's a follow-up plan) — added
// now so the schema migration for the whole board feature happens once.
export const label = pgTable(
  "label",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => board.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
  },
  (t) => [index("label_board_id_idx").on(t.boardId)]
);

export const cardLabel = pgTable(
  "card_label",
  {
    cardId: uuid("card_id")
      .notNull()
      .references(() => card.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => label.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.labelId] })]
);
```

- [ ] **Step 2: Push the schema to the real Neon database**

`drizzle-kit` doesn't read `.env.local` on its own — extract `DATABASE_URL` from it and pass it inline:

```bash
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d'"' -f2) npm run db:push
```
Expected: Drizzle Kit reports the new tables (`board`, `board_column`, `card`, `label`, `card_label`) created, with no errors and no destructive-change prompts (this is a pure addition, no existing table is altered).

- [ ] **Step 3: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0 (no placeholder `DATABASE_URL` needed — `.env.local` has a real one and Next.js loads it automatically).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: board/column/card/label schema"
```

---

### Task 2: Position helper and title validation schema

**Files:**
- Create: `src/lib/position.ts`
- Test: `src/lib/position.test.ts`
- Modify: `src/lib/validation.ts`
- Modify: `src/lib/validation.test.ts`

- [ ] **Step 1: Write the failing test for `nextPosition`**

Create `src/lib/position.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { nextPosition } from "./position";

describe("nextPosition", () => {
  it("returns 0 for an empty list", () => {
    expect(nextPosition([])).toBe(0);
  });

  it("returns one more than the single existing position", () => {
    expect(nextPosition([0])).toBe(1);
  });

  it("returns one more than the maximum existing position", () => {
    expect(nextPosition([0, 3, 1])).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/lib/position.test.ts
```
Expected: FAIL — `Cannot find module './position'`.

- [ ] **Step 3: Create `src/lib/position.ts`**

```ts
export function nextPosition(existingPositions: number[]): number {
  if (existingPositions.length === 0) return 0;
  return Math.max(...existingPositions) + 1;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run src/lib/position.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing test for `titleSchema`**

Add `titleSchema` to the existing named import at the top of `src/lib/validation.test.ts` (extend the existing `import { ... } from "./validation";` line, don't add a second import statement). Append this new `describe` block at the end of the file:
```ts
describe("titleSchema", () => {
  it("accepts a valid title", () => {
    const result = titleSchema.safeParse({ title: "Trabalho" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = titleSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a title that is only whitespace", () => {
    const result = titleSchema.safeParse({ title: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects a title longer than 200 characters", () => {
    const result = titleSchema.safeParse({ title: "a".repeat(201) });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run:
```bash
npx vitest run src/lib/validation.test.ts
```
Expected: the existing 13 tests still pass; the 4 new tests FAIL (`titleSchema` is not exported yet).

- [ ] **Step 7: Add `titleSchema` to `src/lib/validation.ts`**

Append (keep every existing schema/type untouched):
```ts
export const titleSchema = z.object({
  title: z.string().trim().min(1, "Informe um título").max(200, "Título muito longo"),
});

export type TitleInput = z.infer<typeof titleSchema>;
```

- [ ] **Step 8: Run tests to verify they pass**

Run:
```bash
npx vitest run src/lib/validation.test.ts src/lib/position.test.ts
```
Expected: PASS (17 + 3 = 20 tests across the two files... actually run them together or separately, either way all pass).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: position helper and title validation schema"
```

---

### Task 3: Ownership helpers and Server Actions

**Files:**
- Create: `src/lib/board-auth.ts`
- Create: `src/app/boards/actions.ts`

- [ ] **Step 1: Create `src/lib/board-auth.ts`**

```ts
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { board, boardColumn, card } from "@/db/schema";

export async function getOwnedBoard(boardId: string, userId: string) {
  const [row] = await db
    .select()
    .from(board)
    .where(and(eq(board.id, boardId), eq(board.userId, userId)));
  return row ?? null;
}

export async function getOwnedColumn(boardId: string, columnId: string, userId: string) {
  const [row] = await db
    .select({ column: boardColumn })
    .from(boardColumn)
    .innerJoin(board, eq(boardColumn.boardId, board.id))
    .where(
      and(
        eq(boardColumn.id, columnId),
        eq(boardColumn.boardId, boardId),
        eq(board.userId, userId)
      )
    );
  return row?.column ?? null;
}

export async function getOwnedCard(boardId: string, cardId: string, userId: string) {
  const [row] = await db
    .select({ card })
    .from(card)
    .innerJoin(boardColumn, eq(card.columnId, boardColumn.id))
    .innerJoin(board, eq(boardColumn.boardId, board.id))
    .where(
      and(eq(card.id, cardId), eq(boardColumn.boardId, boardId), eq(board.userId, userId))
    );
  return row?.card ?? null;
}
```

Each helper does the ownership check *inside the query itself* (the `and(...)` in `where`), not as a separate check after fetching — so there's no way for a caller to accidentally use the row without the check having applied. `getOwnedColumn`/`getOwnedCard` also join through to `board` to confirm the column/card is actually nested under the specific `boardId` passed in, not just *some* board the user owns — this matters because a user could own multiple boards, and a column ID from board A should never be accepted when the caller believes it's operating on board B.

- [ ] **Step 2: Create `src/app/boards/actions.ts`**

```ts
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { board, boardColumn, card } from "@/db/schema";
import { getOwnedBoard, getOwnedColumn, getOwnedCard } from "@/lib/board-auth";
import { nextPosition } from "@/lib/position";
import { titleSchema } from "@/lib/validation";

async function requireUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  return session.user.id;
}

function parseTitle(title: string) {
  const parsed = titleSchema.safeParse({ title });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Título inválido." } as const;
  }
  return { title: parsed.data.title } as const;
}

export async function createBoard(title: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = parseTitle(title);
  if ("error" in parsed) return { error: parsed.error };

  await db.insert(board).values({ userId, title: parsed.title });
  revalidatePath("/boards");
  return {};
}

export async function renameBoard(boardId: string, title: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = parseTitle(title);
  if ("error" in parsed) return { error: parsed.error };

  const owned = await getOwnedBoard(boardId, userId);
  if (!owned) return { error: "Quadro não encontrado." };

  await db
    .update(board)
    .set({ title: parsed.title, updatedAt: new Date() })
    .where(eq(board.id, boardId));
  revalidatePath("/boards");
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function deleteBoard(boardId: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const owned = await getOwnedBoard(boardId, userId);
  if (!owned) return { error: "Quadro não encontrado." };

  await db.delete(board).where(eq(board.id, boardId));
  revalidatePath("/boards");
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function createColumn(boardId: string, title: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = parseTitle(title);
  if ("error" in parsed) return { error: parsed.error };

  const owned = await getOwnedBoard(boardId, userId);
  if (!owned) return { error: "Quadro não encontrado." };

  const existing = await db
    .select({ position: boardColumn.position })
    .from(boardColumn)
    .where(eq(boardColumn.boardId, boardId));
  const position = nextPosition(existing.map((c) => c.position));

  await db.insert(boardColumn).values({ boardId, title: parsed.title, position });
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function renameColumn(
  boardId: string,
  columnId: string,
  title: string
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = parseTitle(title);
  if ("error" in parsed) return { error: parsed.error };

  const owned = await getOwnedColumn(boardId, columnId, userId);
  if (!owned) return { error: "Coluna não encontrada." };

  await db.update(boardColumn).set({ title: parsed.title }).where(eq(boardColumn.id, columnId));
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function deleteColumn(
  boardId: string,
  columnId: string
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const owned = await getOwnedColumn(boardId, columnId, userId);
  if (!owned) return { error: "Coluna não encontrada." };

  await db.delete(boardColumn).where(eq(boardColumn.id, columnId));
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function createCard(
  boardId: string,
  columnId: string,
  title: string
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = parseTitle(title);
  if ("error" in parsed) return { error: parsed.error };

  const owned = await getOwnedColumn(boardId, columnId, userId);
  if (!owned) return { error: "Coluna não encontrada." };

  const existing = await db
    .select({ position: card.position })
    .from(card)
    .where(eq(card.columnId, columnId));
  const position = nextPosition(existing.map((c) => c.position));

  await db.insert(card).values({ columnId, title: parsed.title, position });
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function renameCard(
  boardId: string,
  cardId: string,
  title: string
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = parseTitle(title);
  if ("error" in parsed) return { error: parsed.error };

  const owned = await getOwnedCard(boardId, cardId, userId);
  if (!owned) return { error: "Card não encontrado." };

  await db
    .update(card)
    .set({ title: parsed.title, updatedAt: new Date() })
    .where(eq(card.id, cardId));
  revalidatePath(`/boards/${boardId}`);
  return {};
}

export async function deleteCard(boardId: string, cardId: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const owned = await getOwnedCard(boardId, cardId, userId);
  if (!owned) return { error: "Card não encontrado." };

  await db.delete(card).where(eq(card.id, cardId));
  revalidatePath(`/boards/${boardId}`);
  return {};
}
```

Every one of these 9 actions follows the same shape: get the real user ID (throws if no valid session — same DB-backed check used in `/account`), validate input, verify ownership of the exact resource being touched, mutate, revalidate. When reviewing this file, check **every single action** has its ownership check — it's easy to skim a repetitive file like this and miss that one function forgot the check.

- [ ] **Step 3: Verify**

Run:
```bash
npm run build
npx tsc --noEmit
```
Expected: both exit 0. (Nothing imports `actions.ts` yet — Tasks 5-6 wire it up — so this only confirms it compiles standalone.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: board/column/card ownership helpers and Server Actions"
```

---

### Task 4: Shared inline-interaction components

**Files:**
- Create: `src/components/boards/InlineEditableText.tsx`
- Create: `src/components/boards/InlineCreateForm.tsx`
- Create: `src/components/boards/DeleteButton.tsx`

- [ ] **Step 1: Create `src/components/boards/InlineEditableText.tsx`**

```tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function InlineEditableText({
  value,
  onSave,
  label,
  className,
}: {
  value: string;
  onSave: (newValue: string) => Promise<{ error?: string }>;
  label: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  async function commit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setDraft(value);
      setEditing(false);
      setError(null);
      return;
    }
    try {
      const result = await onSave(trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      setError(null);
    } catch (err) {
      console.error("Failed to save:", err);
      setError("Não foi possível salvar.");
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
    setError(null);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <input
          autoFocus
          aria-label={label}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          className={cn(
            "rounded border border-input bg-white/5 px-2 py-1 text-sm outline-none",
            className
          )}
        />
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn("text-left hover:underline", className)}
    >
      {value}
    </button>
  );
}
```

- [ ] **Step 2: Create `src/components/boards/InlineCreateForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

export function InlineCreateForm({
  placeholder,
  buttonLabel,
  onCreate,
}: {
  placeholder: string;
  buttonLabel: string;
  onCreate: (title: string) => Promise<{ error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const result = await onCreate(trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTitle("");
      setError(null);
    } catch (err) {
      console.error("Failed to create:", err);
      setError("Não foi possível salvar.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        {buttonLabel}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <Input
        autoFocus
        aria-label={placeholder}
        placeholder={placeholder}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            setTitle("");
            setError(null);
          }
        }}
        onBlur={() => {
          if (!title.trim()) setOpen(false);
        }}
        disabled={loading}
      />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 3: Create `src/components/boards/DeleteButton.tsx`**

```tsx
"use client";

import { useState } from "react";

export function DeleteButton({
  label,
  confirmMessage,
  onDelete,
}: {
  label: string;
  confirmMessage?: string;
  onDelete: () => Promise<{ error?: string }>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setLoading(true);
    try {
      const result = await onDelete();
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Failed to delete:", err);
      setError("Não foi possível excluir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-label={label}
        className="text-muted-foreground hover:text-destructive disabled:opacity-50"
      >
        ×
      </button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
```

Passing `confirmMessage` gates the delete behind `window.confirm(...)` (used for board/column); omitting it deletes immediately on click (used for cards) — one component, both behaviors from the design spec, no duplication.

- [ ] **Step 4: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0. (None of these are used by a page yet — Tasks 5-6 wire them in.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: shared inline create/edit/delete components"
```

---

### Task 5: Boards list page

**Files:**
- Modify: `src/app/boards/page.tsx`

- [ ] **Step 1: Replace `src/app/boards/page.tsx`**

This replaces the foundation plan's placeholder entirely.

```tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { board } from "@/db/schema";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { InlineCreateForm } from "@/components/boards/InlineCreateForm";
import { createBoard } from "./actions";

export default async function BoardsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const boards = await db
    .select()
    .from(board)
    .where(eq(board.userId, session.user.id))
    .orderBy(board.createdAt);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Meus quadros</h1>
        <div className="flex items-center gap-4">
          <Link href="/account" className="text-sm text-muted-foreground hover:text-foreground">
            Minha conta
          </Link>
          <SignOutButton />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {boards.map((b) => (
          <Link
            key={b.id}
            href={`/boards/${b.id}`}
            className="glass flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm hover:bg-accent"
          >
            <span>{b.title}</span>
            <span aria-hidden="true" className="text-muted-foreground">→</span>
          </Link>
        ))}
        {boards.length === 0 && (
          <p className="text-sm text-muted-foreground">Você ainda não tem nenhum quadro.</p>
        )}
      </div>
      <InlineCreateForm placeholder="Nome do quadro" buttonLabel="+ Novo quadro" onCreate={createBoard} />
    </main>
  );
}
```

This does its own DB-backed session check (`auth.api.getSession`), same pattern as `/account` — not relying on `src/proxy.ts`'s cookie-presence check alone.

- [ ] **Step 2: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0, `/boards` still in the route table.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: real boards list page"
```

---

### Task 6: Board view (columns and cards)

**Files:**
- Create: `src/components/boards/CardItem.tsx`
- Create: `src/components/boards/Column.tsx`
- Create: `src/app/boards/[boardId]/page.tsx`

- [ ] **Step 1: Create `src/components/boards/CardItem.tsx`**

```tsx
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
            📅 {new Date(card.dueDate).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>
      <DeleteButton label="Excluir card" onDelete={deleteCard.bind(null, boardId, card.id)} />
    </div>
  );
}
```

Only `dueDate` is rendered conditionally here (not label chips) — there's genuinely no way to set either a due date or a label in this plan, but `dueDate` is a plain column directly on `card`, so showing it costs nothing extra. Labels require joining through `card_label`/`label`, which has zero rows until the follow-up plan builds label management — that plan adds the join query and the chip rendering together, rather than this plan half-building a display path for data that can't exist yet.

- [ ] **Step 2: Create `src/components/boards/Column.tsx`**

```tsx
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
```

- [ ] **Step 3: Create `src/app/boards/[boardId]/page.tsx`**

```tsx
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { boardColumn, card } from "@/db/schema";
import { getOwnedBoard } from "@/lib/board-auth";
import { InlineEditableText } from "@/components/boards/InlineEditableText";
import { InlineCreateForm } from "@/components/boards/InlineCreateForm";
import { DeleteButton } from "@/components/boards/DeleteButton";
import { Column } from "@/components/boards/Column";
import { renameBoard, deleteBoard, createColumn } from "../actions";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const owned = await getOwnedBoard(boardId, session.user.id);
  if (!owned) {
    notFound();
  }

  const columns = await db
    .select()
    .from(boardColumn)
    .where(eq(boardColumn.boardId, boardId))
    .orderBy(boardColumn.position);

  const cards = columns.length
    ? await db
        .select()
        .from(card)
        .where(
          inArray(
            card.columnId,
            columns.map((c) => c.id)
          )
        )
        .orderBy(card.position)
    : [];

  return (
    <main className="flex min-h-screen flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/boards" className="text-sm text-muted-foreground hover:text-foreground">
            <span aria-hidden="true">←</span> Meus quadros
          </Link>
          <InlineEditableText
            value={owned.title}
            onSave={renameBoard.bind(null, boardId)}
            label="Nome do quadro"
            className="text-xl font-semibold"
          />
        </div>
        <DeleteButton
          label="Excluir quadro"
          confirmMessage="Tem certeza? Isso vai excluir todas as colunas e cards deste quadro."
          onDelete={deleteBoard.bind(null, boardId)}
        />
      </div>
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <Column
            key={column.id}
            boardId={boardId}
            column={column}
            cards={cards.filter((c) => c.columnId === column.id)}
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

`getOwnedBoard` here is the same defense-in-depth pattern established for `/account`: `src/proxy.ts` only checks that *a* session cookie exists, this page checks that the session is real *and* that this specific board belongs to this specific user, `notFound()`-ing (404, not a redirect or an error message) if either isn't true — never revealing whether a board ID exists but belongs to someone else.

- [ ] **Step 4: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0, `/boards/[boardId]` in the route table.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: board view with columns and cards"
```

---

### Task 7: Verify against the real database

This task has no code changes — it's a live, manual (or controller-run) end-to-end check against the already-connected real Neon database.

- [ ] **Step 1: Start the dev server and sign in**

```bash
npm run dev
```
Sign in with an existing test account at `http://localhost:3000/login`.

- [ ] **Step 2: Create, rename, and delete a board**

Visit `/boards`. Click "+ Novo quadro", type a name, press Enter. Expected: the board appears in the list immediately. Click into it, click the board title, rename it, press Enter. Expected: title updates, "← Meus quadros" still works. Go back to `/boards`, confirm the renamed title shows there too. Click the "×" next to a board title inside the board view — expected a confirm dialog; cancel it (board should still exist), then confirm it (board should disappear from `/boards`).

- [ ] **Step 3: Create, rename, and delete columns and cards**

Inside a board, click "+ Adicionar coluna" a couple of times to create 2-3 columns. Click a column title to rename it. Inside a column, click "+ Adicionar card" and create a few cards; click a card's title to rename it inline. Click a card's "×" — expected: deletes immediately, no confirmation. Click a column's "×" with cards still in it — expected: confirm dialog mentioning cards will be deleted too; confirm it and verify both the column and its cards are gone.

- [ ] **Step 4: Verify cross-user isolation**

Sign out, sign in as a *different* user (or sign up a new one). Note a board ID that belongs to the *first* user (visible in the URL `/boards/<id>` from Step 2/3, or query it directly: `DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d'"' -f2) node -e "const {neon}=require('@neondatabase/serverless');const sql=neon(process.env.DATABASE_URL);sql\`SELECT id, title FROM board\`.then(r=>console.log(r))"`). While signed in as the second user, visit `/boards/<first-user's-board-id>` directly. Expected: a 404 page, not the board's contents and not an error revealing the board exists.

- [ ] **Step 5: Verify the unauthenticated case**

Sign out. Visit `/boards` and `/boards/<any-board-id>` directly. Expected: both redirect to `/login` (via `src/proxy.ts`'s cookie check, same as `/account`).

---

## Self-Review Notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-08-28-kanban-board-foundation-design.md` maps to a task: arquitetura (Server Components + Server Actions + ownership helper) → Task 3, modelo de dados → Task 1, rotas → Tasks 5–6, interação (tudo inline, confirmação seletiva) → Tasks 4–6, design visual (lista vertical, card com preview) → Tasks 5–6, testes → Task 2. The one place this plan goes slightly beyond the spec's literal wording is `getOwnedBoard` becoming three helpers (`getOwnedBoard`/`getOwnedColumn`/`getOwnedCard`) instead of one — the spec's stated intent ("um helper único... centraliza essa checagem") is about having ownership-checking logic live in one place rather than being duplicated inline across actions, which this fully satisfies; a single `getOwnedBoard` alone would have left column/card actions unable to verify that a given column/card ID actually belongs to the board, which is a real authorization gap, not a stylistic choice.
- **Placeholder scan:** no TBDs. `card`'s `description` and label associations are real, migrated columns/tables with no UI touching them yet — explicitly and repeatedly called out as deferred to the follow-up plan, not left ambiguous.
- **Type consistency:** `CardData`/`ColumnData` types are declared identically (same field names/types) everywhere they're used — `CardItem.tsx`, `Column.tsx`, and the data assembled in `[boardId]/page.tsx` all agree on `{ id: string; title: string; dueDate: Date | null }` for cards and `{ id: string; title: string }` for columns. Every Server Action's return type is `Promise<{ error?: string }>` uniformly — no action returns bare `void`/`undefined`, so every caller's `result.error` check is type-safe without an `undefined` union to handle separately.
