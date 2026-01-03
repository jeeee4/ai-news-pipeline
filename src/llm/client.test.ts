import { describe, it, expect, beforeEach } from "vitest";
import {
  createLLMClient,
  getDefaultClient,
  resetDefaultClient,
} from "./client.js";

beforeEach(() => {
  resetDefaultClient();
});

describe("LLMClient", () => {
  it("should create client with default config", () => {
    const client = createLLMClient("test-api-key");
    expect(client.getModel()).toBe("claude-sonnet-4-20250514");
  });

  it("should create client with custom config", () => {
    const client = createLLMClient("test-api-key", {
      model: "claude-3-opus-20240229",
    });
    expect(client.getModel()).toBe("claude-3-opus-20240229");
  });

  it("should create client with custom temperature and maxTokens", () => {
    const client = createLLMClient("test-api-key", {
      temperature: 0.5,
      maxTokens: 2048,
    });
    // Client is created successfully
    expect(client).toBeDefined();
    expect(client.getModel()).toBe("claude-sonnet-4-20250514");
  });
});

describe("createLLMClient", () => {
  it("should create new client instance each time", () => {
    const client1 = createLLMClient("key1");
    const client2 = createLLMClient("key2");

    expect(client1).not.toBe(client2);
    expect(client1).toBeInstanceOf(Object);
    expect(client2).toBeInstanceOf(Object);
  });
});

describe("getDefaultClient", () => {
  it("should return same instance for subsequent calls", () => {
    const client1 = getDefaultClient("test-key");
    const client2 = getDefaultClient("test-key");

    expect(client1).toBe(client2);
  });

  it("should create new instance after reset", () => {
    const client1 = getDefaultClient("test-key");
    resetDefaultClient();
    const client2 = getDefaultClient("test-key");

    expect(client1).not.toBe(client2);
  });
});
