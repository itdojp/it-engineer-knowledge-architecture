# 旧フォーマット統一ダッシュボードの廃止

## 判断（2026-09-27）

旧キャンペーン [#21](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/21) は、初期調査と方針を後続運用へ統合したとして終了しています。
当時のunchecked checklistと特定PRタイトルから集計する `Update Unification Progress` は、現在の書籍一覧や公開状態の正本ではありません。
[保守Issue #296](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/296) に従い、`.github/workflows/update-unification-progress.yml` を削除します。scheduleと手動実行、`unification-progress` artifactの新規生成がなくなります。GitHubの過去runや保存済みartifactは削除しませんが、既存の保持期限は変えません。

## 不具合と廃止の理由

[失敗run 35557812431](https://github.com/itdojp/it-engineer-knowledge-architecture/actions/runs/35557812431) はAPI 404で停止しています。固定main `c48426e550f13ae41de0fad213896d420792914d` の処理は `- [ ] https://github.com/OWNER/REPO` を `ln.split()[2]` で解析し、URLではなく `]` を取得します。合成行と旧Issueの対象25行で再現しました。この値を使う `/repos/]/pulls` は有効なrepository指定ではありません。private repositoryの認証失敗が原因とは断定しません。

また、404の繰り返し取得と、取得失敗をnav未対応・CI不明へ置き換える処理がありました。これらを無視して成功にするのではなく、終了したキャンペーン専用の収集処理を廃止します。現行trackedファイルに旧artifactを消費する連携は見つかっていません。現在の書籍母数は [catalog](../docs/_data/catalog.json) から取得します。

## 維持する観測と限界

以下の既存workflowとその権限・実装は変更しません。

- [書籍ステータス更新](../.github/workflows/update-book-status.yml): 日次の書籍状態artifactとunavailable通知。
- [学習パス検証](../.github/workflows/validate-learning-paths.yml): catalog・生成物・リンク・サイトの検証。
- [Deploy Pages](../.github/workflows/deploy-pages.yml): サイト公開と本番検証。
- [Pages drift](../.github/workflows/pages-drift-check.yml): 公開状態のdrift検査。
- [Quality Sprint](../.github/workflows/quality-sprint-reminder.yml): 定期レビュー対象の選定。

旧format/nav PRのタイトル検索や全書籍のnav-data集計は停止します。上記の既存観測が同等の代替機能をすべて提供するとは主張しません。[Portfolio Health #278 / PR279](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/278) はこの判断時点で未公開の別作業です。App設定や同PRのmergeを、本変更で実施済みとは扱いません。

## 再導入とrollback

新たに横断観測が必要なら独立Issue/PRで、catalogのpublished指定とlive public visibility、観測不能と認証・通信・コマンド障害の区別、bounded backoff、private情報のredaction、成功/404/partial/認証失敗/rate limit/空対象のfixtureを定義します。過去IssueのチェックリストやPRタイトルを現行正本として復活させません。

履歴は保持します。必要なrollbackも通常PRで行い、上記の不正slugと失敗分類を修正・検証するまで旧scheduleを再有効化しません。権限拡大、失敗の握りつぶし、mainへの自動commitは対処にしません。
