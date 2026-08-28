# Conta Completa — Design

## Contexto

Segundo plano de implementação do projeto `sistema-kanban`, construído sobre a fundação já entregue (auth completo, design Glassmorphism Escuro, banco Neon/Drizzle, Better Auth). Ver [`2026-08-27-kanban-app-design.md`](2026-08-27-kanban-app-design.md) para o desenho geral do produto e [`2026-08-27-foundation-auth.md`](../plans/2026-08-27-foundation-auth.md) para o que já foi implementado (incluindo o hook de verificação de troca de email em `src/lib/auth.ts`, já pronto para uso).

## Objetivo

Entregar a página `/account` (já protegida pelo `src/proxy.ts` desde a fundação, mesmo sem existir ainda) com:
- Upload de foto de perfil
- Editar nome
- Trocar email (com verificação por link enviado ao novo endereço)
- Trocar senha (exigindo a senha atual)

## Layout

Uma única página com um card no mesmo estilo glass das páginas de auth, dividida em duas seções dentro do mesmo card (confirmado visualmente entre duas opções — "um card só" venceu sobre "cards separados por assunto"):

1. **Perfil**: avatar clicável (foto) no topo, campo Nome, campo Email, botão "Salvar".
2. Divisor.
3. **Senha**: campo Senha atual, campo Nova senha, botão "Salvar".

Cada seção é um formulário independente com seu próprio botão — não existe um "salvar tudo" único, porque nome/email e senha usam chamadas diferentes ao Better Auth com semânticas diferentes (nome atualiza na hora; email dispara verificação; senha exige a atual).

## Upload de foto

- Avatar clicável abre o seletor de arquivo do sistema (`<input type="file" accept="image/*" className="hidden">` disparado por clique na imagem/botão).
- Upload direto do navegador para o Vercel Blob via `@vercel/blob/client`'s `upload()` — o arquivo não passa pelo servidor Next.js, só o token assinado.
- Nova rota `src/app/api/account/avatar/route.ts`: gera o token de upload assinado (`handleUpload` do `@vercel/blob/client`, server-side), validando que o usuário está autenticado (via `auth.api.getSession`) antes de assinar — o `proxy.ts` já bloqueia acesso não autenticado à página, mas a rota de API precisa da própria verificação (não depende do proxy, que é só um check de cookie).
- Restrições: `image/*`, até 4MB.
- Após o upload, a URL retornada é salva via `authClient.updateUser({ image: url })`, e a UI atualiza o avatar exibido imediatamente (estado local otimista).
- Sem recorte/crop — a imagem é redimensionada só via CSS (`object-fit: cover` num container circular).

## Trocar nome e email

- Um formulário com dois campos, ambos pré-preenchidos com os valores atuais da sessão.
- Validação client-side com zod (mesmo padrão das telas de auth): nome não vazio, email válido.
- Ao salvar:
  - Se o nome mudou, chama `authClient.updateUser({ name })`.
  - Se o email mudou, chama `authClient.changeEmail({ newEmail, callbackURL: "/account" })` — isso já dispara `sendChangeEmailVerification` (Resend), configurado desde a Task 6. O email **não muda na hora**; só muda quando o link no novo endereço é clicado.
  - Se nenhum dos dois mudou, o botão não faz nada (ou fica desabilitado).
- Mensagem inline após salvar: se o email mudou, avisa que um link de confirmação foi enviado ao novo endereço; o campo email continua mostrando o valor antigo até a troca ser confirmada (a sessão só reflete o novo email depois do clique no link).

## Trocar senha

- Dois campos: Senha atual, Nova senha (mínimo 8 caracteres, mesma regra do cadastro).
- `authClient.changePassword({ currentPassword, newPassword })`.
- Erro inline se a senha atual estiver incorreta (mensagem do Better Auth).
- Sucesso: limpa os campos, mensagem inline de confirmação. Não desloga nem redireciona — o usuário continua na página de conta.

## Reuso de padrões já estabelecidos

Tudo abaixo já existe na fundação e deve ser reaproveitado, não recriado:
- `Button`, `Input`, `Label`, `Card` de `src/components/ui/*`
- `cn()` de `src/lib/utils.ts`
- Padrão de formulário: `noValidate` no `<form>`, `autoComplete` nos inputs, validação zod via `safeParse` antes de qualquer chamada ao `authClient`, erro exibido com `role="alert"`, botão desabilitado durante `loading`.
- `authClient` de `src/lib/auth-client.ts` (já expõe `updateUser`, `changeEmail`, `changePassword` como métodos padrão do Better Auth — nenhuma mudança necessária em `src/lib/auth.ts` ou `src/lib/auth-client.ts`).
- Header/botão de sair: a página `/account` ganha um link de volta para `/boards`, seguindo o mesmo padrão de cross-link das páginas de auth.

## Erros

- Erros de validação zod: inline, `role="alert"`, mesma linguagem das telas de auth.
- Erros do Better Auth (ex: senha atual incorreta, email já em uso por outra conta): `error.message` exibido inline, mesmo padrão das telas de auth.
- Erro de upload (arquivo grande demais, tipo inválido, falha de rede no Blob): mensagem inline abaixo do avatar, não bloqueia o resto do formulário.

## Testes

- Vitest: schemas zod de nome/email (reaproveitando o padrão de `src/lib/validation.ts` — novo schema `updateProfileSchema` e `changePasswordSchema` adicionados ao mesmo arquivo).
- Sem testes de upload de arquivo real (exigiria mockar o Vercel Blob; fora de escopo para este plano, YAGNI).

## Fora de escopo

- Recorte/crop de imagem
- Exclusão de conta
- Autenticação de dois fatores
- Histórico de sessões ativas / revogar sessões individualmente
