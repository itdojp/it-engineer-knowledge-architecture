# Pages Visual Check (Playwright)

GitHub Pages の「見え方/体裁」を横断的に点検するための自動チェックです。

- 対象書籍は `docs/publishing/book-registry.json` の allowlist に限定します（非対象リポジトリは処理しません）。
- スクリーンショット（viewport 単位）と、最低限のヒューリスティック検査結果を JSON で出力します。
- ベースライン画像のコミットは行いません（レビュー用に成果物として参照する運用）。

## 使い方（ローカル）

```bash
cd tools/pages-visual-check
npm ci
npx playwright install --with-deps chromium

# 既定: 28冊 x (root + 代表3ページ) x (mobile+desktop) x chromium
npm run check
```

出力先（既定）: `tools/pages-visual-check/output/<timestamp>/`

## 使い方（オプション）

```bash
node run.mjs \
  --registry ../../docs/publishing/book-registry.json \
  --output ../../tmp/pages-visual-check \
  --browsers chromium,firefox \
  --viewports mobile,tablet,desktop \
  --maxPagesPerBook 4 \
  --concurrency 2 \
  --captureSidebar \
  --enforceFontSpec
```

### Device emulation（オプション）

`--devices` を指定すると、Playwright の device descriptor を使って実行します（`--viewports` は無視されます）。

例（aliases を使用。Pixel 7=chromium / iPhone 13=webkit のため両方を選択）:

```bash
node run.mjs \
  --registry ../../docs/publishing/book-registry.json \
  --output ../../tmp/pages-visual-check-devices \
  --browsers chromium,webkit \
  --devices pixel7,iphone13 \
  --maxPagesPerBook 2 \
  --concurrency 2 \
  --enforceFontSpec
```

## チェック内容（概要）

- ドキュメントの HTTP ステータス（`>=400` を fail）
- ページ実行時例外（`pageerror` を fail）
- same-origin の 4xx/5xx 応答（`assets` 破損の可能性として fail）
- 画像の broken 判定（warn）
- 横スクロールの発生（warn）
- `--font-sans` / `--font-mono` の CSS 変数が存在するか（欠落は fail）
- `--enforceFontSpec` 指定時は `docs/FONT-SPECIFICATION.md` から期待値を抽出し、ドリフトを fail
- `rel="prev"` / `rel="next"` の存在（root 以外で両方欠落は warn）
- `.toc-link.active` が現在URLと一致しているか（TOC現在位置ハイライトの整合性。不一致は warn）

## 目視観点（Artifacts screenshots のチェックポイント）

Artifacts の screenshots は、自動検査で拾えない「体裁/可読性」のサンプリング確認に使います。

- 目次（TOC）: 表示/スクロール/現在位置ハイライト
- 前へ/次へ: 章間遷移の導線が崩れていない
- 本文: 日本語 + 英数字/記号の混在で可読性が低下していない
- コード: monospace 適用、折返し/横スクロール、可読性
- 図表（SVG）: 文字化け/フォント崩れ/レイアウト崩れがない
- テーブル/長いURL: 横溢れがない（必要時は横スクロール）

## 出力

- `report.json`: 集計レポート
- `index.html`: スクリーンショットを閲覧するためのHTMLレポート（ローカルで開いて利用）
- `report.json#fontVarDrift`: `--font-sans` / `--font-mono` のユニーク値の集計（ドリフト検知用）
- `report.json#globalWarnings`: ページ単位ではない警告（例: fontVarDrift）
- `screenshots/`: `bookKey/browser/viewport/*.jpg`
  - `--captureSidebar` 指定時は `*__sidebar.jpg` を追加出力（Drawer/TOC を開いた状態）
