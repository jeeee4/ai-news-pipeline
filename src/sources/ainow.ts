import type { NewsSource, NewsSourceConfig, NewsItem } from "../types/source.js";
import { fetchAndParse, parseJapaneseDate, resolveUrl } from "./scraper-utils.js";

const AINOW_URL = "https://ainow.ai/";

export class AINowSource implements NewsSource {
  readonly config: NewsSourceConfig = {
    name: "AINOW",
    type: "ainow",
    language: "ja",
    enabled: true,
  };

  async fetchNews(limit: number): Promise<NewsItem[]> {
    console.log(`Fetching news from ${this.config.name}...`);

    const $ = await fetchAndParse(AINOW_URL);
    const newsItems: NewsItem[] = [];
    const seenUrls = new Set<string>();

    // 記事リンクを取得（WordPress系の構造）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $("article, .post, .entry, [class*='article'], [class*='post']").each(
      (index: number, element: any) => {
        if (newsItems.length >= limit) return false;

        const $article = $(element);

        // タイトルとリンクを取得
        const $titleLink =
          $article.find("h2 a, h3 a, .entry-title a, [class*='title'] a").first();
        let href = $titleLink.attr("href");
        let title = $titleLink.text().trim();

        // タイトルリンクがない場合、記事内の最初のリンクを試す
        if (!href) {
          const $link = $article.find("a[href*='ainow.ai']").first();
          href = $link.attr("href");
          title = title || $article.find("h2, h3, [class*='title']").first().text().trim();
        }

        if (!title || !href) return;
        if (seenUrls.has(href)) return;
        seenUrls.add(href);

        // 日付を取得
        const $time = $article.find("time, .entry-date, [class*='date']").first();
        const dateText =
          $time.attr("datetime") || $time.text().trim() || "";
        const publishedAt = parseJapaneseDate(dateText);

        // 著者を取得
        const author =
          $article.find(".author, .entry-author, [class*='author']").first().text().trim() ||
          null;

        newsItems.push({
          id: `ainow-${index}-${Date.now()}`,
          title,
          url: resolveUrl(AINOW_URL, href),
          author,
          publishedAt,
          source: this.config.type,
        });
      }
    );

    // 記事が見つからない場合、別のセレクターを試す（日付付きURL）
    if (newsItems.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $("a[href*='ainow.ai/20']").each((index: number, element: any) => {
        if (newsItems.length >= limit) return false;

        const $link = $(element);
        const href = $link.attr("href");
        const title = $link.text().trim();

        // タグページやカテゴリページを除外
        if (!title || !href || title.length < 10) return;
        if (href.includes("/tag/") || href.includes("/category/")) return;
        if (seenUrls.has(href)) return;
        seenUrls.add(href);

        // URLから日付を抽出
        const dateMatch = href.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
        const publishedAt = dateMatch
          ? new Date(
              parseInt(dateMatch[1]),
              parseInt(dateMatch[2]) - 1,
              parseInt(dateMatch[3])
            )
          : new Date();

        newsItems.push({
          id: `ainow-${index}-${Date.now()}`,
          title,
          url: href,
          author: null,
          publishedAt,
          source: this.config.type,
        });
      });
    }

    console.log(`Found ${newsItems.length} articles from ${this.config.name}`);
    return newsItems;
  }
}

export const ainowSource = new AINowSource();
