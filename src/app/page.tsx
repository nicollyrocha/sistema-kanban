export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-semibold">Kanban</h1>
      <p className="max-w-md text-muted-foreground">
        Organize seus projetos em quadros, colunas e cards. Landing page
        completa chega em breve.
      </p>
      <div className="flex gap-3">
        <a
          href="/login"
          className="rounded-lg bg-gradient-to-r from-[var(--gradient-accent-start)] to-[var(--gradient-accent-end)] px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Entrar
        </a>
        <a
          href="/signup"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
        >
          Criar conta
        </a>
      </div>
    </main>
  );
}
