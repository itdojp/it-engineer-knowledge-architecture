# SRE企画の章単位Gap Mapと最小成果物案

確認日: 2026-10-30（Asia/Tokyo）

確認者: Codex（本文調査・編集案。実読者評価ではない）

追跡: [Issue #294](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/294)、親 [#293](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/293)、公開計画 [#282](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/282)

## 1. 対象読者・到達点・調査範囲

対象は、監視設定の経験はあるが、ユーザー影響から運用判断までの根拠を一式で説明したいエンジニアである。到達点は、**一つのサービスについて、SLI/SLO、計測、アラート、Runbook、負荷・容量判断の対応を示し、未測定の事項を保留できること**とする。

本記録は採択済み新規5企画のうち、SRE・可観測性・運用自動化の初回調査だけを扱う。以下の公開4冊・7ファイルの指定範囲を固定SHAで読んだ。全42書籍の全章調査でも、既存サンプルの技術監査でもない。目次は対象選定に使い、不足の証拠には使わない。

既存章にはSLI/SLO、エラーバジェット、Runbook、インシデント運用の説明と記入例がある。「専門書がない」ことから「内容がない」とは判断しない。今回の推奨は **Integrate（既存章をつなぐ最小教材の検証）** であり、全編執筆の承認、公開計画の変更、完成済み教材の宣言ではない。

## 2. 固定した本文と読者用リンク

公開ページは読者の入口、固定SHAのリンクは今回の判定根拠である。公開ページのHTTP成功は、その内容と固定SHAの同一性や学習効果を保証しない。

| 根拠 | 書籍ID・確認範囲 | 読者用の章・資料 | 固定SHAの本文 |
| --- | --- | --- | --- |
| S1 | `cloud-infra-book` 第7章 §7.2 全体 | [メトリクスとアラートの設計](https://itdojp.github.io/cloud-infra-book/chapter-chapter07/) | [d27902e / L176–339](https://github.com/itdojp/cloud-infra-book/blob/d27902e77d349ece0332c5f290037940da0d9c9a/docs/chapter-chapter07/index.md#L176-L339) |
| S2 | 同書 第7章 §7.5 全体 | [SREプラクティスの実践](https://itdojp.github.io/cloud-infra-book/chapter-chapter07/) | [d27902e / L756–925](https://github.com/itdojp/cloud-infra-book/blob/d27902e77d349ece0332c5f290037940da0d9c9a/docs/chapter-chapter07/index.md#L756-L925) |
| S3 | `IT-infra-book` 第9章 §9.3 全体 | [メトリクス収集システムの設計](https://itdojp.github.io/IT-infra-book/chapters/chapter09/) | [e1af5a8 / L552–841](https://github.com/itdojp/IT-infra-book/blob/e1af5a8c8cb639816512519dc682094655ea5947/docs/chapters/chapter09/index.md#L552-L841) |
| S4 | `engineering-documentation-book` 第7章 全体 | [Runbook](https://itdojp.github.io/engineering-documentation-book/chapters/chapter-07/) | [7d3eb2b / 本文](https://github.com/itdojp/engineering-documentation-book/blob/7d3eb2bd5da1b73d596c80b94a6fa2d33fef309e/docs/chapters/chapter-07/index.md) |
| S5 | 同書 Runbook付録 全体 | [テンプレートと記入例](https://itdojp.github.io/engineering-documentation-book/appendices/templates/runbook/) | [7d3eb2b / 付録](https://github.com/itdojp/engineering-documentation-book/blob/7d3eb2bd5da1b73d596c80b94a6fa2d33fef309e/docs/appendices/templates/runbook/index.md) |
| S6 | 同書 MiniShop Runbook 全体 | GitHub上の完成例（右列） | [7d3eb2b / 記入例](https://github.com/itdojp/engineering-documentation-book/blob/7d3eb2bd5da1b73d596c80b94a6fa2d33fef309e/examples/minishop/runbook.md) |
| S7 | `incident-response-basics-book` 第5章 全体 | [Severity・役割・タイムライン](https://itdojp.github.io/incident-response-basics-book/chapters/chapter-05/) | [097d80d / 本文](https://github.com/itdojp/incident-response-basics-book/blob/097d80db5aa3d8b65e165186901f0de99d85866a/docs/chapters/chapter-05/index.md) |
| S8 | 同書 第8章 全体 | [ポストモーテム](https://itdojp.github.io/incident-response-basics-book/chapters/chapter-08/) | [097d80d / 本文](https://github.com/itdojp/incident-response-basics-book/blob/097d80db5aa3d8b65e165186901f0de99d85866a/docs/chapters/chapter-08/index.md) |

S4がリンクするMiniShop完成例は別の固定SHA `48211ed…` を指す。本調査ではS6の現行スナップショットを独立して読んでおり、両版の一致は未確認である。採用時には参照版を揃える。

## 3. 章単位Gap Map

区分は次の意味に限定する。全行の確認者・確認日は冒頭に示す。

- `covered`: 記載した到達点の説明・例が確認範囲にある。読者による達成の証明ではない。
- `bridge-needed`: 部品はあるが、本企画の課題として入力・成果物・判断の接続を設計する必要がある。
- `gap-confirmed`: **今回読んだ範囲に限定して**、指定した成果物がない。全体系での不在を意味しない。
- `unknown`: 対象範囲外または未実行で判断できない。不足確定へ変換しない。

以下のOWN/BRIDGE/DELEGATEはSRE企画側の責任を示す。「主担当」は、その話題を主に説明する既存書、または新規に検証する範囲である。

| 読者の仕事・学習目標 | 根拠と既存の到達点 | 不足する接続・未検証 | 区分 | 責任境界・主担当 |
| --- | --- | --- | --- | --- |
| ユーザー影響をSLI、対象イベント、測定窓、SLOへ落とす | S1: 指標定義と除外、SLO設定の観点がある | 同一fixtureの分母・分子をRunbookまで保持する課題は要設計 | bridge-needed | BRIDGE: `cloud-infra-book`。SRE企画は対応表をOWN |
| 指標を収集しアラートへ渡す | S3: アプリ計装、収集設定、クエリ、通知の例がある | 掲載版の互換性・実行結果は未検証。SLOとの同一単位・窓の照合が必要 | bridge-needed | DELEGATE: `IT-infra-book`。製品設定を再執筆しない |
| バジェットから変更判断を説明する | S1/S2: 計算例と判断例がある | 時間ベース例をイベントベースfixtureへ無条件転用しない。教材内の判断条件が必要 | bridge-needed | BRIDGE: `cloud-infra-book`。統合例の条件はSRE企画がOWN |
| Runbookの初動・連絡・復旧判断・更新責任を書く | S4/S5/S6: 書式、記入例、成功条件、保守欄がある | 本企画のSLI・アラートIDとの接続は別途必要 | covered | DELEGATE: `engineering-documentation-book`。汎用テンプレートを重複制作しない |
| 影響を役割・状況共有・事後改善へ渡す | S7/S8: 役割、タイムライン、担当・期限・検証付き改善例がある | 実組織での担当配置・通知実績は未検証 | covered | DELEGATE: `incident-response-basics-book`。SRE企画は引渡し欄だけBRIDGE |
| 負荷測定から容量判断を保留・採択する | S2: 成長率と1台当たり処理量からの容量計算例がある | 仮定の処理量を裏付ける同一サービスの負荷fixture・測定結果・判断表は確認範囲にない | gap-confirmed | OWN: SRE最小成果物。高度な予測手法は初版の非目標 |
| 一つの入力から全工程を再現する | S1–S8: 各工程の説明・例を確認 | 共通入力、期待結果、アラート、Runbook、容量判断を束ねた実行可能な一式は確認範囲にない | gap-confirmed | OWN: SRE最小成果物。独立した概説章の増設はしない |
| 他章・他書で統合課題が既に完結していないかを判断する | 上記以外の本文・演習は未精読 | クラウド第7章§7.6以降、他の運用・障害対応書などは未判定 | unknown | BRIDGE: 編集担当が追加確認。未読を新刊の根拠にしない |

## 4. 作る範囲と作らない範囲

### OWN — 代表成果物として新しく検証するもの

一つの架空サービスを対象に、次の対応を追跡できる小さな学習用パッケージを作る。

```text
ユーザー操作 → 対象イベント／SLI／SLO
→ 固定入力と計測結果 → アラート条件／判断
→ Runbookの分岐 → 負荷・容量の根拠／保留
→ 改善担当・期限・再確認条件
```

### BRIDGE — 既存の説明を課題へ接続するもの

S1/S2の概念を入力仕様へ、S3の計測結果をアラートへ、S4–S6のRunbookを判断表へ、S7/S8を引渡し・再確認へ接続する。章間の必須技術依存ではなく、課題の実施順と推奨読順である。

### DELEGATE — 本企画では再執筆しないもの

監視製品のインストール・設定百科はS3、汎用Runbookの書き方はS4/S5、指揮・状況共有・ポストモーテムの基本はS7/S8へ委譲する。初版の代表課題には、複数負荷生成器の比較、高度な機械学習予測、本番障害注入、実顧客データ、外部通知、クラウド課金を必要とする操作を含めない。

S2には本番を対象とする障害注入の例もある。本記録はその安全性を検証・推奨していない。参照章を丸ごと実行課題とせず、将来の教材は隔離した合成環境に限定して再検証する。

## 5. 最小成果物・課題・評価観点の対応案

まだ統合パッケージは実装していない。次表は完成判定案であり、実施済みチェックリストではない。負荷生成器は1系統とし、選定・バージョン固定・隔離条件を最小例の実装時に記録する。

| 概念 | 読者が行う課題 | 記入済み例・期待結果の計画 | 評価観点 |
| --- | --- | --- | --- |
| ユーザー影響とSLI | 架空の注文確認操作を対象に対象イベント・成功条件・除外・窓を定義 | 下記の合成集計例を入力契約へ展開 | 分母・分子・単位・窓・除外を第三者が再現できる |
| バジェット | 同じ窓の正常／悪化fixtureを比較 | 正常と悪化の数値例は下記。欠測fixtureは作成待ち | 欠測を成功扱いせず、計算と判断の仮定を分ける |
| アラートとRunbook | 判定理由とRunbookの参照先・確認順・停止条件を対応付ける | S5の書式、S6の例を使い、共通ID付き完成例を作成 | 初動が「ログを見る」だけで終わらず、復旧確認・エスカレーションへ進める |
| 負荷・容量 | 合成環境の計測から採択／保留の根拠を記録 | 測定条件、遅延・飽和、繰返し結果、限界を含む判断表を作成 | 成功率や仮の1台処理量だけで容量を確定しない |
| 改善の引渡し | 残課題に担当・期限・再確認条件を付ける | S8の形式を共通Caseへ接続 | 未測定と失敗を区別し、閉鎖条件を説明できる |

### 合成集計の記入例（算術のみ）

同じ固定窓の対象イベントを1,000件、教材用の成功率目標を99.0%とする。これは本番SLOやアラート閾値の推奨ではない。イベント数ベースで計算し、停止時間へ換算しない。

| 入力 | 成功率 | 許容失敗数 | 実失敗数／許容失敗数 | 記入する判断 |
| --- | --- | --- | --- | --- |
| 合成正常例: 失敗5件 | 99.5% | 10件 | 0.5（50%消費） | 残り5件。同じ窓の目標内だが、リリース安全性や容量は未判定 |
| 合成悪化例: 失敗15件 | 98.5% | 10件 | 1.5（150%消費） | 許容を5件超過。Runbookの調査分岐へ渡す。容量追加が必要とはまだ断定しない |

計算式は `成功率 = (対象件数 − 失敗件数) / 対象件数`、`許容失敗数 = 対象件数 × (1 − 目標成功率)`。この小例は任意に定めた2入力の算術確認に限る。burn rateアラート、多窓判定、負荷生成、実測、運用成功の証拠ではない。

## 6. 暫定判断・責任者・再評価条件

| 判断対象 | 暫定案 | 根拠 | 次の再評価条件 |
| --- | --- | --- | --- |
| 次の制作単位 | **Integrate** | 既存4冊に説明・例がある。欠けている接続を最小教材で先に検証する | 共通fixture、記入済み成果物、期待結果、停止条件が揃う |
| 初版の範囲 | **Narrow** | 製品数や高度な予測を増やさず、1サービス・1負荷系統から始める | 最小例の不足が既存章への追記で足りるか判定する |
| 全編執筆の開始 | **Hold** | 統合課題未実装、実読者試行未実施。他章での重複充足も未確認 | 関連する未読章の確認、代表3〜4章と統合レビュー、実読者試行の結果を編集判断へ渡す |

編集上の最終判断者は `ootakazuhiko`。本記録の調査・修正担当はこのポータル作業担当であり、上表は承認済みの着手決定ではない。実読者試行の協力者・実施日は未定で、追加の運用担当者を置くことは前提にしない。AIレビューやCI成功を実読者試行に数えない。

更新時には、根拠SHA、参照版、到達目標、成果物・試行結果、未検証を再確認する。再確認の契機は、参照章・演習の意味変更、共通fixture完成、読者が再現できない箇所の発見、最小スコープ変更とする。日付だけで再確認済みへ更新しない。

Wave 1の制作順は維持する。この調査は全編執筆WIPを増やさず、最大2冊という既存方針も変えない。別担当のホワイトハッカー書のGateを再実施・再定義しない。残る新規4企画、6件全体の責任表、最終採否はIssue #294に残す。Issue #282の公開作業を本記録の完成待ちにしない。

## 7. 検証状態と限界

- **本文確認済み**: S1–S8の指定範囲。設定例の存在と教育上の接続を確認した。
- **算術実行済み**: 上記2入力の成功率・許容数・消費率をPythonの有理数で確認した。実サービスは呼び出していない。
- **未実行**: 既存書のPrometheus/Grafana/クラウド設定、負荷生成、障害注入、通知、復旧操作。掲載バージョンの互換性は本記録で保証しない。
- **未実装・未評価**: 共通fixture、統合Runbook、容量実測、代表章、実読者試行、学習効果、需要・ROI。これらの完了率や発売日は算出しない。
- **範囲外**: その他の書籍・章、非公開本文、別担当書籍の進捗判定、catalogの書換え、formatter pin更新。
- ポータル検証・レビューのexact-head証跡は、本記録を追加するPRとIssue #294に残す。CI結果を本書案の学習効果や既存コードの動作確認へ読み替えない。
