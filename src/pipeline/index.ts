import { getAINews } from "../api/hackernews.js";
import { scrapeArticle } from "../scraper/article.js";
import { createLLMClient } from "../llm/client.js";
import { createSummarizerService } from "../summarizer/service.js";
import { loadConfig } from "../lib/config.js";
import type { AINewsItem } from "../types/hackernews.js";
import type { ArticleSummary } from "../types/summary.js";

export interface PipelineOptions {
  maxArticles: number;
  language: "ja" | "en";
  verbose: boolean;
}

export interface PipelineResult {
  summaries: ArticleSummary[];
  errors: Array<{ id: number; title: string; error: string }>;
  stats: {
    totalFetched: number;
    successfulScrapes: number;
    successfulSummaries: number;
    totalTokensUsed: number;
  };
}

const DEFAULT_OPTIONS: PipelineOptions = {
  maxArticles: 10,
  language: "ja",
  verbose: true,
};

export async function runPipeline(
  options?: Partial<PipelineOptions>
): Promise<PipelineResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const log = opts.verbose ? console.log : () => {};

  const result: PipelineResult = {
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

  // 3. ニュース取得
  log(`Fetching top ${opts.maxArticles} AI news from Hacker News...`);
  const newsItems = await getAINews(opts.maxArticles);
  result.stats.totalFetched = newsItems.length;
  log(`Found ${newsItems.length} AI-related articles`);

  // 4. 記事ごとにスクレイピング＆要約
  for (const news of newsItems) {
    log(`\nProcessing: ${news.title}`);

    // URLがない記事はスキップ
    if (!news.url) {
      log("  Skipping: No URL available");
      result.errors.push({
        id: news.id,
        title: news.title,
        error: "No URL available",
      });
      continue;
    }

    // スクレイピング
    log("  Scraping article...");
    const scrapeResult = await scrapeArticle(news.url);

    if (!scrapeResult.success || !scrapeResult.data) {
      log(`  Scraping failed: ${scrapeResult.error}`);
      result.errors.push({
        id: news.id,
        title: news.title,
        error: `Scraping failed: ${scrapeResult.error}`,
      });
      continue;
    }
    result.stats.successfulScrapes++;

    // 要約生成
    log("  Generating summary...");
    const summaryResult = await summarizer.summarize(news, scrapeResult.data);

    if (!summaryResult.success || !summaryResult.data) {
      log(`  Summary failed: ${summaryResult.error}`);
      result.errors.push({
        id: news.id,
        title: news.title,
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
  log("Pipeline completed");
  log(`  Total fetched: ${result.stats.totalFetched}`);
  log(`  Successful scrapes: ${result.stats.successfulScrapes}`);
  log(`  Successful summaries: ${result.stats.successfulSummaries}`);
  log(`  Total tokens used: ${result.stats.totalTokensUsed}`);
  log(`  Errors: ${result.errors.length}`);
  log("=".repeat(50));

  return result;
}

// 結果をフォーマットして表示
export function formatSummaries(summaries: ArticleSummary[]): string {
  const lines: string[] = [];

  lines.push("# AI News Summary\n");
  lines.push(`Generated at: ${new Date().toLocaleString("ja-JP")}\n`);

  summaries.forEach((summary, index) => {
    lines.push(`## ${index + 1}. ${summary.title}\n`);
    lines.push(`**Category:** ${summary.category}`);
    lines.push(`**Sentiment:** ${summary.sentiment}\n`);
    lines.push(`### Summary`);
    lines.push(summary.summary + "\n");

    if (summary.keyPoints.length > 0) {
      lines.push(`### Key Points`);
      summary.keyPoints.forEach((point) => {
        lines.push(`- ${point}`);
      });
      lines.push("");
    }

    if (summary.url) {
      lines.push(`[Read more](${summary.url})\n`);
    }

    lines.push("---\n");
  });

  return lines.join("\n");
}
