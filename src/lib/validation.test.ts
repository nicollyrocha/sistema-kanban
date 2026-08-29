import { describe, expect, it } from "vitest";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
  titleSchema,
  descriptionSchema,
  dueDateSchema,
  labelSchema,
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

describe("titleSchema", () => {
  it("accepts a valid title", () => {
    const result = titleSchema.safeParse({ title: "Trabalho" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = titleSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a title that is only whitespace", () => {
    const result = titleSchema.safeParse({ title: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects a title longer than 200 characters", () => {
    const result = titleSchema.safeParse({ title: "a".repeat(201) });
    expect(result.success).toBe(false);
  });
});

describe("descriptionSchema", () => {
  it("accepts an empty description", () => {
    const result = descriptionSchema.safeParse({ description: "" });
    expect(result.success).toBe(true);
  });

  it("accepts a normal description", () => {
    const result = descriptionSchema.safeParse({ description: "Ligar antes de assinar." });
    expect(result.success).toBe(true);
  });

  it("rejects a description longer than 2000 characters", () => {
    const result = descriptionSchema.safeParse({ description: "a".repeat(2001) });
    expect(result.success).toBe(false);
  });
});

describe("dueDateSchema", () => {
  it("accepts a valid ISO date string", () => {
    const result = dueDateSchema.safeParse({ dueDate: "2026-08-28" });
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = dueDateSchema.safeParse({ dueDate: null });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed date string", () => {
    const result = dueDateSchema.safeParse({ dueDate: "not-a-date" });
    expect(result.success).toBe(false);
  });
});

describe("labelSchema", () => {
  it("accepts a valid label", () => {
    const result = labelSchema.safeParse({ name: "urgente", color: "#ff6bd6" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = labelSchema.safeParse({ name: "", color: "#ff6bd6" });
    expect(result.success).toBe(false);
  });

  it("rejects a color outside the fixed palette", () => {
    const result = labelSchema.safeParse({ name: "urgente", color: "#000000" });
    expect(result.success).toBe(false);
  });
});
