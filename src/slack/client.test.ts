import { describe, it, expect, vi, beforeEach } from "vitest";
import { SlackClient, createSlackClient } from "./client.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("SlackClient", () => {
  it("should throw error when webhook URL is empty", () => {
    expect(() => new SlackClient("")).toThrow("Slack webhook URL is required");
  });

  it("should send message successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    const client = new SlackClient("https://hooks.slack.com/test");
    const result = await client.send({ text: "Test message" });

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/test",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Test message" }),
      })
    );
  });

  it("should handle API errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "invalid_payload",
    });

    const client = new SlackClient("https://hooks.slack.com/test");
    const result = await client.send({ text: "Test" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("400");
    expect(result.error).toContain("invalid_payload");
  });

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    const client = new SlackClient("https://hooks.slack.com/test");
    const result = await client.send({ text: "Test" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network failure");
  });

  it("should send text message using convenience method", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const client = new SlackClient("https://hooks.slack.com/test");
    const result = await client.sendText("Simple text");

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/test",
      expect.objectContaining({
        body: JSON.stringify({ text: "Simple text" }),
      })
    );
  });
});

describe("createSlackClient", () => {
  it("should create client instance", () => {
    const client = createSlackClient("https://hooks.slack.com/test");
    expect(client).toBeInstanceOf(SlackClient);
  });
});
