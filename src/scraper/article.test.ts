import { describe, it, expect, vi, beforeEach } from "vitest";
import { scrapeArticle, scrapeArticles } from "./article.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

const createMockHtml = (options: {
  title?: string;
  ogTitle?: string;
  content?: string;
  siteName?: string;
}) => {
  const { title, ogTitle, content, siteName } = options;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title ?? "Test Page"}</title>
      ${ogTitle ? `<meta property="og:title" content="${ogTitle}">` : ""}
      ${siteName ? `<meta property="og:site_name" content="${siteName}">` : ""}
    </head>
    <body>
      <nav>Navigation</nav>
      <article>
        ${content ?? "This is the main article content that should be extracted. It contains enough text to pass the minimum length requirement for extraction."}
      </article>
      <footer>Footer content</footer>
    </body>
    </html>
  `;
};

describe("scrapeArticle", () => {
  it("should extract article content successfully", async () => {
    const mockHtml = createMockHtml({
      ogTitle: "Test Article Title",
      content:
        "This is a detailed article about AI and machine learning. It contains important information that spans multiple sentences and provides value to readers.",
      siteName: "Tech News",
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHtml,
    });

    const result = await scrapeArticle("https://example.com/article");

    expect(result.success).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.data?.title).toBe("Test Article Title");
    expect(result.data?.siteName).toBe("Tech News");
    expect(result.data?.content).toContain("AI and machine learning");
    expect(result.data?.url).toBe("https://example.com/article");
    expect(result.data?.fetchedAt).toBeInstanceOf(Date);
  });

  it("should fall back to title tag when og:title is not present", async () => {
    const mockHtml = createMockHtml({
      title: "Fallback Title",
      content:
        "Article content that is long enough to be extracted properly from the page.",
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHtml,
    });

    const result = await scrapeArticle("https://example.com/article");

    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("Fallback Title");
  });

  it("should remove navigation and footer elements", async () => {
    const mockHtml = createMockHtml({
      content:
        "Main article content without navigation or footer elements included.",
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHtml,
    });

    const result = await scrapeArticle("https://example.com/article");

    expect(result.success).toBe(true);
    expect(result.data?.content).not.toContain("Navigation");
    expect(result.data?.content).not.toContain("Footer content");
  });

  it("should handle HTTP errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await scrapeArticle("https://example.com/not-found");

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain("404");
  });

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await scrapeArticle("https://example.com/error");

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBe("Network error");
  });

  it("should fail when content is too short", async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Empty Page</title></head>
      <body><article>Short</article></body>
      </html>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHtml,
    });

    const result = await scrapeArticle("https://example.com/empty");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Could not extract meaningful content");
  });

  it("should create excerpt from content", async () => {
    const longContent =
      "A".repeat(300) +
      " This is additional content that should not appear in the excerpt.";
    const mockHtml = createMockHtml({ content: longContent });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHtml,
    });

    const result = await scrapeArticle("https://example.com/long");

    expect(result.success).toBe(true);
    expect(result.data?.excerpt.length).toBeLessThanOrEqual(203); // 200 + "..."
    expect(result.data?.excerpt.endsWith("...")).toBe(true);
  });
});

describe("scrapeArticles", () => {
  it("should scrape multiple articles with rate limiting", async () => {
    const mockHtml = createMockHtml({
      content: "Article content that meets the minimum length requirement.",
    });

    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => mockHtml,
    });

    const urls = [
      "https://example.com/1",
      "https://example.com/2",
      "https://example.com/3",
    ];

    const results = await scrapeArticles(urls, 2, 100);

    expect(results.size).toBe(3);
    expect(results.get("https://example.com/1")?.success).toBe(true);
    expect(results.get("https://example.com/2")?.success).toBe(true);
    expect(results.get("https://example.com/3")?.success).toBe(true);
  });

  it("should handle mixed success and failure", async () => {
    const mockHtml = createMockHtml({
      content: "Valid article content that passes minimum length check.",
    });

    mockFetch
      .mockResolvedValueOnce({ ok: true, text: async () => mockHtml })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, text: async () => mockHtml });

    const urls = [
      "https://example.com/1",
      "https://example.com/2",
      "https://example.com/3",
    ];

    const results = await scrapeArticles(urls, 3, 0);

    expect(results.get("https://example.com/1")?.success).toBe(true);
    expect(results.get("https://example.com/2")?.success).toBe(false);
    expect(results.get("https://example.com/3")?.success).toBe(true);
  });
});
