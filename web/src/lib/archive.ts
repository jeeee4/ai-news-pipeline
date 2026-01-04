import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { ArchiveData, NewsStats } from "@/types/news";

const DATA_DIR = resolve(process.cwd(), "data");
const ARCHIVE_DIR = resolve(DATA_DIR, "archive");
const STATS_FILE = resolve(DATA_DIR, "stats.json");

export function getStats(): NewsStats | null {
  if (!existsSync(STATS_FILE)) {
    return null;
  }
  const content = readFileSync(STATS_FILE, "utf-8");
  return JSON.parse(content) as NewsStats;
}

export function getArchiveMonths(): string[] {
  if (!existsSync(ARCHIVE_DIR)) {
    return [];
  }
  return readdirSync(ARCHIVE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
    .sort((a, b) => b.localeCompare(a));
}

export function getArchiveData(month: string): ArchiveData | null {
  const archiveFile = resolve(ARCHIVE_DIR, `${month}.json`);
  if (!existsSync(archiveFile)) {
    return null;
  }
  const content = readFileSync(archiveFile, "utf-8");
  return JSON.parse(content) as ArchiveData;
}

export function getAllArchiveData(): ArchiveData[] {
  const months = getArchiveMonths();
  return months
    .map((month) => getArchiveData(month))
    .filter((data): data is ArchiveData => data !== null);
}
