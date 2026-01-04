import type { NewsSource, NewsSourceConfig, NewsItem } from "../types/source.js";
import { getAINews } from "../api/hackernews.js";

export class HackerNewsSource implements NewsSource {
  readonly config: NewsSourceConfig = {
    name: "Hacker News",
    type: "hackernews",
    language: "en",
    enabled: true,
  };

  async fetchNews(limit: number): Promise<NewsItem[]> {
    const aiNews = await getAINews(limit);

    return aiNews.map((item) => ({
      id: `hn-${item.id}`,
      title: item.title,
      url: item.url,
      author: item.author,
      publishedAt: item.postedAt,
      source: this.config.type,
      metadata: {
        score: item.score,
        commentsCount: item.commentsCount,
        hnId: item.id,
      },
    })) as NewsItem[];
  }
}

export const hackerNewsSource = new HackerNewsSource();
