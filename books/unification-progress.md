# 書籍フォーマット統一 進捗トラッカー

本ページは、book-formatter v3.0 に基づく書籍フォーマット統一の進捗を管理します。

- 統一ガイド: https://github.com/itdojp/book-formatter/blob/main/docs/book-format-unification-guide.md
- 管理Issue: https://github.com/itdojp/it-engineer-knowledge-architecture/issues/21

## チェックリスト定義
- Pages: GitHub Pages 設定が main /docs
- Config: `_config.yml` の統一（permalink, defaults: layout: book, plugins, repository）
- Template: レイアウト/インクルード/アセット同期（CSS-onlyレスポンシブ, ダークモード, favicon）
- Sidebar: リソースリンク（GitHub → 書籍一覧 → 会社）
- FrontMatter: index/chapters の Front Matter 統一
- Links: リンク切れ・相対リンク修正（Liquid使用）
- Workflow: Actions の重複解消
- QA: リンクチェック/ビルド/モバイル/ダークモード確認

## 進捗一覧（既存書籍）

| リポジトリ | Pages | Config | Template | Sidebar | FrontMatter | Links | Workflow | QA |
|---|---|---|---|---|---|---|---|---|
| illustrated-linux-basics-book |  |  | ✅ | ✅ |  | ✅ |  |  |
| wsl2-linux-essentials-book |  |  | ✅ | ✅ |  | ✅ |  |  |
| linux-infra-textbook2 |  |  | ✅ | ✅ |  | ✅ |  |  |
| linux-infra-textbook |  |  |  | ✅ |  |  |  |  |
| it-infra-software-essentials-book |  |  |  | ✅ |  |  |  |  |
| IT-infra-book |  |  |  | ✅ |  |  |  |  |
| IT-infra-troubleshooting-book |  |  |  | ✅ |  |  |  |  |
| cloud-infra-book |  |  |  | ✅ |  |  |  |  |
| it-infra-security-guide-book |  |  |  | ✅ |  |  |  |  |
| podman-book | ✅ | ✅ | ✅ | ✅ |  | ✅ |  |  |
| practical-auth-book |  |  |  | ✅ |  |  |  |  |
| supabase-architecture-patterns-book |  |  | ✅ | ✅ |  | ✅ |  |  |
| theoretical-computer-science-textbook |  |  | ✅ | ✅ |  | ✅ |  |  |
| github-workflow-book | ✅ | ✅ | ✅ | ✅ |  | ✅ |  |  |
| github-guide-for-beginners-book |  |  |  | ✅ |  |  |  |  |
| formal-methods-book |  |  | ✅ | ✅ |  | ✅ |  |  |
| BioinformaticsGuide-book |  |  | ✅ | ✅ |  | ✅ |  |  |
| IT-engineer-communication-book |  |  | ✅ | ✅ |  | ✅ |  |  |
| ai-communication-book |  |  | ✅ | ✅ |  | ✅ |  |  |
| ai-era-engineers-mind-book |  |  | ✅ | ✅ |  | ✅ |  |  |
| ai-testing-strategy-book |  |  | ✅ | ✅ |  | ✅ |  |  |
| LogicalThinking-AI-Era-Guide |  |  | ✅ | ✅ |  | ✅ |  |  |
| negotiation-for-engineers-book |  |  | ✅ | ✅ |  | ✅ |  |  |
| cs-visionaries-book |  |  | ✅ | ✅ |  | ✅ |  |  |
| computational-physicalism-book |  |  | ✅ | ✅ |  | ✅ |  |  |
