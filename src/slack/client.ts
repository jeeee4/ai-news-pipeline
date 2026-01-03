import type { SlackMessage, SlackNotifyResult } from "../types/slack.js";

export class SlackClient {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    if (!webhookUrl) {
      throw new Error("Slack webhook URL is required");
    }
    this.webhookUrl = webhookUrl;
  }

  async send(message: SlackMessage): Promise<SlackNotifyResult> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Slack API error: ${response.status} - ${errorText}`,
        };
      }

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        success: false,
        error: message,
      };
    }
  }

  async sendText(text: string): Promise<SlackNotifyResult> {
    return this.send({ text });
  }
}

export function createSlackClient(webhookUrl: string): SlackClient {
  return new SlackClient(webhookUrl);
}
