import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSubredditPosts, getRedditAINews } from "./reddit.js";
import type { RedditListingResponse } from "../types/reddit.js";

// モックfetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const createMockPost = (
  id: string,
  title: string,
  score: number,
  subreddit: string = "MachineLearning"
) => ({
  kind: "t3" as const,
  data: {
    id,
    title,
    url: `https://example.com/${id}`,
    selftext: "",
    author: `user_${id}`,
    score,
    num_comments: Math.floor(score / 2),
    created_utc: 1704067200,
    subreddit,
    is_self: false,
    permalink: `/r/${subreddit}/comments/${id}/`,
    over_18: false,
    stickied: false,
  },
});

const createMockResponse = (
  posts: ReturnType<typeof createMockPost>[]
): RedditListingResponse => ({
  kind: "Listing",
  data: {
    children: posts,
    after: null,
    before: null,
  },
});

describe("getSubredditPosts", () => {
  it("should fetch posts from a subreddit", async () => {
    const mockPosts = [
      createMockPost("abc123", "New LLM Research", 500),
      createMockPost("def456", "GPT-5 announcement", 1200),
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse(mockPosts),
    });

    const result = await getSubredditPosts("MachineLearning", "hot", "day", 25);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.reddit.com/r/MachineLearning/hot.json?limit=25",
      expect.objectContaining({
        headers: { "User-Agent": "ai-news-pipeline/1.0" },
      })
    );
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("New LLM Research");
  });

  it("should filter out stickied posts", async () => {
    const normalPost = createMockPost("abc123", "Normal Post", 500);
    const stickiedPost = createMockPost("sticky", "Stickied Post", 100);
    stickiedPost.data.stickied = true;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse([normalPost, stickiedPost]),
    });

    const result = await getSubredditPosts("MachineLearning");

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Normal Post");
  });

  it("should filter out NSFW posts", async () => {
    const normalPost = createMockPost("abc123", "Normal Post", 500);
    const nsfwPost = createMockPost("nsfw", "NSFW Post", 100);
    nsfwPost.data.over_18 = true;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse([normalPost, nsfwPost]),
    });

    const result = await getSubredditPosts("MachineLearning");

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Normal Post");
  });

  it("should add timeframe param for top sort", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse([]),
    });

    await getSubredditPosts("MachineLearning", "top", "week");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.reddit.com/r/MachineLearning/top.json?limit=25&t=week",
      expect.any(Object)
    );
  });

  it("should return empty array on fetch error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await getSubredditPosts("MachineLearning");

    expect(result).toEqual([]);
  });

  it("should throw on rate limit", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    const result = await getSubredditPosts("MachineLearning");

    expect(result).toEqual([]);
  });
});

describe("getRedditAINews", () => {
  it("should fetch and filter posts by score", async () => {
    const highScorePost = createMockPost("high", "High Score Post", 500);
    const lowScorePost = createMockPost("low", "Low Score Post", 5);

    // First subreddit
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse([highScorePost, lowScorePost]),
    });

    const result = await getRedditAINews({
      subreddits: ["MachineLearning"],
      minScore: 10,
      limit: 10,
    });

    expect(result).toHaveLength(1);
    expect(result[0].title).toContain("High Score Post");
  });

  it("should sort posts by score descending", async () => {
    const posts = [
      createMockPost("a", "Post A", 100, "MachineLearning"),
      createMockPost("b", "Post B", 500, "MachineLearning"),
      createMockPost("c", "Post C", 300, "MachineLearning"),
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse(posts),
    });

    const result = await getRedditAINews({
      subreddits: ["MachineLearning"],
      minScore: 10,
    });

    expect(result[0].score).toBe(500);
    expect(result[1].score).toBe(300);
    expect(result[2].score).toBe(100);
  });

  it("should return AINewsItem format", async () => {
    const post = createMockPost("test123", "Test Post", 200, "LocalLLaMA");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse([post]),
    });

    const result = await getRedditAINews({
      subreddits: ["LocalLLaMA"],
      minScore: 10,
    });

    expect(result[0]).toMatchObject({
      title: "[r/LocalLLaMA] Test Post",
      url: "https://example.com/test123",
      author: "user_test123",
      score: 200,
      commentsCount: 100,
    });
    expect(result[0].id).toBeTypeOf("number");
    expect(result[0].postedAt).toBeInstanceOf(Date);
  });

  it("should use Reddit permalink for self posts", async () => {
    const selfPost = createMockPost("self123", "Self Post", 100, "artificial");
    selfPost.data.is_self = true;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse([selfPost]),
    });

    const result = await getRedditAINews({
      subreddits: ["artificial"],
      minScore: 10,
    });

    expect(result[0].url).toBe(
      "https://www.reddit.com/r/artificial/comments/self123/"
    );
  });

  it("should respect limit option", async () => {
    const posts = Array.from({ length: 10 }, (_, i) =>
      createMockPost(`post${i}`, `Post ${i}`, 100 + i * 10)
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse(posts),
    });

    const result = await getRedditAINews({
      subreddits: ["MachineLearning"],
      minScore: 10,
      limit: 3,
    });

    expect(result).toHaveLength(3);
  });
});
