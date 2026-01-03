import { describe, it, expect } from "vitest";
import {
  getSystemPrompt,
  createUserPrompt,
  parseSummaryResponse,
} from "./prompts.js";

describe("getSystemPrompt", () => {
  it("should return Japanese prompt for ja", () => {
    const prompt = getSystemPrompt("ja");
    expect(prompt).toContain("あなたはAI・テクノロジーニュースの専門家です");
    expect(prompt).toContain("JSON形式");
  });

  it("should return English prompt for en", () => {
    const prompt = getSystemPrompt("en");
    expect(prompt).toContain("You are an AI and technology news expert");
    expect(prompt).toContain("JSON format");
  });
});

describe("createUserPrompt", () => {
  it("should create Japanese user prompt", () => {
    const prompt = createUserPrompt("Test Title", "Test content", {
      language: "ja",
      maxLength: 4000,
      includeKeyPoints: true,
    });

    expect(prompt).toContain("以下の記事を要約してください");
    expect(prompt).toContain("Test Title");
    expect(prompt).toContain("Test content");
  });

  it("should create English user prompt", () => {
    const prompt = createUserPrompt("Test Title", "Test content", {
      language: "en",
      maxLength: 4000,
      includeKeyPoints: true,
    });

    expect(prompt).toContain("Please summarize the following article");
    expect(prompt).toContain("Test Title");
    expect(prompt).toContain("Test content");
  });

  it("should truncate long content", () => {
    const longContent = "A".repeat(5000);
    const prompt = createUserPrompt("Title", longContent, {
      language: "ja",
      maxLength: 100,
      includeKeyPoints: true,
    });

    expect(prompt).toContain("A".repeat(100) + "...");
    expect(prompt).not.toContain("A".repeat(101));
  });
});

describe("parseSummaryResponse", () => {
  it("should parse valid JSON response", () => {
    const response = JSON.stringify({
      summary: "This is a summary",
      keyPoints: ["Point 1", "Point 2"],
      category: "AI",
      sentiment: "positive",
    });

    const result = parseSummaryResponse(response);

    expect(result.summary).toBe("This is a summary");
    expect(result.keyPoints).toEqual(["Point 1", "Point 2"]);
    expect(result.category).toBe("AI");
    expect(result.sentiment).toBe("positive");
  });

  it("should parse JSON in code block", () => {
    const response = `Here is the summary:
\`\`\`json
{
  "summary": "Summary text",
  "keyPoints": ["Point 1"],
  "category": "ML",
  "sentiment": "neutral"
}
\`\`\``;

    const result = parseSummaryResponse(response);

    expect(result.summary).toBe("Summary text");
    expect(result.category).toBe("ML");
  });

  it("should handle missing keyPoints", () => {
    const response = JSON.stringify({
      summary: "Summary",
      category: "AI",
      sentiment: "neutral",
    });

    const result = parseSummaryResponse(response);

    expect(result.keyPoints).toEqual([]);
  });

  it("should default to neutral for invalid sentiment", () => {
    const response = JSON.stringify({
      summary: "Summary",
      keyPoints: [],
      category: "AI",
      sentiment: "invalid",
    });

    const result = parseSummaryResponse(response);

    expect(result.sentiment).toBe("neutral");
  });

  it("should default to Other for missing category", () => {
    const response = JSON.stringify({
      summary: "Summary",
      keyPoints: [],
      sentiment: "positive",
    });

    const result = parseSummaryResponse(response);

    expect(result.category).toBe("Other");
  });

  it("should limit keyPoints to 3", () => {
    const response = JSON.stringify({
      summary: "Summary",
      keyPoints: ["1", "2", "3", "4", "5"],
      category: "AI",
      sentiment: "positive",
    });

    const result = parseSummaryResponse(response);

    expect(result.keyPoints).toHaveLength(3);
  });

  it("should throw error for missing summary", () => {
    const response = JSON.stringify({
      keyPoints: [],
      category: "AI",
      sentiment: "neutral",
    });

    expect(() => parseSummaryResponse(response)).toThrow("Invalid summary");
  });

  it("should throw error for non-JSON response", () => {
    const response = "This is not JSON";

    expect(() => parseSummaryResponse(response)).toThrow(
      "No JSON object found"
    );
  });
});
