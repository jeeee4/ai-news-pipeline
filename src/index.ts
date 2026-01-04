import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getAINews } from "./api/hackernews.js";
import { runPipeline } from "./pipeline/index.js";
import { getConfigSafe } from "./lib/config.js";
import type { AINewsItem } from "./types/hackernews.js";
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

function displayNews(news: AINewsItem[]): void {
  console.log("\n" + "=".repeat(60));
  console.log("  AI News from Hacker News");
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
    console.log(`    HN: https://news.ycombinator.com/item?id=${item.id}`);
    console.log("");
  });

  console.log("=".repeat(60));
  console.log(`Total: ${news.length} AI-related stories`);
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

function saveNewsData(data: NewsData): void {
  const outputPath = resolve(__dirname, "../web/data/news.json");
  const outputDir = dirname(outputPath);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\nNews data saved to: ${outputPath}`);
}

async function main(): Promise<void> {
  try {
    // APIキーが設定されているか確認
    const config = getConfigSafe();

    if (config) {
      // LLM要約パイプラインを実行
      console.log("Running pipeline with LLM summarization...\n");
      const result = await runPipeline({ maxArticles: 10 });

      if (result.summaries.length > 0) {
        const newsData = convertSummariesToNewsData(result.summaries);
        saveNewsData(newsData);
      } else {
        console.log("\nNo summaries generated. Falling back to simple mode...");
        const news = await getAINews(10);
        displayNews(news);
        const newsData = convertToNewsDataSimple(news);
        saveNewsData(newsData);
      }
    } else {
      // APIキーなし: シンプルモードで実行
      console.log("ANTHROPIC_API_KEY not set. Running in simple mode (no LLM summarization)...\n");
      const news = await getAINews(10);
      displayNews(news);
      const newsData = convertToNewsDataSimple(news);
      saveNewsData(newsData);
    }
  } catch (error) {
    console.error("Error running pipeline:", error);
    process.exit(1);
  }
}

main();
