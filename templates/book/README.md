# Book Publishing Templates

このディレクトリは、各書籍リポジトリで共通利用する「出版体裁」テンプレートです。

## UX共通仕様（Series UX v1）
- 新規書籍の標準フォーマット（共通コア + profile + modules）を定義します
- book-formatter の生成手順に接続します

参照仕様:
- `docs/publishing/ux-core.md`
- `docs/publishing/ux-profiles.md`
- `docs/publishing/ux-modules.md`

## 使い方
1. 各ファイル内の `{PLACEHOLDER}` を書籍固有の値に置換します。
2. 書籍サイト/ナビ（目次）に以下の順で組み込みます。

推奨順:
1. title
2. copyright
3. preface
4. 本文
5. afterword
6. changelog
7. colophon

## book-formatter での生成例
```bash
npm start init --output ./book-config.json
npm start create-book --config ./book-config.json --output ./my-book
```

## 注意
- ライセンスは本文（文章・図表・画像等）を **CC BY-NC-SA 4.0**（商用は別契約）とします。
- 第三者著作物（引用/画像/コード）は個別に出典・ライセンスを明記してください。
- `ux` 未指定の既存書籍は段階適用を優先します。
- modules のキー追加は `docs/publishing/ux-modules.md` を更新してください。
