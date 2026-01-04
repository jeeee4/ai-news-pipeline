import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  BLOG_SOURCES,
  fetchRSSFeed,
  fetchAllBlogNews,
  getBlogNews,
} from "./rss.js";

// rss-parserをモック
vi.mock("rss-parser", () => {
  return {
    default: class MockParser {
      async parseURL(url: string) {
        // URLに基づいてモックデータを返す
        if (url.includes("openai")) {
          return {
            title: "OpenAI Blog",
            description: "OpenAI blog feed",
            link: "https://openai.com",
            items: [
              {
                title: "GPT-5 Announcement",
                link: "https://openai.com/blog/gpt-5",
                contentSnippet: "Announcing GPT-5...",
                pubDate: "Mon, 01 Jan 2024 00:00:00 GMT",
                guid: "gpt-5",
                categories: ["AI"],
              },
              {
                title: "Sora Update",
                link: "https://openai.com/blog/sora-update",
                content: "Sora improvements...",
                pubDate: "Tue, 02 Jan 2024 00:00:00 GMT",
                guid: "sora-update",
              },
            ],
          };
        }

        if (url.includes("research.google")) {
          return {
            title: "Google Research Blog",
            description: null,
            link: "https://research.google",
            items: [
              {
                title: "Gemini 2.0 Released",
                link: "https://research.google/blog/gemini-2",
                pubDate: "Wed, 03 Jan 2024 00:00:00 GMT",
                guid: "gemini-2",
                categories: ["AI", "ML"],
              },
            ],
          };
        }

        if (url.includes("error")) {
          throw new Error("Network error");
        }

        return {
          title: "Default Feed",
          items: [],
        };
      }
    },
  };
});

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("BLOG_SOURCES", () => {
  it("should contain expected blog sources", () => {
    expect(BLOG_SOURCES).toHaveLength(4);
    expect(BLOG_SOURCES.map((s) => s.id)).toEqual([
      "openai",
      "google-research",
      "microsoft-research",
      "huggingface",
    ]);
  });

  it("should have valid URLs for all sources", () => {
    BLOG_SOURCES.forEach((source) => {
      expect(source.feedUrl).toMatch(/^https:\/\//);
      expect(source.siteUrl).toMatch(/^https:\/\//);
    });
  });
});

describe("fetchRSSFeed", () => {
  it("should fetch and parse RSS feed from OpenAI", async () => {
    const source = BLOG_SOURCES.find((s) => s.id === "openai")!;
    const result = await fetchRSSFeed(source);

    expect(result.title).toBe("OpenAI Blog");
    expect(result.description).toBe("OpenAI blog feed");
    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe("GPT-5 Announcement");
    expect(result.items[0].description).toBe("Announcing GPT-5...");
    expect(result.items[1].title).toBe("Sora Update");
  });

  it("should handle feeds with no description by using content", async () => {
    const source = BLOG_SOURCES.find((s) => s.id === "openai")!;
    const result = await fetchRSSFeed(source);

    // Second item uses content since contentSnippet is not available
    expect(result.items[1].description).toBe("Sora improvements...");
  });

  it("should parse categories correctly", async () => {
    const source = BLOG_SOURCES.find((s) => s.id === "google-research")!;
    const result = await fetchRSSFeed(source);

    expect(result.items[0].categories).toEqual(["AI", "ML"]);
  });

  it("should parse dates correctly", async () => {
    const source = BLOG_SOURCES.find((s) => s.id === "openai")!;
    const result = await fetchRSSFeed(source);

    expect(result.items[0].pubDate).toBeInstanceOf(Date);
    expect(result.items[0].pubDate.getFullYear()).toBe(2024);
  });
});

describe("fetchAllBlogNews", () => {
  it("should fetch news from all sources", async () => {
    const result = await fetchAllBlogNews(
      [
        BLOG_SOURCES[0], // openai
        BLOG_SOURCES[1], // google-research
      ],
      10
    );

    expect(result.length).toBeGreaterThan(0);
    expect(result.some((item) => item.source === "OpenAI")).toBe(true);
    expect(result.some((item) => item.source === "Google Research")).toBe(true);
  });

  it("should sort results by date (newest first)", async () => {
    const result = await fetchAllBlogNews(
      [BLOG_SOURCES[0], BLOG_SOURCES[1]],
      10
    );

    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].postedAt.getTime()).toBeGreaterThanOrEqual(
        result[i + 1].postedAt.getTime()
      );
    }
  });

  it("should generate unique IDs for each item", async () => {
    const result = await fetchAllBlogNews([BLOG_SOURCES[0]], 10);

    const ids = result.map((item) => item.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should include source ID in item ID", async () => {
    const result = await fetchAllBlogNews([BLOG_SOURCES[0]], 10);

    result.forEach((item) => {
      expect(item.id).toContain("openai-");
    });
  });

  it("should limit results per source", async () => {
    const result = await fetchAllBlogNews([BLOG_SOURCES[0]], 1);

    // Only 1 item from OpenAI (limit=1)
    const openaiItems = result.filter((item) => item.source === "OpenAI");
    expect(openaiItems.length).toBe(1);
  });
});

describe("getBlogNews", () => {
  it("should use default sources and limit", async () => {
    const result = await getBlogNews();

    expect(result.length).toBeGreaterThan(0);
  });

  it("should respect the limit parameter", async () => {
    const result = await getBlogNews(1);

    // Each source contributes at most 1 item
    expect(result.length).toBeLessThanOrEqual(BLOG_SOURCES.length);
  });
});

describe("BlogNewsItem structure", () => {
  it("should have correct structure", async () => {
    const result = await fetchAllBlogNews([BLOG_SOURCES[0]], 1);
    const item = result[0];

    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("title");
    expect(item).toHaveProperty("url");
    expect(item).toHaveProperty("description");
    expect(item).toHaveProperty("source");
    expect(item).toHaveProperty("postedAt");

    expect(typeof item.id).toBe("string");
    expect(typeof item.title).toBe("string");
    expect(typeof item.url).toBe("string");
    expect(item.postedAt).toBeInstanceOf(Date);
  });
});
