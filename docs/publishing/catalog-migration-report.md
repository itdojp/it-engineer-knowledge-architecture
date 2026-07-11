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

## 移行項目の処理状態

2026-07-12のPhase 5整理で、解決済み、継続対応、別Issueの3区分へ更新した。

| 区分 | 項目 | 処理状態 | 対応 |
|---|---|---|---|
| 解決済み | 旧一覧・旧計画・旧学習パス | `books/existing-books.md`、`books/planned-books.md`、`roadmap/learning-paths.md`を非正本・更新停止の履歴資料と明示した。 | 現行情報の編集経路を`docs/_data/catalog.json`へ一意化し、読者向け表示を`/books/`と`/paths/`へ案内する。3文書は自動生成物ではなく、移行前の説明・期間・演習等を保存する。 |
| 解決済み | 旧クラウド書籍識別子 | 現行参照を`cloud-infra-book`へ統一した。 | 計画書籍`enterprise-cloud-architecture-guide`の前提書籍も`prerequisites: ["cloud-infra-book"]`として構造化した。旧識別子の再混入はdebt checkで拒否する。 |
| 継続 | レビュー状態の粒度差 | メインライン公開書籍は`reviewStatus: "reviewed"`を基本にしたが、個別の`lastReviewedAt` / `reviewIssue`は推測せず`null`のままにした。 | Parent Issue #187のQuality Sprintで、一次証跡が確認できた書籍から更新する。履歴資料の古いレビュー表記は現況として使用しない。 |
| 継続 | 個別日本語概要 | README公開カタログの多くは個別の日本語要約を持たない。 | `summary.ja`は推測で埋めず、Parent Issue #187のQuality Sprintで書籍本文を確認して補完する。 |
| 別Issue | UX profile/modules | 既存registry由来の暫定値または必須モジュール不足が残る。 | #197で実書籍の証跡を確認し、`ux.profile` / `ux.modules`を更新する。 |
| 解決済み | 動的メトリクス | Star数、Open Issue数、Open PR数、GitHub上の更新日時は時点依存である。 | 正本に保存せず、`sourcePolicy.externalDynamicFields`と進捗レポート生成スクリプトで扱う。 |
| 解決済み | 学習順序 | 正本の`learningPaths[].bookIds`と`nextPathIds`をcatalog IDで構造化し、公開`/paths/`を正本から生成する。 | 循環・存在しない参照・表示リンクをCI/E2Eで検証する。 |

### 旧学習パス文書の分類

`roadmap/learning-paths.md`と正本`learningPaths`を比較し、次の境界で保持する。詳細説明を正本schemaへ推測で追加しない。

| 分類 | 情報 | 扱い |
|---|---|---|
| 正本へ移行済み | パスID、表示名、説明、書籍順序、次のパス | `docs/_data/catalog.json`の`learningPaths`で管理し、`/paths/`へ生成する。 |
| 履歴・参考情報として保持 | レベル別Phase目標、想定期間、学習内容、実践項目、専門分野別の派生案 | `roadmap/learning-paths.md`に凍結保存する。現行情報ではなく、今後schema化する場合の調査材料とする。 |
| 横断ガイダンスとして保持 | 習得レベル評価、進捗追跡、学習加速の工夫 | 書籍順序を決める正本データではないため、履歴資料内の参考情報として保持する。 |

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

## Phase 5で意図的に変更しない範囲

- 公開サイトのレイアウト、デザイン、URL、アンカー
- 履歴資料に残した期間、演習、専門分野別案のschema追加
- `books/existing-books.md`、`books/planned-books.md`、`roadmap/learning-paths.md`の削除・自動生成化
- 個別書籍リポジトリの修正
- 外部URLのHTTP確認をPR必須チェックに含めること
