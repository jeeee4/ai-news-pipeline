import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getAINews } from "./api/hackernews.js";
import { getBlogNews } from "./api/rss.js";
import { getRedditAINews } from "./api/reddit.js";
import { runPipeline, type NewsSource } from "./pipeline/index.js";
import { runBlogPipeline } from "./pipeline/blog.js";
import { runMultiSourcePipeline, runJapanesePipeline } from "./pipeline/multi-source.js";
import { sourceManager, type NewsItem } from "./sources/index.js";
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

function displayMultiSourceNews(news: NewsItem[]): void {
  console.log("\n" + "=".repeat(60));
  console.log("  AI News from Japanese Sources");
  console.log("=".repeat(60) + "\n");

  if (news.length === 0) {
    console.log("No AI-related news found.");
    return;
  }

  news.forEach((item, index) => {
    console.log(`[${index + 1}] [${item.source}] ${item.title}`);
    if (item.author) {
      console.log(`    Author: ${item.author}`);
    }
    console.log(`    Posted: ${formatDate(item.publishedAt)}`);
    if (item.url) {
      console.log(`    URL: ${item.url}`);
    }
    console.log("");
  });

  console.log("=".repeat(60));
  console.log(`Total: ${news.length} articles`);
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
      id: index + 10000,
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

// マルチソースのニュースをシンプルなNewsDataに変換
function convertMultiSourceToNewsDataSimple(news: NewsItem[]): NewsData {
  return {
    generatedAt: new Date().toISOString(),
    articles: news.map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      summary: `${item.source}から取得した記事です。`,
      keyPoints: [
        `ソース: ${item.source}`,
        item.author ? `投稿者: ${item.author}` : null,
      ].filter((p): p is string => p !== null),
      category: "AI",
      sentiment: "neutral" as const,
      createdAt: item.publishedAt.toISOString(),
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

type SourceMode = "hackernews" | "reddit" | "blogs" | "japan" | "all";

function parseArgs(): { mode: SourceMode; maxArticles: number } {
  const args = process.argv.slice(2);
  let mode: SourceMode = "all";
  let maxArticles = 5;

  for (const arg of args) {
    if (arg === "--hackernews" || arg === "-hn") {
      mode = "hackernews";
    } else if (arg === "--reddit" || arg === "-r") {
      mode = "reddit";
    } else if (arg === "--blogs" || arg === "-b") {
      mode = "blogs";
    } else if (arg === "--japan" || arg === "-jp") {
      mode = "japan";
    } else if (arg === "--all" || arg === "-a") {
      mode = "all";
    } else if (arg.startsWith("--max=")) {
      maxArticles = parseInt(arg.split("=")[1], 10) || 5;
    }
  }

  return { mode, maxArticles };
}

async function fetchNewsBySource(source: NewsSource, limit: number): Promise<AINewsItem[]> {
  if (source === "hackernews") {
    return getAINews(limit);
  }
  if (source === "reddit") {
    return getRedditAINews({ limit });
  }
  const perSource = Math.ceil(limit / 2);
  const [hn, reddit] = await Promise.all([
    getAINews(perSource),
    getRedditAINews({ limit: perSource }),
  ]);
  return [...hn, ...reddit].sort((a, b) => b.score - a.score).slice(0, limit);
}

async function main(): Promise<void> {
  const { mode, maxArticles } = parseArgs();

  console.log(`Mode: ${mode}, Max articles per source: ${maxArticles}\n`);
  console.log("Available Japanese sources:");
  sourceManager.listSources().forEach((s) => {
    console.log(`  - ${s.name} (${s.type}, ${s.language})`);
  });
  console.log("");

  try {
    const config = getConfigSafe();

    if (mode === "hackernews") {
      // Hacker News専用モード
      if (config) {
        console.log("Running Hacker News pipeline with LLM summarization...\n");
        const result = await runPipeline({ maxArticles });
        if (result.summaries.length > 0) {
          saveNewsData(convertSummariesToNewsData(result.summaries));
        } else {
          const news = await getAINews(maxArticles);
          displayNews(news, "hackernews");
          saveNewsData(convertToNewsDataSimple(news));
        }
      } else {
        console.log("Running in simple mode...\n");
        const news = await getAINews(maxArticles);
        displayNews(news, "hackernews");
        saveNewsData(convertToNewsDataSimple(news));
      }
    } else if (mode === "reddit") {
      // Reddit専用モード
      const news = await getRedditAINews({ limit: maxArticles });
      displayNews(news, "reddit");
      saveNewsData(convertToNewsDataSimple(news));
    } else if (mode === "blogs") {
      // ブログ専用モード
      if (config) {
        const result = await runBlogPipeline({ maxArticles });
        if (result.summaries.length > 0) {
          saveNewsData(convertSummariesToNewsData(result.summaries));
        } else {
          const news = await getBlogNews(maxArticles);
          displayBlogNews(news);
          saveNewsData(convertBlogToNewsDataSimple(news));
        }
      } else {
        const news = await getBlogNews(maxArticles);
        displayBlogNews(news);
        saveNewsData(convertBlogToNewsDataSimple(news));
      }
    } else if (mode === "japan") {
      // 日本ニュースソース専用モード
      if (config) {
        console.log("Running Japanese sources pipeline with LLM summarization...\n");
        const result = await runJapanesePipeline({ maxArticlesPerSource: maxArticles });
        if (result.summaries.length > 0) {
          saveNewsData(convertSummariesToNewsData(result.summaries));
        } else {
          const news = await sourceManager.fetchAllNews(maxArticles, { japaneseOnly: true });
          displayMultiSourceNews(news);
          saveNewsData(convertMultiSourceToNewsDataSimple(news));
        }
      } else {
        console.log("Running in simple mode...\n");
        const news = await sourceManager.fetchAllNews(maxArticles, { japaneseOnly: true });
        displayMultiSourceNews(news);
        saveNewsData(convertMultiSourceToNewsDataSimple(news));
      }
    } else {
      // 全ソースモード (all)
      if (config) {
        console.log("Running all sources pipeline with LLM summarization...\n");

        // HN + Reddit
        console.log("=== Hacker News & Reddit ===");
        const hnRedditResult = await runPipeline({ maxArticles, sources: "all" });

        // Tech Blogs
        console.log("\n=== Tech Blogs ===");
        const blogResult = await runBlogPipeline({ maxArticles });

        // Japanese Sources
        console.log("\n=== Japanese Sources ===");
        const japanResult = await runJapanesePipeline({ maxArticlesPerSource: maxArticles });

        const allSummaries = [
          ...hnRedditResult.summaries,
          ...blogResult.summaries,
          ...japanResult.summaries,
        ];

        if (allSummaries.length > 0) {
          saveNewsData(convertSummariesToNewsData(allSummaries));
        } else {
          console.log("\nNo summaries generated. Falling back to simple mode...");
          const hnReddit = await fetchNewsBySource("all", maxArticles);
          const blogs = await getBlogNews(maxArticles);
          const japan = await sourceManager.fetchAllNews(maxArticles, { japaneseOnly: true });

          displayNews(hnReddit, "all");
          displayBlogNews(blogs);
          displayMultiSourceNews(japan);

          saveNewsData(mergeNewsData(
            convertToNewsDataSimple(hnReddit),
            convertBlogToNewsDataSimple(blogs),
            convertMultiSourceToNewsDataSimple(japan)
          ));
        }
      } else {
        console.log("Running in simple mode (all sources)...\n");

        console.log("=== Hacker News & Reddit ===");
        const hnReddit = await fetchNewsBySource("all", maxArticles);
        displayNews(hnReddit, "all");

        console.log("\n=== Tech Blogs ===");
        const blogs = await getBlogNews(maxArticles);
        displayBlogNews(blogs);

        console.log("\n=== Japanese Sources ===");
        const japan = await sourceManager.fetchAllNews(maxArticles, { japaneseOnly: true });
        displayMultiSourceNews(japan);

        saveNewsData(mergeNewsData(
          convertToNewsDataSimple(hnReddit),
          convertBlogToNewsDataSimple(blogs),
          convertMultiSourceToNewsDataSimple(japan)
        ));
      }
    }
  } catch (error) {
    console.error("Error running pipeline:", error);
    process.exit(1);
  }
}

main();
