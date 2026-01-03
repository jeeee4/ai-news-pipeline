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
