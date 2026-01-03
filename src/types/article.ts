export interface ArticleContent {
  url: string;
  title: string;
  content: string;
  excerpt: string;
  siteName: string | null;
  fetchedAt: Date;
}

export interface ScrapingResult {
  success: boolean;
  data: ArticleContent | null;
  error: string | null;
}
