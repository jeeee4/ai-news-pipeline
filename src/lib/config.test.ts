import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadConfig, getConfigSafe } from "./config.js";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should throw error when ANTHROPIC_API_KEY is not set", () => {
    delete process.env.ANTHROPIC_API_KEY;

    expect(() => loadConfig()).toThrow("ANTHROPIC_API_KEY is required");
  });

  it("should load config with default model", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    delete process.env.ANTHROPIC_MODEL;

    const config = loadConfig();

    expect(config.anthropic.apiKey).toBe("test-key");
    expect(config.anthropic.model).toBe("claude-sonnet-4-20250514");
  });

  it("should load config with custom model", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.ANTHROPIC_MODEL = "claude-3-opus-20240229";

    const config = loadConfig();

    expect(config.anthropic.model).toBe("claude-3-opus-20240229");
  });

  it("should load slack config when webhook URL is set", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";

    const config = loadConfig();

    expect(config.slack?.webhookUrl).toBe("https://hooks.slack.com/test");
  });

  it("should not include slack config when webhook URL is not set", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    delete process.env.SLACK_WEBHOOK_URL;

    const config = loadConfig();

    expect(config.slack).toBeUndefined();
  });
});

describe("getConfigSafe", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return null when config is invalid", () => {
    delete process.env.ANTHROPIC_API_KEY;

    const config = getConfigSafe();

    expect(config).toBeNull();
  });

  it("should return config when valid", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";

    const config = getConfigSafe();

    expect(config).not.toBeNull();
    expect(config?.anthropic.apiKey).toBe("test-key");
  });
});
