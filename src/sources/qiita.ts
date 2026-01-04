import type { NewsSource, NewsSourceConfig, NewsItem } from "../types/source.js";
import { fetchAtomFeed, parseDate } from "./rss.js";

const QIITA_FEED_URLS = [
  "https://qiita.com/tags/machinelearning/feed",
  "https://qiita.com/tags/ai/feed",
  "https://qiita.com/tags/llm/feed",
];

export class QiitaSource implements NewsSource {
  readonly config: NewsSourceConfig = {
    name: "Qiita",
    type: "qiita",
    language: "ja",
    enabled: true,
  };

  async fetchNews(limit: number): Promise<NewsItem[]> {
    console.log(`Fetching news from ${this.config.name}...`);

    const allItems: NewsItem[] = [];
    const seenUrls = new Set<string>();

    for (const feedUrl of QIITA_FEED_URLS) {
      try {
        const entries = await fetchAtomFeed(feedUrl);
        for (const entry of entries) {
          const link =
            typeof entry.link === "object" ? entry.link?.href : entry.link;
          if (!link || seenUrls.has(link)) continue;
          seenUrls.add(link);

          allItems.push({
            id: `qiita-${entry.id || link}`,
            title: entry.title || "Untitled",
            url: link,
            author: entry.author?.name || null,
            publishedAt: parseDate(entry.published || entry.updated),
            source: this.config.type,
            metadata: {
              content: entry.content || entry.summary,
            },
          });
        }
      } catch (error) {
        console.error(`Failed to fetch ${feedUrl}:`, error);
      }
    }

    // 日付順でソートして最新の記事を返す
    const sorted = allItems.sort(
      (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
    );

    console.log(`Found ${Math.min(sorted.length, limit)} articles from ${this.config.name}`);
    return sorted.slice(0, limit);
  }
}

export const qiitaSource = new QiitaSource();
