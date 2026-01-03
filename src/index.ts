import { getAINews } from "./api/hackernews.js";
import type { AINewsItem } from "./types/hackernews.js";

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

async function main(): Promise<void> {
  try {
    const news = await getAINews(10);
    displayNews(news);
  } catch (error) {
    console.error("Error fetching news:", error);
    process.exit(1);
  }
}

main();
