import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1, "Informe seu nome"),
  email: z.email("Email inválido"),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});

export const loginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Email inválido"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Informe seu nome"),
  email: z.email("Email inválido"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe sua senha atual"),
  newPassword: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});

export const titleSchema = z.object({
  title: z.string().trim().min(1, "Informe um título").max(200, "Título muito longo"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type TitleInput = z.infer<typeof titleSchema>;
