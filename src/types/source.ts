/**
 * 共通ニュースアイテムインターフェース
 * 全てのニュースソースがこの形式に変換される
 */
export interface NewsItem {
  id: string;
  title: string;
  url: string | null;
  author: string | null;
  publishedAt: Date;
  source: NewsSourceType;
  /** ソース固有のメタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * サポートするニュースソースの種類
 */
export type NewsSourceType =
  | "hackernews"
  | "itmedia"
  | "qiita"
  | "ainow"
  | "ledge"
  | "aishinbun";

/**
 * ニュースソースの設定
 */
export interface NewsSourceConfig {
  name: string;
  type: NewsSourceType;
  language: "ja" | "en";
  enabled: boolean;
}

/**
 * ニュースソースインターフェース
 * 全てのニュースソースアダプターはこのインターフェースを実装する
 */
export interface NewsSource {
  readonly config: NewsSourceConfig;

  /**
   * ニュースアイテムを取得する
   * @param limit 取得する最大件数
   * @returns ニュースアイテムの配列
   */
  fetchNews(limit: number): Promise<NewsItem[]>;
}

/**
 * RSSフィードのアイテム構造
 */
export interface RSSItem {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  author?: string;
  guid?: string;
}

/**
 * Atomフィードのエントリ構造
 */
export interface AtomEntry {
  id?: string;
  title?: string;
  link?: { href?: string } | string;
  published?: string;
  updated?: string;
  author?: { name?: string };
  content?: string;
  summary?: string;
}
