export interface ArticleSummary {
  id: number;
  title: string;
  url: string | null;
  originalContent: string;
  summary: string;
  keyPoints: string[];
  category: string;
  sentiment: "positive" | "negative" | "neutral";
  createdAt: Date;
}

export interface SummaryResult {
  success: boolean;
  data: ArticleSummary | null;
  error: string | null;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface SummaryOptions {
  language: "ja" | "en";
  maxLength: number;
  includeKeyPoints: boolean;
}
