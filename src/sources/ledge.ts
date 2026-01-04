import type { NewsSource, NewsSourceConfig, NewsItem } from "../types/source.js";
import { fetchAndParse, resolveUrl } from "./scraper-utils.js";

const LEDGE_URL = "https://ledge.ai/";

interface LedgeArticle {
  id?: number;
  attributes?: {
    title?: string;
    slug?: string;
    scheduled_at?: string;
    publishedAt?: string;
    editor?: {
      data?: {
        attributes?: {
          name?: string;
        };
      };
    };
  };
}

export class LedgeSource implements NewsSource {
  readonly config: NewsSourceConfig = {
    name: "Ledge.ai",
    type: "ledge",
    language: "ja",
    enabled: true,
  };

  async fetchNews(limit: number): Promise<NewsItem[]> {
    console.log(`Fetching news from ${this.config.name}...`);

    const $ = await fetchAndParse(LEDGE_URL);
    const newsItems: NewsItem[] = [];

    // Nuxt.jsの埋め込みJSONデータを探す
    const scripts = $("script").toArray();
    for (const script of scripts) {
      const content = $(script).html() || "";

      // __NUXT__ データを探す
      if (content.includes("__NUXT__") || content.includes("fetchNewestArticles")) {
        try {
          const articles = this.extractArticlesFromNuxt(content);
          for (const article of articles.slice(0, limit)) {
            newsItems.push(article);
          }
          if (newsItems.length > 0) break;
        } catch {
          // JSONパース失敗、次のスクリプトを試す
        }
      }
    }

    // JSONデータが見つからない場合、HTMLからスクレイピング
    if (newsItems.length === 0) {
      const seenUrls = new Set<string>();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $("a[href*='/articles/']").each((index: number, element: any) => {
        if (newsItems.length >= limit) return false;

        const $link = $(element);
        const href = $link.attr("href");
        if (!href || seenUrls.has(href)) return;

        // 記事タイトルを探す
        const $container = $link.closest("article, div, li");
        const title =
          $container.find("h2, h3, [class*='title']").first().text().trim() ||
          $link.text().trim();

        if (!title || title.length < 5) return;
        seenUrls.add(href);

        // 日付を探す
        const dateText = $container
          .find("time, [class*='date']")
          .first()
          .text()
          .trim();
        const publishedAt = dateText ? new Date(dateText) : new Date();

        newsItems.push({
          id: `ledge-${index}-${Date.now()}`,
          title,
          url: resolveUrl(LEDGE_URL, href),
          author: null,
          publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
          source: this.config.type,
        });
      });
    }

    console.log(`Found ${newsItems.length} articles from ${this.config.name}`);
    return newsItems;
  }

  private extractArticlesFromNuxt(scriptContent: string): NewsItem[] {
    const articles: NewsItem[] = [];

    // JSON配列を抽出するパターン
    const patterns = [
      /\["fetchNewestArticles"[^\]]*\],(\{[^}]+\})/g,
      /"data":\s*(\[[\s\S]*?\])/g,
    ];

    for (const pattern of patterns) {
      const matches = scriptContent.matchAll(pattern);
      for (const match of matches) {
        try {
          const data = JSON.parse(match[1]) as LedgeArticle[];
          if (Array.isArray(data)) {
            for (const item of data) {
              const attrs = item.attributes;
              if (!attrs?.title || !attrs?.slug) continue;

              articles.push({
                id: `ledge-${item.id || Date.now()}`,
                title: attrs.title,
                url: `https://ledge.ai/articles/${attrs.slug}`,
                author: attrs.editor?.data?.attributes?.name || null,
                publishedAt: new Date(
                  attrs.scheduled_at || attrs.publishedAt || Date.now()
                ),
                source: this.config.type,
              });
            }
          }
        } catch {
          // パース失敗、次のパターンを試す
        }
      }
    }

    return articles;
  }
}

export const ledgeSource = new LedgeSource();
