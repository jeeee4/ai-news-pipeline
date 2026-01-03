import type { HNStory, AINewsItem } from "../types/hackernews.js";

const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";

// AI関連のキーワード
const AI_KEYWORDS = [
  "ai",
  "artificial intelligence",
  "machine learning",
  "ml",
  "deep learning",
  "neural network",
  "gpt",
  "llm",
  "chatgpt",
  "openai",
  "anthropic",
  "claude",
  "gemini",
  "transformer",
  "diffusion",
  "stable diffusion",
  "midjourney",
  "generative ai",
  "langchain",
  "rag",
  "embedding",
];

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getTopStoryIds(limit = 100): Promise<number[]> {
  const ids = await fetchJson<number[]>(`${HN_API_BASE}/topstories.json`);
  return ids.slice(0, limit);
}

export async function getNewStoryIds(limit = 100): Promise<number[]> {
  const ids = await fetchJson<number[]>(`${HN_API_BASE}/newstories.json`);
  return ids.slice(0, limit);
}

export async function getStory(id: number): Promise<HNStory | null> {
  try {
    return await fetchJson<HNStory>(`${HN_API_BASE}/item/${id}.json`);
  } catch {
    return null;
  }
}

export async function getStories(ids: number[]): Promise<HNStory[]> {
  const stories = await Promise.all(ids.map(getStory));
  return stories.filter((story): story is HNStory => story !== null);
}

function isAIRelated(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return AI_KEYWORDS.some((keyword) => lowerTitle.includes(keyword));
}

export async function getAINews(limit = 20): Promise<AINewsItem[]> {
  console.log("Fetching top stories from Hacker News...");

  const storyIds = await getTopStoryIds(200);
  const stories = await getStories(storyIds);

  const aiStories = stories
    .filter((story) => story.type === "story" && isAIRelated(story.title))
    .slice(0, limit);

  console.log(`Found ${aiStories.length} AI-related stories`);

  return aiStories.map((story) => ({
    id: story.id,
    title: story.title,
    url: story.url ?? null,
    author: story.by,
    score: story.score,
    commentsCount: story.descendants ?? 0,
    postedAt: new Date(story.time * 1000),
  }));
}
