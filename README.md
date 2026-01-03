# AI News Pipeline

Hacker NewsからAI関連ニュースを取得し、LLMで要約してSlack通知＆Webで公開するツール

[![CI](https://github.com/jeeee4/ai-news-pipeline/actions/workflows/ci.yml/badge.svg)](https://github.com/jeeee4/ai-news-pipeline/actions/workflows/ci.yml)

## 機能

- [x] Hacker News API連携（Top/New記事の取得）
- [x] AI関連キーワードによるフィルタリング
- [x] 記事本文のスクレイピング
- [x] Anthropic Claude APIによる要約生成
- [x] Slack通知（リッチメッセージ）
- [x] Webページ（Next.js SSG）
- [x] GitHub Actions自動実行

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Actions                       │
│              (毎朝定時実行 + 自動デプロイ)                │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              Node.js / TypeScript                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ HN API   │→│ Scraper  │→│ LLM API  │→│ Output │  │
│  │ 記事取得  │  │ 本文取得  │  │ 要約生成  │  │ 配信   │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
└─────────────────────────────────────────────────────────┘
                  │                              │
                  ▼                              ▼
         ┌───────────────┐              ┌───────────────┐
         │  Slack API    │              │ GitHub Pages  │
         │  (Webhook)    │              │ (Next.js SSG) │
         └───────────────┘              └───────────────┘
```

## セットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envを編集してAPI keyを設定
```

## 使い方

```bash
# ニュース取得（開発）
npm run dev

# テスト
npm run test

# Webサーバー起動
npm run web:dev
```

## プロジェクト構造

```
├── src/
│   ├── api/           # Hacker News API
│   ├── scraper/       # 記事スクレイピング
│   ├── llm/           # LLMクライアント
│   ├── summarizer/    # 要約サービス
│   ├── slack/         # Slack通知
│   ├── pipeline/      # パイプライン統合
│   ├── lib/           # 設定等
│   └── types/         # 型定義
├── web/               # Next.js Webフロントエンド
├── docs/              # ドキュメント
└── .github/workflows/ # GitHub Actions
```

## GitHub Secretsの設定

GitHub Actionsで自動実行するには、以下のSecretsを設定してください：

1. リポジトリの Settings → Secrets and variables → Actions
2. 以下のSecretsを追加：

| Secret名 | 説明 |
|----------|------|
| `ANTHROPIC_API_KEY` | Anthropic API Key |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL |

## GitHub Pages の設定

1. Settings → Pages
2. Source: "GitHub Actions" を選択

## 技術スタック

- **言語**: TypeScript
- **ランタイム**: Node.js (ESM)
- **テスト**: Vitest + Playwright
- **LLM**: Anthropic Claude
- **フロント**: Next.js (SSG)
- **CI/CD**: GitHub Actions
- **ホスティング**: GitHub Pages
