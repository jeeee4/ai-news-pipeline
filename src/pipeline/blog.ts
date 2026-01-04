import { getBlogNews } from "../api/rss.js";
import { scrapeArticle } from "../scraper/article.js";
import { createLLMClient } from "../llm/client.js";
import { createSummarizerService } from "../summarizer/service.js";
import { loadConfig } from "../lib/config.js";
import type { BlogNewsItem } from "../types/rss.js";
import type { ArticleSummary } from "../types/summary.js";
import type { AINewsItem } from "../types/hackernews.js";

export interface BlogPipelineOptions {
  maxArticles: number;
  language: "ja" | "en";
  verbose: boolean;
}

export interface BlogPipelineResult {
  summaries: ArticleSummary[];
  errors: Array<{ id: string; title: string; error: string }>;
  stats: {
    totalFetched: number;
    successfulScrapes: number;
    successfulSummaries: number;
    totalTokensUsed: number;
  };
}

const DEFAULT_OPTIONS: BlogPipelineOptions = {
  maxArticles: 10,
  language: "ja",
  verbose: true,
};

// BlogNewsItemをAINewsItem互換に変換
function toAINewsItem(blog: BlogNewsItem): AINewsItem {
  // IDからハッシュ値を生成（数値が必要なため）
  let hash = 0;
  for (let i = 0; i < blog.id.length; i++) {
    const char = blog.id.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return {
    id: Math.abs(hash),
    title: blog.title,
    url: blog.url,
    author: blog.source,
    score: 0,
    commentsCount: 0,
    postedAt: blog.postedAt,
  };
}

export async function runBlogPipeline(
  options?: Partial<BlogPipelineOptions>
): Promise<BlogPipelineResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const log = opts.verbose ? console.log : () => {};

  const result: BlogPipelineResult = {
    summaries: [],
    errors: [],
    stats: {
      totalFetched: 0,
      successfulScrapes: 0,
      successfulSummaries: 0,
      totalTokensUsed: 0,
    },
  };

  // 1. 設定読み込み
  log("Loading configuration...");
  const config = loadConfig();

  // 2. LLMクライアント・サービス初期化
  const llmClient = createLLMClient(config.anthropic.apiKey, {
    model: config.anthropic.model,
  });
  const summarizer = createSummarizerService(llmClient, {
    language: opts.language,
  });

  // 3. ブログニュース取得
  log(`Fetching blog news (max ${opts.maxArticles} per source)...`);
  const blogItems = await getBlogNews(opts.maxArticles);
  result.stats.totalFetched = blogItems.length;
  log(`Found ${blogItems.length} blog articles`);

  // 4. 記事ごとにスクレイピング＆要約
  for (const blog of blogItems.slice(0, opts.maxArticles)) {
    log(`\nProcessing [${blog.source}]: ${blog.title}`);

    // スクレイピング
    log("  Scraping article...");
    const scrapeResult = await scrapeArticle(blog.url);

    if (!scrapeResult.success || !scrapeResult.data) {
      log(`  Scraping failed: ${scrapeResult.error}`);
      result.errors.push({
        id: blog.id,
        title: blog.title,
        error: `Scraping failed: ${scrapeResult.error}`,
      });
      continue;
    }
    result.stats.successfulScrapes++;

    // 要約生成
    log("  Generating summary...");
    const newsItem = toAINewsItem(blog);
    const summaryResult = await summarizer.summarize(newsItem, scrapeResult.data);

    if (!summaryResult.success || !summaryResult.data) {
      log(`  Summary failed: ${summaryResult.error}`);
      result.errors.push({
        id: blog.id,
        title: blog.title,
        error: `Summary failed: ${summaryResult.error}`,
      });
      continue;
    }

    result.summaries.push(summaryResult.data);
    result.stats.successfulSummaries++;

    if (summaryResult.usage) {
      result.stats.totalTokensUsed +=
        summaryResult.usage.inputTokens + summaryResult.usage.outputTokens;
    }

    log(`  ✓ Summary generated (${summaryResult.data.category})`);
  }

  // 5. 結果サマリー
  log("\n" + "=".repeat(50));
  log("Blog Pipeline completed");
  log(`  Total fetched: ${result.stats.totalFetched}`);
  log(`  Successful scrapes: ${result.stats.successfulScrapes}`);
  log(`  Successful summaries: ${result.stats.successfulSummaries}`);
  log(`  Total tokens used: ${result.stats.totalTokensUsed}`);
  log(`  Errors: ${result.errors.length}`);
  log("=".repeat(50));

  return result;
}
