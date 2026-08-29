# Design: Landing page

## Contexto

`src/app/page.tsx` hoje é um placeholder (`docs/superpowers/plans/*` anteriores
adiaram isso deliberadamente): título "Kanban", um parágrafo dizendo que a
landing completa "chega em breve", e dois botões (Entrar/Criar conta). Este
plano substitui esse placeholder pela landing page real — a última peça do
pedido original do usuário.

## Objetivo e escopo

Landing simples e direta ("porta de entrada"), não uma vitrine de SaaS — o
produto é uma ferramenta pessoal de kanban (não colaborativa, sem
planos/preços/times), então a página não precisa vender nada, só apresentar o
produto rapidamente e levar pro login/cadastro. Sem novas dependências, sem
novos componentes reutilizáveis — é uma página só, estática (Server
Component, sem estado/JS no cliente), reaproveitando os tokens de design já
existentes em `globals.css` (`--gradient-accent-start/end`, `.glass`,
`--border`, `--muted-foreground`, etc.).

**Fora de escopo:** screenshots reais do produto (a prévia do quadro é um
mockup decorativo estático, não dados reais), seção de "recursos" extensa
tipo SaaS, qualquer formulário/captura de lead, dark/light mode toggle (app é
dark-only).

## Estrutura da página

Cinco blocos empilhados, de cima pra baixo:

1. **Nav** — logo "Kanban" à esquerda; botões "Entrar" (estilo ghost/outline)
   e "Criar conta" (gradiente, mesmo estilo do CTA primário usado em outras
   páginas do app) à direita.
2. **Hero** — headline + subtexto + CTAs, tudo centralizado (layout
   escolhido entre 3 opções visuais durante o brainstorm — "Opção B":
   empilhado, sem divisão em colunas).
3. **Prévia do quadro** — mini-mockup estático do board (3 colunas com
   2-3 cards cada, alguns com uma etiqueta colorida), largura total,
   logo abaixo do hero. Puramente decorativo — sem dados reais, sem
   interatividade.
4. **Destaques** — grade 2×2 de cards (ícone-emoji + título + descrição
   curta), layout escolhido entre 3 opções durante o brainstorm ("Opção D").
5. **Rodapé** — uma linha discreta: nome do projeto + link de volta pro
   login.

## Conteúdo (copy, pt-BR)

- **Headline:** "Organize seus projetos, do seu jeito."
- **Subtexto:** "Quadros, colunas e cards com etiquetas, prazos e
  arraste-e-solte. Simples, rápido, seu."
- **CTA primário:** "Criar conta grátis" → `/signup`.
- **CTA secundário:** "Entrar" → `/login`.
- **Destaques** (título + descrição, cada um com um emoji como ícone):
  - 📋 Quadros e colunas — "Crie quantos quadros quiser, com colunas do seu
    jeito."
  - ↔️ Arraste e solte — "Mova cards entre colunas com o mouse, toque ou
    teclado."
  - 🏷️ Etiquetas coloridas — "Organize por categoria com etiquetas que você
    cria na hora."
  - 📅 Prazos e descrições — "Cada card guarda os detalhes que importam pra
    você."
- **Rodapé:** "Kanban — feito pra organizar sua rotina." + link "Entrar".

Ícones são emojis (não SVG) — decisão explícita durante o brainstorm: mais
rápido, sem dependência nova, e consistente com o resto do app (que já usa
emoji em vários lugares, ex. 📅 no card, × pra fechar/excluir).

## Implementação

Um único arquivo, `src/app/page.tsx` — substitui o conteúdo inteiro do
placeholder atual. Sem novos componentes em `src/components/` (nada aqui se
repete em outra página do app, então não há motivo pra extrair). Marcação +
classes Tailwind usando os design tokens já existentes em `globals.css` —
nenhum token novo, nenhuma cor hardcoded fora do que já existe.

**Responsivo:**
- A grade de destaques (2×2 no desktop) vira 1 coluna no mobile.
- A prévia do quadro (3 colunas fixas) fica numa área com `overflow-x: auto`
  no mobile, mesmo padrão já usado no board de verdade
  (`src/app/boards/[boardId]/page.tsx`).
- Nav/hero/rodapé usam padding/flex responsivos consistentes com o resto do
  app (não há um breakpoint novo a inventar — segue o que já existe nas
  páginas de auth).

## Testes

Sem lógica nova (nenhuma função pura, nenhum Server Action, nenhum estado) —
não há nada pra testar com Vitest. Verificação é 100% visual, no navegador,
em desktop e mobile (mesmo padrão de verificação ao vivo usado nos planos
anteriores, mas sem precisar do banco de dados real, já que a página não lê
nem escreve nada — só precisa do servidor de dev rodando).

## Self-review

- **Placeholder scan:** nenhum TBD.
- **Consistência interna:** a estrutura de 5 blocos, o copy de cada bloco, e
  as decisões de layout (Opção B pro hero, Opção D pros destaques, emojis
  como ícone) foram todas validadas explicitamente com o usuário durante o
  brainstorm — nada aqui é uma suposição não confirmada.
- **Escopo:** focado — uma página, um arquivo, sem novas dependências. Um
  plano de implementação único é suficiente.
- **Ambiguidade:** nenhuma — cada bloco tem copy exata definida, não "algo
  tipo X".
