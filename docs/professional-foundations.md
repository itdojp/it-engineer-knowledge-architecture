---
layout: default
permalink: /professional-foundations/
title: Professional Foundations（基礎リテラシー）実装ガイド
description: 仕事の型、成果物テンプレート、導入順をまとめた基礎リテラシーカテゴリの実装ガイド
---

# Professional Foundations（基礎リテラシー）実装ガイド

本ページは、Issue [#126](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/126) の受け入れ条件に対応する、基礎リテラシーカテゴリの導入ガイドです。
未経験〜初級者が技術書へ進む前に、調査、Issue、PR、ドキュメント、セキュリティ、インシデント対応の成果物をレビュー可能な形で作ることを目的とします。

## 位置づけ

- **カテゴリ名**: 基礎リテラシー（Professional Foundations）
- **対象読者**: IT未経験者、初級エンジニア、OJT担当者、教育カリキュラム設計者
- **到達目標**: 技術学習と並行して、根拠・合意・実行・記録・振り返りを GitHub 上で再利用可能な成果物に落とし込める状態
- **前提**: GitHub の基本操作は [GitHub初心者ガイド](https://itdojp.github.io/github-guide-for-beginners-book/) を入口にし、本カテゴリでは実務成果物の型と品質維持を扱う

## 最初に読む順

1. [根拠で進める開発仕事術](https://itdojp.github.io/evidence-based-engineering-book/) — 検索、一次情報確認、仕様読解、検証ログ、AI利用ガードレール
2. [チケット駆動の仕事術](https://itdojp.github.io/issue-driven-work-book/) — Issue、PR、DoR/DoD、進捗報告、合意形成
3. [エンジニアリングドキュメント実践ガイド](https://itdojp.github.io/engineering-documentation-book/) — README、手順書、Runbook、ADR、ポストモーテム
4. [セキュリティ＆プライバシー基礎リテラシー](https://itdojp.github.io/security-privacy-literacy-book/) — 秘密情報、権限、データ分類、誤公開防止
5. [インシデント対応 基礎](https://itdojp.github.io/incident-response-basics-book/) — 切り分け、状況共有、復旧、エスカレーション、ポストモーテム

この順序は、技術基盤書籍へ進む前に「証跡を残して作業できる」状態を作るための導入動線です。

## 書籍企画・実装対応表

| 書籍 | 目的 | 対象読者 | 到達目標 | 章立て・構成の状態 | テンプレート連携 |
| --- | --- | --- | --- | --- | --- |
| [根拠で進める開発仕事術](https://github.com/itdojp/evidence-based-engineering-book) | 検索・仕様読解・検証・引用を、再現可能な判断プロセスとして扱う | 全レベル、特に調査結果の説明に不安がある初級者 | 一次情報を確認し、根拠、未確定事項、検証結果を分けて記録できる | Chapter 1〜7 と、research log / spec reading notes / verification plan 等の付録テンプレートを公開済み | 本リポジトリの `templates/professional-foundations/progress-report-template.md` と併用 |
| [チケット駆動の仕事術](https://github.com/itdojp/issue-driven-work-book) | Issue と PR を使って、作業分割、合意形成、進捗報告、完了判定を運用する | 全レベル、OJT担当者、チームリーダー | 良い Issue / PR を作り、DoR / DoD とレビュー証跡でタスクを閉じられる | Chapter 1〜9 と、bug / improvement / task Issue、PR、ADR、status report 等の付録テンプレートを公開済み | `issue-template.md`、`pr-template.md`、`progress-report-template.md` を最小セットとして使う |
| [エンジニアリングドキュメント実践ガイド](https://github.com/itdojp/engineering-documentation-book) | README、手順書、Runbook、ADR、障害報告を、保守される成果物として設計する | 全レベル、プロジェクト担当者、レビュー担当者 | 目的別に文書を選び、陳腐化対策とレビュー観点を含めて運用できる | Chapter 1〜11 と、README / procedure / runbook / ADR / incident report / postmortem 等の付録テンプレートを公開済み | `README-template.md`、`procedure-template.md`、`runbook-template.md`、`adr-template.md` を再利用 |
| [セキュリティ＆プライバシー基礎リテラシー](https://github.com/itdojp/security-privacy-literacy-book) | 秘密情報、権限、データ分類、誤公開の基本事故を防ぐ | 初級〜中級、全職種の実務担当者 | 作業前に扱う情報・権限・公開範囲を確認し、危険な操作を止められる | Chapter 1〜8 と、access request / data classification / security review / threat modeling 等の付録テンプレートを公開済み | Issue / PR テンプレートにセキュリティ確認欄を組み込む |
| [インシデント対応 基礎](https://github.com/itdojp/incident-response-basics-book) | 障害・問い合わせ・異常検知を、切り分けからポストモーテムまで一貫して扱う | 初級〜中級、当番担当者、運用責任者 | 状況共有、復旧判断、エスカレーション、振り返りを時系列で残せる | Chapter 1〜8 と、incident log / status update / escalation / timeline / postmortem 等の付録テンプレートを公開済み | `incident-report-template.md`、`runbook-template.md`、`progress-report-template.md` を併用 |

## 再利用テンプレート

本リポジトリには、横断利用するための最小テンプレートを `templates/professional-foundations/` に配置します。各書籍の詳細テンプレートを使う前の標準形として利用してください。

| テンプレート | 用途 |
| --- | --- |
| [`README-template.md`](https://github.com/itdojp/it-engineer-knowledge-architecture/blob/main/templates/professional-foundations/README-template.md) | プロジェクト概要、利用手順、責任範囲、更新手順を揃える |
| [`issue-template.md`](https://github.com/itdojp/it-engineer-knowledge-architecture/blob/main/templates/professional-foundations/issue-template.md) | 背景、目的、スコープ、受け入れ条件、リスクを明確化する |
| [`pr-template.md`](https://github.com/itdojp/it-engineer-knowledge-architecture/blob/main/templates/professional-foundations/pr-template.md) | 変更内容、検証、レビュー観点、残リスクを提示する |
| [`procedure-template.md`](https://github.com/itdojp/it-engineer-knowledge-architecture/blob/main/templates/professional-foundations/procedure-template.md) | 手順書として、前提、手順、確認、ロールバックを記録する |
| [`runbook-template.md`](https://github.com/itdojp/it-engineer-knowledge-architecture/blob/main/templates/professional-foundations/runbook-template.md) | 定常運用・異常時対応を、判断条件つきで記録する |
| [`adr-template.md`](https://github.com/itdojp/it-engineer-knowledge-architecture/blob/main/templates/professional-foundations/adr-template.md) | 技術的意思決定の背景、選択肢、判断理由、影響を残す |
| [`incident-report-template.md`](https://github.com/itdojp/it-engineer-knowledge-architecture/blob/main/templates/professional-foundations/incident-report-template.md) | 事象、影響、時系列、原因、再発防止を記録する |
| [`progress-report-template.md`](https://github.com/itdojp/it-engineer-knowledge-architecture/blob/main/templates/professional-foundations/progress-report-template.md) | 進捗、ブロッカー、判断待ち、次アクションを短く共有する |

## GitHub初心者ガイドとの相互リンク方針

| 領域 | GitHub初心者ガイド | Professional Foundations |
| --- | --- | --- |
| Git / GitHub 操作 | リポジトリ、Issue、PR、GitHub Pages、Actions の入口 | 操作を前提に、成果物の品質と完了判定を標準化する |
| Issue / PR | 最小運用と基本的なレビュー手順 | DoR / DoD、分割、進捗報告、合意形成、証跡管理を扱う |
| Docs-as-Code | GitHub Pages や Markdown の入口 | README、手順書、Runbook、ADR、障害報告を保守可能な文書体系にする |
| セキュリティ | 基本的な公開範囲・リポジトリ運用 | 秘密情報、権限、データ分類、誤公開防止のチェックを作業テンプレートへ組み込む |

## Issue #126 受け入れ条件への対応

| 受け入れ条件 | 対応 |
| --- | --- |
| Knowledge Architecture 上で「基礎リテラシー」カテゴリを明示し、未経験者の導入動線を提示 | README / 公開トップ / English Catalog にカテゴリを掲載し、本ページと `roadmap/learning-paths.md` に Phase 0 の導入順を追加 |
| 最低2冊の書籍企画がスタブではなく、目的・対象読者・到達目標・章立て・付録テンプレ一覧を含む | 優先度Aの2冊に加え、5冊すべてを公開済み書籍として整理し、本ページの対応表に目的、読者、到達目標、章立て、テンプレートを明記 |
| README / Issue / PR / 障害報告 / ADR のテンプレートが Markdown で存在 | `templates/professional-foundations/` に必須5種を含む8種の Markdown テンプレートを追加 |
| GitHub初心者ガイドとの相互リンク方針を整理 | 本ページで「入口」と「体系化・運用」の責任範囲を明文化 |
