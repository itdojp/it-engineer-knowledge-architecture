# 書籍ポートフォリオ再編レビュー — 2026-09-07

## 位置付け

本記録は、Codex CLIで進行中の公開制作ロードマップ更新と並行して実施したレビューである。新しい制作計画の正本を増やすものではない。

- 実装の正本: [Issue #282](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/282)
- 本監査の追跡: [Issue #293](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/293)
- 後続の編集判断: [Issue #294](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/294)
- 監査基準main: `c48426e550f13ae41de0fad213896d420792914d`
- 確認日: 2026-09-07（Asia/Tokyo）

この文書だけのPRを #282 のmerge前提にはしない。#282の担当branch、共有カタログ、validator、workflow、既存review thread、個別書籍本文は本PRから変更しない。

## 結論

採択済み6件、企画検証候補3件、リビングガイド候補1件という構成は維持する。ただし、7月の実行指示には現行コードと合わない前提がある。特に、計画中書籍のrepository存在、YouTube metadata、ホワイトハッカー書の進捗を補正する必要がある。

| 判断対象 | 結論 |
| --- | --- |
| 公開ロードマップの更新 | #282を継続し、現行契約との差分を同じ実装で修正する |
| ホワイトハッカー書 | 完了済みの基盤・代表章Gateへ戻さず、既存の全編制作を継続する |
| 新規5企画 | 企画採択と全編着手を分け、関連章の不足と代表成果物を #294 で確認する |
| 旧計画の中止・統合 | active recordを廃止しつつ、旧リンクと採否理由への導線を残す |
| 並行PR #279 | 別々の検証成功だけでなく、最終統合結果と異なる計数母集団を確認する |

## 確認方法と限界

GitHub connectorで、固定SHAのコード、Issue本文、PRメタデータ、変更ファイル一覧、限定した差分を確認した。基準mainの `CONTRIBUTING.md` を読み、rootの `AGENTS.md` は取得時点で存在を確認できなかった。

以下はこの監査では実施していない。

- Codexの未push変更・ローカルworktreeの確認
- 全42書籍の本文・演習の逐語的な再レビュー
- すべての技術規格・出典の最新版再確認
- 実読者による学習試行や需要調査
- ローカルのnpm、Jekyll、Playwrightの全検証

ローカルcloneは実行環境のネットワーク制限により成功していない。既存PRに記載されたCI成功を、本監査が再実行した検証として扱わない。以下のコード上の失敗条件は静的読解に基づくもので、テストを実行して再現したとの主張ではない。

## 確認した状態

### ポータル

基準mainでは公開メインライン41件、関連独立英語書籍1件、旧計画7件を扱う。実装開始時・merge前の件数は実行者が再取得する。

[PR #283](https://github.com/itdojp/it-engineer-knowledge-architecture/pull/283) はYouTube紹介導線の追加であり、#282の実装PRではない。merge SHAは `4630642f4c7d5459d4fd7d940fd871c96b888ece`。紹介動画の正本とcatalogの整合性検査が追加されている。

確認時にAPIで取得できたOpen PRは [#279](https://github.com/itdojp/it-engineer-knowledge-architecture/pull/279)。対象headは `4aec7e8dd19afd61aa82e967e0c1a8356b3f0f31`。#282用の未push作業が存在しないと断定するものではない。

### ホワイトハッカー書

- [基盤PR #2](https://github.com/itdojp/white-hat-cyber-intelligence-book/pull/2) はmerge済み。
- [代表4章Issue #3](https://github.com/itdojp/white-hat-cyber-intelligence-book/issues/3) はcompleted。
- 全編制作は [Issue #17](https://github.com/itdojp/white-hat-cyber-intelligence-book/issues/17)、安定版公開判定は [Issue #25](https://github.com/itdojp/white-hat-cyber-intelligence-book/issues/25) で管理される。
- README等の古い進捗表示は書籍側の [Issue #108](https://github.com/itdojp/white-hat-cyber-intelligence-book/issues/108) で既に修正対象になっている。

ポータル側から基盤や代表章を再作成しない。公開サイトの存在、章ファイル数、テスト成功、非正本草稿の登録を、安定版完成と同一視しない。現段階の表現は「全編執筆中・安定版未公開」とする。

## 指摘と処置

### R1 / P1: plannedとrepository未作成を同義にしている

[固定SHAのcatalog-utils.mjs](https://github.com/itdojp/it-engineer-knowledge-architecture/blob/c48426e550f13ae41de0fad213896d420792914d/scripts/catalog-utils.mjs) の `validateCatalog` は `status=planned` のとき `repoVisibility=not-created` を必須にする。#282の `planned + public` というホワイトハッカー書recordは、そのままではこの分岐で拒否される。

処置は、公開repositoryを持つ未完成書籍を許可する最小変更と正負fixtureである。完成書籍へ偽装する、検査を無効化する、すべての制約を削除する方法は採らない。status、countingGroup、repo、公開範囲の整合を残す。

この変更で未完成版のURL状態モデルまで全面改築しない。#282ではcatalogの `pagesUrl: null` とplanned計数を維持し、実在する執筆中サイトを案内するときはロードマップで「執筆中版（未完成）」と明示する。完成書籍の「読む」や有料試読の属性へ誤分類しない。

### R2 / P1: YouTube未作成リストの同期漏れ

[validate-catalog.mjs](https://github.com/itdojp/it-engineer-knowledge-architecture/blob/c48426e550f13ae41de0fad213896d420792914d/scripts/validate-catalog.mjs) は、通常catalogの検証が通った後にYouTube整合性を検査する。

[youtube-utils.mjs](https://github.com/itdojp/it-engineer-knowledge-architecture/blob/c48426e550f13ae41de0fad213896d420792914d/scripts/youtube-utils.mjs) は `meta.booksWithoutVideo` とplanned集合についてID、タイトル、状態、順序の完全一致を要求する。[youtube.json](https://github.com/itdojp/it-engineer-knowledge-architecture/blob/c48426e550f13ae41de0fad213896d420792914d/docs/_data/youtube.json) には旧7件があるため、catalogだけを6件へ変えると、R1修正後もこの検査で失敗する。

#282の変更範囲に未作成リストの同期と関連回帰検証を含める。既存published動画record、動画ID、playlist位置、チャンネルは維持する。外部YouTube APIへ書き込まない。動画生成日とmetadata整合確認日を混同せず、未実施の再生成や架空のsource SHAを記録しない。

### R3 / P1: 完了済みの制作段階を再実施させる古い指示

基盤PR #2をDraftとして待つ、代表4章を再び完成させる、Phase 0の残作業から開始するという旧指示は現状と合わない。現在の書籍側Issue #17と #25へ案内を切り替える。

公開ページは完成版・執筆中版を区別する。本文の完成率や最新版の確認日を、API取得日やCI成功から推測しない。書籍側の進捗表示修正、出典整合、学習導線、checker保守は既存 #108〜#111 を参照し、同じ改善Issueを再作成しない。

### R4 / P2: active IDの廃止とfragment互換の喪失

旧planned recordを廃止しても、以前に公開した `/books/#旧ID` を無言で切らない。旧7件すべてについて、改題・再設計・統合・候補化・中止の対応を示す。

互換anchorは非書籍要素として実装し、book cardやplanned件数へ含めない。JavaScriptなしでも移管先を読める形が望ましい。テストの「旧IDなし」はactive record/cardへ適用し、履歴・対応表・互換anchorへの出現を失敗としない。

### R5 / P1: 個別PRのgreenと統合結果のgreenを区別する

PR #279はlayout、package、E2E、smoke、Pages workflow等を変更する。#282の公開導線・検証変更と接点があるため、無競合の独立変更とは扱わない。

先行merge後のmainを安全に取り込んだ最終headで、両方の導線と検証を確認する。Portfolio Healthはpublished集合、制作計画はplanned集合を母数とする。公開repositoryを持つplanned書籍を、稼働済み書籍のHTTP失敗として追加しない。

PR #279には対象headを固定したCOMMENTレビューを記録した。これは範囲限定の統合助言であり、PR全体の承認や既存指摘の解決を意味しない。

### R6 / P2: 企画採択を全編着手の承認と誤解させない

旧提案は目次・概要中心のポートフォリオ判断であり、「専門書がない」ことからテーマ全体の欠落を断定してはならない。関連する既存章の到達点、演習、成果物を確認して不足を確定する。

この編集作業は #294 へ分離した。#282の公開更新を止めず、各企画の最小成果物と委譲先を確認する。原則は次のとおり。

- SREは一つのサービスのSLO・計測・アラート・Runbook・負荷／容量判断を接続する。
- データベースは一つの参照RDBでモデル・不変条件・移行・復元試験を成立させる。
- 供給網は署名やSBOMの存在だけでなく、信頼境界・検証・更新／失効を扱う。
- DRは複製とバックアップ、復旧とクリーン性、非サイバー障害と侵害を区別する。
- LLMOpsは変更・評価・段階公開・監視・停止／rollbackを接続し、GPU環境を全読者に必須としない。
- ホワイトハッカー書は既存の代表章・安全契約・全編制作管理を再利用する。

全編執筆WIPは2冊を上限とする。技術的な前提、推奨読順、制作順を分け、実在しない必須依存を作らない。優先順位を欠陥の重大度P0〜P3と混同しない。

## 実装の受入条件へ反映した点

#282の2026-09-07改訂では、上記に加えて次を明示した。

1. 6件の独立した期待ID集合と、各企画が一つだけの段階へ属することを検査する。
2. 未実装UXや未レビュー本文を、設定値だけで実装・レビュー済みとしない。
3. 古いコマンドを満たすためだけにダミー実装を追加しない。
4. PRでは `Refs #282` を使い、mergeだけで公開確認前にIssueを自動closeしない。
5. 対象mergeのdeploymentと公開snapshotの対応を記録する。後続mainが公開された場合は対象変更の包含を検証し、古いSHAへ巻き戻して一致させない。
6. #293の文書PRと #294の編集調査を、新たな必須依存にしない。

## 保留・対象外

schema全体の再設計、全書籍の全面改稿、個別書籍の安全基準変更、任意改善ゼロを目標にしたレビュー反復、新規5件の一括repository作成は行わない。

本記録の追加は、#282の実装・Pages公開が完了したことを意味しない。最終的な実装証跡、CI、公開URLとsnapshotの確認は #282 の担当作業で記録する。
