---
layout: default
title: follow-up Issue 優先順位
description: 既存書籍レビュー後に残った横断・書籍別 follow-up Issue の優先順位と運用方針
---

# follow-up Issue 優先順位

## スナップショット

- 確認日: 2026-05-24（Asia/Tokyo）
- 確認元: `docs/publishing/book-registry.json` 掲載 39 書籍リポジトリと `itdojp/it-engineer-knowledge-architecture`
- 確認方法: GitHub API で open Issue を取得し、PR を除外
- 観測結果: 40 リポジトリ中 11 リポジトリに open Issue、合計 26 件

このページは運用判断用のスナップショットです。最新状態は各 Issue の GitHub 画面を正とします。

記法ルール: 単独の `#番号` は `itdojp/it-engineer-knowledge-architecture` の Issue を示し、`repo#番号` は各書籍リポジトリの Issue を示します（例: `#133` と `practical-auth-book#133` は別 Issue）。

## 優先度の定義

| 優先度 | 判断基準 | 期待する扱い |
| --- | --- | --- |
| P0 | 公開サイト停止、CI全面停止、重大な安全性・正確性リスク | ただちに個別 PR / hotfix として処理 |
| P1 | カタログの正確性、学習順序、横断方針、主要書籍の大規模改稿判断に影響 | 次の通常スプリントで着手候補にする |
| P2 | 図表、スクリーンショット、UX、章導線、実機目視など品質向上 | 品質スプリントで 2〜4 件ずつ処理 |
| P3 | 古いスプリント、重複、収束済み確認、記録整理 | クローズまたは次回スプリントへの移管を判断 |

## 優先順位付きバックログ

### P0: 緊急対応

現時点の open Issue タイトルからは、公開停止、CI全面停止、重大な安全性リスクに相当する P0 は確認していません。

### P1: 次に着手する候補

| 順位 | Issue | 理由 | 推奨アクション |
| --- | --- | --- | --- |
| 1 | [#133: categorical / composable 関係整理](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/133) | 公開カタログ、英語カタログ、関連書籍の説明に直結する | README、英語カタログ、公開カタログ上の関係説明を再確認し、必要なら小粒 PR で完了させる |
| 2 | [#83: AI時代のITインフラ不足領域](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/83) | 計画書籍 7 冊と今後の学習パスに影響する | Kubernetes / Platform Engineering / LLMOps / OpenTelemetry の採否判断を行い、計画書籍と学習パスへ反映する |
| 3 | [#137: GitHub Actions Node 20 廃止予告対応](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/137) | 管理下書籍の CI 継続性に影響する | 未対応 repo の再棚卸し、対応済みチェック、必要なら横断 PR を分割して進める |
| 4 | AI / ソフトスキル系の全面リライト Issue | `GitHub-AgentOps-book#37`、`LogicalThinking-AI-Era-Guide#126`、`ai-era-engineers-mind-book#127`、`ai-communication-book#131` は内容品質の上限を決める | 1冊ずつ設計 Issue を確定し、章構成単位の PR に分解する |
| 5 | `ai-agent-engineering-book` の判断系 Issue | [#227](https://github.com/itdojp/ai-agent-engineering-book/issues/227)、[#228](https://github.com/itdojp/ai-agent-engineering-book/issues/228)、[#229](https://github.com/itdojp/ai-agent-engineering-book/issues/229) は agent 運用境界と証跡厳格性に関わる | 用語・境界条件を決め、日英 backmatter / sample harness docs の整合 PR に分ける |
| 6 | [practical-auth-book#133](https://github.com/itdojp/practical-auth-book/issues/133) | 認証認可書籍の runnable minimum と公開 TOC 導線に影響する | 環境構築導線と最小実行例を、セキュリティ誤用を避ける表現で復旧する |

### P2: 品質スプリントで処理する候補

| グループ | Issue | 推奨アクション |
| --- | --- | --- |
| Kubernetes / コンテナ UX | [kubernetes-basics-book#22](https://github.com/itdojp/kubernetes-basics-book/issues/22)、[#13](https://github.com/itdojp/kubernetes-basics-book/issues/13)、[kubernetes-cluster-ops-book#16](https://github.com/itdojp/kubernetes-cluster-ops-book/issues/16)、[kubernetes-proxmox-to-cloud-book#20](https://github.com/itdojp/kubernetes-proxmox-to-cloud-book/issues/20)、[podman-book#189](https://github.com/itdojp/podman-book/issues/189) | 章導線、共通コア、スクリーンショット差し込みを、書籍ごとに小粒 PR 化する |
| Proxmox 図表・スクリーンショット | [proxmox_book#25](https://github.com/itdojp/proxmox_book/issues/25)、[#2](https://github.com/itdojp/proxmox_book/issues/2) | Proxmox VE の対象バージョンと取得手順を固定してから、図表追加 PR に進む |
| 実機目視 / 可読性 | [it-engineer-knowledge-architecture#117](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/117) | Pages Visual Check の artifact を使い、iOS Safari / Android Chrome / Windows ブラウザの観点を記録する |
| Professional Foundations 整理 | [it-engineer-knowledge-architecture#126](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/126) | #153 で実装済みの内容と照合し、残存タスクがなければクローズ、残る場合は差分 Issue に分割する |

### P3: 整理・クローズ判断

| Issue | 推奨アクション |
| --- | --- |
| [#136](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/136)、[#145](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/145)、[#150](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/150)、[#151](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/151)、[#152](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/152) | 古い Quality Sprint Issue は、未着手対象を次回スプリントへ移すか、記録としてクローズする |
| [#111: 運用ダッシュボード](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/111) | この優先順位表を参照先に追加し、Issue本文の open Issue 一覧が古くなった場合は更新する |

## 運用ルール

- P1 は「カタログ・学習パス・横断仕様に影響するもの」を優先します。
- P2 は品質スプリントで同種の作業をまとめ、1 PR = 1 書籍または 1 テーマを原則にします。
- P3 は backlog の視認性を下げるため、次回へ移すかクローズするかを明確にします。
- 各 PR は Copilot review、CI green、merge 後の公開サイト確認を完了条件に含めます。
