---
layout: default
title: フォント可読性 E2E 確認ログ（2026-05-24）
description: Issue #117 の Pages Visual Check 再実行結果、修正PR、残警告、実機目視への引き継ぎ
---

# フォント可読性 E2E 確認ログ（2026-05-24）

関連: [Issue #117](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/117)

## 目的

フォント統一後のフォローアップとして、現行 `docs/publishing/book-registry.json` に掲載されている 39 冊を対象に、モバイル相当の Pages Visual Check を再実行しました。
本ログは、E2E で検出した font/runtime gate の失敗、対応PR、再実行結果、実機目視へ残す事項を記録するものです。

## 実行条件

| 項目 | 値 |
| --- | --- |
| 実行日 | 2026-05-24（Asia/Tokyo） |
| 対象 | `docs/publishing/book-registry.json` 掲載 39 冊 |
| browsers | `chromium,webkit` |
| devices | `pixel7,iphone13` |
| maxPagesPerBook | `4` |
| captureSidebar | `true` |
| enforceFontSpec | `true` |
| Playwright | `tools/pages-visual-check/package.json` の `playwright@1.58.2` |

再実行しやすいように、以下はリポジトリルートからの相対パスで表記しています。
実際の確認では同等の workspace-local 一時ディレクトリを指定しました。

```bash
PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-./tmp/ms-playwright}" \
node tools/pages-visual-check/run.mjs \
  --registry docs/publishing/book-registry.json \
  --output ./tmp/pages-visual-check-117-post-fixes-20260524 \
  --browsers chromium,webkit \
  --devices pixel7,iphone13 \
  --maxPagesPerBook 4 \
  --concurrency 3 \
  --captureSidebar \
  --enforceFontSpec
```

## 初回結果と修正

初回実行では、39 冊 / 312 ページ中 `fail=16` を検出しました。
主因は `computational-physicalism-book` と `cs-visionaries-book` の font/runtime gate 不整合でした。

| リポジトリ | 検出内容 | 対応PR | 状態 |
| --- | --- | --- | --- |
| `itdojp/computational-physicalism-book` | `--font-sans` / `--font-mono` 欠落、存在しない `safe-main.js` 参照、classic script の `styleSheet` グローバル衝突 | [PR #143](https://github.com/itdojp/computational-physicalism-book/pull/143) | merged |
| `itdojp/cs-visionaries-book` | `--font-sans` / `--font-mono` 欠落、存在しない `safe-main.js` 参照 | [PR #163](https://github.com/itdojp/cs-visionaries-book/pull/163) | merged |

## Pages Visual Check ツールの補正

一部の生成済み書籍レイアウトは、モバイルDrawerを `.active` ではなく `.is-open` と `window.sidebarManager.open()` で制御します。
`--captureSidebar` が実際の UI 状態を確認できるように、Pages Visual Check は以下を許容します。

- `#sidebar-toggle-checkbox` がある旧レイアウト
- `#sidebar.active` を使うレイアウト
- `#sidebar.is-open` を使うレイアウト
- `window.sidebarManager.open()` を公開するレイアウト

この補正により、UI 側では開けるDrawerを `sidebar did not open` と誤判定するケースを減らします。

## 修正後の再実行結果

修正PRのマージと Pages 反映後、同条件で再実行しました。

| 指標 | 結果 |
| --- | --- |
| books | 39 |
| pagesChecked | 312 |
| ok | 296 |
| warn | 16 |
| fail | 0 |
| globalWarn | 0 |

`fail=0` となり、font/runtime gate の失敗は解消しました。

## 残警告

残る `warn=16` は、実機目視または書籍別 follow-up PR で扱う対象です。

| リポジトリ | 警告 | 対象 |
| --- | --- | --- |
| `ai-agent-engineering-book` | Drawer open 時に active TOC が可視領域外 | Chapter 7 / Chapter 12、Pixel 7 / iPhone 13 |
| `cs-visionaries-book` | モバイル横方向 overflow | root、Chapter 1 / 7 / 12、Pixel 7 / iPhone 13 |
| `formal-methods-book` | モバイル横方向 overflow | Chapter 1 / 13、Pixel 7 / iPhone 13 |
| `negotiation-for-engineers-book` | appendix log page の active TOC 不一致、`rel=prev/next` 欠落 | `appendices/logs/NEG-2024-06-10-001/`、Pixel 7 / iPhone 13 |

## 実機目視への引き継ぎ

この確認は Playwright の device emulation による E2E であり、実機 iOS Safari / Android Chrome / Windows Edge/Chrome の代替ではありません。
Issue #117 の実機チェックは、以下の順序で消し込む必要があります。

1. 本ログの残警告テーブルから対象ページを優先して開く。
2. iOS Safari / Android Chrome / Windows Edge/Chrome で、TOC、前へ/次へ、本文、コード、SVG、テーブル、長いURLを確認する。
3. 問題が再現する場合は該当書籍リポジトリへ小粒PRを作成する。
4. 問題が再現しない場合も、端末名、OS、ブラウザ、確認ページ、判断理由を Issue #117 へコメントする。
