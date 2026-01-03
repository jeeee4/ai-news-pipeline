import { config } from "dotenv";

// Load .env file
config();

export interface AppConfig {
  anthropic: {
    apiKey: string;
    model: string;
  };
  slack?: {
    webhookUrl: string;
  };
}

export function loadConfig(): AppConfig {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicApiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is required. Please set it in .env file."
    );
  }

  return {
    anthropic: {
      apiKey: anthropicApiKey,
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
    },
    slack: process.env.SLACK_WEBHOOK_URL
      ? { webhookUrl: process.env.SLACK_WEBHOOK_URL }
      : undefined,
  };
}

export function getConfigSafe(): AppConfig | null {
  try {
    return loadConfig();
  } catch {
    return null;
  }
}
