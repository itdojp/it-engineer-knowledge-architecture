<!-- NOTE: このディレクトリの文書は「codex cli に渡す共通プロンプト」のたたき台です。 -->

# codex-prompts

本ディレクトリは、it-engineer-knowledge-architecture シリーズで **codex cli を用いて編集作業を進める際の共通プロンプト**を置くための場所です。

## 使い方（概要）

- Stage2（構成レビュー）: `stage2-structure-review.md` をベースに、対象書籍リポジトリ内でレビュー文書（例: `docs/project-management/structure-review-round1.md`）を生成します。
- Stage3（表現・スタイル）: `stage3-style-editing.md` をベースに、対象章を 1〜2 章に限定して微修正し、PR で差分確認します。

## 前提

- 既存の企画意図・主張は変更しない（不明点は「要確認」）。
- Stage2 は **レビュー文書の作成のみ**で、本文編集は行わない。
- Stage3 は **意味を変えない範囲**での表現調整（文の分割・冗長表現の整理・表記ゆれ調整・コードブロック言語指定など）に留める。

## 関連ドキュメント

- Stage3 ミニスタイルガイド: `project-management/STYLE_GUIDE_AI_BOOKS.md`
