import { describe, it, expect } from "vitest";
import {
  formatSummaryBlock,
  formatDailySummary,
  formatErrorNotification,
} from "./formatter.js";
import type { ArticleSummary } from "../types/summary.js";

const createMockSummary = (
  overrides?: Partial<ArticleSummary>
): ArticleSummary => ({
  id: 1,
  title: "Test Article Title",
  url: "https://example.com/article",
  originalContent: "Original content...",
  summary: "This is a test summary of the article.",
  keyPoints: ["Point 1", "Point 2", "Point 3"],
  category: "AI",
  sentiment: "positive",
  createdAt: new Date("2024-01-01"),
  ...overrides,
});

describe("formatSummaryBlock", () => {
  it("should create blocks with header, fields, and summary", () => {
    const summary = createMockSummary();
    const blocks = formatSummaryBlock(summary);

    expect(blocks.length).toBeGreaterThan(0);

    // ヘッダーブロック
    const header = blocks.find((b) => b.type === "header");
    expect(header).toBeDefined();
    expect(header?.text?.text).toBe("Test Article Title");

    // セクションブロック（メタ情報）
    const section = blocks.find((b) => b.type === "section" && b.fields);
    expect(section).toBeDefined();
    expect(section?.fields?.length).toBe(2);
  });

  it("should include key points when available", () => {
    const summary = createMockSummary();
    const blocks = formatSummaryBlock(summary);

    const keyPointsBlock = blocks.find(
      (b) =>
        b.type === "section" && b.text?.text?.includes("Key Points")
    );
    expect(keyPointsBlock).toBeDefined();
    expect(keyPointsBlock?.text?.text).toContain("Point 1");
  });

  it("should not include key points when empty", () => {
    const summary = createMockSummary({ keyPoints: [] });
    const blocks = formatSummaryBlock(summary);

    const keyPointsBlock = blocks.find(
      (b) =>
        b.type === "section" && b.text?.text?.includes("Key Points")
    );
    expect(keyPointsBlock).toBeUndefined();
  });

  it("should include action button when URL is present", () => {
    const summary = createMockSummary();
    const blocks = formatSummaryBlock(summary);

    const actionsBlock = blocks.find((b) => b.type === "actions");
    expect(actionsBlock).toBeDefined();
    expect(actionsBlock?.elements?.[0]?.url).toBe("https://example.com/article");
  });

  it("should not include action button when URL is null", () => {
    const summary = createMockSummary({ url: null });
    const blocks = formatSummaryBlock(summary);

    const actionsBlock = blocks.find((b) => b.type === "actions");
    expect(actionsBlock).toBeUndefined();
  });

  it("should truncate long titles", () => {
    const longTitle = "A".repeat(200);
    const summary = createMockSummary({ title: longTitle });
    const blocks = formatSummaryBlock(summary);

    const header = blocks.find((b) => b.type === "header");
    expect(header?.text?.text?.length).toBeLessThanOrEqual(150);
  });
});

describe("formatDailySummary", () => {
  it("should create a complete daily summary message", () => {
    const summaries = [createMockSummary(), createMockSummary({ id: 2 })];
    const message = formatDailySummary(summaries);

    expect(message.text).toContain("2 articles");
    expect(message.blocks).toBeDefined();
    expect(message.blocks!.length).toBeGreaterThan(0);
    expect(message.unfurl_links).toBe(false);
  });

  it("should include header with article count", () => {
    const summaries = [createMockSummary()];
    const message = formatDailySummary(summaries);

    const header = message.blocks?.find((b) => b.type === "header");
    expect(header?.text?.text).toContain("AI News");
  });

  it("should use provided date", () => {
    const summaries = [createMockSummary()];
    const customDate = new Date("2024-06-15");
    const message = formatDailySummary(summaries, customDate);

    const context = message.blocks?.find((b) => b.type === "context");
    expect(context?.elements?.[0]).toBeDefined();
  });
});

describe("formatErrorNotification", () => {
  it("should create error notification", () => {
    const errors = [
      { title: "Article 1", error: "Network error" },
      { title: "Article 2", error: "Parse error" },
    ];
    const message = formatErrorNotification(errors);

    expect(message.text).toContain("2 errors");
    expect(message.blocks).toBeDefined();
  });

  it("should limit errors to 10", () => {
    const errors = Array.from({ length: 15 }, (_, i) => ({
      title: `Article ${i + 1}`,
      error: "Error",
    }));
    const message = formatErrorNotification(errors);

    const sectionBlocks = message.blocks?.filter((b) => b.type === "section");
    expect(sectionBlocks?.length).toBe(10);

    // 残りのエラー数を表示
    const context = message.blocks?.find(
      (b) => b.type === "context" &&
        b.elements?.[0]?.text?.includes("5 more errors")
    );
    expect(context).toBeDefined();
  });

  it("should truncate long titles in errors", () => {
    const errors = [{ title: "A".repeat(150), error: "Error" }];
    const message = formatErrorNotification(errors);

    const section = message.blocks?.find((b) => b.type === "section");
    expect(section?.text?.text?.length).toBeLessThan(200);
  });
});
