import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getAINews } from "./api/hackernews.js";
import { getBlogNews } from "./api/rss.js";
import { getRedditAINews } from "./api/reddit.js";
import { runPipeline, type NewsSource } from "./pipeline/index.js";
import { runBlogPipeline } from "./pipeline/blog.js";
import { getConfigSafe } from "./lib/config.js";
import type { AINewsItem } from "./types/hackernews.js";
import type { BlogNewsItem } from "./types/rss.js";
import type { ArticleSummary } from "./types/summary.js";
import type { NewsData } from "./types/news.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function formatDate(date: Date): string {
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayNews(news: AINewsItem[], source: NewsSource): void {
  const sourceLabel = source === "all" ? "Hacker News & Reddit" : source === "reddit" ? "Reddit" : "Hacker News";
  console.log("\n" + "=".repeat(60));
  console.log(`  AI News from ${sourceLabel}`);
  console.log("=".repeat(60) + "\n");

  if (news.length === 0) {
    console.log("No AI-related news found.");
    return;
  }

  news.forEach((item, index) => {
    console.log(`[${index + 1}] ${item.title}`);
    console.log(`    Score: ${item.score} | Comments: ${item.commentsCount}`);
    console.log(`    Author: ${item.author} | Posted: ${formatDate(item.postedAt)}`);
    if (item.url) {
      console.log(`    URL: ${item.url}`);
    }
    // Reddit posts have IDs > 1 billion
    if (item.id < 1_000_000_000) {
      console.log(`    HN: https://news.ycombinator.com/item?id=${item.id}`);
    }
    console.log("");
  });

  console.log("=".repeat(60));
  console.log(`Total: ${news.length} AI-related stories`);
  console.log("=".repeat(60));
}

function displayBlogNews(news: BlogNewsItem[]): void {
  console.log("\n" + "=".repeat(60));
  console.log("  AI News from Tech Blogs");
  console.log("=".repeat(60) + "\n");

  if (news.length === 0) {
    console.log("No blog news found.");
    return;
  }

  news.forEach((item, index) => {
    console.log(`[${index + 1}] [${item.source}] ${item.title}`);
    console.log(`    Posted: ${formatDate(item.postedAt)}`);
    console.log(`    URL: ${item.url}`);
    console.log("");
  });

  console.log("=".repeat(60));
  console.log(`Total: ${news.length} blog articles`);
  console.log("=".repeat(60));
}

// LLM要約なしのフォールバック変換
function convertToNewsDataSimple(news: AINewsItem[]): NewsData {
  return {
    generatedAt: new Date().toISOString(),
    articles: news.map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      summary: `Hacker Newsで${item.score}ポイント、${item.commentsCount}件のコメントを獲得した記事です。`,
      keyPoints: [
        `スコア: ${item.score}`,
        `コメント数: ${item.commentsCount}`,
        `投稿者: ${item.author}`,
      ],
      category: "AI",
      sentiment: "neutral" as const,
      createdAt: item.postedAt.toISOString(),
    })),
  };
}

// ブログニュースをNewsData形式に変換（LLMなし）
function convertBlogToNewsDataSimple(news: BlogNewsItem[]): NewsData {
  return {
    generatedAt: new Date().toISOString(),
    articles: news.map((item, index) => ({
      id: index + 10000, // ブログ記事用のIDオフセット
      title: item.title,
      url: item.url,
      summary: item.description ?? `${item.source}の公式ブログ記事です。`,
      keyPoints: [
        `ソース: ${item.source}`,
      ],
      category: "AI",
      sentiment: "neutral" as const,
      createdAt: item.postedAt.toISOString(),
    })),
  };
}

// LLM要約結果をNewsData形式に変換
function convertSummariesToNewsData(summaries: ArticleSummary[]): NewsData {
  return {
    generatedAt: new Date().toISOString(),
    articles: summaries.map((summary) => ({
      id: summary.id,
      title: summary.title,
      url: summary.url,
      summary: summary.summary,
      keyPoints: summary.keyPoints,
      category: summary.category,
      sentiment: summary.sentiment,
      createdAt: summary.createdAt.toISOString(),
    })),
  };
}

// 複数のNewsDataをマージ
function mergeNewsData(...dataSources: NewsData[]): NewsData {
  const allArticles = dataSources.flatMap((d) => d.articles);
  // 日付で降順ソート
  allArticles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    generatedAt: new Date().toISOString(),
    articles: allArticles,
  };
}

function saveNewsData(data: NewsData): void {
  const outputPath = resolve(__dirname, "../web/data/news.json");
  const outputDir = dirname(outputPath);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\nNews data saved to: ${outputPath}`);
}

function parseArgs(): { source: NewsSource; limit: number } {
  const args = process.argv.slice(2);
  let source: NewsSource = "all";
  let limit = 10;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--source" && args[i + 1]) {
      const val = args[i + 1];
      if (val === "hackernews" || val === "reddit" || val === "all") {
        source = val;
      }
      i++;
    } else if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[i + 1], 10) || 10;
      i++;
    }
  }

  return { source, limit };
}

async function fetchNewsBySource(source: NewsSource, limit: number): Promise<AINewsItem[]> {
  if (source === "hackernews") {
    return getAINews(limit);
  }
  if (source === "reddit") {
    return getRedditAINews({ limit });
  }
  // source === "all"
  const perSource = Math.ceil(limit / 2);
  const [hn, reddit] = await Promise.all([
    getAINews(perSource),
    getRedditAINews({ limit: perSource }),
  ]);
  return [...hn, ...reddit].sort((a, b) => b.score - a.score).slice(0, limit);
}

async function main(): Promise<void> {
  try {
    const { source, limit } = parseArgs();

    // APIキーが設定されているか確認
    const config = getConfigSafe();

    if (config) {
      // LLM要約パイプラインを実行
      console.log(`Running pipeline with LLM summarization (source: ${source})...\n`);

      // HN + Reddit パイプライン
      console.log("=== Hacker News & Reddit ===");
      const hnRedditResult = await runPipeline({ maxArticles: limit, sources: source });

      // ブログパイプライン
      console.log("\n=== Tech Blogs ===");
      const blogResult = await runBlogPipeline({ maxArticles: 5 });

      // 結果をマージ
      const allSummaries = [...hnRedditResult.summaries, ...blogResult.summaries];

      if (allSummaries.length > 0) {
        const newsData = convertSummariesToNewsData(allSummaries);
        saveNewsData(newsData);
      } else {
        console.log("\nNo summaries generated. Falling back to simple mode...");
        const news = await fetchNewsBySource(source, limit);
        const blogNews = await getBlogNews(5);
        displayNews(news, source);
        displayBlogNews(blogNews);
        const newsData = mergeNewsData(
          convertToNewsDataSimple(news),
          convertBlogToNewsDataSimple(blogNews)
        );
        saveNewsData(newsData);
      }
    } else {
      // APIキーなし: シンプルモードで実行
      console.log(`ANTHROPIC_API_KEY not set. Running in simple mode (source: ${source})...\n`);

      // HN + Reddit
      console.log("=== Hacker News & Reddit ===");
      const news = await fetchNewsBySource(source, limit);
      displayNews(news, source);

      // Tech Blogs
      console.log("\n=== Tech Blogs ===");
      const blogNews = await getBlogNews(5);
      displayBlogNews(blogNews);

      // マージして保存
      const newsData = mergeNewsData(
        convertToNewsDataSimple(news),
        convertBlogToNewsDataSimple(blogNews)
      );
      saveNewsData(newsData);
    }
  } catch (error) {
    console.error("Error running pipeline:", error);
    process.exit(1);
  }
}

main();
