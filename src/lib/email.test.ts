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
