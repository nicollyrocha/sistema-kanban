# Account Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/account` page (already protected by `src/proxy.ts` since the foundation plan, though no page exists behind it yet): upload an avatar, edit name, change email (with verification), and change password (with current-password confirmation).

**Architecture:** Three independent client-side forms (avatar, profile, password) inside one server-rendered page, reusing every UI primitive and form pattern (`noValidate` + zod `safeParse` gate + `role="alert"` errors) already established in the foundation plan. Avatar uploads go directly from the browser to Vercel Blob via a signed-token API route — the file never passes through the Next.js server. Name/email/password changes all go through Better Auth's existing client methods (`updateUser`, `changeEmail`, `changePassword`) — no new server-side auth logic, since `src/lib/auth.ts`'s email-verification hook for changed emails was already wired up in the foundation plan's Task 6.

**Tech Stack:** Next.js (App Router), Better Auth client, `@vercel/blob` (client + server), Zod, existing Tailwind/`cva` UI primitives, Vitest.

---

## Context for the engineer

This plan builds directly on the foundation plan (`docs/superpowers/plans/2026-08-27-foundation-auth.md`, fully implemented — see that file's own file structure section for what already exists). Everything you need from it:

- `src/lib/auth-client.ts` exports `authClient`, already configured. It exposes Better Auth's standard client methods including `updateUser`, `changeEmail`, `changePassword` — you don't need to add anything to this file.
- `src/lib/auth.ts` already has `user.changeEmail.enabled: true` and the `emailVerification.sendVerificationEmail` hook wired to Resend — changing email already works server-side. You don't need to touch this file.
- `src/proxy.ts` already protects `/account/:path*` at the cookie level (redirects to `/login` if no session cookie). That's a *presence* check only, not a validity check — this plan's `/account/page.tsx` does the DB-backed validity check (`auth.api.getSession`) that a prior code review flagged as necessary "before real data lands" on a protected route. This is that moment.
- `src/lib/validation.ts` has the zod pattern to follow (`signupSchema`, etc.) — this plan adds two more schemas to the same file.
- `src/components/ui/{button,input,label,card}.tsx` — reuse as-is, do not modify.
- Full design spec: [`docs/superpowers/specs/2026-08-28-account-settings-design.md`](../specs/2026-08-28-account-settings-design.md).

The design for `@vercel/blob`'s client-upload API (Task 2/3 below) is written from well-established, stable Vercel Blob documentation, but the package is not yet installed in this repo and its exact exported types haven't been checked against the specific installed version. **Before writing the code in Tasks 2 and 3, check `node_modules/@vercel/blob`'s actual type exports** (same practice used successfully in the foundation plan for a zod v4 API change) rather than assuming the shown code compiles as-is — flag and adapt if the installed version's API differs.

You are on `master` in `C:\Users\Nic\Documents\sistema-kanban`, with explicit standing consent to work directly on `master` (established during the foundation plan). Windows + Git Bash. A real Neon database is already connected via `.env.local` (created during the foundation plan's Task 13) — `npm run dev` with real data works today, no placeholder `DATABASE_URL` workaround needed for `npm run build` either, since a real one is already in the environment when the engineer runs these commands locally. If `DATABASE_URL` isn't set in your shell for some reason, fall back to the placeholder pattern from the foundation plan: `DATABASE_URL="postgresql://user:pass@localhost:5432/placeholder" npm run build`.

## File Structure

```
src/
├── lib/
│   └── validation.ts                    # + updateProfileSchema, changePasswordSchema
├── app/
│   ├── api/account/avatar/route.ts      # Vercel Blob upload token handler
│   └── account/page.tsx                 # server component: session check + assembles the 3 forms
├── components/
│   └── account/
│       ├── AvatarUploader.tsx
│       ├── ProfileForm.tsx              # name + email
│       └── ChangePasswordForm.tsx
└── next.config.ts                        # + images.remotePatterns for Blob URLs
```

---

### Task 1: Install `@vercel/blob`, add validation schemas

**Files:**
- Modify: `package.json`
- Modify: `src/lib/validation.ts`
- Modify: `src/lib/validation.test.ts`

- [ ] **Step 1: Install `@vercel/blob`**

Run:
```bash
npm install @vercel/blob@^2.8.0
```

- [ ] **Step 2: Write the failing tests**

Add to `src/lib/validation.test.ts` (append — do not remove existing tests):
```ts
import { updateProfileSchema, changePasswordSchema } from "./validation";
```
(Add this to the existing `import { ... } from "./validation";` line at the top rather than a second import statement — extend the existing named-import list.)

Append these new `describe` blocks at the end of the file:
```ts
describe("updateProfileSchema", () => {
  it("accepts a valid profile payload", () => {
    const result = updateProfileSchema.safeParse({
      name: "Ana",
      email: "ana@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = updateProfileSchema.safeParse({
      name: "",
      email: "ana@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = updateProfileSchema.safeParse({
      name: "Ana",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("accepts a valid password-change payload", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "oldpassword",
      newPassword: "newpassword123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "newpassword123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a new password shorter than 8 characters", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "oldpassword",
      newPassword: "short",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify the new ones fail**

Run:
```bash
npx vitest run src/lib/validation.test.ts
```
Expected: the 7 existing tests still pass; the 6 new tests FAIL with "updateProfileSchema is not defined" / "changePasswordSchema is not defined" (or similar — the import will fail since these exports don't exist yet).

- [ ] **Step 4: Add the schemas to `src/lib/validation.ts`**

Append to the existing file (keep everything already there unchanged):
```ts
export const updateProfileSchema = z.object({
  name: z.string().min(1, "Informe seu nome"),
  email: z.email("Email inválido"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe sua senha atual"),
  newPassword: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
```
Note: uses `z.email(...)`, not `z.string().email(...)` — the latter is deprecated in the installed zod v4 (this was already discovered and fixed in the foundation plan's Task 7; stay consistent with it).

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
npx vitest run src/lib/validation.test.ts
```
Expected: PASS (13 tests total — 7 existing + 6 new).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: install @vercel/blob, add account settings validation schemas"
```

---

### Task 2: Avatar upload API route

**Files:**
- Create: `src/app/api/account/avatar/route.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Check the installed `@vercel/blob` client-upload API**

Before writing the route, read `node_modules/@vercel/blob/dist/client/index.d.ts` (or wherever the actual type declarations live in the installed version) and confirm: the exported `handleUpload` function's signature (does it take `{ body, request, onBeforeGenerateToken, onUploadCompleted }`?), the `HandleUploadBody` type's import path, and what `onBeforeGenerateToken` is expected to return (does it need `allowedContentTypes`/`maximumSizeInBytes` under those exact names?). If anything below doesn't match the installed version, adapt the code to what's actually exported — report the deviation in your task report the same way the foundation plan's Task 7 reported the zod v4 deviation.

- [ ] **Step 2: Create `src/app/api/account/avatar/route.ts`**

```ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session) {
          throw new Error("Não autenticado.");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          maximumSizeInBytes: 4 * 1024 * 1024,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
```

This route only issues the signed upload token after confirming a real (DB-backed) session exists — it does not trust `src/proxy.ts`'s cookie-presence check alone, since API routes aren't covered by page-level assumptions.

- [ ] **Step 3: Allow Vercel Blob URLs in `next.config.ts`**

Vercel Blob serves uploaded files from a per-project subdomain of `public.blob.vercel-storage.com`. `next/image` (used in Task 3) refuses to render images from hosts not explicitly allowed.

Replace `next.config.ts` with:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 4: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0. (No Blob token is actually exercised at build time — this route isn't called during static generation.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: avatar upload API route, allow Blob URLs in next/image"
```

---

### Task 3: Avatar uploader component

**Files:**
- Create: `src/components/account/AvatarUploader.tsx`

- [ ] **Step 1: Re-check the installed `@vercel/blob` client `upload()` signature**

Same caveat as Task 2 — confirm `upload(pathname, file, options)`'s exact signature and return shape (does the resolved object have a `.url` property?) against `node_modules/@vercel/blob/dist/client/index.d.ts` before relying on the code below verbatim.

- [ ] **Step 2: Create `src/components/account/AvatarUploader.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { authClient } from "@/lib/auth-client";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export function AvatarUploader({
  initialImage,
  name,
}: {
  initialImage: string | null;
  name: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState(initialImage);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Envie uma imagem.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("A imagem precisa ter até 4MB.");
      return;
    }

    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/account/avatar",
      });
      const { error: updateError } = await authClient.updateUser({ image: blob.url });
      if (updateError) {
        setError(updateError.message ?? "Não foi possível salvar a foto.");
        return;
      }
      setImage(blob.url);
    } catch (err) {
      console.error("Avatar upload failed:", err);
      setError("Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  const initials = name.slice(0, 1).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Trocar foto de perfil"
        className="relative h-20 w-20 overflow-hidden rounded-full border border-border disabled:opacity-50"
      >
        {image ? (
          <Image src={image} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-accent text-lg font-semibold">
            {initials}
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="Selecionar imagem"
        className="hidden"
        onChange={handleFileChange}
      />
      <span className="text-xs text-muted-foreground">
        {uploading ? "Enviando..." : "Clique para trocar a foto"}
      </span>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0. (This component isn't used by any page yet — Task 6 wires it in — so this step just confirms it compiles standalone.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: avatar uploader component"
```

---

### Task 4: Profile form (name + email)

**Files:**
- Create: `src/components/account/ProfileForm.tsx`

- [ ] **Step 1: Create `src/components/account/ProfileForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { updateProfileSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  // "Committed" baseline — what the server actually has right now. Starts
  // from props but advances after each successful save, so re-submitting
  // unchanged values (or clicking Salvar twice without editing) doesn't
  // keep re-sending the same update.
  const [savedName, setSavedName] = useState(initialName);
  const [savedEmail, setSavedEmail] = useState(initialEmail);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const unchanged = name === savedName && email === savedEmail;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const parsed = updateProfileSchema.safeParse({ name, email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    setLoading(true);
    try {
      let nameUpdated = false;

      if (parsed.data.name !== savedName) {
        const { error: nameError } = await authClient.updateUser({ name: parsed.data.name });
        if (nameError) {
          setError(nameError.message ?? "Não foi possível atualizar o nome.");
          return;
        }
        setSavedName(parsed.data.name);
        nameUpdated = true;
      }

      if (parsed.data.email !== savedEmail) {
        const { error: emailError } = await authClient.changeEmail({
          newEmail: parsed.data.email,
          callbackURL: "/account",
        });
        if (emailError) {
          // The name change above may already have succeeded even though
          // the email change failed — say so, don't just show a bare error
          // that makes it look like nothing happened.
          setError(
            nameUpdated
              ? `Nome atualizado. Não foi possível trocar o email: ${emailError.message ?? "tente novamente."}`
              : (emailError.message ?? "Não foi possível trocar o email.")
          );
          return;
        }
        // The account's real email doesn't change until the confirmation
        // link is clicked, but we still advance the baseline here — the
        // request itself succeeded, and re-submitting the same pending
        // address should not silently resend the confirmation email.
        setSavedEmail(parsed.data.email);
        setMessage("Enviamos um link de confirmação para o novo email.");
      } else if (nameUpdated) {
        setMessage("Perfil atualizado.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
      <Button type="submit" disabled={loading || unchanged}>
        {loading ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
```

The Save button is disabled whenever the form matches the last-saved values (`unchanged`) — this also means the old "neither field changed" branch (which used to show "Perfil atualizado." after doing nothing) can't be reached through normal use anymore, since there's nothing to submit in that state.

- [ ] **Step 2: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: profile form (name and email)"
```

---

### Task 5: Change password form

**Files:**
- Create: `src/components/account/ChangePasswordForm.tsx`

- [ ] **Step 1: Create `src/components/account/ChangePasswordForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { changePasswordSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    setLoading(true);
    const { error } = await authClient.changePassword(parsed.data);
    setLoading(false);
    if (error) {
      setError(error.message ?? "Não foi possível trocar a senha.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setMessage("Senha atualizada.");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <Label htmlFor="currentPassword">Senha atual</Label>
        <Input
          id="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="newPassword">Nova senha</Label>
        <Input
          id="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: change password form"
```

---

### Task 6: Account page

**Files:**
- Create: `src/app/account/page.tsx`

- [ ] **Step 1: Create `src/app/account/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { AvatarUploader } from "@/components/account/AvatarUploader";
import { ProfileForm } from "@/components/account/ProfileForm";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Minha conta</h1>
          <Link href="/boards" className="text-sm text-muted-foreground hover:text-foreground">
            Voltar
          </Link>
        </div>
        <AvatarUploader initialImage={session.user.image ?? null} name={session.user.name} />
        <div className="my-6 h-px bg-border" />
        <ProfileForm initialName={session.user.name} initialEmail={session.user.email} />
        <div className="my-6 h-px bg-border" />
        <ChangePasswordForm />
      </Card>
    </main>
  );
}
```

This is a server component doing a real, DB-backed session check (`auth.api.getSession`) before rendering anything — not relying on `src/proxy.ts`'s cookie-presence check alone. This closes the gap a prior code review flagged: `/account` needed its own session validation once it started doing real, session-scoped work.

- [ ] **Step 2: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0, `/account` appears in the route table.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: account settings page"
```

---

### Task 7: Verify against the real database and Vercel Blob

This task has no code changes. A real Neon database and a real `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` already exist in `.env.local` (from the foundation plan's Task 13) — but Vercel Blob needs its own token, which isn't set up yet.

- [ ] **Step 1: Add a Vercel Blob store and token**

In the Vercel dashboard (or via `vercel blob store add` if using the CLI, run from `C:\Users\Nic\Documents\sistema-kanban` with the project already linked from the foundation plan's Task 14), create a Blob store and get its `BLOB_READ_WRITE_TOKEN`. Add it to `.env.local`:
```bash
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```
Also add it to `.env.example` as a documented placeholder (no real value):
```bash
BLOB_READ_WRITE_TOKEN=""
```
And to the Vercel project's production environment variables (same pattern as the other production env vars set up in the foundation plan's Task 14):
```bash
printf '%s' "vercel_blob_rw_..." | npx vercel env add BLOB_READ_WRITE_TOKEN production --scope nicollyrochas-projects
```

- [ ] **Step 2: Start the dev server and sign in**

```bash
npm run dev
```
Sign in with an existing test account (or sign up a new one) at `http://localhost:3000/login`.

- [ ] **Step 3: Manually verify the avatar upload**

Visit `http://localhost:3000/account`. Click the avatar circle, pick an image file under 4MB. Expected: the circle updates to show the new image within a couple seconds, no error shown.

- [ ] **Step 4: Manually verify the profile form**

Change the name field, click "Salvar". Expected: "Perfil atualizado." message, no page reload needed (name is used elsewhere like the avatar's initials fallback — refresh the page and confirm the new name persisted).

Change the email field to a different real address you control, click "Salvar". Expected: "Enviamos um link de confirmação para o novo email." message. Check that address's inbox (or, if `RESEND_API_KEY` is unset locally, check the terminal running `npm run dev` for a `[email:dev]` log line) for the confirmation link, click it, and confirm the account's email actually changes (sign out, sign back in with the new email to confirm).

- [ ] **Step 5: Manually verify the password form**

Enter the wrong current password, click "Salvar". Expected: inline error, password not changed. Enter the correct current password and a new one (8+ characters), click "Salvar". Expected: "Senha atualizada." message, fields clear. Sign out, sign back in with the new password to confirm.

- [ ] **Step 6: Manually verify the DB-backed session check**

While signed in, delete the current session row directly from Neon (via the Neon SQL editor: `DELETE FROM session WHERE token = '<your session token from the browser cookie>';`, or simpler — just delete all rows from the `session` table for your test user) without signing out through the app. Then reload `/account`. Expected: redirected to `/login` (the cookie is still present, but `auth.api.getSession` correctly finds no matching DB session and `/account/page.tsx` redirects) — this is the specific defense-in-depth behavior Task 6 was built to add.

---

## Self-Review Notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-08-28-account-settings-design.md` maps to a task: layout → Task 6, avatar upload → Tasks 2–3, name/email → Task 4, password → Task 5, "reuso de padrões" → followed throughout (same `noValidate`/`autoComplete`/`role="alert"` pattern in every form), testing section → Task 1 (zod schemas only, file-upload testing explicitly out of scope per the spec).
- **Placeholder scan:** no TBDs. The two places where exact third-party API shape isn't 100% certain (`@vercel/blob`'s `handleUpload`/`upload` signatures in Tasks 2–3) are explicitly flagged as "verify against the installed version before relying on this verbatim," with a known-good fallback precedent (the zod v4 deviation from the foundation plan) — not left as unresolved TBDs.
- **Type consistency:** `authClient.updateUser`, `authClient.changeEmail`, `authClient.changePassword` are called with the exact body shapes confirmed against `better-auth`'s installed type declarations (`node_modules/better-auth/dist/api/routes/update-user.d.mts`) during planning — `{ name }` / `{ image }` for `updateUser`, `{ newEmail, callbackURL }` for `changeEmail`, `{ currentPassword, newPassword }` for `changePassword`. `updateProfileSchema`/`changePasswordSchema` field names match what each form passes to `authClient` 1:1 (`parsed.data.name`, `parsed.data.email`, `parsed.data` spread directly into `changePassword`).
