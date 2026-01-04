import type { NewsSource, NewsSourceConfig, NewsItem } from "../types/source.js";
import { fetchAndParse, parseJapaneseDate, resolveUrl } from "./scraper-utils.js";

const AISHINBUN_URL = "https://community.exawizards.com/aishinbun/";

export class AIShinbunSource implements NewsSource {
  readonly config: NewsSourceConfig = {
    name: "AI新聞",
    type: "aishinbun",
    language: "ja",
    enabled: true,
  };

  async fetchNews(limit: number): Promise<NewsItem[]> {
    console.log(`Fetching news from ${this.config.name}...`);

    const $ = await fetchAndParse(AISHINBUN_URL);
    const newsItems: NewsItem[] = [];

    // 記事カードを取得
    const cardSelectors = [
      ".exa-archive-card--type-1",
      ".exa-archive-card--type-2",
      ".exa-archive-card--type-3",
      ".exa-archive-two-columns-layout__list-of-articles__card",
    ];

    const cards = $(cardSelectors.join(", "));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cards.each((index: number, element: any) => {
      if (newsItems.length >= limit) return false;

      const $card = $(element);

      // リンクとタイトルを取得
      const $link = $card.find("a").first();
      const href = $link.attr("href");
      const title =
        $card.find("h2, h3").first().text().trim() ||
        $link.text().trim();

      if (!title || !href) return;

      // 日付を取得（"YYYY/M/D" 形式を探す）
      const cardText = $card.text();
      const dateMatch = cardText.match(/(\d{4}\/\d{1,2}\/\d{1,2})/);
      const publishedAt = dateMatch
        ? parseJapaneseDate(dateMatch[1])
        : new Date();

      newsItems.push({
        id: `aishinbun-${index}-${Date.now()}`,
        title,
        url: resolveUrl(AISHINBUN_URL, href),
        author: null,
        publishedAt,
        source: this.config.type,
      });
    });

    console.log(`Found ${newsItems.length} articles from ${this.config.name}`);
    return newsItems;
  }
}

export const aishinbunSource = new AIShinbunSource();
