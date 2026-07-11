# カタログメタデータ品質基準

- 更新日: 2026-07-11
- 対象Issue: [#187](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/187)
- 正本: `docs/_data/catalog.json`

## 1. 目的と原則

この文書は、書籍カタログを読者向け案内と運用上のレビュー証跡の両方に利用するための記録基準を定義する。値は各書籍のREADME、本文、公開ページ、正式な企画資料、レビューIssue・PRなど、第三者が追跡できる根拠に基づいて記録する。

次の原則を適用する。

1. 不明な値を推測で補完しない。未確認は `null`、空文字、または具体的な運用メモとして残す。
2. 時点依存情報には確認日またはレビュー証跡を付ける。
3. `docs/_data/catalog.json` を正本とし、生成物を手動編集しない。
4. 内部enum、移行メモ、監査用参照は検索・運用には利用しても、通常の読者向けカードへ直接表示しない。
5. metadata補完はQuality Sprintの2〜4冊単位で行い、根拠と検証結果をIssue・PRへ記録する。

## 2. 読者向け概要

### `summary.ja`

- 日本語書籍では、何を、どの読者が、どこまで学べるかを1〜2文で記述する。
- 目安は全角60〜180字とし、章一覧の機械的な列挙や根拠のない宣伝表現を避ける。
- 対象読者、主要トピック、到達点のうち少なくとも2点を含める。
- READMEと本文が一致しない場合は、本文と現行公開ページを確認し、必要なら書籍側を先に修正する。

### `summary.en`

- `summary.ja` と実際の章構成に矛盾しない1〜2文の英語概要とする。
- 単純な機械翻訳ではなく、英語読者が書籍の範囲を判断できる表現にする。
- 英語概要の根拠が確認できない計画書籍は空文字を許容し、棚卸し対象として残す。

日本語と英語の書名が同一であることは、特に日本語のみの書籍では直ちに不備とは限らない。`title.ja == title.en` は棚卸し候補として扱い、正式英語書名が確認できる場合のみ変更する。

## 3. 学習期間

`estimatedWeeks` は、次のいずれかに根拠がある場合だけ記録する。

- 書籍READMEまたは本文に示された標準学習計画
- 正式な企画書、研修カリキュラム、シラバス
- Issue・PRで合意された、1週あたりの学習時間を含む算定方法

章数、文字数、演習数だけから週数を推測しない。時間表記を週数へ換算する場合は、1週あたりの想定学習時間を根拠に含める。根拠がない場合は `null` を維持し、古い一覧の値を無条件に転記しない。

## 4. 学習順

### `prerequisites`

- その書籍を開始する前に理解または修了している必要がある書籍をcatalog IDで記録する。
- README、本文の「前提知識」「次のステップ」または正式な学習パスを根拠とする。
- 読者向け表示ではcatalog IDを直接表示せず、参照先の書名と同一ページ内リンクへ変換する。

### `recommendedAfter`

- 必須ではないが、その書籍の後に読むと学習がつながる書籍をcatalog IDで記録する。
- `prerequisites` の逆参照を機械的に複製しない。推奨理由が確認できる場合だけ設定する。

参照先は必ず正本に存在するIDとし、循環は `npm run validate:learning-graph` で検出する。

## 5. レビュー証跡

### `reviewStatus`

- `reviewed`: 定義済みの範囲で内容、メタデータ、公開表示、CIを確認した。
- `review-needed`: 公開済みだが、現行仕様・安全性・出典・表示の再確認が必要である。
- `not-started`: 計画段階など、レビュー対象がまだ成立していない。
- `unknown`: 移行時点で状態を判定できず、確認手順も未確定である。

### `lastReviewedAt`

- 実際にレビューを完了し、必要な修正のmerge後確認まで終えた日を `YYYY-MM-DD` で記録する。
- ファイルの更新日、Issue作成日、推定日を代用しない。

### `reviewIssue`

- レビュー範囲、判断、PR、CI、本番確認を追跡できるIssue番号を記録する。
- `reviewStatus: reviewed` でも既存の証跡が確認できない移行レコードは、推測で番号を設定しない。

## 6. UX Profileとmodules

Profileとmoduleは、書籍リポジトリの設定だけでなく、公開対象ファイルの実体を確認して判定する。

- Profile A: 初学者向け。Quick Start、読み方、概念図、用語導線を中心とする。
- Profile B: 実務適用向け。チェックリスト、トラブルシューティング、法的・運用上の注意を含む。
- Profile C: 理論・研究向け。概念関係、図表索引、用語・出典導線を重視する。

各moduleは、対応するページ、見出し、設定、ナビゲーションなどの確認可能な実体がある場合だけ `true` とする。判定根拠は `sourceRefs`、レビューIssue、または具体的な `notes` に残す。「暫定割当（要確認）」だけで長期維持しない。

## 7. `notes` の取り扱い

`notes` は運用・移行・例外の説明に使用し、通常の読者向けカードには表示しない。

記録してよい内容:

- Private管理と無料試読範囲など、公開モデル上の例外
- 未確認項目と、その確認方法
- 移行元の不一致を解消するために必要な具体的作業
- UX判定などの監査文脈

避ける内容:

- 読者向け概要の代替
- 「要確認」だけで確認対象・方法が分からない記述
- 秘密情報、非公開URL、個人情報
- `sourceRefs` と同じURLの単純な列挙

読者へ必要なPrivate、無料試読、計画中、独立英語書籍の説明は、構造化フィールドから統一文言を生成する。

## 8. `sourceRefs`

次の形式を許容する。

- 対象書籍リポジトリのREADME、設定、主要本文への固定またはmainブランチURL
- 公開Pages URL
- レビューIssue、修正PR、merge commit
- 本リポジトリ内の正本性を持つ文書への相対パス
- 正式な企画資料の参照先（アクセス条件を明示できるもの）

生成物だけ、存在しないパス、検索結果ページ、根拠内容を特定できないリポジトリトップだけに依存しない。Private資料を参照する場合も、秘密情報や有料本文を `notes` へ転記しない。

## 9. Quality Sprint完了時の更新手順

1. 対象書籍のdefault branch、open Issue・PR、CI、README、本文、Pagesを確認する。
2. 内容修正が必要なら書籍側PRを先にmergeし、main CIとPagesを確認する。
3. 根拠に基づいて `summary`、対象読者、学習順、レビュー証跡、UX、`notes`、`sourceRefs` を更新する。
4. `estimatedWeeks` は根拠がある場合だけ設定する。
5. `npm run generate` で派生物とcatalog debt reportを再生成する。
6. 次を実行する。

   ```bash
   npm ci
   npm run verify
   node scripts/validate-ux-registry.js
   npm audit --audit-level=moderate
   git diff --check
   ```

7. PRレビューthreadを0にし、CI green後にmergeする。
8. mainのDeploy Pages、production smoke、`/build-info.json`、Pages drift、公開ページを確認する。
9. Issueへ根拠、PR、merge commit、検証結果、残課題を記録する。

## 10. 棚卸しレポートとCI

`scripts/report-catalog-debt.mjs` は、既存欠損を決定的なJSONとして可視化する。現在時刻を含めず、同じ入力からbyte-for-byte同じ出力を生成する。

- `npm run report:catalog-debt`: 現状JSONを標準出力へ表示する。
- `npm run generate`: 正本由来の生成物と `docs/publishing/catalog-debt-report.json` を更新する。
- `npm run check:catalog-debt`: 生成レポートの同期と読者向け表示gateを確認する。

空概要、未記録期間、未記録レビュー証跡、暫定メモ、同一書名、UX根拠候補、旧識別子は情報提供項目とし、既存件数だけを理由にCIを失敗させない。生成レポートの非同期、または通常カードへの内部enum、運用notes、`sourceRefs`、生のprerequisite ID再露出はCI failureとする。
