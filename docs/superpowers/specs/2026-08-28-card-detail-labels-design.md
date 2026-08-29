# Card Detail Panel & Labels — Design

## Contexto

Quarto plano de implementação do `sistema-kanban`, construído sobre a fundação do board já entregue (`docs/superpowers/plans/2026-08-28-kanban-board-foundation.md`). Ver [`2026-08-27-kanban-app-design.md`](2026-08-27-kanban-app-design.md) para o desenho geral do produto.

Este é o primeiro dos dois planos restantes do board (o outro é arrastar-e-soltar, separado por serem tecnicamente independentes — um é UI+CRUD, o outro exige mudar o esquema de posição). Nenhuma migração de schema é necessária aqui: `card.description`, `card.dueDate`, `label` e `card_label` já existem desde o plano de fundação do board, apenas sem UI até agora.

## Objetivo

- Painel de detalhe do card: descrição, prazo, etiquetas, excluir (com confirmação)
- Etiquetas por quadro: criar (direto no card), aplicar/remover de um card, excluir a etiqueta inteira (com confirmação, já que afeta todos os cards que a usam)

## Mudança de interação no card fechado

Hoje, clicar no título do card o edita inline (`InlineEditableText`). Isso muda: **clicar em qualquer parte do card (fora do "×" de excluir) abre o painel de detalhe** — a edição de título passa a acontecer dentro do painel, junto com descrição/prazo/etiquetas, seguindo o que o spec geral do produto já previa ("Clique no card abre painel de detalhe... com: título, descrição..."). O "×" de exclusão rápida no card fechado continua existindo e continua sem confirmação (comportamento já validado no plano anterior); o painel ganha seu próprio botão de excluir, este **com confirmação**, já que abrir o painel é uma ação mais deliberada.

## Painel de detalhe

Um único componente `CardDetailPanel`, responsivo via classes Tailwind (sem biblioteca de modal): fixo na base da tela no mobile (bottom sheet), centralizado com fundo escurecido no desktop (modal) — decisão visual já confirmada entre duas opções. Mostra **tudo de uma vez** (não em seções colapsáveis — decisão visual confirmada): título, etiquetas, prazo, descrição, botão excluir.

Cada `CardItem` guarda seu próprio estado local "painel aberto?" (mesmo padrão já usado pelo `InlineCreateForm`) — sem rota nova, sem estado global/contexto compartilhado. Clicar fora do painel ou num botão "fechar" o fecha.

- **Título**: `InlineEditableText` (mesmo componente já existente), dentro do painel.
- **Descrição**: textarea com "salvar ao perder o foco" — Enter insere quebra de linha (não salva, diferente dos campos de título/nome que usam Enter-para-salvar). Esc reverte ao valor salvo.
- **Prazo**: `<input type="date">` nativo, salva ao escolher uma data. Um botão "Remover prazo" aparece quando há uma data definida, limpando o campo.
- **Etiquetas**: mostra os chips já aplicados ao card (cada um com um × pequeno pra remover *deste* card); abaixo, lista as etiquetas do quadro ainda não aplicadas (clique aplica); abaixo, um formulário "+ nova etiqueta" (nome + paleta fixa de ~6 cores pré-definidas, sem seletor de cor livre) que cria a etiqueta **e já aplica ao card atual** numa ação só — decisão visual confirmada ("cria direto no card"). Cada etiqueta na lista de "já existem no quadro" também tem um × que **exclui a etiqueta do quadro inteiro** (não só deste card) — pede confirmação, já que remove de todos os cards que a usam.
- **Excluir card**: botão no painel, com confirmação (`window.confirm`, mesmo padrão já usado para excluir quadro/coluna).

## Server Actions novas

Todas em `src/app/boards/actions.ts` (mesmo arquivo do plano anterior), seguindo exatamente o padrão já estabelecido: `requireUserId()` → validar entrada → verificar posse do recurso via helper de `board-auth.ts` → mutar → `revalidatePath`.

- `updateCardDescription(boardId, cardId, description)` — usa `getOwnedCard`.
- `updateCardDueDate(boardId, cardId, dueDate: string | null)` — usa `getOwnedCard`.
- `createLabel(boardId, cardId, name, color)` — usa `getOwnedCard` (precisa confirmar que o card pertence ao quadro/usuário); cria a etiqueta em `label` e já insere a associação em `card_label` na mesma ação.
- `assignLabel(boardId, cardId, labelId)` — usa `getOwnedCard`; insere em `card_label` (ignora se já existe, sem erro).
- `unassignLabel(boardId, cardId, labelId)` — usa `getOwnedCard`; remove a linha de `card_label`.
- `deleteLabel(boardId, labelId)` — usa um novo helper `getOwnedLabel(boardId, labelId, userId)` em `board-auth.ts`; apaga a etiqueta (cascade já remove as associações em `card_label`).

Reaproveita sem modificação: `renameCard` (título dentro do painel) e `deleteCard` (botão de excluir do painel, com confirmação adicionada só no lado do componente, não na action).

## Paleta de cores das etiquetas

Um conjunto fixo pré-definido (não um seletor de cor livre), consistente com a paleta de acento já usada no app: rosa (`#ff6bd6`), roxo (`#7c5cff`), verde (`#39ff88`), amarelo (`#ffd803`), azul (`#5c9dff`), laranja (`#ff9d5c`).

## Erros

Mesmo padrão inline já estabelecido: erro perto do campo/ação que falhou, sem bloquear o resto do painel. Erro ao criar/aplicar/excluir etiqueta ou ao salvar descrição/prazo segue o mesmo formato `{ error?: string }` + `role="alert"` já usado em todas as Server Actions e componentes existentes.

## Testes

Nenhum teste novo de lógica pura é necessário — este plano é inteiramente UI + Server Actions que seguem o padrão já coberto (indiretamente) pelos testes de `titleSchema`/`nextPosition` do plano anterior. Sem testes de integração das novas Server Actions (mesma decisão de escopo já tomada nos planos anteriores — verificação manual/ao vivo no lugar).

## Fora de escopo

- Arrastar-e-soltar (plano separado)
- Editar o nome ou a cor de uma etiqueta já criada (só criar e excluir; renomear/recolorir fica pra depois se for pedido)
- Filtrar cards por etiqueta
- Seletor de cor livre (só a paleta fixa)
