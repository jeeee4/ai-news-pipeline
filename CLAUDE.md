# AI News Pipeline

## 概要

Hacker NewsからAI関連ニュースを取得し、LLMで要約してSlack通知＆Webで公開するツール。
個人の便利ツール兼ポートフォリオとして開発。

## 技術スタック

- **言語**: TypeScript (ESM)
- **ランタイム**: Node.js 20
- **LLM**: Anthropic Claude API
- **フロント**: Next.js (App Router, SSG)
- **テスト**: Vitest (Unit) + Playwright (E2E)
- **CI/CD**: GitHub Actions
- **ホスティング**: GitHub Pages

## アーキテクチャ

```
GitHub Actions (cron: 毎日JST 9:00)
    │
    ▼
Node.js パイプライン
    │
    ├─→ HN API → Scraper → LLM要約 → Slack通知
    │
    └─→ data/news.json → Next.js SSG → GitHub Pages
```

**ポイント**: バッチサーバー不要。GitHub Actionsで定期実行、GitHub Pagesで静的ホスティング。

## ディレクトリ構造

```
├── src/                 # CLIパイプライン
│   ├── api/            # Hacker News API
│   ├── scraper/        # 記事スクレイピング
│   ├── llm/            # Anthropic クライアント
│   ├── summarizer/     # 要約サービス
│   ├── slack/          # Slack通知
│   └── pipeline/       # 統合パイプライン
├── web/                # Next.js フロントエンド
│   ├── src/app/       # App Router
│   ├── src/components/
│   └── e2e/           # Playwright E2Eテスト
├── docs/              # ドキュメント
│   └── REQUIREMENTS.md # 要件定義・ロードマップ
└── .github/workflows/ # GitHub Actions
    ├── ci.yml         # テスト・ビルド
    ├── deploy.yml     # GitHub Pages デプロイ
    └── collect-news.yml # 定期ニュース収集
```

## 開発コマンド

```bash
# パイプライン実行
npm run dev

# テスト
npm run test          # Unit (watch)
npm run test:run      # Unit (単発)
npm run test:coverage # カバレッジ

# Web開発
cd web
npm run dev           # 開発サーバー
npm run build         # ビルド
npm run test:e2e      # E2Eテスト
```

## 環境変数

```bash
ANTHROPIC_API_KEY=    # Anthropic API Key
SLACK_WEBHOOK_URL=    # Slack Incoming Webhook URL
```

GitHub Secrets にも同じ値を設定済み。

## 現在のステータス

- **Phase 1**: 完了（基本機能）
- **Phase 2**: 開発中（ニュースソース拡充、データ管理）

## タスク確認

```bash
gh issue list                    # オープンなIssue一覧
gh issue list --label priority:high  # 優先度高のIssue
```

## 関連ドキュメント

- `README.md` - プロジェクト概要
- `docs/REQUIREMENTS.md` - 詳細要件・Phase 2ロードマップ
