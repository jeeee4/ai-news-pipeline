import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTopStoryIds,
  getNewStoryIds,
  getStory,
  getStories,
  getAINews,
} from "./hackernews.js";
import type { HNStory } from "../types/hackernews.js";

// モックfetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("getTopStoryIds", () => {
  it("should fetch top story IDs", async () => {
    const mockIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIds,
    });

    const result = await getTopStoryIds(5);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://hacker-news.firebaseio.com/v0/topstories.json"
    );
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  it("should throw error on fetch failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(getTopStoryIds()).rejects.toThrow("HTTP error! status: 500");
  });
});

describe("getNewStoryIds", () => {
  it("should fetch new story IDs", async () => {
    const mockIds = [10, 20, 30];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIds,
    });

    const result = await getNewStoryIds(2);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://hacker-news.firebaseio.com/v0/newstories.json"
    );
    expect(result).toEqual([10, 20]);
  });
});

describe("getStory", () => {
  it("should fetch a single story", async () => {
    const mockStory: HNStory = {
      id: 123,
      title: "Test Story",
      url: "https://example.com",
      by: "testuser",
      time: 1704067200,
      score: 100,
      descendants: 50,
      type: "story",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStory,
    });

    const result = await getStory(123);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://hacker-news.firebaseio.com/v0/item/123.json"
    );
    expect(result).toEqual(mockStory);
  });

  it("should return null on fetch error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await getStory(123);

    expect(result).toBeNull();
  });
});

describe("getStories", () => {
  it("should fetch multiple stories and filter out nulls", async () => {
    const mockStory1: HNStory = {
      id: 1,
      title: "Story 1",
      by: "user1",
      time: 1704067200,
      score: 50,
      type: "story",
    };
    const mockStory2: HNStory = {
      id: 2,
      title: "Story 2",
      by: "user2",
      time: 1704067200,
      score: 100,
      type: "story",
    };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockStory1 })
      .mockRejectedValueOnce(new Error("Failed"))
      .mockResolvedValueOnce({ ok: true, json: async () => mockStory2 });

    const result = await getStories([1, 999, 2]);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });
});

describe("getAINews", () => {
  it("should filter AI-related stories", async () => {
    const mockIds = [1, 2, 3];
    const mockStories: HNStory[] = [
      {
        id: 1,
        title: "OpenAI releases new GPT model",
        by: "user1",
        time: 1704067200,
        score: 200,
        descendants: 100,
        type: "story",
        url: "https://example.com/openai",
      },
      {
        id: 2,
        title: "JavaScript framework comparison",
        by: "user2",
        time: 1704067200,
        score: 150,
        type: "story",
      },
      {
        id: 3,
        title: "Claude AI improves reasoning",
        by: "user3",
        time: 1704067200,
        score: 180,
        descendants: 80,
        type: "story",
        url: "https://example.com/claude",
      },
    ];

    // Mock for getTopStoryIds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIds,
    });

    // Mock for each getStory call
    mockStories.forEach((story) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => story,
      });
    });

    const result = await getAINews(10);

    expect(result).toHaveLength(2);
    expect(result[0].title).toContain("OpenAI");
    expect(result[1].title).toContain("Claude");
  });

  it("should return AINewsItem format", async () => {
    const mockIds = [1];
    const mockStory: HNStory = {
      id: 1,
      title: "Machine Learning breakthrough",
      by: "mluser",
      time: 1704067200,
      score: 300,
      descendants: 150,
      type: "story",
      url: "https://example.com/ml",
    };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockIds })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStory });

    const result = await getAINews(1);

    expect(result[0]).toEqual({
      id: 1,
      title: "Machine Learning breakthrough",
      url: "https://example.com/ml",
      author: "mluser",
      score: 300,
      commentsCount: 150,
      postedAt: new Date(1704067200 * 1000),
    });
  });
});
