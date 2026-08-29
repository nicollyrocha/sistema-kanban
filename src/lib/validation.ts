import { z } from "zod";
import { LABEL_COLORS } from "@/lib/label-colors";

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

export const descriptionSchema = z.object({
  description: z.string().max(2000, "Descrição muito longa"),
});

export const dueDateSchema = z.object({
  dueDate: z.iso.date("Data inválida").nullable(),
});

export const labelSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome").max(50, "Nome muito longo"),
  color: z.enum(LABEL_COLORS, { error: "Cor inválida" }),
});

export const moveCardSchema = z.object({
  newIndex: z.number().int("Posição inválida").min(0, "Posição inválida"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type TitleInput = z.infer<typeof titleSchema>;
export type DescriptionInput = z.infer<typeof descriptionSchema>;
export type DueDateInput = z.infer<typeof dueDateSchema>;
export type LabelInput = z.infer<typeof labelSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;
