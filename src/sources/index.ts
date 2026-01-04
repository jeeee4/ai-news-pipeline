import type { NewsSource, NewsItem, NewsSourceType } from "../types/source.js";
import { hackerNewsSource } from "./hackernews.js";
import { itmediaSource } from "./itmedia.js";
import { qiitaSource } from "./qiita.js";

export interface SourceManagerOptions {
  /** 有効にするソースタイプ（指定しない場合は全て有効） */
  enabledSources?: NewsSourceType[];
  /** 日本語ソースのみを使用する */
  japaneseOnly?: boolean;
  /** 英語ソースのみを使用する */
  englishOnly?: boolean;
}

/**
 * 複数のニュースソースを統合管理するクラス
 */
export class SourceManager {
  private sources: NewsSource[] = [
    hackerNewsSource,
    itmediaSource,
    qiitaSource,
  ];

  /**
   * 有効なソースを取得する
   */
  getEnabledSources(options: SourceManagerOptions = {}): NewsSource[] {
    let filtered = this.sources.filter((source) => source.config.enabled);

    if (options.enabledSources) {
      filtered = filtered.filter((source) =>
        options.enabledSources!.includes(source.config.type)
      );
    }

    if (options.japaneseOnly) {
      filtered = filtered.filter((source) => source.config.language === "ja");
    }

    if (options.englishOnly) {
      filtered = filtered.filter((source) => source.config.language === "en");
    }

    return filtered;
  }

  /**
   * 全ての有効なソースからニュースを取得する
   */
  async fetchAllNews(
    limitPerSource: number,
    options: SourceManagerOptions = {}
  ): Promise<NewsItem[]> {
    const sources = this.getEnabledSources(options);
    console.log(
      `Fetching news from ${sources.length} sources: ${sources.map((s) => s.config.name).join(", ")}`
    );

    const results = await Promise.allSettled(
      sources.map((source) => source.fetchNews(limitPerSource))
    );

    const allNews: NewsItem[] = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        allNews.push(...result.value);
      } else {
        console.error(
          `Failed to fetch from ${sources[index].config.name}:`,
          result.reason
        );
      }
    });

    // 重複を除去（URLベース）
    const seenUrls = new Set<string>();
    const deduped = allNews.filter((item) => {
      if (!item.url) return true;
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    });

    // 日付順でソート（新しい順）
    deduped.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    console.log(`Total: ${deduped.length} unique articles`);
    return deduped;
  }

  /**
   * 日本語ソースからのみニュースを取得する
   */
  async fetchJapaneseNews(limitPerSource: number): Promise<NewsItem[]> {
    return this.fetchAllNews(limitPerSource, { japaneseOnly: true });
  }

  /**
   * 登録されているソースの一覧を取得する
   */
  listSources(): Array<{ name: string; type: NewsSourceType; language: string; enabled: boolean }> {
    return this.sources.map((source) => ({
      name: source.config.name,
      type: source.config.type,
      language: source.config.language,
      enabled: source.config.enabled,
    }));
  }
}

export const sourceManager = new SourceManager();

// Re-export individual sources and types
export { hackerNewsSource } from "./hackernews.js";
export { itmediaSource } from "./itmedia.js";
export { qiitaSource } from "./qiita.js";
export type { NewsSource, NewsItem, NewsSourceType } from "../types/source.js";
