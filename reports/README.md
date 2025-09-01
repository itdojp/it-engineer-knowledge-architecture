# リンク監査レポート

このディレクトリには、書籍群のリンク監査結果を配置します。

## nav_audit.csv（章ページリンク監査）

- 目的: 章ページのHTTP応答と前後ナビ（page-nav）の有無を横断的に確認
- 仕様: `repo, path, http_status, page_nav`
  - `repo`: 書籍リポジトリ名
  - `path`: `_data/navigation.yml` に記載の `path`
  - `http_status`: 取得したHTTPステータスコード
  - `page_nav`: 本文下部に `class="page-nav"` が存在すれば `1`、なければ `0`

### 再生成方法

`scripts/nav_audit.sh` を実行すると、`reports/nav_audit.csv` を再生成します。

```bash
bash scripts/nav_audit.sh
```

### 分析例

```bash
# HTTPエラーまたは page-nav 未検出の行を抽出
awk -F, '$3!=200 || $4!=1 {print}' reports/nav_audit.csv
```

## 運用メモ

- 章ページの構成が変更された場合や `_data/navigation.yml` の更新後は、本監査の再実行を推奨します。
- 例外的に navigation.yml が存在しない書籍は監査対象外です（該当はログに出力）。

