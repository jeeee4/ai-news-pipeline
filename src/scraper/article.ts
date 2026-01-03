import * as cheerio from "cheerio";
import type { ArticleContent, ScrapingResult } from "../types/article.js";

type CheerioAPI = ReturnType<typeof cheerio.load>;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const TIMEOUT_MS = 10000;

// 削除する要素のセレクタ
const REMOVE_SELECTORS = [
  "script",
  "style",
  "nav",
  "header",
  "footer",
  "aside",
  "iframe",
  "noscript",
  ".advertisement",
  ".ads",
  ".ad",
  ".sidebar",
  ".comments",
  ".comment",
  ".social-share",
  ".related-posts",
  "[role='navigation']",
  "[role='banner']",
  "[role='complementary']",
];

// 本文として優先するセレクタ
const CONTENT_SELECTORS = [
  "article",
  "[role='main']",
  "main",
  ".post-content",
  ".article-content",
  ".entry-content",
  ".content",
  ".post-body",
  "#content",
];

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en;q=0.9",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractContent($: CheerioAPI): string {
  // 不要な要素を削除
  REMOVE_SELECTORS.forEach((selector) => {
    $(selector).remove();
  });

  // 本文要素を探す
  for (const selector of CONTENT_SELECTORS) {
    const element = $(selector);
    if (element.length > 0) {
      const text = element.first().text();
      const cleaned = cleanText(text);
      if (cleaned.length > 100) {
        return cleaned;
      }
    }
  }

  // フォールバック: body全体から抽出
  const bodyText = $("body").text();
  return cleanText(bodyText);
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ") // 連続する空白を1つに
    .replace(/\n+/g, "\n") // 連続する改行を1つに
    .trim();
}

function extractTitle($: CheerioAPI): string {
  // og:titleを優先
  const ogTitle = $('meta[property="og:title"]').attr("content");
  if (ogTitle) return ogTitle;

  // 通常のtitleタグ
  const title = $("title").text();
  if (title) return cleanText(title);

  // h1タグ
  const h1 = $("h1").first().text();
  if (h1) return cleanText(h1);

  return "";
}

function extractSiteName($: CheerioAPI): string | null {
  const ogSiteName = $('meta[property="og:site_name"]').attr("content");
  if (ogSiteName) return ogSiteName;

  const applicationName = $('meta[name="application-name"]').attr("content");
  if (applicationName) return applicationName;

  return null;
}

function createExcerpt(content: string, maxLength = 200): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trim() + "...";
}

export async function scrapeArticle(url: string): Promise<ScrapingResult> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title = extractTitle($);
    const content = extractContent($);
    const siteName = extractSiteName($);

    if (!content || content.length < 50) {
      return {
        success: false,
        data: null,
        error: "Could not extract meaningful content from the page",
      };
    }

    return {
      success: true,
      data: {
        url,
        title,
        content,
        excerpt: createExcerpt(content),
        siteName,
        fetchedAt: new Date(),
      },
      error: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      success: false,
      data: null,
      error: message,
    };
  }
}

export async function scrapeArticles(
  urls: string[],
  concurrency = 3,
  delayMs = 500
): Promise<Map<string, ScrapingResult>> {
  const results = new Map<string, ScrapingResult>();

  // バッチ処理で並列数を制限
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const result = await scrapeArticle(url);
        return { url, result };
      })
    );

    batchResults.forEach(({ url, result }) => {
      results.set(url, result);
    });

    // レート制限のための遅延（最後のバッチ以外）
    if (i + concurrency < urls.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
