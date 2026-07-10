# Catalog Migration Report

作成日: 2026-07-10
対象Issue: [#176](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/176)

## 目的

書籍横断メタデータの正本を `docs/_data/catalog.json` に集約し、既存の重複ファイルに含まれる不一致を隠さず記録する。PR 1/2 の範囲では公開サイトのデザインと既存URLは変更せず、既存の互換利用箇所には正本から生成した `docs/publishing/book-registry.json` を提供する。

## 移行元

次のファイルを移行・照合対象にした。

- `README.md`
- `docs/index.md`
- `docs/en/index.md`
- `books/existing-books.md`
- `books/planned-books.md`
- `roadmap/learning-paths.md`
- `docs/publishing/book-registry.json`

GitHub API由来のStar数、Open Issue数、Open PR数、リポジトリ更新日時は正本に保存しない。これらは既存の進捗レポート生成時に動的フィールドとして扱う。

## 移行結果

| 区分 | 件数 | 正本上の表現 |
|---|---:|---|
| メインライン公開書籍 | 41 | `countingGroup: "main-lineup"` かつ `countedInMainLineup: true` |
| 計画書籍 | 7 | `status: "planned"`, `countingGroup: "planned"`, `publicationScope: "planned"` |
| 関連する独立英語書籍 | 1 | `countingGroup: "related-independent"`, `countedInMainLineup: false` |
| 総レコード | 49 | 上記すべてを `books[]` に含める |
| 互換用registry出力 | 41 | 既存互換のためメインライン公開書籍のみを `books` に出力 |

`docs/publishing/book-registry.json` は `docs/_data/catalog.json` から生成する互換ファイルに変更した。今後、新規メタデータ項目は原則として正本へ追加し、registryは既存Workflow/ツールの互換用途に限定する。

## 正本化で明示した例外・方針

### 関連する独立英語書籍

`composable-software-design-book` は `docs/en/index.md` で `Independent EN book` として扱われている。日本語メインライン41冊には含めず、正本では次のように明示した。

- `countingGroup: "related-independent"`
- `countedInMainLineup: false`
- `languages: ["en"]`
- 関連日本語書籍 `categorical-software-design-book` とは `relatedEditions` で相互参照

### Private管理書籍

`ai-agent-collaboration-book` は有料部分を含むため管理リポジトリがPrivateである。正本では次のように明示した。

- `repoVisibility: "private"`
- `publicationScope: "free-preview"`
- `pagesUrl` は無料公開範囲を示す公開Pages URLを保持
- `notes` に「有料部分を含むPrivate管理書籍。Pagesは無料公開範囲のみ。」を記録

互換registryにも `repoVisibility`, `pagesPublicationScope`, `accessNote` を生成する。

### 計画書籍

計画7冊は、公開済みと同じスキーマに載せたうえで、未作成状態を構造化した。

- `status: "planned"`
- `repoVisibility: "not-created"`
- `pagesUrl: null`
- `publicationScope: "planned"`

リポジトリ名は計画上の識別子として保持するが、存在確認やPages公開確認の対象にはしない。

## 確認済みの不一致・未解決事項

| 項目 | 内容 | 対応 |
|---|---|---|
| `books/existing-books.md` の旧情報 | `cloud-infra-handbook` など、現行公開カタログ/registryと異なる旧リポジトリ名・URLが残っている。 | 正本は現在の公開カタログと既存registryを優先し、旧情報は本レポートで未解決として記録。Phase 4/5以降で既存重複ページを正本生成へ移行する。 |
| レビュー状態の粒度差 | `README.md` は「既存41冊（レビュー済み）」、一方 `books/existing-books.md` には「レビュー予定」や古いIssue参照が残る。 | メインライン公開書籍は `reviewStatus: "reviewed"` を基本にしたが、個別の `lastReviewedAt` / `reviewIssue` は推測せず `null` のままにした。 |
| 個別日本語概要 | README公開カタログの多くは個別の日本語要約を持たない。 | `summary.ja` は推測で埋めず空文字を許容し、各レコードの `notes` に「日本語個別概要はREADME公開カタログ上で未記載。」を記録した。 |
| UX profile/modules | 既存 `docs/publishing/book-registry.json` に「暫定割当（要確認）」が含まれる。 | `ux.profile` / `ux.modules` に構造化して移行し、暫定性は `notes` に残した。 |
| 動的メトリクス | Star数、Open Issue数、Open PR数、GitHub上の更新日時は時点依存。 | 正本に保存せず、`sourcePolicy.externalDynamicFields` と進捗レポート生成スクリプトで扱う。 |
| 学習順序 | `roadmap/learning-paths.md` は表示名・本文説明ベースで、機械検証可能なID参照ではない。 | 初期正本では `learningPaths[].bookIds` と `nextPathIds` をcatalog IDで構造化した。今後、公開表示は正本生成へ移行する。 |

## 構造化できた暫定事項

- `ux.profile` と `ux.modules` は既存registryの値を保持し、未確認性を `notes` に残した。
- `publicationScope` により、完全公開、無料公開範囲、計画段階を区別した。
- `countingGroup` と `countedInMainLineup` により、41冊メインライン、7冊計画、1冊関連独立書籍の集計意味を分離した。
- `repoVisibility` により、公開、Private管理、未作成を区別した。
- `prerequisites`, `recommendedAfter`, `relatedEditions`, `learningPaths[].bookIds`, `learningPaths[].nextPathIds` は表示名ではなくcatalog IDで参照するようにした。

## 検証基盤への接続

この移行に合わせて、次の検証を追加した。

- `scripts/validate-catalog.mjs`: 必須フィールド、enum、ID/repo/Pages URL一意性、公開/計画/Private管理書籍の整合、参照先ID、集計値を検証
- `scripts/validate-learning-graph.mjs`: 前提関係と学習パスの循環を検出
- `scripts/generate-catalog-derived.mjs --check`: 正本から生成した互換registryとの差分を検出
- `scripts/test-catalog-fixtures.mjs`: 正常fixtureと不正fixture（ID重複、存在しない前提ID、循環、Private管理書籍の公開範囲不整合）を検証
- `.github/workflows/validate-learning-paths.yml`: grep中心の冊数確認と空実装の循環/前提チェックを `npm run verify` ベースの実検証へ置換

## このPRで意図的に変更しない範囲

- 公開サイトのレイアウト、デザイン、URL、アンカー
- `README.md`, `docs/index.md`, `docs/en/index.md` のデータ駆動生成
- `books/existing-books.md` や `books/planned-books.md` の削除・再生成
- 個別書籍リポジトリの修正
- 外部URLのHTTP確認をPR必須チェックに含めること

これらは #176 の後続Phaseで扱う。
