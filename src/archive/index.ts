import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NewsData, NewsSummary, ArchiveData, NewsStats, MonthlyStats } from "../types/news.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../web/data");
const NEWS_FILE = resolve(DATA_DIR, "news.json");
const ARCHIVE_DIR = resolve(DATA_DIR, "archive");
const STATS_FILE = resolve(DATA_DIR, "stats.json");

const ARCHIVE_THRESHOLD_DAYS = 30;

function getMonthKey(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function isOlderThanThreshold(dateStr: string, thresholdDays: number): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > thresholdDays;
}

function loadNewsData(): NewsData | null {
  if (!existsSync(NEWS_FILE)) {
    console.log("News file not found:", NEWS_FILE);
    return null;
  }
  const content = readFileSync(NEWS_FILE, "utf-8");
  return JSON.parse(content) as NewsData;
}

function loadArchiveData(month: string): ArchiveData | null {
  const archiveFile = resolve(ARCHIVE_DIR, `${month}.json`);
  if (!existsSync(archiveFile)) {
    return null;
  }
  const content = readFileSync(archiveFile, "utf-8");
  return JSON.parse(content) as ArchiveData;
}

function saveArchiveData(data: ArchiveData): void {
  mkdirSync(ARCHIVE_DIR, { recursive: true });
  const archiveFile = resolve(ARCHIVE_DIR, `${data.month}.json`);
  writeFileSync(archiveFile, JSON.stringify(data, null, 2));
  console.log(`Archive saved: ${archiveFile}`);
}

function saveNewsData(data: NewsData): void {
  writeFileSync(NEWS_FILE, JSON.stringify(data, null, 2));
  console.log(`News data updated: ${NEWS_FILE}`);
}

function saveStats(stats: NewsStats): void {
  writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  console.log(`Stats saved: ${STATS_FILE}`);
}

function getArchivedArticlesCount(): number {
  if (!existsSync(ARCHIVE_DIR)) {
    return 0;
  }
  const files = readdirSync(ARCHIVE_DIR).filter((f) => f.endsWith(".json"));
  let count = 0;
  for (const file of files) {
    const content = readFileSync(resolve(ARCHIVE_DIR, file), "utf-8");
    const data = JSON.parse(content) as ArchiveData;
    count += data.articles.length;
  }
  return count;
}

function getMonthlyStats(): MonthlyStats[] {
  if (!existsSync(ARCHIVE_DIR)) {
    return [];
  }
  const files = readdirSync(ARCHIVE_DIR).filter((f) => f.endsWith(".json"));
  const stats: MonthlyStats[] = [];
  for (const file of files) {
    const content = readFileSync(resolve(ARCHIVE_DIR, file), "utf-8");
    const data = JSON.parse(content) as ArchiveData;
    stats.push({
      month: data.month,
      count: data.articles.length,
    });
  }
  return stats.sort((a, b) => b.month.localeCompare(a.month));
}

export function runArchive(): { archived: number; remaining: number } {
  const newsData = loadNewsData();
  if (!newsData) {
    return { archived: 0, remaining: 0 };
  }

  const activeArticles: NewsSummary[] = [];
  const articlesToArchive: NewsSummary[] = [];

  for (const article of newsData.articles) {
    if (isOlderThanThreshold(article.createdAt, ARCHIVE_THRESHOLD_DAYS)) {
      articlesToArchive.push(article);
    } else {
      activeArticles.push(article);
    }
  }

  if (articlesToArchive.length === 0) {
    console.log("No articles to archive.");
    return { archived: 0, remaining: newsData.articles.length };
  }

  // Group articles by month
  const byMonth = new Map<string, NewsSummary[]>();
  for (const article of articlesToArchive) {
    const month = getMonthKey(article.createdAt);
    if (!byMonth.has(month)) {
      byMonth.set(month, []);
    }
    byMonth.get(month)!.push(article);
  }

  // Merge with existing archives
  for (const [month, articles] of byMonth) {
    const existingArchive = loadArchiveData(month);
    const existingIds = new Set(existingArchive?.articles.map((a) => a.id) ?? []);
    const newArticles = articles.filter((a) => !existingIds.has(a.id));

    const mergedArticles = [...(existingArchive?.articles ?? []), ...newArticles];
    mergedArticles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const archiveData: ArchiveData = {
      month,
      archivedAt: new Date().toISOString(),
      articles: mergedArticles,
    };
    saveArchiveData(archiveData);
    console.log(`Archived ${newArticles.length} new articles to ${month}`);
  }

  // Update news.json with only active articles
  const updatedNewsData: NewsData = {
    generatedAt: newsData.generatedAt,
    articles: activeArticles,
  };
  saveNewsData(updatedNewsData);

  // Update stats
  const archivedCount = getArchivedArticlesCount();
  const stats: NewsStats = {
    totalArticles: activeArticles.length + archivedCount,
    activeArticles: activeArticles.length,
    archivedArticles: archivedCount,
    monthlyStats: getMonthlyStats(),
    lastUpdated: new Date().toISOString(),
  };
  saveStats(stats);

  return { archived: articlesToArchive.length, remaining: activeArticles.length };
}

async function main(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("  News Archive Process");
  console.log("=".repeat(60) + "\n");

  const result = runArchive();

  console.log("\n" + "=".repeat(60));
  console.log(`Archived: ${result.archived} articles`);
  console.log(`Remaining: ${result.remaining} active articles`);
  console.log("=".repeat(60));
}

main();
