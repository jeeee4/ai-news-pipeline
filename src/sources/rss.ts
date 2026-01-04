import { load } from "cheerio";
import type { RSSItem, AtomEntry } from "../types/source.js";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * RSSフィードを取得してパースする
 */
export async function fetchRSSFeed(url: string): Promise<RSSItem[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      Accept: "application/rss+xml, application/xml, text/xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS feed: ${response.status}`);
  }

  const xml = await response.text();
  return parseRSS(xml);
}

/**
 * RSS 2.0フィードをパースする
 */
export function parseRSS(xml: string): RSSItem[] {
  const $ = load(xml, { xmlMode: true });
  const items: RSSItem[] = [];

  $("item").each((_, element) => {
    const $item = $(element);
    items.push({
      title: $item.find("title").text().trim() || undefined,
      link: $item.find("link").text().trim() || undefined,
      description: $item.find("description").text().trim() || undefined,
      pubDate: $item.find("pubDate").text().trim() || undefined,
      author:
        $item.find("author").text().trim() ||
        $item.find("dc\\:creator").text().trim() ||
        undefined,
      guid: $item.find("guid").text().trim() || undefined,
    });
  });

  return items;
}

/**
 * Atomフィードを取得してパースする
 */
export async function fetchAtomFeed(url: string): Promise<AtomEntry[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      Accept: "application/atom+xml, application/xml, text/xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Atom feed: ${response.status}`);
  }

  const xml = await response.text();
  return parseAtom(xml);
}

/**
 * Atomフィードをパースする
 */
export function parseAtom(xml: string): AtomEntry[] {
  const $ = load(xml, { xmlMode: true });
  const entries: AtomEntry[] = [];

  $("entry").each((_, element) => {
    const $entry = $(element);
    const linkEl = $entry.find('link[rel="alternate"]').first();
    const linkHref =
      linkEl.attr("href") || $entry.find("link").first().attr("href");

    entries.push({
      id: $entry.find("id").text().trim() || undefined,
      title: $entry.find("title").text().trim() || undefined,
      link: linkHref ? { href: linkHref } : undefined,
      published: $entry.find("published").text().trim() || undefined,
      updated: $entry.find("updated").text().trim() || undefined,
      author: {
        name: $entry.find("author name").text().trim() || undefined,
      },
      content: $entry.find("content").text().trim() || undefined,
      summary: $entry.find("summary").text().trim() || undefined,
    });
  });

  return entries;
}

/**
 * 日付文字列をDateオブジェクトに変換する
 */
export function parseDate(dateStr: string | undefined): Date {
  if (!dateStr) {
    return new Date();
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}
