import Parser from "rss-parser";
import type { BlogSource, BlogNewsItem, RSSFeed, RSSFeedItem } from "../types/rss.js";

const parser = new Parser();

export const BLOG_SOURCES: BlogSource[] = [
  {
    id: "openai",
    name: "OpenAI",
    feedUrl: "https://openai.com/news/rss.xml",
    siteUrl: "https://openai.com",
  },
  {
    id: "google-research",
    name: "Google Research",
    feedUrl: "https://research.google/blog/rss",
    siteUrl: "https://research.google",
  },
  {
    id: "microsoft-research",
    name: "Microsoft Research",
    feedUrl: "https://www.microsoft.com/en-us/research/blog/feed/",
    siteUrl: "https://www.microsoft.com/en-us/research",
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    feedUrl: "https://huggingface.co/blog/feed.xml",
    siteUrl: "https://huggingface.co",
  },
];

export async function fetchRSSFeed(source: BlogSource): Promise<RSSFeed> {
  console.log(`Fetching RSS feed from ${source.name}...`);

  const feed = await parser.parseURL(source.feedUrl);

  const items: RSSFeedItem[] = feed.items.map((item) => ({
    title: item.title ?? "",
    link: item.link ?? "",
    description: item.contentSnippet ?? item.content ?? null,
    pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
    guid: item.guid ?? item.link ?? "",
    categories: item.categories ?? [],
  }));

  return {
    title: feed.title ?? source.name,
    description: feed.description ?? null,
    link: feed.link ?? source.siteUrl,
    items,
  };
}

export async function fetchAllBlogNews(
  sources: BlogSource[] = BLOG_SOURCES,
  limit = 10
): Promise<BlogNewsItem[]> {
  console.log(`Fetching news from ${sources.length} blog sources...`);

  const allItems: BlogNewsItem[] = [];

  for (const source of sources) {
    try {
      const feed = await fetchRSSFeed(source);
      const items = feed.items.slice(0, limit).map((item) => ({
        id: `${source.id}-${item.guid}`,
        title: item.title,
        url: item.link,
        description: item.description,
        source: source.name,
        postedAt: item.pubDate,
      }));
      allItems.push(...items);
      console.log(`  - ${source.name}: ${items.length} items`);
    } catch (error) {
      console.error(`  - ${source.name}: Failed to fetch`, error);
    }
  }

  // Sort by date (newest first)
  allItems.sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());

  console.log(`Total blog news items: ${allItems.length}`);
  return allItems;
}

export async function getBlogNews(limit = 20): Promise<BlogNewsItem[]> {
  return fetchAllBlogNews(BLOG_SOURCES, limit);
}
