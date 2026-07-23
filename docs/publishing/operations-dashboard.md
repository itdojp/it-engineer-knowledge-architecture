---
layout: default
title: 運用ダッシュボード
description: 全書籍・横断課題の現行Issue棚卸しと次アクション
---

# 運用ダッシュボード

> **現行の動的ビュー:** 全公開書籍のdefault branch、Issue / PR、Book QA、Pages、公開HTTP、保守負債は[Portfolio Health]({{ '/portfolio-health/' | relative_url }})を参照してください。以下は2026-05-24時点のIssue運用スナップショットとして保持します。

## スナップショット

- 確認日: 2026-05-24（Asia/Tokyo）
- 対象: `itdojp/it-engineer-knowledge-architecture` の open Issue（旧 Quality Sprint 整理と #111 完了処理後）
- 確認方法: GitHub Issue API / `gh issue list` で open Issue を取得し、PR は除外
- 観測結果: 継続 open Issue は 1 件。内訳は active Quality Sprint（#152）1 件

このページは、横断リポジトリの Issue 運用を判断するための公開スナップショットです。
最新の状態は GitHub の Issue 画面を正とします。

## 運用原則

| 区分 | 管理場所 | 判断基準 |
| --- | --- | --- |
| 横断方針・全書籍ロールアウト | `itdojp/it-engineer-knowledge-architecture` | 複数書籍の公開カタログ、共通テンプレート、Book QA、品質スプリント運用に影響する |
| 書籍単体の本文・章導線・CI | 各書籍リポジトリ | 影響範囲が 1 書籍に閉じる。必要な修正 PR も当該書籍で完結する |
| 進捗ログ・定期棚卸し | 原則として最新の管理 Issue に集約 | 旧スプリント Issue は、次回へ繰り越すか、参照リンクを残してクローズする |

## Portfolio Healthの読み取り認証 {#portfolio-health-auth}

Portfolio Healthは複数repositoryのActions、deployment、Pages、Issueを収集する。repository単位の`github.token`は他repositoryのAPIを読めないため、正本workflowは読み取り専用GitHub Appのinstallation tokenを毎回短期発行する。個人用PAT、有期限のinstallation token、または権限の広い既存CLI tokenをsecretとして保存しない。

GitHub Appのrepository permissionは **Actions: read、Contents: read、Deployments: read、Issues: read、Pages: read、Pull requests: read** のみとする。インストール先はcatalogの`status=published`かつpublicなrepositoryに限定する。private書籍はインストール対象にせず、catalogで既に公開している識別情報とgeneric state以外を常にredactする。

repository管理者はApp作成・インストール後に次の2値を設定する。private keyの内容はCLI出力、Issue、PR、artifactに記録しない。

```bash
gh variable set PORTFOLIO_HEALTH_APP_ID \
  --repo itdojp/it-engineer-knowledge-architecture \
  --body '<GitHub App ID>'
gh secret set PORTFOLIO_HEALTH_APP_PRIVATE_KEY \
  --repo itdojp/it-engineer-knowledge-architecture \
  < /secure/path/portfolio-health-app.private-key.pem
```

`PORTFOLIO_HEALTH_READ_TOKEN`はAppから実行中だけ発行し、横断読み取りにのみ使う。Alert Issueの更新は別系統のrepository-scoped `github.token`を`PORTFOLIO_HEALTH_ALERT_TOKEN`として使い、横断tokenへwrite権限を与えない。Appのインストール先とcatalogが一致しない場合はpartial observationとして検出し、全public書籍がpartialな状態でPages検証を通過させない。

## 現在の open Issue

| Issue | ラベル | 現状 | 次アクション |
| --- | --- | --- | --- |
| [#152: Quality Sprint 2026-05-15](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/152) | `platform-wide` | 現時点で active な Quality Sprint Issue | 次に実施する 2〜4 冊を選定し、1 PR = 1 書籍または 1 テーマで進める |

## 直近で完了した横断課題

| Issue | 完了内容 | 運用上の扱い |
| --- | --- | --- |
| [#111: 運用ダッシュボード](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/111) | 公開ダッシュボードを追加し、open Issue 棚卸しと次アクションを同期 | close 済み。今後の棚卸しはこの公開ページと必要な新規 Issue で扱う |
| [#136](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/136) / [#145](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/145) / [#150](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/150) / [#151](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/151) | 旧 Quality Sprint Issue を #152 に集約する方針で記録付き close | 重複する全書籍チェックリストは #152 または次回スプリントへ繰り越す |
| [#153: 既存書籍群の内容レビュー・改善ロードマップ](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/153) | 39 冊の既存書籍レビュー、各書籍 PR、Copilot review、CI、公開確認まで完了 | 成果サマリは [既存書籍レビュー完了サマリ](./content-review-summary-2026.html) を参照する |
| [#83: AI時代のITインフラ不足領域](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/83) | 不足領域の採否判断とカタログ反映方針を整理済み | 追加企画が必要な場合は新規 Issue として起票する |
| [#126: Professional Foundations カテゴリ新設](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/126) | 基礎リテラシー領域のカテゴリとテンプレートを整理済み | 継続的な導線調整は公開カタログ更新 PR に含める |
| [#133: categorical / composable 関係整理](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/133) | 公開カタログと英語カタログ上の関係説明を整理済み | 今後は対象書籍側の変更が入った場合にカタログ差分として扱う |
| [#137: GitHub Actions Node 20 廃止予告対応](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/137) | 管理下書籍リポジトリの Node 20 廃止予告対応を完了 | 新たな Actions ランタイム移行は別 Issue で扱う |
| [#117: フォント統一フォローアップ](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/117) | Pages Visual Check で 39 冊 / 312 ページの `warn=0` / `fail=0` を確認し、Issue は完了扱いで close | Issue 本文には実機チェックリストの未完了表記が残るため、実機観測を追加で行う場合は新規 Issue または再オープンで扱う |

## #111 棚卸しチェックリストへの対応状況

| チェック項目 | 現状 | 判定 |
| --- | --- | --- |
| 本リポジトリの open Issue にラベルが付与されている | #152 は `platform-wide` | 完了 |
| 各 Issue に「次アクション」が明記されている | #152 の次アクションを本ページに明記 | 完了 |
| 書籍単体の話題が本リポジトリに残っていない | 現在の open Issue は active Quality Sprint のみ | 完了 |
| 進捗ログ型 Issue は、収束したらクローズ | #136 / #145 / #150 / #151 を記録付きで close 済み。#152 は active sprint として維持 | 完了 |

## 次に実施する順序

1. #152 で次に扱う 2〜4 冊を選定し、書籍ごとまたはテーマごとの小粒 PR に分解する。
2. 各 PR は Copilot review、レビュー本文・inline comment・suggestion の全件確認、CI green、merge 後の公開確認を完了条件にする。
3. 次回 Quality Sprint が自動起票されたら、#152 の未着手対象を繰り越すか、#152 を記録として close する。
