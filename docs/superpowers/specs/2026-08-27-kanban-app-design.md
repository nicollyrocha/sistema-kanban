# Kanban App — Design

## Contexto

Projeto novo (pasta vazia) para um sistema de kanban pessoal, com landing page pública e sistema de conta completo. Deve ser construído do zero, priorizando serviços gerenciados em vez de código customizado sempre que possível (especialmente para autenticação/conta), seguindo o mesmo padrão já validado no projeto irmão `todo-list` (`C:\Users\Nic\Documents\todo-list`).

## Objetivo

Entregar um app de kanban pessoal (não colaborativo na v1), com:
- Landing page pública
- Autenticação completa (login, cadastro, recuperar senha)
- Conta de usuário completa (trocar senha, trocar email, subir foto de perfil)
- Quadros (boards) múltiplos por usuário, com colunas customizáveis e cards
- Design "Glassmorphism Escuro", moderno e responsivo

## Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | Next.js (App Router) | Alvo nativo da Vercel |
| Hospedagem | Vercel | Requisito do usuário |
| Banco de dados | Neon Postgres (via integração Vercel↔Neon) | Requisito do usuário |
| ORM | Drizzle ORM + `@neondatabase/serverless` | Leve e confiável em serverless; evita os problemas de pool de conexão do Prisma nesse cenário |
| Autenticação | Better Auth + `drizzleAdapter` | Mesmo padrão do `todo-list`; cobre email/senha, reset de senha, troca de email |
| Email transacional | Resend | Emails de recuperação de senha e confirmação de troca de email |
| Upload de foto | Vercel Blob | Mesmo padrão do `todo-list` |
| Drag-and-drop | dnd-kit | Suporte a toque (responsivo); `react-beautiful-dnd` está sem manutenção |
| UI | Tailwind CSS + shadcn/ui + framer-motion | Mesmo padrão do `todo-list`, restilizado para o tema escuro |
| Validação | zod | Mesmo padrão do `todo-list` |
| Testes | Vitest | Mesmo padrão do `todo-list` |

**Nota sobre "não tocar no código":** entendido como preferência por serviços gerenciados (Better Auth cuida de toda a lógica de senha/sessão/tokens de verificação; Vercel Blob cuida do storage; Resend cuida do envio de email) em vez de implementar essas partes na mão. O código da UI e da lógica do kanban em si é, por natureza, customizado — não há como evitar isso num app novo.

## Design visual — Glassmorphism Escuro

Direção escolhida entre 4 opções apresentadas visualmente (glassmorphism escuro, dark minimal/dev tool, neo-brutalista colorido, clean SaaS claro).

- **Fundo:** gradiente diagonal roxo/azul profundo (`#0f0c29 → #302b63 → #24243e`), fixo, com glows radiais desfocados (roxo e rosa) em posições sutis, para dar profundidade sem poluir.
- **Superfícies (cards, painéis, modais):** fundo translúcido (~6–10% branco), `backdrop-filter: blur`, borda 1px em branco ~15% de opacidade, cantos arredondados (`rounded-xl`/`2xl`), sombra suave.
- **Acento:** gradiente violeta → rosa (`#7c5cff → #ff6bd6`) para botões primários, estados ativos, focus rings e barra de progresso/loading.
- **Tipografia:** Inter (ou equivalente do sistema), pesos semibold para headings, corpo regular.
- **Movimento:** framer-motion para hover (leve elevação/scale), transições de modal (fade + scale), elevação de card durante o drag.
- **Responsivo:** mobile-first; grid/flex que colapsa para coluna única fora do board; board em si tem tratamento próprio (ver UX do Board abaixo).

## Rotas

Públicas:
- `/` — landing page
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password?token=...`

Protegidas (exigem sessão via Better Auth; redirecionam para `/login` se não autenticado):
- `/boards` — lista de quadros do usuário
- `/boards/[boardId]` — o quadro (colunas + cards)
- `/account` — configurações de conta

## Modelo de dados (Neon / Drizzle)

Tabelas geridas pelo Better Auth (idênticas ao `todo-list`, geradas via CLI do Better Auth):
- `user(id, name, email, email_verified, image, created_at, updated_at)`
- `session(id, expires_at, token, created_at, updated_at, ip_address, user_agent, user_id→user)`
- `account(id, account_id, provider_id, issuer, user_id→user, access_token, refresh_token, id_token, ..., password)`
- `verification(id, identifier, value, expires_at, created_at, updated_at)`

Tabelas próprias do kanban:
- `board(id uuid pk, user_id→user cascade, title text, created_at, updated_at)`
- `column(id uuid pk, board_id→board cascade, title text, position int, created_at)`
- `card(id uuid pk, column_id→column cascade, title text, description text nullable, due_date timestamp nullable, position int, created_at, updated_at)`
- `label(id uuid pk, board_id→board cascade, name text, color text)`
- `card_label(card_id→card cascade, label_id→label cascade)` — chave composta

`position` é um inteiro por coluna (para cards) e por board (para colunas), reindexado ao reordenar (estratégia simples: recalcular posições inteiras sequenciais no reorder, sem necessidade de posições fracionárias na v1).

## Fluxo de autenticação e conta

- **Cadastro/login:** formulário email+senha via Better Auth (`emailAndPassword.enabled`), seguindo o padrão do `todo-list`. Sem verificação obrigatória de email no cadastro (`requireEmailVerification: false`, como no projeto de referência).
- **Recuperar senha:** `/forgot-password` → Better Auth gera token → Resend envia email com link → `/reset-password?token=...` define nova senha.
- **Trocar senha (logado):** formulário em `/account` (senha atual + nova), via Better Auth.
- **Trocar email (logado):** formulário em `/account` → Better Auth dispara verificação (`emailVerification.sendVerificationEmail`) → Resend envia link de confirmação para o **novo** endereço → email só é efetivado após clique no link. Mesma ressalva do `todo-list`: esse hook é compartilhado com verificação de cadastro, então se no futuro `requireEmailVerification` for ativado, será preciso diferenciar os dois fluxos.
- **Upload de foto:** componente de avatar clicável em `/account`, upload direto para Vercel Blob, URL salva em `user.image`.

## UX do Board

- Colunas lado a lado (scroll horizontal quando não cabem), cada uma com seu título editável inline e lista de cards.
- Criar coluna (botão no fim da linha de colunas), renomear (clique no título), excluir (com confirmação), reordenar colunas via drag-and-drop (dnd-kit).
- Criar card (botão no fim da coluna), drag-and-drop de cards entre colunas e dentro da mesma coluna (dnd-kit, com suporte a toque).
- Clique no card abre painel de detalhe (modal no desktop, bottom sheet no mobile) com: título, descrição, data de vencimento, etiquetas (criar/associar/remover), excluir card.
- Etiquetas (`label`) são por board, com nome e cor; exibidas como chips coloridos no card.
- Mutações otimistas (UI atualiza imediatamente); em caso de erro do servidor, rollback + toast de erro.

## Landing page

- Hero: headline, subheadline, CTAs "Criar conta grátis" e "Entrar", mockup do board com efeito glass flutuando.
- Grid de features (quadros ilimitados, colunas customizáveis, etiquetas coloridas, drag-and-drop).
- Seção de preview/screenshot do board.
- Footer com links de login/signup.

## Erros

- Validação de formulário com zod, mensagens inline estilizadas no tema escuro.
- Erros de auth (senha incorreta, email já cadastrado, link de reset/verificação expirado) exibidos como alerts inline nos formulários correspondentes.
- Erros de mutação do board (falha ao salvar posição, criar/editar card, etc.) via rollback otimista + toast.

## Testes

- Vitest (mesma convenção do `todo-list`) cobrindo:
  - Validação de schemas (zod) de board/column/card/label
  - Lógica de reindexação de `position` no reorder de colunas e cards
  - Helpers de acesso a dados (Drizzle queries) mais sensíveis

## Fora de escopo (v1)

- Colaboração/compartilhamento de quadros entre usuários (confirmado: pessoal apenas)
- Verificação obrigatória de email no cadastro
- Posições fracionárias / reordenação otimizada para grandes volumes
- Testes end-to-end (apenas unitários por enquanto)
