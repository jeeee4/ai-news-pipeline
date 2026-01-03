import Anthropic from "@anthropic-ai/sdk";
import type { LLMConfig, LLMResponse } from "../types/llm.js";

const DEFAULT_CONFIG: Omit<LLMConfig, "apiKey"> = {
  model: "claude-sonnet-4-20250514",
  maxTokens: 1024,
  temperature: 0.7,
};

// リトライ設定
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

export class LLMClient {
  private client: Anthropic;
  private config: LLMConfig;

  constructor(apiKey: string, config?: Partial<Omit<LLMConfig, "apiKey">>) {
    this.client = new Anthropic({ apiKey });
    this.config = {
      apiKey,
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  async complete(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const textContent = response.content.find(
          (block) => block.type === "text"
        );
        if (!textContent || textContent.type !== "text") {
          throw new Error("No text content in response");
        }

        return {
          content: textContent.text,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // リトライ可能かチェック
        if (this.isRetryableError(error) && attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt); // Exponential backoff
          console.log(
            `Retrying in ${delay}ms... (attempt ${attempt + 1}/${MAX_RETRIES})`
          );
          await this.sleep(delay);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError ?? new Error("Unknown error occurred");
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Anthropic.APIError) {
      return RETRYABLE_STATUS_CODES.includes(error.status);
    }
    // ネットワークエラー等もリトライ対象
    if (error instanceof Error) {
      return (
        error.message.includes("ECONNRESET") ||
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("fetch failed")
      );
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getModel(): string {
    return this.config.model;
  }
}

// シングルトンインスタンス用のファクトリ
let defaultClient: LLMClient | null = null;

export function createLLMClient(
  apiKey: string,
  config?: Partial<Omit<LLMConfig, "apiKey">>
): LLMClient {
  return new LLMClient(apiKey, config);
}

export function getDefaultClient(apiKey: string): LLMClient {
  if (!defaultClient) {
    defaultClient = createLLMClient(apiKey);
  }
  return defaultClient;
}

export function resetDefaultClient(): void {
  defaultClient = null;
}
