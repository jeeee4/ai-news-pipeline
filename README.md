# AI News Pipeline

Hacker NewsからAI関連ニュースを取得し、LLMで要約するCLIツール

## 機能

### 実装済み

- [x] Hacker News API連携（Top/New記事の取得）
- [x] AI関連キーワードによるフィルタリング（28キーワード対応）
- [x] CLI上でのニュース一覧表示

### 未実装

- [ ] 記事本文の取得（URLからのスクレイピング）
- [ ] LLM API連携（OpenAI / Anthropic）
- [ ] 記事の要約生成
- [ ] 要約結果の出力（ファイル / Slack等）

## セットアップ

```bash
npm install
```

## 使い方

```bash
# 開発モードで実行
npm run dev

# ビルド
npm run build

# ビルド後の実行
npm start
```

## 出力例

```
============================================================
  AI News from Hacker News
============================================================

[1] OpenAI announces new model
    Score: 500 | Comments: 200
    Author: user123 | Posted: 2025/01/03 10:00
    URL: https://example.com/article
    HN: https://news.ycombinator.com/item?id=12345

============================================================
Total: 10 AI-related stories
============================================================
```

## プロジェクト構造

```
src/
├── index.ts              # エントリーポイント、CLI表示
├── api/
│   └── hackernews.ts     # Hacker News API連携
└── types/
    └── hackernews.ts     # 型定義
```

## AIフィルタリングキーワード

ai, artificial intelligence, machine learning, ml, deep learning, neural network, gpt, llm, chatgpt, openai, anthropic, claude, gemini, transformer, diffusion, stable diffusion, midjourney, generative ai, langchain, rag, embedding

## 技術スタック

- TypeScript
- Node.js (ESM)
- tsx (開発時の実行)
