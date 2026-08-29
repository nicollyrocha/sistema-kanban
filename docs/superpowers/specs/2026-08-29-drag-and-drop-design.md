# Design: Drag-and-drop de cards

## Contexto

O board hoje (`docs/superpowers/plans/2026-08-28-kanban-board-foundation.md` +
`2026-08-28-card-detail-labels.md`) tem boards → colunas → cards, tudo
create/rename/delete inline via Server Actions, sem reordenação por arraste.
`card.position` e `boardColumn.position` são `integer`, atribuídos hoje só por
`nextPosition()` (`max(existentes) + 1`, append-only — ver `src/lib/position.ts`).

Este plano adiciona: arrastar um card para reordenar dentro da mesma coluna,
ou para movê-lo para outra coluna.

## Escopo

**Dentro do escopo:**
- Arrastar cards para reordenar dentro de uma coluna.
- Arrastar cards entre colunas do mesmo board.
- Suporte a mouse, touch (mobile) e teclado (setas + espaço).

**Fora do escopo (explicitamente):**
- Reordenar as próprias colunas (colunas continuam em ordem fixa de criação,
  como hoje — só renomeáveis/excluíveis).
- Mover cards entre boards diferentes.
- Qualquer indicador de colaboração em tempo real (múltiplos usuários vendo o
  mesmo board) — o app não é colaborativo em v1.

## Biblioteca

`@dnd-kit/core` + `@dnd-kit/sortable` — biblioteca React dedicada a
drag-and-drop, com `PointerSensor` (mouse + touch) e `KeyboardSensor`
(acessibilidade por teclado) prontos, e o padrão mais comum hoje para board
kanban em React. Nova dependência (`package.json`), sem duplicar nada que já
exista no projeto.

## Arquitetura

Hoje `page.tsx` (server component) busca os dados e renderiza `Column`
(client) por coluna, cada um recebendo só os cards daquela coluna — não há
estado compartilhado entre colunas. Arrastar um card *entre* colunas exige
que algo veja o board inteiro de uma vez, então:

- Novo componente client `src/components/boards/BoardView.tsx`: recebe
  `columns` + `cardsByColumn` como props iniciais (exatamente o que
  `page.tsx` já monta hoje), guarda isso em `useState` local, e envolve tudo
  em um `DndContext` do dnd-kit (`PointerSensor` com `activationConstraint`
  de ~8px de distância, para distinguir clique-de-abrir-painel de
  início-de-arraste, + `KeyboardSensor`).
- `page.tsx` não muda a query — só passa os dados pro `BoardView` em vez de
  mapear `Column` diretamente.
- `Column.tsx` vira um `SortableContext` (um por coluna) e ganha
  `useDroppable` para aceitar cards de outras colunas.
- `CardItem.tsx` usa `useSortable` para virar arrastável; nenhuma mudança na
  interação de clique existente (abrir painel) ou no botão de exclusão
  rápida (`stopPropagation` já isola isso).
- Card inteiro é arrastável (sem alça dedicada) — o `activationConstraint`
  do `PointerSensor` já resolve a ambiguidade clique-vs-arraste.

## Fluxo de dados e persistência

Nova Server Action `moveCard(boardId, cardId, targetColumnId, newIndex)` em
`src/app/boards/actions.ts`, seguindo o padrão de ownership já usado em toda
a feature: `getOwnedCard(cardId, userId)` (confirma que o card pertence ao
usuário) e `getOwnedColumn(targetColumnId, userId)` (confirma que a coluna
destino também pertence ao mesmo board/usuário — bloqueia mover um card para
uma coluna de outro board).

**Algoritmo de reordenação:** ao soltar o card na posição `newIndex` da
coluna destino, buscar a lista atual de cards *dessa coluna* (excluindo o
card movido, se ele já estava nela), inserir o card movido no índice `newIndex`,
e renumerar **só essa lista resultante** como `0, 1, 2, ...`, persistindo via
`db.batch` (um `update` por card cuja `position`, e/ou `columnId` no caso do
card movido, mudou). A coluna de origem, num movimento entre colunas, **não**
precisa ser tocada: remover um card de uma lista não desordena os que
ficaram, só deixa um "buraco" nos números — inofensivo, já que `nextPosition()`
(usado ao criar um card novo) usa `max(existentes) + 1`, não exige
contiguidade.

Isso espelha o padrão já estabelecido em `createLabel` (`db.batch` +
ids gerados no client) — necessário porque o driver `neon-http` não suporta
`db.transaction()` (é stateless/HTTP puro).

**UI otimista:** ao soltar, `BoardView` atualiza o estado local
imediatamente (o card já aparece na nova posição/coluna) e dispara
`moveCard` em paralelo. Em caso de erro (retorno `{ error }` ou exceção), o
estado local volta pro snapshot de antes do arraste, e uma mensagem breve
(`role="alert"`, mesmo padrão usado nos formulários do painel de card)
aparece perto do título do board, sumindo sozinha após alguns segundos. Em
caso de sucesso, `moveCard` chama `revalidatePath` (como as outras 15
actions já fazem) — isso mantém uma navegação futura sincronizada com o
banco, sem sobrescrever o estado otimista já aplicado no client durante a
sessão atual.

**Teclado:** o `KeyboardSensor` do dnd-kit cuida de levantar (Espaço), mover
(setas) e soltar (Espaço) um card via teclado, disparando o mesmo handler de
drop e portanto a mesma `moveCard` — nenhuma lógica duplicada entre os dois
modos de interação.

## Visual

Durante o arraste, o `DragOverlay` do dnd-kit mostra uma cópia flutuante do
card seguindo o cursor/dedo (leve aumento de `shadow`/`opacity` pra
destacar, dentro do design system "glass" já existente — nenhum elemento
visual novo é introduzido). O espaço original do card, enquanto arrastado,
fica com um placeholder tracejado indicando onde ele estava; o ponto de
destino é indicado pelo próprio reflow da lista (os outros cards abrem
espaço), padrão nativo do `@dnd-kit/sortable`.

## Testes

A função pura de recálculo de posições (`src/lib/reorder.ts`, algo como
`reorderColumn(cardIds: string[], movedCardId: string, newIndex: number): string[]`
retornando a nova ordem, de onde a Server Action deriva as posições 0..n-1)
ganha testes unitários no estilo de `src/lib/position.test.ts` — casos:
mover pra frente, mover pra trás, mover pro início/fim, mover para uma lista
vazia (chegando de outra coluna), lista com um único card.

A Server Action `moveCard` e a interação de arraste ponta a ponta são
verificadas manualmente contra o banco real (Neon), seguindo o mesmo padrão
de verificação ao vivo usado nos planos anteriores (não há testes de
componente/UI automatizados neste projeto hoje) — incluindo: arraste entre
colunas, reordenação dentro da mesma coluna, arraste por teclado, e
isolamento entre usuários (mover um card para uma coluna de outro usuário
via chamada direta da action deve falhar).

## Self-review

- **Placeholder scan:** nenhum TBD.
- **Consistência interna:** o algoritmo de renumeração só toca a coluna
  destino, consistente com a decisão de não tocar a coluna de origem; a
  Server Action segue exatamente o padrão de ownership das 15 actions
  existentes.
- **Escopo:** focado — só cards, não colunas; um plano de implementação
  único é suficiente.
- **Ambiguidade:** "card inteiro arrastável" está definido via
  `activationConstraint` de distância (não uma alça dedicada), decisão já
  tomada explicitamente com o usuário.
