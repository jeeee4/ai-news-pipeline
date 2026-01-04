import type { NewsSource, NewsSourceConfig, NewsItem } from "../types/source.js";
import { fetchRSSFeed, parseDate } from "./rss.js";

const ITMEDIA_RSS_URL = "https://rss.itmedia.co.jp/rss/2.0/aiplus.xml";

export class ITMediaSource implements NewsSource {
  readonly config: NewsSourceConfig = {
    name: "ITmedia AI+",
    type: "itmedia",
    language: "ja",
    enabled: true,
  };

  async fetchNews(limit: number): Promise<NewsItem[]> {
    console.log(`Fetching news from ${this.config.name}...`);

    const items = await fetchRSSFeed(ITMEDIA_RSS_URL);
    const newsItems = items.slice(0, limit).map((item, index) => ({
      id: `itmedia-${item.guid || index}`,
      title: item.title || "Untitled",
      url: item.link || null,
      author: item.author || null,
      publishedAt: parseDate(item.pubDate),
      source: this.config.type,
      metadata: {
        description: item.description,
      },
    })) as NewsItem[];

    console.log(`Found ${newsItems.length} articles from ${this.config.name}`);
    return newsItems;
  }
}

export const itmediaSource = new ITMediaSource();
