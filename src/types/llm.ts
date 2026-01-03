export interface LLMConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface LLMResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface LLMError {
  code: string;
  message: string;
  retryable: boolean;
}
