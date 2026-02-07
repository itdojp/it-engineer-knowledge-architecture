---
layout: default
title: 運用プレイブック（book-formatter更新の横展開）
description: book-formatter更新時の追随PR作成・検証・マージまでの標準手順
---

# 運用プレイブック（book-formatter更新の横展開）

## 対象

- シリーズ内書籍（`docs/publishing/book-registry.json` で管理）
- 各書籍の Book QA ワークフローが `itdojp/book-formatter` を **commit SHA で pin** してチェックアウトする構成

## 目的

- Book QA（自動検査）の仕様・実装更新を、シリーズ内の全書籍へ一貫して適用する
- CIの再現性を確保するため、参照先は原則 **commit SHA pin** とする（floating tag は原則使用しない）

## 前提（実行環境/権限）

- ローカル: `git` / `gh`（GitHub CLI）/ `node`（book-formatter の実行に必要）
- 権限: 対象書籍リポジトリに PR 作成・ブランチ push・マージが可能
- 制約: GitHub API の secondary rate limit（HTTP 429）が発生する可能性がある（後述）

## 手順

### 1. book-formatter 側で pin する commit SHA を確定

- `itdojp/book-formatter` の対象PRをマージし、pin すべき commit SHA（40桁）を確定する
- 併せて、book-formatter 側 CI が成功していることを確認する（最低限: lint/test）

### 2. ロールアウト方針（ブランチ/PR単位）を決める

- 原則: **1冊=1PR**（レビュー容易性・コンフリクト局所化を優先）
- ブランチ名（例）: `chore/book-formatter-pin-YYYYMMDD`
- PRタイトル（例）: `chore(ci): bump book-formatter pin`
- PR本文には以下を必ず含める
  - 旧SHA（短縮可）→ 新SHA（短縮可）
  - 目的（例: QAルール更新反映、誤検知低減、CI安定化）
  - pin を SHA で固定する理由（再現性の担保）

### 3. 各書籍で pin 更新の追随PRを作成

変更箇所（典型）
- `.github/workflows/book-qa.yml` 内の `repository: itdojp/book-formatter` に紐づく `ref: <SHA>` のみを更新する

推奨運用
- 差分は最小（pin更新以外の無関係変更を混在させない）
- 既存の Book QA が失敗する場合は、先に失敗要因を解消するPRを別途作成してから pin 更新PRに着手する

### 4. CI/レビュー/コンフリクトに対応

- レビュー本文・インラインコメント（suggestion 含む）を全件確認し、必要なら修正、不要なら理由を返信する
- コンフリクトが発生した場合は、対象PRブランチを `main` に追従させて解消する（PR差分を増やしすぎない）

### 5. マージとブランチのクリーンアップ

- マージ方式は原則 squash を推奨（履歴を簡潔に保つ）
- マージ後は PR ブランチを削除する

### 6. ロールアウト完了の検証と記録

- open PR が残っていないことを確認する
- 必要に応じて、全書籍で QA の再スキャン（例: layout risk scan）を実行し、エラー/警告が増えていないことを確認する
- 追跡 Issue（例: `it-engineer-knowledge-architecture#102`）へ PR 一覧・検証結果をコメントし、チェックリストを消し込む

## secondary rate limit（HTTP 429）対策

- `gh pr view` 等のAPI呼び出しを大量にループしない（可能なら GraphQL で集約する）
- 操作（PR作成/コメント/マージ）を短時間に連続実行しない（適宜 `sleep` と指数バックオフを入れる）
- エラー文言に `429 Too Many Requests` / `secondary rate limit` / `exceeded retry limit` が含まれる場合は、待機してから再試行する

