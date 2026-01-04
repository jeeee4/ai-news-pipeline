export interface NewsSummary {
  id: number;
  title: string;
  url: string | null;
  summary: string;
  keyPoints: string[];
  category: string;
  sentiment: "positive" | "negative" | "neutral";
  createdAt: string;
}

export interface NewsData {
  generatedAt: string;
  articles: NewsSummary[];
}

export interface ArchiveData {
  month: string; // "2026-01" format
  archivedAt: string;
  articles: NewsSummary[];
}

export interface MonthlyStats {
  month: string;
  count: number;
}

export interface NewsStats {
  totalArticles: number;
  activeArticles: number;
  archivedArticles: number;
  monthlyStats: MonthlyStats[];
  lastUpdated: string;
}
