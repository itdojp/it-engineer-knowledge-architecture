---
layout: default
title: Portfolio Health
description: 公開中の書籍群に対する運用状態の横断ビュー
---

# Portfolio Health

このURLは、GitHub Pagesのbuild時にcatalogの `status=published` と完全一致する最新の横断運用ビューへ置き換わります。

ローカルのJekyll buildでは動的なGitHub API値を取得しません。最新の状態は公開Pagesの同じURL、または定期実行Workflowのsummaryとartifactで確認してください。

security debtは、公開Issueの分類と各書籍のBook QAを横断集計します。リポジトリ横断credentialは保存しないため、Dependabot alert APIの直接照会は行わず、書籍別の保守作業として明示的にscheduled扱いにします。
