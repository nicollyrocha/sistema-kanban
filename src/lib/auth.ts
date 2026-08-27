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
