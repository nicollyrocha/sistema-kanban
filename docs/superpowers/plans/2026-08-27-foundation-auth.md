# Kanban Foundation & Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js project on Neon + Vercel with a fully working authentication system (signup, login, sign out, forgot/reset password) and the base "Glassmorphism Escuro" design system, so every later plan (account settings, the kanban board, the landing page) has a real, protected app to build into.

**Architecture:** Next.js (App Router, TypeScript) deployed on Vercel. Neon Postgres accessed through Drizzle ORM's serverless driver. Better Auth (email+password) with a Drizzle adapter handles signup/login/sessions/password-reset/email-change server logic — no auth logic is hand-rolled. Resend sends transactional email. Hand-written Tailwind + `class-variance-authority` UI primitives implement the dark glass visual language (no external component library).

**Tech Stack:** Next.js, TypeScript, Tailwind CSS v4, Drizzle ORM (`@neondatabase/serverless` driver), Better Auth, Resend, Zod, Vitest.

---

## Context for the engineer

This is a brand-new, empty project (git already initialized, only `.gitignore` and `docs/` exist). It has a sibling project at `C:\Users\Nic\Documents\todo-list` that uses the same stack (Better Auth + Drizzle + Neon + Resend + Vercel Blob) — several code patterns below are deliberately copied from it for consistency. You do not need to open that project to complete this plan; everything you need is inlined below.

The full product design is in [`docs/superpowers/specs/2026-08-27-kanban-app-design.md`](../specs/2026-08-27-kanban-app-design.md). This plan implements only the **foundation**: scaffold, design tokens, database connection, and the full auth flow. Account settings (change password/email, avatar upload), the kanban board itself, and the public landing page are separate follow-up plans — this plan's placeholder `/` and `/boards` pages will be replaced later.

## File Structure

```
sistema-kanban/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # root layout, dark theme, Inter font
│   │   ├── globals.css             # design tokens (OKLCH) + glass utilities
│   │   ├── page.tsx                # placeholder landing (replaced later)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── boards/page.tsx         # placeholder protected page (replaced later)
│   │   └── api/auth/[...all]/route.ts
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   └── card.tsx
│   │   └── auth/
│   │       ├── LoginForm.tsx
│   │       ├── SignupForm.tsx
│   │       ├── ForgotPasswordForm.tsx
│   │       ├── ResetPasswordForm.tsx
│   │       └── SignOutButton.tsx
│   ├── db/
│   │   ├── index.ts                # Neon + Drizzle client
│   │   └── schema.ts                # Better Auth tables
│   ├── lib/
│   │   ├── auth.ts                  # Better Auth server config
│   │   ├── auth-client.ts           # Better Auth React client
│   │   ├── email.ts                  # Resend helpers
│   │   ├── utils.ts                  # `cn()` class helper
│   │   └── validation.ts             # Zod schemas for auth forms
│   ├── middleware.ts                 # protects /boards and /account
│   └── db/schema.ts (see above)
├── drizzle.config.ts
├── vitest.config.ts
└── .env.example
```

---

### Task 1: Scaffold the Next.js project

**Files:**
- Create: entire Next.js project tree (via `create-next-app`), merged into the existing `sistema-kanban/` folder

- [ ] **Step 1: Scaffold into a temporary sibling folder**

`create-next-app` refuses to run inside a non-empty directory, and this folder already has `.git`, `.gitignore`, and `docs/`. Scaffold next to it, then merge.

Run:
```bash
cd /c/Users/Nic/Documents
npx --yes create-next-app@latest sistema-kanban-scaffold --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```
Expected: a new `sistema-kanban-scaffold/` folder is created with a working Next.js app (its own `.git` and `node_modules` included).

- [ ] **Step 2: Merge the scaffold into the real project**

Run:
```bash
cd /c/Users/Nic/Documents
rm -rf sistema-kanban-scaffold/.git sistema-kanban-scaffold/node_modules
cp -rn sistema-kanban-scaffold/. sistema-kanban/
rm -rf sistema-kanban-scaffold
```
`cp -rn` (no-clobber) copies every scaffolded file *except* ones that already exist in `sistema-kanban/` — so our existing `.gitignore` and `docs/` are preserved untouched.

- [ ] **Step 3: Install dependencies and verify the build**

Run:
```bash
cd /c/Users/Nic/Documents/sistema-kanban
npm install
npm run build
```
Expected: build completes with exit code 0 (the default Next.js starter page compiles cleanly).

- [ ] **Step 4: Commit**

```bash
cd /c/Users/Nic/Documents/sistema-kanban
git add -A
git commit -m "chore: scaffold Next.js project"
```

---

### Task 2: Install remaining dependencies and configure test/db scripts

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install runtime and dev dependencies**

Run:
```bash
cd /c/Users/Nic/Documents/sistema-kanban
npm install better-auth@^1.7.1 drizzle-orm@^0.45.2 @neondatabase/serverless@^1.1.0 resend@^6.22.1 zod@^4.4.3 class-variance-authority@^0.7.1 clsx@^2.1.1 tailwind-merge@^3.6.0
npm install -D drizzle-kit@^0.31.10 vitest@^4.1.11 vite-tsconfig-paths@^6.1.1
```

- [ ] **Step 2: Add npm scripts**

Run:
```bash
npm pkg set scripts.test="vitest run"
npm pkg set scripts.db:generate="drizzle-kit generate"
npm pkg set scripts.db:push="drizzle-kit push"
```

- [ ] **Step 3: Create the Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    passWithNoTests: true,
  },
});
```

- [ ] **Step 4: Verify**

Run:
```bash
npm test
```
Expected: exits 0 ("No test files found" is fine — `passWithNoTests` makes that a pass, not a failure).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add auth/db/email/test dependencies"
```

---

### Task 3: Design tokens and base UI primitives

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/label.tsx`
- Create: `src/components/ui/card.tsx`

- [ ] **Step 1: Replace `src/app/globals.css`**

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
}

:root {
  /* Dark-first identity: <html> always carries the "dark" class (see
     layout.tsx) — there is no light-mode toggle in this app. */
  --background: oklch(0.16 0.05 290);
  --foreground: oklch(0.97 0.01 290);
  --card: oklch(1 0 0 / 8%);
  --card-foreground: var(--foreground);
  --popover: oklch(0.2 0.05 290);
  --popover-foreground: var(--foreground);
  --primary: oklch(0.64 0.23 300);
  --primary-foreground: oklch(0.99 0.01 300);
  --secondary: oklch(1 0 0 / 10%);
  --secondary-foreground: var(--foreground);
  --muted: oklch(1 0 0 / 6%);
  --muted-foreground: oklch(0.82 0.02 290 / 70%);
  --accent: oklch(1 0 0 / 12%);
  --accent-foreground: var(--foreground);
  --destructive: oklch(0.66 0.21 25);
  --border: oklch(1 0 0 / 15%);
  --input: oklch(1 0 0 / 16%);
  --ring: oklch(0.64 0.23 300);
  --radius: 1rem;
  --gradient-bg-start: #0f0c29;
  --gradient-bg-mid: #302b63;
  --gradient-bg-end: #24243e;
  --gradient-accent-start: #7c5cff;
  --gradient-accent-end: #ff6bd6;
}

.dark {
  --background: oklch(0.16 0.05 290);
  --foreground: oklch(0.97 0.01 290);
  --card: oklch(1 0 0 / 8%);
  --card-foreground: var(--foreground);
  --popover: oklch(0.2 0.05 290);
  --popover-foreground: var(--foreground);
  --primary: oklch(0.64 0.23 300);
  --primary-foreground: oklch(0.99 0.01 300);
  --secondary: oklch(1 0 0 / 10%);
  --secondary-foreground: var(--foreground);
  --muted: oklch(1 0 0 / 6%);
  --muted-foreground: oklch(0.82 0.02 290 / 70%);
  --accent: oklch(1 0 0 / 12%);
  --accent-foreground: var(--foreground);
  --destructive: oklch(0.66 0.21 25);
  --border: oklch(1 0 0 / 15%);
  --input: oklch(1 0 0 / 16%);
  --ring: oklch(0.64 0.23 300);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply text-foreground font-sans antialiased;
    background: linear-gradient(
      135deg,
      var(--gradient-bg-start),
      var(--gradient-bg-mid),
      var(--gradient-bg-end)
    );
    background-attachment: fixed;
    min-height: 100vh;
  }
}

@layer utilities {
  .glass {
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
}
```

- [ ] **Step 2: Replace `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Kanban — organize seus projetos",
  description: "Um kanban pessoal, rápido e bonito.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Create `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Create `src/components/ui/button.tsx`**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-all outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-3 focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[var(--gradient-accent-start)] to-[var(--gradient-accent-end)] text-primary-foreground hover:opacity-90",
        outline: "border border-border bg-transparent hover:bg-accent",
        ghost: "hover:bg-accent",
        destructive:
          "bg-destructive/20 text-destructive hover:bg-destructive/30",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

- [ ] **Step 5: Create `src/components/ui/input.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-10 w-full rounded-lg border border-input bg-white/5 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 6: Create `src/components/ui/label.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("mb-1 block text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}
```

- [ ] **Step 7: Create `src/components/ui/card.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "glass rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/20",
        className
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 8: Replace `src/app/page.tsx` with a placeholder landing page**

The real landing page is built in a later plan — this just proves the theme renders and links to auth.

```tsx
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
```

- [ ] **Step 9: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0, no TypeScript or lint errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: dark glassmorphism design tokens and base UI primitives"
```

---

### Task 4: Database schema and Neon client

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Create: `drizzle.config.ts`
- Create: `.env.example`

- [ ] **Step 1: Create `src/db/schema.ts`**

These four tables are the exact shape Better Auth's Drizzle adapter expects (copied from the working `todo-list` project). Kanban-specific tables (`board`, `column`, `card`, `label`) are added in a later plan.

```ts
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  issuer: text("issuer").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

- [ ] **Step 2: Create `src/db/index.ts`**

```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
```

- [ ] **Step 3: Create `drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 4: Create `.env.example`**

```bash
DATABASE_URL="postgresql://user:password@ep-xxxx.neon.tech/neondb?sslmode=require"
BETTER_AUTH_SECRET="generate-with: openssl rand -base64 32"
BETTER_AUTH_URL="http://localhost:3000"
RESEND_API_KEY=""
EMAIL_FROM="onboarding@resend.dev"
```

- [ ] **Step 5: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0. (`src/db/index.ts` throws if `DATABASE_URL` is missing, but nothing imports it yet at build time, so the build does not need a real database.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Neon + Drizzle client and Better Auth table schema"
```

---

### Task 5: Resend email helper

**Files:**
- Create: `src/lib/email.ts`
- Test: `src/lib/email.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/email.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("email", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("logs instead of sending when RESEND_API_KEY is unset outside production", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "development");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { sendResetPasswordEmail } = await import("./email");
    await expect(
      sendResetPasswordEmail("a@b.com", "http://x/reset")
    ).resolves.toBeUndefined();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("a@b.com")
    );
  });

  it("throws when RESEND_API_KEY is unset in production", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");

    const { sendResetPasswordEmail } = await import("./email");
    await expect(
      sendResetPasswordEmail("a@b.com", "http://x/reset")
    ).rejects.toThrow("RESEND_API_KEY is not set in production");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/lib/email.test.ts
```
Expected: FAIL — `Cannot find module './email'` (the file doesn't exist yet).

- [ ] **Step 3: Create `src/lib/email.ts`**

```ts
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "RESEND_API_KEY is not set in production; refusing to silently drop email delivery"
      );
    }
    console.log(`[email:dev] to=${to} subject=${subject}\n${html}`);
    return;
  }
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
    to,
    subject,
    html,
  });
  if (error) {
    throw new Error(`Failed to send email via Resend: ${error.message}`);
  }
}

export async function sendResetPasswordEmail(to: string, url: string) {
  await send(
    to,
    "Redefina sua senha",
    `<p>Clique no link para redefinir sua senha: <a href="${url}">${url}</a></p>`
  );
}

export async function sendChangeEmailVerification(to: string, url: string) {
  await send(
    to,
    "Confirme seu novo email",
    `<p>Clique no link para confirmar seu novo email: <a href="${url}">${url}</a></p>`
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run src/lib/email.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Resend email helper for password reset and email change"
```

---

### Task 6: Better Auth server config, API route, and client

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...all]/route.ts`
- Create: `src/lib/auth-client.ts`

- [ ] **Step 1: Create `src/lib/auth.ts`**

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { sendResetPasswordEmail, sendChangeEmailVerification } from "@/lib/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url);
    },
  },
  // This hook is shared with signup email verification. Do NOT set
  // requireEmailVerification: true or sendOnSignUp: true without adding
  // flow-detection here first — otherwise new signups will receive this
  // "confirm your new email" copy instead of a signup-verification email.
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendChangeEmailVerification(user.email, url);
    },
  },
  user: {
    changeEmail: {
      enabled: true,
    },
  },
});
```

- [ ] **Step 2: Create `src/app/api/auth/[...all]/route.ts`**

```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 3: Create `src/lib/auth-client.ts`**

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
```

- [ ] **Step 4: Verify**

`src/app/api/auth/[...all]/route.ts` now imports `src/lib/auth.ts`, which imports `@/db`, which throws at module-evaluation time if `DATABASE_URL` is unset. Next.js's build-time "Collecting page data" phase statically imports every route module — including this one — to inspect its config, even though the route itself is dynamic and never *executes* at build time. That import alone is enough to trigger the throw. So from this task onward, `npm run build` needs *some* syntactically valid `DATABASE_URL` in the environment — it does not need to be reachable, since nothing queries it at build time (the Neon HTTP driver only makes a network call when a query actually runs, which only happens at request time, never at build time).

Run:
```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/placeholder" npm run build
```
Expected: exit code 0. Do **not** put this placeholder value in any committed file (`.env.example` already documents the real shape) — it's a one-off shell env var for this build check only. Every later task's "Run `npm run build`" verification step also needs this same `DATABASE_URL=...` prefix, for the same reason — the whole app builds together, so once one route imports the DB, all build verification does. In real environments this is a non-issue: local dev has a real `DATABASE_URL` in `.env.local` from Task 13 onward, and Vercel production builds get a real one from the Neon integration (Task 14) — this placeholder is only needed for isolated build checks during development of Tasks 6–12, before a real database is connected.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Better Auth server config, API route, and client"
```

---

### Task 7: Auth form validation schemas

**Files:**
- Create: `src/lib/validation.ts`
- Test: `src/lib/validation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/validation.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./validation";

describe("signupSchema", () => {
  it("accepts a valid signup payload", () => {
    const result = signupSchema.safeParse({
      name: "Ana",
      email: "ana@example.com",
      password: "supersecret",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = signupSchema.safeParse({
      name: "Ana",
      email: "ana@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = signupSchema.safeParse({
      name: "Ana",
      email: "not-an-email",
      password: "supersecret",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts a valid login payload", () => {
    const result = loginSchema.safeParse({
      email: "ana@example.com",
      password: "x",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "ana@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("rejects an invalid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "nope" });
    expect(result.success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("rejects a password shorter than 8 characters", () => {
    const result = resetPasswordSchema.safeParse({ password: "short" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/lib/validation.test.ts
```
Expected: FAIL — `Cannot find module './validation'`.

- [ ] **Step 3: Create `src/lib/validation.ts`**

```ts
import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1, "Informe seu nome"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run src/lib/validation.test.ts
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: zod validation schemas for auth forms"
```

---

### Task 8: Login page

**Files:**
- Create: `src/components/auth/LoginForm.tsx`
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Create `src/components/auth/LoginForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Não foi possível entrar.");
      return;
    }
    router.push("/boards");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </Button>
      <div className="flex justify-between text-sm text-muted-foreground">
        <Link href="/forgot-password" className="hover:text-foreground">
          Esqueci minha senha
        </Link>
        <Link href="/signup" className="hover:text-foreground">
          Criar conta
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `src/app/login/page.tsx`**

```tsx
import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">Entrar</h1>
        <LoginForm />
      </Card>
    </main>
  );
}
```

- [ ] **Step 3: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: login page"
```

---

### Task 9: Signup page

**Files:**
- Create: `src/components/auth/SignupForm.tsx`
- Create: `src/app/signup/page.tsx`

- [ ] **Step 1: Create `src/components/auth/SignupForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Não foi possível criar a conta.");
      return;
    }
    router.push("/boards");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          type="text"
          required
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Criando conta..." : "Criar conta"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="text-foreground hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 2: Create `src/app/signup/page.tsx`**

```tsx
import { SignupForm } from "@/components/auth/SignupForm";
import { Card } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">Criar conta</h1>
        <SignupForm />
      </Card>
    </main>
  );
}
```

- [ ] **Step 3: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: signup page"
```

---

### Task 10: Forgot password page

**Files:**
- Create: `src/components/auth/ForgotPasswordForm.tsx`
- Create: `src/app/forgot-password/page.tsx`

- [ ] **Step 1: Create `src/components/auth/ForgotPasswordForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Não foi possível enviar o email.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        Se existir uma conta com esse email, enviamos um link para redefinir
        a senha.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Enviando..." : "Enviar link de recuperação"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create `src/app/forgot-password/page.tsx`**

```tsx
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Card } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">Recuperar senha</h1>
        <ForgotPasswordForm />
      </Card>
    </main>
  );
}
```

- [ ] **Step 3: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: forgot password page"
```

---

### Task 11: Reset password page

**Files:**
- Create: `src/components/auth/ResetPasswordForm.tsx`
- Create: `src/app/reset-password/page.tsx`

- [ ] **Step 1: Create `src/components/auth/ResetPasswordForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Link inválido ou expirado.");
      return;
    }
    setLoading(true);
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Não foi possível redefinir a senha.");
      return;
    }
    router.push("/login");
  }

  if (!token) {
    return <p className="text-sm text-destructive">Link inválido ou expirado.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Redefinir senha"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create `src/app/reset-password/page.tsx`**

`useSearchParams` requires a `Suspense` boundary in the App Router.

```tsx
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Card } from "@/components/ui/card";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold">Redefinir senha</h1>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </Card>
    </main>
  );
}
```

- [ ] **Step 3: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: reset password page"
```

---

### Task 12: Route protection, sign out, and placeholder boards page

**Files:**
- Create: `src/middleware.ts`
- Create: `src/components/auth/SignOutButton.tsx`
- Create: `src/app/boards/page.tsx`

- [ ] **Step 1: Create `src/middleware.ts`**

Uses Better Auth's lightweight cookie check (no DB round-trip) to protect routes.

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/boards/:path*", "/account/:path*"],
};
```

- [ ] **Step 2: Create `src/components/auth/SignOutButton.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={handleSignOut}>
      Sair
    </Button>
  );
}
```

- [ ] **Step 3: Create `src/app/boards/page.tsx`**

Placeholder — replaced by the real boards list in a later plan. Its purpose here is to prove the protected-route flow works end to end.

```tsx
import { SignOutButton } from "@/components/auth/SignOutButton";

export default function BoardsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Meus quadros</h1>
        <SignOutButton />
      </div>
      <p className="text-muted-foreground">
        A lista de quadros chega no próximo passo.
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Verify**

Run:
```bash
npm run build
```
Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: protect /boards and /account, add sign out"
```

---

### Task 13: Connect to a real Neon database and verify the full auth flow

This task has no code changes — it wires up real credentials and manually verifies everything built so far actually works. It requires access to Neon and (optionally) Resend accounts, so the user should do this step themselves rather than an agent.

- [ ] **Step 1: Create a Neon database**

Go to https://neon.tech (or, in the Vercel dashboard, Storage → Create Database → Neon) and create a new project/database. Copy the connection string (it looks like `postgresql://user:password@ep-xxxx.neon.tech/neondb?sslmode=require`).

- [ ] **Step 2: Create `.env.local`**

Copy `.env.example` to `.env.local` and fill in real values:
```bash
cp .env.example .env.local
```
Then edit `.env.local`:
- `DATABASE_URL` — the Neon connection string from Step 1.
- `BETTER_AUTH_SECRET` — generate with `openssl rand -base64 32`.
- `BETTER_AUTH_URL` — leave as `http://localhost:3000` for local dev.
- `RESEND_API_KEY` — leave blank for now; without it, reset/verification emails are printed to the terminal instead of sent (see `src/lib/email.ts`).

- [ ] **Step 2: Push the schema to Neon**

Run:
```bash
npm run db:push
```
Expected: Drizzle Kit reports the `user`, `session`, `account`, and `verification` tables were created.

- [ ] **Step 3: Start the dev server**

Run:
```bash
npm run dev
```
Expected: server starts at `http://localhost:3000`.

- [ ] **Step 4: Manually verify signup**

Visit `http://localhost:3000/signup`, create an account. Expected: redirected to `/boards`, page shows "Meus quadros" and a "Sair" button.

- [ ] **Step 5: Manually verify sign out and login**

Click "Sair". Expected: redirected to `/login`. Log back in with the same credentials. Expected: redirected to `/boards` again.

- [ ] **Step 6: Manually verify forgot/reset password**

Sign out, visit `/forgot-password`, submit your email. Since `RESEND_API_KEY` is unset, check the terminal running `npm run dev` for a `[email:dev]` log line containing a reset URL. Copy that URL into the browser, set a new password. Expected: redirected to `/login`. Log in with the **new** password. Expected: redirected to `/boards`.

- [ ] **Step 7: Manually verify route protection**

Sign out, then try to visit `http://localhost:3000/boards` directly. Expected: redirected to `/login` (middleware blocks unauthenticated access).

---

### Task 14: Vercel deployment

No code changes — deployment steps for the user, since they require the user's own GitHub/Vercel/Neon/Resend accounts.

- [ ] **Step 1: Push the repo to GitHub**

Create a repo (via https://github.com/new or `gh repo create`) and push:
```bash
git remote add origin <your-repo-url>
git push -u origin master
```

- [ ] **Step 2: Import the project into Vercel**

In the Vercel dashboard, "Add New… → Project", import the GitHub repo.

- [ ] **Step 3: Connect Neon**

In the Vercel project's Storage tab, connect the Neon database created in Task 13 (or create a new one) — this automatically sets the `DATABASE_URL` environment variable in the Vercel project.

- [ ] **Step 4: Set the remaining environment variables**

In the Vercel project's Settings → Environment Variables, add:
- `BETTER_AUTH_SECRET` — same value as local, or a freshly generated one.
- `BETTER_AUTH_URL` — the production URL Vercel assigns (e.g. `https://sistema-kanban.vercel.app`).
- `RESEND_API_KEY` — a real key from https://resend.com, so password-reset and email-change emails actually send in production (the code refuses to silently drop emails in production — see `src/lib/email.ts`).
- `EMAIL_FROM` — a verified sender address in Resend.

- [ ] **Step 5: Push the schema to the production database**

Locally, temporarily point `DATABASE_URL` at the production Neon connection string and run:
```bash
npm run db:push
```

- [ ] **Step 6: Deploy and verify**

Trigger a deploy (Vercel deploys automatically on push, or click "Deploy" in the dashboard). Once live, repeat the manual checks from Task 13 (Steps 4–7) against the production URL.

---

## Self-Review Notes

- **Spec coverage:** this plan covers the spec's "Rotas" (public auth routes + placeholder `/boards`), "Fluxo de autenticação" (signup/login/forgot/reset), and the "Design visual" base tokens. It intentionally does **not** cover: trocar senha/email/foto in `/account` (needs the board's data model conventions decided first), the kanban board itself, or the real landing page — those are separate follow-up plans, as called out in "Context for the engineer" above and in "Fora de escopo" implicitly deferred items of the spec.
- **Placeholder scan:** no TBDs; the two intentionally temporary files (`src/app/page.tsx`, `src/app/boards/page.tsx`) are explicitly labeled as placeholders to be replaced by later plans, not unfinished work within this plan.
- **Type consistency:** `authClient.signIn.email`, `authClient.signUp.email`, `authClient.requestPasswordReset`, `authClient.resetPassword`, and `authClient.signOut` are Better Auth's standard React client methods and are used with the same signature everywhere they appear (Tasks 8–12). The `cn()` helper from Task 3 is imported identically (`@/lib/utils`) by every component that uses it.
