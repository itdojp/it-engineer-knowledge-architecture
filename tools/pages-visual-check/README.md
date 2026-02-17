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

## 出力

- `report.json`: 集計レポート
- `report.json#fontVarDrift`: `--font-sans` / `--font-mono` のユニーク値の集計（ドリフト検知用）
- `report.json#globalWarnings`: ページ単位ではない警告（例: fontVarDrift）
- `screenshots/`: `bookKey/browser/viewport/*.jpg`
