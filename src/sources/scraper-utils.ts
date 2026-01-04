import { load } from "cheerio";

type CheerioRoot = ReturnType<typeof load>;

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * HTMLページを取得してCheerioでパースする
 */
export async function fetchAndParse(url: string): Promise<CheerioRoot> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ja,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  return load(html);
}

/**
 * 日本語の日付文字列をパースする
 * 例: "2024/1/15", "2024.01.15", "2024年1月15日"
 */
export function parseJapaneseDate(dateStr: string): Date {
  // 空白やカッコ内の曜日を除去
  const cleaned = dateStr.replace(/\s*[\(（].*?[\)）]\s*/g, "").trim();

  // 様々な日本語日付形式をパース
  const patterns = [
    /(\d{4})[\/\.\-年](\d{1,2})[\/\.\-月](\d{1,2})日?/,
    /(\d{4})(\d{2})(\d{2})/, // YYYYMMDD
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const [, year, month, day] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
  }

  // ISO形式を試す
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  return new Date();
}

/**
 * 相対URLを絶対URLに変換する
 */
export function resolveUrl(base: string, relative: string): string {
  if (relative.startsWith("http://") || relative.startsWith("https://")) {
    return relative;
  }
  const baseUrl = new URL(base);
  return new URL(relative, baseUrl).toString();
}
