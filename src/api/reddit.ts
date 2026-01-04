import type { AINewsItem } from "../types/hackernews.js";
import type {
  RedditListingResponse,
  RedditPostData,
  RedditFetchOptions,
} from "../types/reddit.js";
import { DEFAULT_AI_SUBREDDITS } from "../types/reddit.js";

const REDDIT_BASE_URL = "https://www.reddit.com";
const USER_AGENT = "ai-news-pipeline/1.0";

// Rate limiting: Reddit recommends max 60 requests per minute
const DELAY_BETWEEN_REQUESTS_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRedditJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (response.status === 429) {
    throw new Error("Reddit rate limit exceeded. Please try again later.");
  }

  if (!response.ok) {
    throw new Error(`Reddit API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getSubredditPosts(
  subreddit: string,
  sort: "hot" | "top" | "new" = "hot",
  timeframe: string = "day",
  limit: number = 25
): Promise<RedditPostData[]> {
  const url = new URL(`${REDDIT_BASE_URL}/r/${subreddit}/${sort}.json`);
  url.searchParams.set("limit", String(limit));

  if (sort === "top") {
    url.searchParams.set("t", timeframe);
  }

  try {
    const response = await fetchRedditJson<RedditListingResponse>(
      url.toString()
    );
    return response.data.children
      .map((child) => child.data)
      .filter((post) => !post.stickied && !post.over_18);
  } catch (error) {
    console.error(`Failed to fetch r/${subreddit}:`, error);
    return [];
  }
}

function convertToAINewsItem(post: RedditPostData): AINewsItem {
  // For self posts, use the Reddit permalink as the URL
  const postUrl = post.is_self
    ? `${REDDIT_BASE_URL}${post.permalink}`
    : post.url;

  return {
    id: hashStringToNumber(post.id),
    title: `[r/${post.subreddit}] ${post.title}`,
    url: postUrl,
    author: post.author,
    score: post.score,
    commentsCount: post.num_comments,
    postedAt: new Date(post.created_utc * 1000),
  };
}

// Convert Reddit's string ID to a numeric ID for compatibility with AINewsItem
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Ensure positive number and add offset to avoid collision with HN IDs
  return Math.abs(hash) + 1_000_000_000;
}

export async function getRedditAINews(
  options: Partial<RedditFetchOptions> = {}
): Promise<AINewsItem[]> {
  const {
    subreddits = DEFAULT_AI_SUBREDDITS,
    sort = "hot",
    timeframe = "day",
    minScore = 10,
    limit = 20,
  } = options;

  console.log(`Fetching posts from Reddit: ${subreddits.join(", ")}...`);

  const allPosts: RedditPostData[] = [];

  for (const subreddit of subreddits) {
    const posts = await getSubredditPosts(subreddit, sort, timeframe, 50);
    allPosts.push(...posts);

    // Rate limiting between subreddit requests
    if (subreddits.indexOf(subreddit) < subreddits.length - 1) {
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }
  }

  // Filter by minimum score and sort by score descending
  const filteredPosts = allPosts
    .filter((post) => post.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  console.log(
    `Found ${filteredPosts.length} Reddit posts (score >= ${minScore})`
  );

  return filteredPosts.map(convertToAINewsItem);
}
