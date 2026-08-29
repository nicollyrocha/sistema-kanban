# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder home page with the real public landing
page: nav, hero, a decorative board preview, a features grid, and a footer.

**Architecture:** A single Server Component, `src/app/page.tsx` — no new
components, no new dependencies, no client-side state. Reuses the existing
`Button`-styled link classes and the `Card` primitive (`src/components/ui/`),
and the same visual language as the real board (`Column`/`CardItem`'s glass
card classes) for the decorative preview, so it looks like an actual glimpse
of the product rather than a separate illustration style.

**Tech Stack:** Next.js App Router (Server Component), Tailwind CSS v4 using
the existing design tokens in `src/app/globals.css` — no new tokens, no new
libraries.

**Design doc:** `docs/superpowers/specs/2026-08-29-landing-page-design.md`

---

### Task 1: Replace the placeholder home page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write the new page**

Replace the entire contents of `src/app/page.tsx` with:

```tsx
import Link from "next/link";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    emoji: "📋",
    title: "Quadros e colunas",
    description: "Crie quantos quadros quiser, com colunas do seu jeito.",
  },
  {
    emoji: "↔️",
    title: "Arraste e solte",
    description: "Mova cards entre colunas com o mouse, toque ou teclado.",
  },
  {
    emoji: "🏷️",
    title: "Etiquetas coloridas",
    description: "Organize por categoria com etiquetas que você cria na hora.",
  },
  {
    emoji: "📅",
    title: "Prazos e descrições",
    description: "Cada card guarda os detalhes que importam pra você.",
  },
];

const PREVIEW_COLUMNS = [
  {
    title: "A Fazer",
    cards: [
      { title: "Planejar a semana", color: "#7c5cff" },
      { title: "Revisar orçamento", color: null },
    ],
  },
  {
    title: "Fazendo",
    cards: [{ title: "Escrever o relatório", color: "#ff6bd6" }],
  },
  {
    title: "Feito",
    cards: [
      { title: "Configurar o quadro", color: null },
      { title: "Convidar ninguém, é só seu 🙂", color: "#39ff88" },
    ],
  },
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between px-4 py-4 sm:px-8">
        <span className="text-lg font-semibold">Kanban</span>
        <div className="flex gap-2">
          <Link
            href="/login"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-gradient-to-r from-[var(--gradient-accent-start)] to-[var(--gradient-accent-end)] px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Criar conta
          </Link>
        </div>
      </nav>

      <section className="flex flex-col items-center gap-6 px-4 pt-8 pb-4 text-center sm:pt-16">
        <h1 className="max-w-xl text-4xl font-semibold text-balance sm:text-5xl">
          Organize seus projetos, do seu jeito.
        </h1>
        <p className="max-w-md text-muted-foreground">
          Quadros, colunas e cards com etiquetas, prazos e arraste-e-solte.
          Simples, rápido, seu.
        </p>
        <div className="flex gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-gradient-to-r from-[var(--gradient-accent-start)] to-[var(--gradient-accent-end)] px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Criar conta grátis
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium"
          >
            Entrar
          </Link>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-8">
        <div className="mx-auto flex max-w-4xl gap-4 overflow-x-auto pb-2">
          {PREVIEW_COLUMNS.map((column) => (
            <div
              key={column.title}
              className="flex w-64 shrink-0 flex-col gap-3 rounded-xl border border-border bg-white/5 p-3"
            >
              <span className="text-sm font-semibold">{column.title}</span>
              <div className="flex flex-col gap-2">
                {column.cards.map((card) => (
                  <div
                    key={card.title}
                    className="glass flex flex-col gap-1 rounded-lg border border-border bg-card p-2 text-sm"
                  >
                    <span>{card.title}</span>
                    {card.color && (
                      <span
                        className="h-1.5 w-8 rounded-full"
                        style={{ backgroundColor: card.color }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-12 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-semibold">
            Tudo que você precisa pra organizar
          </h2>
          <p className="mt-2 text-muted-foreground">
            Sem complicação, sem curva de aprendizado
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                className="flex flex-col items-start gap-2 p-5 text-left"
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--gradient-accent-start)] to-[var(--gradient-accent-end)] text-lg"
                >
                  {feature.emoji}
                </span>
                <span className="font-semibold">{feature.title}</span>
                <span className="text-sm text-muted-foreground">
                  {feature.description}
                </span>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="mt-auto flex items-center justify-center gap-2 border-t border-border px-4 py-6 text-sm text-muted-foreground">
        <span>Kanban — feito pra organizar sua rotina.</span>
        <Link
          href="/login"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Entrar
        </Link>
      </footer>
    </main>
  );
}
```

Notes on this code, for whoever implements it:
- `Card` (`src/components/ui/card.tsx`) already renders
  `"glass rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/20"`
  merged with the `className` you pass — the `p-5` override above replaces
  its default `p-6`, which is intentional (tighter padding fits a 2×2 grid
  of small feature tiles better than the card's default padding, which is
  sized for the wider auth-page cards it's normally used in).
- The nav's and hero's "Entrar"/"Criar conta" links deliberately hand-roll
  Tailwind classes instead of using the `Button` component
  (`src/components/ui/button.tsx`) — `Button` renders a `<button>`, not an
  `<a>`/`Link`, and the previous placeholder page already used this same
  hand-rolled-class approach for its two links, so this keeps that
  precedent rather than introducing a second pattern for button-styled
  links in the same codebase.
- Label preview colors (`#7c5cff`, `#ff6bd6`, `#39ff88`) are three of the
  six real hex values from `src/lib/label-colors.ts` (`LABEL_COLORS`), not
  arbitrary colors — this keeps the decorative preview visually accurate to
  what labels actually look like in the real board.

- [ ] **Step 2: Verify**

Run:

```bash
npm run build
```

Expected: exit code 0, `/` still in the route table (as a static route,
same as before — this page has no data fetching).

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add the real landing page"
```

---

### Task 2: Verify visually in the browser

No further code changes — a live, controller-run visual check. This page
reads and writes nothing, so no database is involved; only the dev server
needs to be running.

- [ ] **Step 1: Start the dev server and open `/`**

- [ ] **Step 2: Verify the desktop layout**

At a desktop viewport width, confirm: the nav shows "Kanban" on the left and
both buttons on the right; the hero headline/subtext/CTAs are centered; the
board preview shows 3 columns (A Fazer, Fazendo, Feito) with cards, and 3 of
those cards show a colored label chip in the correct color (violet, pink,
green — matching `LABEL_COLORS`); the features section shows a 2×2 grid of
4 cards, each with an emoji icon, title, and description; the footer shows
the tagline and an "Entrar" link, pinned to the bottom of the page even on
a short viewport (`mt-auto` on a `flex min-h-screen flex-col` parent).

- [ ] **Step 3: Verify the mobile layout**

Resize to a mobile viewport width (e.g. 375px). Confirm: the features grid
collapses to a single column; the board preview's 3 columns no longer fit
side by side and the row scrolls horizontally instead of wrapping or
overflowing the page; nav/hero text and buttons remain readable and don't
overlap or clip.

- [ ] **Step 4: Verify all four links**

Click each of "Entrar" (nav), "Criar conta" (nav), "Criar conta grátis"
(hero), "Entrar" (hero), and "Entrar" (footer) — expected: the two "Entrar"
links go to `/login`, the two "Criar conta" links go to `/signup`, and none
of them 404.

- [ ] **Step 5: Verify against the previous placeholder's routes**

Confirm `/login` and `/signup` still render correctly and are unaffected —
this plan only touches `src/app/page.tsx`, but it's worth a quick sanity
check that nothing about routing broke.

---

## Self-Review Notes

- **Spec coverage:** every section of
  `docs/superpowers/specs/2026-08-29-landing-page-design.md` maps to this
  plan — the 5-block structure (nav, hero, prévia do quadro, destaques,
  rodapé) → Task 1 Step 1's JSX, exact copy → the same JSX's literal
  strings, emoji icons (not SVG) → `FEATURES`' `emoji` field, responsive
  behavior (features grid 1-col on mobile, preview scrolls horizontally) →
  the `sm:grid-cols-2` / `overflow-x-auto` classes and re-verified live in
  Task 2 Step 3, no new components/dependencies → confirmed only
  `src/app/page.tsx` is touched (`Card` and `Link` are both pre-existing).
- **Placeholder scan:** no TBDs — every string in the JSX is the final copy
  from the spec, not a stand-in.
- **Type consistency:** N/A — this plan introduces no shared types, Server
  Actions, or cross-file function signatures; it's a single self-contained
  page component.
