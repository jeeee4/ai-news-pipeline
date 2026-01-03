import type { SummaryOptions } from "../types/summary.js";

const SYSTEM_PROMPT_JA = `あなたはAI・テクノロジーニュースの専門家です。
与えられた記事を分析し、以下の形式でJSON形式で要約を返してください。

必ず以下のJSON形式で返答してください：
{
  "summary": "記事の要約（2-3文）",
  "keyPoints": ["重要ポイント1", "重要ポイント2", "重要ポイント3"],
  "category": "カテゴリ（AI/ML/LLM/Robotics/Other）",
  "sentiment": "positive/negative/neutral"
}

注意事項：
- 要約は簡潔かつ正確に
- 技術的な内容は平易な言葉で説明
- 重要ポイントは3つまで
- JSONのみを返し、他の文章は含めない`;

const SYSTEM_PROMPT_EN = `You are an AI and technology news expert.
Analyze the given article and return a summary in the following JSON format.

You must respond with only the following JSON format:
{
  "summary": "Article summary (2-3 sentences)",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "category": "Category (AI/ML/LLM/Robotics/Other)",
  "sentiment": "positive/negative/neutral"
}

Guidelines:
- Keep summaries concise and accurate
- Explain technical content in plain language
- Maximum 3 key points
- Return only JSON, no additional text`;

export function getSystemPrompt(language: "ja" | "en"): string {
  return language === "ja" ? SYSTEM_PROMPT_JA : SYSTEM_PROMPT_EN;
}

export function createUserPrompt(
  title: string,
  content: string,
  options: SummaryOptions
): string {
  const truncatedContent =
    content.length > options.maxLength
      ? content.slice(0, options.maxLength) + "..."
      : content;

  if (options.language === "ja") {
    return `以下の記事を要約してください。

タイトル: ${title}

本文:
${truncatedContent}`;
  }

  return `Please summarize the following article.

Title: ${title}

Content:
${truncatedContent}`;
}

export interface ParsedSummary {
  summary: string;
  keyPoints: string[];
  category: string;
  sentiment: "positive" | "negative" | "neutral";
}

export function parseSummaryResponse(response: string): ParsedSummary {
  // JSONブロックを抽出（```json ... ``` の形式にも対応）
  let jsonStr = response;

  const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    jsonStr = jsonBlockMatch[1].trim();
  }

  // 直接JSONオブジェクトを探す
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // バリデーション
  if (!parsed.summary || typeof parsed.summary !== "string") {
    throw new Error("Invalid summary field");
  }

  if (!Array.isArray(parsed.keyPoints)) {
    parsed.keyPoints = [];
  }

  if (!parsed.category || typeof parsed.category !== "string") {
    parsed.category = "Other";
  }

  const validSentiments = ["positive", "negative", "neutral"];
  if (!validSentiments.includes(parsed.sentiment)) {
    parsed.sentiment = "neutral";
  }

  return {
    summary: parsed.summary,
    keyPoints: parsed.keyPoints.slice(0, 3),
    category: parsed.category,
    sentiment: parsed.sentiment,
  };
}
