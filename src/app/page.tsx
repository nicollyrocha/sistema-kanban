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
        <div
          aria-hidden="true"
          className="mx-auto flex max-w-4xl gap-4 overflow-x-auto pb-2"
        >
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
                <h3 className="font-semibold">{feature.title}</h3>
                <span className="text-sm text-muted-foreground">
                  {feature.description}
                </span>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="mt-auto flex flex-col items-center justify-center gap-1 border-t border-border px-4 py-6 text-center text-sm text-muted-foreground sm:flex-row sm:gap-2">
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
