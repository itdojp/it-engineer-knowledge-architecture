---
layout: default
title: GitHub Pagesデプロイ運用Runbook
description: Actions artifact方式の設定、デプロイ検証、drift検知と復旧手順
---

# GitHub Pagesデプロイ運用Runbook

## 運用原則

- GitHub Pagesの公開元はGitHub Actions（Pages APIの `build_type: workflow`）とする。
- `.github/workflows/deploy-pages.yml` が生成したartifactだけを公開する。
- `main`、`docs/`、`gh-pages` などを直接公開するbranch deploymentへ戻さない。
- Workflowは動的な確認結果をソースへ書き戻さず、`main` へbot commitを作らない。
- 公開物のcommitはartifact内の `/build-info.json` を正本として確認する。`docs/` にはこのファイルを置かない。

## 一度だけ行うPages設定

通常は変更不要である。新規作成または設定復旧時に、リポジトリ管理者がGitHubの **Settings > Pages > Build and deployment > Source** を **GitHub Actions** に設定する。

CLIで現在値を確認する。

```bash
gh api repos/itdojp/it-engineer-knowledge-architecture/pages \
  --jq '{build_type: .build_type, status: .status, html_url: .html_url}'
```

期待値は `build_type: workflow` である。`legacy` の場合はbranch deploymentであり、運用要件を満たさない。UIでGitHub Actionsへ戻してから、Deploy Pagesを手動実行する。

```bash
gh workflow run deploy-pages.yml --repo itdojp/it-engineer-knowledge-architecture
```

## 通常のデプロイと検証

`main` の更新は変更パスを問わずDeploy Pagesを起動する。定期drift確認がdefault branchの最新SHAを期待値とするため、公開内容に影響しない変更も同じSHAのartifactとして再デプロイし、default branchと公開SHAの一貫性を維持する。処理は次の3 jobで構成する。

1. Jekyllをbuildし、catalogの `status=published` と完全一致する `_site/portfolio-health.json`、`_site/portfolio-health/index.html`、`_site/build-info.json` を追加してPages artifactを作る。
2. artifactを `github-pages` environmentへデプロイする。
3. deploymentが返した `page_url` に対して本番スモークを実行する。

本番スモークは `/`、`/books/`、`/paths/`、`/en/`、`/portfolio-health/`、`/portfolio-health.json`、`/404.html`、`/build-info.json` のHTTP状態、主要見出し、共通ナビゲーション、`main#main-content`、書籍49件、公開中42件、学習パス7件、base path内リンク、private書籍の動的情報redaction、旧トップページmarkerの不在、期待SHAを検証する。キャッシュ回避query、timeout、指数backoff付きretryを用いる。結果はjob summaryとartifactに残り、不一致ならWorkflowを失敗させる。

手動で公開SHAを確認する。

```bash
curl --fail --silent --show-error \
  'https://itdojp.github.io/it-engineer-knowledge-architecture/build-info.json?manual_check=1' | jq
git ls-remote https://github.com/itdojp/it-engineer-knowledge-architecture.git refs/heads/main
```

## 定期drift確認

`.github/workflows/pages-drift-check.yml` は毎日および手動で実行し、次を比較する。

1. GitHub APIで取得したdefault branchの最新commit SHA
2. 最新の成功済み `github-pages` deployment SHA
3. 公開 `/build-info.json` のSHA
4. 本番スモークの全endpoint・marker検証結果

一致時は実行サマリとartifactだけを残す。不一致または公開異常時はタイトル `[Alert][Pages Drift] 公開サイトのデプロイ不整合` のIssueを1件だけ作る。未復旧の再検知では同じIssueへ証跡を追記し、重複Issueを作らない。復旧時は同じIssueへ復旧結果を追記してクローズする。

通常の手動確認は入力なしで実行する。

```bash
gh workflow run pages-drift-check.yml --repo itdojp/it-engineer-knowledge-architecture
```

`expected_sha_override` は監視機能の異常系試験専用である。通常運用では指定しない。異常系試験後は入力なしで再実行し、公開状態の一致とAlert Issueの自動クローズを確認する。

## 不整合時の調査順序

1. Alert Issue、失敗したWorkflowのjob summary、`pages-drift-*` artifactを確認する。
2. Pages APIの `build_type` が `workflow` か確認する。
3. Deploy Pagesの最新実行でbuild、deploy、Production smokeのどこが失敗したか確認する。
4. default branch SHA、deployment SHA、公開build-info SHAを比較する。
5. deploymentだけが古い場合はDeploy Pagesを再実行する。公開物の内容異常なら原因修正をPRで行う。
6. 入力なしのPages drift checkを再実行し、復旧コメントとAlert Issueのクローズを確認する。

```bash
gh run list --repo itdojp/it-engineer-knowledge-architecture \
  --workflow deploy-pages.yml --limit 10
gh run list --repo itdojp/it-engineer-knowledge-architecture \
  --workflow pages-drift-check.yml --limit 10
gh api repos/itdojp/it-engineer-knowledge-architecture/deployments \
  --method GET -f environment=github-pages -f per_page=10
```

branch deploymentへの切り替え、監視Workflowによるソース修正、失敗を無視する再実行は復旧策に含めない。
