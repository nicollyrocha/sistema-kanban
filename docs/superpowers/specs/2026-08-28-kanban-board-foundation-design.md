# Kanban Board Foundation (Boards, Columns, Cards) — Design

## Contexto

Terceiro plano de implementação do projeto `sistema-kanban`, construído sobre a fundação (auth completo) e a conta completa (senha, email, foto) já entregues. Ver [`2026-08-27-kanban-app-design.md`](2026-08-27-kanban-app-design.md) para o desenho geral do produto.

O board de kanban é grande demais para um plano só, então foi dividido em dois:
1. **Este plano (Fundação do board)**: schema do banco, listagem de quadros, quadro com colunas e cards — tudo com criação/edição/exclusão, mas sem arrastar-e-soltar.
2. **Plano futuro (Interações do board)**: arrastar-e-soltar (colunas e cards) e o painel de detalhe completo do card (descrição, prazo, etiquetas).

`/boards` já existe como placeholder protegido (do plano de fundação) e será substituído. `/boards/[boardId]` não existe ainda.

## Objetivo

- Listagem de quadros do usuário, com criar/renomear/excluir
- Um quadro com colunas (criar/renomear/excluir) e cards dentro delas (criar/renomear/excluir)
- Tudo isolado por usuário — nunca expor ou permitir editar quadro de outra pessoa

## Arquitetura

- **Leitura**: Server Components consultando o Drizzle diretamente em `page.tsx` — sem API route para isso, seguindo o padrão já usado em `src/app/account/page.tsx`.
- **Escrita**: Server Actions (`"use server"`) para todas as mutações — criar/renomear/excluir quadro, coluna e card. Chamadas diretamente dos componentes client (sem `fetch` manual), usando `revalidatePath` para atualizar a tela após cada ação. Mais idiomático no Next.js App Router do que criar uma rota de API por ação.
- **Autorização**: toda Server Action recebe o `boardId` (ou `columnId`/`cardId`, dos quais o `boardId` é derivado via join) e confirma que o quadro pertence ao usuário da sessão atual antes de tocar em qualquer linha — nunca confia apenas no ID vindo do cliente. Um helper único (`getOwnedBoard(boardId, userId)`) centraliza essa checagem para não duplicá-la em cada action.
- **Posição**: `column.position` e `card.position` são inteiros desde já (novo item = posição máxima atual + 1), mesmo sem drag-and-drop neste plano — evita uma migração de schema quando o próximo plano adicionar reordenação.

## Modelo de dados

Adiciona ao `src/db/schema.ts` (mantém as tabelas de auth existentes intactas):

- `board(id uuid pk, user_id text → user.id cascade, title text, created_at, updated_at)`
- `column(id uuid pk, board_id uuid → board.id cascade, title text, position integer, created_at)`
- `card(id uuid pk, column_id uuid → column.id cascade, title text, description text nullable, due_date timestamp nullable, position integer, created_at, updated_at)`
- `label(id uuid pk, board_id uuid → board.id cascade, name text, color text)`
- `card_label(card_id uuid → card.id cascade, label_id uuid → label.id cascade)` — chave composta

`label`/`card_label` entram no schema agora (junto com o resto, uma única migração) mas **sem nenhuma UI para criar ou associar etiquetas neste plano** — isso é do plano de interações. O componente de card já é construído capaz de exibir chips de etiqueta e prazo (decisão visual já validada — ver seção de UI), mas como nada popula esses campos ainda, na prática todo card aparece só com o título até o próximo plano.

Índices: `column.board_id`, `card.column_id` (lookups mais comuns), seguindo o mesmo cuidado já aplicado ao schema de auth (índices em FKs usadas para busca).

## Rotas

- `/boards` — lista vertical dos quadros do usuário (raiz-lista escolhida entre duas opções visuais). Cada item é um link para `/boards/[boardId]`. "+ Novo" cria um quadro inline (sem modal).
- `/boards/[boardId]` — colunas lado a lado (scroll horizontal se não couberem), cards dentro. "+ Adicionar coluna" no fim da linha de colunas; "+ Adicionar card" no fim de cada coluna.

Ambas fazem um check de sessão real via `auth.api.getSession` (mesmo padrão de `/account` — não confiam só no cookie-check do `src/proxy.ts`). `/boards/[boardId]` adicionalmente verifica que o quadro pertence ao usuário logado; se não existir ou não for dele, `notFound()` (404) — nunca revela se o ID pertence a outra pessoa.

## Interação

Tudo inline, sem modal — decisão explícita para não gerar trabalho jogado fora quando o próximo plano trouxer o painel de detalhe completo do card:

- **Criar** quadro/coluna/card: clique em "+ Novo"/"+ Adicionar coluna"/"+ Adicionar card" abre um campo de texto ali mesmo; Enter salva, Esc cancela, perder o foco sem digitar nada cancela.
- **Renomear** quadro/coluna/card existente: clique no título vira um campo editável no lugar; mesmo Enter/Esc/blur.
- **Excluir quadro ou coluna**: pede confirmação (diálogo simples "Tem certeza?"), já que apaga tudo dentro em cascata (colunas e cards de um quadro; cards de uma coluna).
- **Excluir card**: direto, sem confirmação — menor risco, ação isolada.

## Design visual

Reaproveita integralmente o sistema já estabelecido (tokens do `globals.css`, `Button`/`Input`/`Label`/`Card` de `src/components/ui/`, tema Glassmorphism Escuro) — nenhum token ou primitivo novo.

- **Lista de quadros**: itens em lista vertical, cada um um painel glass fino (título + seta), escolhido sobre uma alternativa em grade por ser mais compacto e escalar melhor com poucos ou muitos quadros.
- **Card do quadro**: escolhido o visual "com preview" sobre o "minimalista" — quando existirem etiquetas/prazo (plano futuro), aparecem como chip colorido e "📅 data" diretamente no card, sem precisar abrir nada.

## Erros

- Falha ao salvar (rede, erro do servidor) em qualquer ação inline: reverte a UI otimista e mostra um erro curto perto do campo, mesmo padrão de mensagem inline já usado em auth/conta (não há `role="alert"` genérico aqui porque cada mutação já é local a um campo específico, não um formulário com um único bloco de erro).
- Quadro/coluna/card inexistente ou de outro usuário: `notFound()` (páginas) ou retorno de erro genérico da Server Action (ações) — nunca uma mensagem que revele se o recurso existe.

## Testes

- Vitest: lógica de cálculo de posição (nova posição = máxima atual + 1) como função pura testável, extraída para `src/lib/position.ts`.
- Sem testes de integração das Server Actions neste plano (exigiria mockar sessão + banco; mesma decisão de escopo já tomada para a rota de upload de avatar — YAGNI).

## Fora de escopo (fica para o plano de interações)

- Arrastar-e-soltar de colunas e cards
- Painel de detalhe do card (descrição, prazo, etiquetas — criar/editar/associar)
- Criar ou gerenciar etiquetas
- Reordenação de qualquer tipo
