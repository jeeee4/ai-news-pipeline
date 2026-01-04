import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { runArchive } from "./index.js";
import type { NewsData, NewsSummary } from "../types/news.js";

vi.mock("node:fs");

const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockMkdirSync = vi.mocked(mkdirSync);
const mockExistsSync = vi.mocked(existsSync);
const mockReaddirSync = vi.mocked(readdirSync);

describe("runArchive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createArticle = (id: number, daysAgo: number): NewsSummary => {
    const date = new Date("2026-02-15T00:00:00Z");
    date.setDate(date.getDate() - daysAgo);
    return {
      id,
      title: `Article ${id}`,
      url: `https://example.com/${id}`,
      summary: `Summary for article ${id}`,
      keyPoints: ["point1", "point2"],
      category: "AI",
      sentiment: "neutral",
      createdAt: date.toISOString(),
    };
  };

  it("should return early if news file does not exist", () => {
    mockExistsSync.mockReturnValue(false);

    const result = runArchive();

    expect(result).toEqual({ archived: 0, remaining: 0 });
  });

  it("should not archive articles less than 30 days old", () => {
    const newsData: NewsData = {
      generatedAt: new Date().toISOString(),
      articles: [
        createArticle(1, 10),
        createArticle(2, 20),
        createArticle(3, 29),
      ],
    };

    mockExistsSync.mockImplementation((path) => {
      if (String(path).includes("news.json")) return true;
      if (String(path).includes("archive")) return false;
      return false;
    });
    mockReadFileSync.mockReturnValue(JSON.stringify(newsData));

    const result = runArchive();

    expect(result).toEqual({ archived: 0, remaining: 3 });
  });

  it("should archive articles older than 30 days", () => {
    const newsData: NewsData = {
      generatedAt: new Date().toISOString(),
      articles: [
        createArticle(1, 10),
        createArticle(2, 35),
        createArticle(3, 45),
      ],
    };

    mockExistsSync.mockImplementation((path) => {
      if (String(path).includes("news.json")) return true;
      if (String(path).includes("stats.json")) return false;
      if (String(path).includes("archive")) return false;
      return false;
    });
    mockReadFileSync.mockReturnValue(JSON.stringify(newsData));
    mockReaddirSync.mockReturnValue([]);

    const result = runArchive();

    expect(result).toEqual({ archived: 2, remaining: 1 });
    expect(mockWriteFileSync).toHaveBeenCalled();
  });

  it("should group archived articles by month", () => {
    const newsData: NewsData = {
      generatedAt: new Date().toISOString(),
      articles: [
        createArticle(1, 10),
        createArticle(2, 35), // 2026-01-11
        createArticle(3, 60), // 2025-12-17
      ],
    };

    const savedArchives: Record<string, string> = {};

    mockExistsSync.mockImplementation((path) => {
      if (String(path).includes("news.json")) return true;
      if (String(path).includes("stats.json")) return false;
      if (String(path).includes("archive")) return false;
      return false;
    });
    mockReadFileSync.mockReturnValue(JSON.stringify(newsData));
    mockWriteFileSync.mockImplementation((path, data) => {
      if (String(path).includes("archive")) {
        savedArchives[String(path)] = String(data);
      }
    });
    mockReaddirSync.mockReturnValue([]);

    runArchive();

    const archivePaths = Object.keys(savedArchives);
    expect(archivePaths.some((p) => p.includes("2026-01.json"))).toBe(true);
    expect(archivePaths.some((p) => p.includes("2025-12.json"))).toBe(true);
  });

  it("should merge with existing archive data", () => {
    const newsData: NewsData = {
      generatedAt: new Date().toISOString(),
      articles: [
        createArticle(1, 10),
        createArticle(2, 35),
      ],
    };

    const existingArchive = {
      month: "2026-01",
      archivedAt: "2026-02-01T00:00:00Z",
      articles: [createArticle(100, 40)],
    };

    mockExistsSync.mockImplementation((path) => {
      if (String(path).includes("news.json")) return true;
      if (String(path).includes("2026-01.json")) return true;
      if (String(path).includes("archive") && !String(path).endsWith(".json")) return true;
      return false;
    });
    mockReadFileSync.mockImplementation((path) => {
      if (String(path).includes("news.json")) {
        return JSON.stringify(newsData);
      }
      if (String(path).includes("2026-01.json")) {
        return JSON.stringify(existingArchive);
      }
      return "";
    });
    mockReaddirSync.mockReturnValue(["2026-01.json"] as unknown as ReturnType<typeof readdirSync>);

    let savedArchive: string | null = null;
    mockWriteFileSync.mockImplementation((path, data) => {
      if (String(path).includes("2026-01.json")) {
        savedArchive = String(data);
      }
    });

    runArchive();

    expect(savedArchive).not.toBeNull();
    const parsed = JSON.parse(savedArchive!);
    expect(parsed.articles).toHaveLength(2); // existing + new
  });

  it("should not duplicate articles when merging", () => {
    const newsData: NewsData = {
      generatedAt: new Date().toISOString(),
      articles: [
        createArticle(1, 10),
        createArticle(2, 35),
      ],
    };

    const existingArchive = {
      month: "2026-01",
      archivedAt: "2026-02-01T00:00:00Z",
      articles: [createArticle(2, 35)], // Same article ID
    };

    mockExistsSync.mockImplementation((path) => {
      if (String(path).includes("news.json")) return true;
      if (String(path).includes("2026-01.json")) return true;
      if (String(path).includes("archive") && !String(path).endsWith(".json")) return true;
      return false;
    });
    mockReadFileSync.mockImplementation((path) => {
      if (String(path).includes("news.json")) {
        return JSON.stringify(newsData);
      }
      if (String(path).includes("2026-01.json")) {
        return JSON.stringify(existingArchive);
      }
      return "";
    });
    mockReaddirSync.mockReturnValue(["2026-01.json"] as unknown as ReturnType<typeof readdirSync>);

    let savedArchive: string | null = null;
    mockWriteFileSync.mockImplementation((path, data) => {
      if (String(path).includes("2026-01.json")) {
        savedArchive = String(data);
      }
    });

    runArchive();

    expect(savedArchive).not.toBeNull();
    const parsed = JSON.parse(savedArchive!);
    expect(parsed.articles).toHaveLength(1); // No duplicate
  });

  it("should update stats.json", () => {
    const newsData: NewsData = {
      generatedAt: new Date().toISOString(),
      articles: [
        createArticle(1, 10),
        createArticle(2, 35),
      ],
    };

    mockExistsSync.mockImplementation((path) => {
      if (String(path).includes("news.json")) return true;
      if (String(path).includes("archive")) return false;
      return false;
    });
    mockReadFileSync.mockReturnValue(JSON.stringify(newsData));
    mockReaddirSync.mockReturnValue([]);

    let savedStats: string | null = null;
    mockWriteFileSync.mockImplementation((path, data) => {
      if (String(path).includes("stats.json")) {
        savedStats = String(data);
      }
    });

    runArchive();

    expect(savedStats).not.toBeNull();
    const parsed = JSON.parse(savedStats!);
    expect(parsed.activeArticles).toBe(1);
    expect(parsed.lastUpdated).toBeDefined();
  });
});
