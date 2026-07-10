# IT Engineer Knowledge Architecture

IT Engineer Knowledge Architecture は、ITDO の技術書シリーズを横断管理するための運用リポジトリです。読者向けの公開サイト、書籍メタデータ正本、学習パス、出版・レビュー運用資料、品質確認Workflowを管理します。

- 公開サイト: https://itdojp.github.io/it-engineer-knowledge-architecture/
- 書籍一覧: https://itdojp.github.io/it-engineer-knowledge-architecture/books/
- 学習パス: https://itdojp.github.io/it-engineer-knowledge-architecture/paths/
- English catalog: https://itdojp.github.io/it-engineer-knowledge-architecture/en/

## このリポジトリの役割

- 書籍メタデータの正本を `docs/_data/catalog.json` として管理する。
- 正本から読者向けカタログ、学習パス、互換用registryを生成・検証する。
- 出版テンプレート、レビュー基準、UX仕様、品質スプリント運用を文書化する。
- GitHub Pages の公開サイトを管理する。

個別書籍の本文や書籍固有の修正は、原則として各書籍リポジトリで扱います。

## 主要ディレクトリ

| パス | 役割 |
|---|---|
| `docs/` | GitHub Pages 公開サイト |
| `docs/_data/catalog.json` | 書籍メタデータ正本 |
| `docs/books/` | 正本から生成する読者向け書籍一覧ページ |
| `docs/paths/` | 正本から生成する学習パスページ |
| `docs/publishing/` | 出版・レビュー・運用ガイド |
| `books/` | 既存の運用補助資料・履歴資料 |
| `roadmap/` | 学習パス関連の既存資料 |
| `schemas/` | カタログスキーマ |
| `scripts/` | 検証・生成スクリプト |
| `tests/fixtures/` | カタログ検証fixture |
| `.github/workflows/` | CI、Pages、定期確認Workflow |

## メタデータ更新手順

1. `docs/_data/catalog.json` を更新する。
2. 必要に応じて `docs/publishing/catalog-migration-report.md` に例外や未解決事項を追記する。
3. 互換ファイルを再生成する。

```bash
npm run generate
```

4. 検証を実行する。

```bash
npm ci
npm run verify
node scripts/validate-ux-registry.js
npm audit --audit-level=moderate
```

`docs/publishing/book-registry.json` は互換用の生成物です。新規の正本項目は原則として `docs/_data/catalog.json` へ追加してください。

## ローカルサイト確認

Jekyll が利用できる環境では、次のように公開サイトを生成できます。

```bash
jekyll build --source docs --destination .site --baseurl /it-engineer-knowledge-architecture
```

GitHub Pages 用の本番デプロイは `.github/workflows/deploy-pages.yml` で Actions artifact として行います。

## Workflow運用方針

- PRでは `npm run verify` と Jekyll build の構造チェックを通す。
- 定期実行Workflowは、実行時点の動的データをartifactまたはIssue通知として扱い、定期実行だけを理由に `main` へ自動コミットしない。
- Star数、Open Issue/PR数、リポジトリ更新日時などの時点依存データは正本へ保存しない。

## コントリビューション

- 変更は小さなPRに分割する。
- 個別書籍の内容変更は、対象書籍リポジトリでPRを作る。
- 不明な情報は推測で正本へ入れず、`notes` または移行レポートに未解決事項として記録する。
- 公開URLの変更やリダイレクトが必要な場合は、影響範囲と検証方法をPR本文に明記する。

## ライセンス

- 本リポジトリ内の文書は、特記がない限り CC BY-NC-SA 4.0 に基づきます。
- 商用利用や研修利用の詳細は `LICENSE-SCOPE.md` と公開サイトの出版ガイドを参照してください。
