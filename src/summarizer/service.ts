import type { LLMClient } from "../llm/client.js";
import type { AINewsItem } from "../types/hackernews.js";
import type { ArticleContent } from "../types/article.js";
import type {
  ArticleSummary,
  SummaryResult,
  SummaryOptions,
} from "../types/summary.js";
import {
  getSystemPrompt,
  createUserPrompt,
  parseSummaryResponse,
} from "./prompts.js";

const DEFAULT_OPTIONS: SummaryOptions = {
  language: "ja",
  maxLength: 4000,
  includeKeyPoints: true,
};

export class SummarizerService {
  private client: LLMClient;
  private options: SummaryOptions;

  constructor(client: LLMClient, options?: Partial<SummaryOptions>) {
    this.client = client;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async summarize(
    newsItem: AINewsItem,
    articleContent: ArticleContent
  ): Promise<SummaryResult> {
    try {
      const systemPrompt = getSystemPrompt(this.options.language);
      const userPrompt = createUserPrompt(
        newsItem.title,
        articleContent.content,
        this.options
      );

      const response = await this.client.complete(userPrompt, systemPrompt);
      const parsed = parseSummaryResponse(response.content);

      const summary: ArticleSummary = {
        id: newsItem.id,
        title: newsItem.title,
        url: newsItem.url,
        originalContent: articleContent.excerpt,
        summary: parsed.summary,
        keyPoints: parsed.keyPoints,
        category: parsed.category,
        sentiment: parsed.sentiment,
        createdAt: new Date(),
      };

      return {
        success: true,
        data: summary,
        error: null,
        usage: response.usage,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        success: false,
        data: null,
        error: message,
      };
    }
  }

  async summarizeMany(
    items: Array<{ news: AINewsItem; content: ArticleContent }>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<number, SummaryResult>> {
    const results = new Map<number, SummaryResult>();
    const total = items.length;

    for (let i = 0; i < items.length; i++) {
      const { news, content } = items[i];
      const result = await this.summarize(news, content);
      results.set(news.id, result);

      if (onProgress) {
        onProgress(i + 1, total);
      }
    }

    return results;
  }
}

export function createSummarizerService(
  client: LLMClient,
  options?: Partial<SummaryOptions>
): SummarizerService {
  return new SummarizerService(client, options);
}
