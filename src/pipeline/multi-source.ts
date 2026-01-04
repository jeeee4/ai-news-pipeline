import { sourceManager, type SourceManagerOptions } from "../sources/index.js";
import type { NewsItem } from "../types/source.js";
import { scrapeArticle } from "../scraper/article.js";
import { createLLMClient } from "../llm/client.js";
import { createSummarizerService } from "../summarizer/service.js";
import { loadConfig } from "../lib/config.js";
import type { ArticleSummary } from "../types/summary.js";

export interface MultiSourcePipelineOptions {
  maxArticlesPerSource: number;
  language: "ja" | "en";
  verbose: boolean;
  sourceOptions?: SourceManagerOptions;
}

export interface MultiSourcePipelineResult {
  summaries: ArticleSummary[];
  errors: Array<{ id: string; title: string; source: string; error: string }>;
  stats: {
    totalFetched: number;
    successfulScrapes: number;
    successfulSummaries: number;
    totalTokensUsed: number;
    bySource: Record<string, number>;
  };
}

const DEFAULT_OPTIONS: MultiSourcePipelineOptions = {
  maxArticlesPerSource: 5,
  language: "ja",
  verbose: true,
};

/**
 * NewsItemをサマライザーが期待する形式に変換する
 */
function newsItemToSummarizerInput(item: NewsItem): {
  id: number;
  title: string;
  url: string | null;
  author: string;
  score: number;
  commentsCount: number;
  postedAt: Date;
} {
  const metadata = item.metadata || {};
  return {
    id: typeof item.id === "string" ? parseInt(item.id.split("-").pop() || "0", 10) : 0,
    title: item.title,
    url: item.url,
    author: item.author || "Unknown",
    score: (metadata.score as number) || 0,
    commentsCount: (metadata.commentsCount as number) || 0,
    postedAt: item.publishedAt,
  };
}

/**
 * マルチソースパイプラインを実行する
 */
export async function runMultiSourcePipeline(
  options?: Partial<MultiSourcePipelineOptions>
): Promise<MultiSourcePipelineResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const log = opts.verbose ? console.log : () => {};

  const result: MultiSourcePipelineResult = {
    summaries: [],
    errors: [],
    stats: {
      totalFetched: 0,
      successfulScrapes: 0,
      successfulSummaries: 0,
      totalTokensUsed: 0,
      bySource: {},
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

  // 3. 全ソースからニュース取得
  log("\nFetching news from multiple sources...");
  const newsItems = await sourceManager.fetchAllNews(
    opts.maxArticlesPerSource,
    opts.sourceOptions
  );
  result.stats.totalFetched = newsItems.length;

  // ソース別の統計をカウント
  for (const item of newsItems) {
    result.stats.bySource[item.source] =
      (result.stats.bySource[item.source] || 0) + 1;
  }

  log(`\nTotal fetched: ${newsItems.length} articles`);
  for (const [source, count] of Object.entries(result.stats.bySource)) {
    log(`  - ${source}: ${count} articles`);
  }

  // 4. 記事ごとにスクレイピング＆要約
  for (const news of newsItems) {
    log(`\nProcessing: [${news.source}] ${news.title}`);

    // URLがない記事はスキップ
    if (!news.url) {
      log("  Skipping: No URL available");
      result.errors.push({
        id: news.id,
        title: news.title,
        source: news.source,
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
        source: news.source,
        error: `Scraping failed: ${scrapeResult.error}`,
      });
      continue;
    }
    result.stats.successfulScrapes++;

    // 要約生成
    log("  Generating summary...");
    const summarizerInput = newsItemToSummarizerInput(news);
    const summaryResult = await summarizer.summarize(
      summarizerInput,
      scrapeResult.data
    );

    if (!summaryResult.success || !summaryResult.data) {
      log(`  Summary failed: ${summaryResult.error}`);
      result.errors.push({
        id: news.id,
        title: news.title,
        source: news.source,
        error: `Summary failed: ${summaryResult.error}`,
      });
      continue;
    }

    // IDを元のNewsItemのIDに置き換え
    const summary: ArticleSummary = {
      ...summaryResult.data,
      id: news.id,
    };

    result.summaries.push(summary);
    result.stats.successfulSummaries++;

    if (summaryResult.usage) {
      result.stats.totalTokensUsed +=
        summaryResult.usage.inputTokens + summaryResult.usage.outputTokens;
    }

    log(`  ✓ Summary generated (${summaryResult.data.category})`);
  }

  // 5. 結果サマリー
  log("\n" + "=".repeat(50));
  log("Multi-source pipeline completed");
  log(`  Total fetched: ${result.stats.totalFetched}`);
  log(`  Successful scrapes: ${result.stats.successfulScrapes}`);
  log(`  Successful summaries: ${result.stats.successfulSummaries}`);
  log(`  Total tokens used: ${result.stats.totalTokensUsed}`);
  log(`  Errors: ${result.errors.length}`);
  log("=".repeat(50));

  return result;
}

/**
 * 日本語ソース専用のパイプラインを実行する
 */
export async function runJapanesePipeline(
  options?: Partial<Omit<MultiSourcePipelineOptions, "sourceOptions">>
): Promise<MultiSourcePipelineResult> {
  return runMultiSourcePipeline({
    ...options,
    language: "ja",
    sourceOptions: { japaneseOnly: true },
  });
}
