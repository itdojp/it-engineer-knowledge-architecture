# 技術書執筆プロンプト（6フェーズ構成版）

## 執筆の基本理念

### 【本質的理念】技術の本質と知識体系を伝える
1. **技術の本質的価値と実世界での影響を、背景から丁寧に解説する**
   - なぜその技術が生まれたか、何を解決するのかから始める
   - 原理原則を通じて、時代を超えて有効な理解を提供

2. **体系的な知識構造を明確にし、読者の理解を段階的に深める**
   - 個々の技術要素の関係性と全体像を明示
   - 基礎から応用への論理的な積み上げ
   - 各章・節の役割と相互関係を明確化

### 【アプローチ理念】読者と対等な知識探求
3. **教育的意図を前面に出さず、実務的な技術文書として自然に仕上げる**
   - 上から教えるのではなく、共に技術を探求する姿勢
   - 読者の知性を尊重した対等な文体

4. **概念と原理の説明を主体とし、コードは理解を助ける補助として最小限に使用する**
   - 技術の背後にある思想と設計思想を言葉で丁寧に説明
   - コードは概念の具体例として必要な場合のみ提示
   - 実装詳細より、なぜそのような設計になったかを重視

### 【執筆方針理念】AI支援の最適化
5. **AI支援による一貫性と創造性の両立を図る**
   - 文章による説明を中心とした技術解説
   - 図表・メタファー・事例を活用した多様な説明手法
   - コード偏重を避け、人間が理解しやすい自然言語での表現

### 【品質保証理念】継続的な価値向上
6. **ドキュメント・アズ・コード手法による品質管理と継続的改善**
   - 生きたドキュメントとして進化し続ける
   - 技術の進歩に合わせた更新を可能にする仕組み

7. **測定可能な成果指標による執筆プロセスの最適化**
   - 読者の理解と成功を定量的に検証
   - フィードバックに基づく継続的な改善

---

## フェーズ1：企画立案・価値設計

### 目的
技術書の存在意義と提供価値を明確化し、戦略的な方向性を定める

### 実施内容

#### 1.1 企画意図の明確化
- **解決する課題**：この技術書がない世界での読者の困難
- **提供する価値**：読了後に読者が得られる具体的な成果
- **差別化要素**：既存書籍にない独自の視点や価値

#### 1.2 読者プロファイルの詳細定義
- **技術的背景**：前提知識、経験年数、専門分野
- **現状の課題**：何に困っているか、何を知りたいか
- **期待する成果**：技術書から得たい知識や能力

#### 1.3 市場分析と位置付け
- **競合分析**：類似書籍の強み・弱み・空白領域
- **市場ニーズ**：技術トレンドと需要の分析
- **ポジショニング**：本書の独自の立ち位置

#### 1.4 体系的な章構成原案の作成
- **知識体系の全体設計**：技術要素の関係性を反映した構造
- **段階的理解の設計**：なぜ→何を→どのように→将来展望
- **各章の役割定義**：全体の中での位置づけと貢献
- **章間の連携設計**：前提知識と発展的内容の明確化

#### 1.5 成果指標（KPI）の設定
- **読者満足度指標**：理解度、実用性、推奨度の目標値
- **技術適用指標**：読者が実際に技術を適用できる成功率
- **参照価値指標**：長期的な参照頻度、引用数
- **改善指標**：フィードバックに基づく改訂頻度と質

### 成果物
- 企画書（A4 2-3ページ）
- 読者ペルソナ（3-5パターン）
- 競合分析表
- 章構成案（各章1-2行の説明付き）
- KPI定義書（測定方法と目標値）

---

## フェーズ2：構造設計・目次詳細化

### 目的
読者の学習経路を設計し、論理的で理解しやすい構造を作る

### 実施内容

#### 2.1 体系的な詳細目次の作成
```
各章について以下を定義：
- 章タイトル（読者の関心を引く明確な表現）
- 節タイトル（5-8個程度、論理的な流れ）
- 各節の概要（2-3行で内容を説明）
- 節間の接続（どう繋がるか）
- 知識の前提と到達点（各章で何を前提とし、何を理解できるようになるか）
```

#### 2.2 技術要素の配置設計
- **用語定義の配置**：いつ、どこで専門用語を導入するか
- **概念の積み上げ**：基礎から応用への段階的構成
- **実例の配置**：抽象概念を支える具体例の計画

#### 2.3 視覚的情報設計
- **情報アーキテクチャ設計**：読者の認知負荷を最小化する構造
- **視覚的階層構造**：重要度に応じた視覚的な強調
- **図表の戦略的配置**：
  - 複雑な概念の視覚化タイミング
  - テキストと図表の最適なバランス
  - 最小限主義による明確性の確保
- **フローと導線設計**：読者の自然な視線移動を考慮

#### 2.4 ドキュメント・アズ・コード環境の準備
- **執筆フォーマット選定**：Markdown、AsciiDoc等の選択
- **バージョン管理設定**：Git等によるバージョン管理体制
- **ビルドプロセス設計**：自動変換、検証プロセスの確立
- **レビューワークフロー**：プルリクエストベースのレビュー体制

### 成果物
- 詳細目次（全章・全節のタイトルと概要）
- 用語定義リスト（初出位置の指定付き）
- 視覚的情報設計書（情報アーキテクチャと視覚階層）
- 図表配置計画書
- 執筆環境設定書（ツールとワークフロー）

---

## フェーズ3：探索的執筆・内容検証

### 目的
AI支援により全章のラフ原稿を作成し、全体構造の妥当性を検証して執筆方向を確定する

### 実施内容

#### 3.1 AI支援による全章ラフ執筆
- **全章全節の執筆**（100%のラフ原稿作成）
- **高速執筆モード**：構造と流れを重視した執筆
- **一貫性の確保**：章間の整合性と論理的つながり

#### 3.2 AIモデル選択戦略
- **ラフ原稿用：Claude 4 Opus**
  - 高い創造性と深い分析力を活用
  - 技術の本質を多角的に探求
  - 複雑な概念の体系的な整理
  - 文章による豊富な説明を生成
- **本稿用（フェーズ5）：Claude 4 Sonnet**
  - 高速処理による効率的な精緻化
  - 一貫した文体と用語使用
  - 実用性を重視した簡潔な説明
  - 技術的正確性と読みやすさのバランス
- **共通指針**：概念と原理の文章説明を優先し、コード例は最小限に

#### 3.2 執筆スタイルの確立
- **トーンの決定**：対等で探求的な文体の確立
- **説明方法の確立**：
  - 概念と原理を言葉で丁寧に説明
  - メタファー、図解、事例のバランス
  - コードは補助的な具体例として最小限に
- **用語使用の確認**：専門用語の適切な定義と一貫した使用

#### 3.3 全体構造の検証
- **知識体系の確認**：技術要素の関係性が明確に表現されているか
- **章間の流れ**：論理的な展開と段階的な理解の確認
- **説明の重複と欠落**：内容の過不足チェック
- **技術レベルの一貫性**：説明深度の統一性確認

#### 3.4 ユーザビリティテスト（第1回）
- **サンプル章テスト**：代表的な章での理解度測定
- **読了率測定**：どこで読者が離脱するか分析
- **タスク完了率**：技術の理解と適用成功率
- **A/Bテスト**：異なる説明アプローチの比較
- **定量的指標**：
  - 理解度スコア（理解度テスト結果）
  - 読了時間と離脱ポイント
  - 実践課題の成功率

### 成果物
- ラフ原稿（全章完成版）
- スタイルガイド（執筆ルール）
- 構造検証レポート（章間の整合性分析）
- ユーザビリティテスト結果レポート

---

## フェーズ4：構造改善・方針確定

### 目的
ラフ原稿から得られた知見を基に、全体構造と執筆方針を最適化する

### 実施内容

#### 4.1 構造の見直しと最適化
- **章立ての調整**：ラフ原稿で見えた問題の解決
- **節の再配置**：より論理的な流れへの修正
- **分量の再配分**：重要度に応じた調整
- **ユーザビリティ改善**：
  - 離脱ポイントの改善策
  - 理解困難箇所の再構成
  - 成功率の高い説明方法の採用

#### 4.2 内容方針の精緻化
- **知識体系の精緻化**：技術要素間の関係をより明確に
- **説明深度の統一**：各章の詳細度を揃える
- **前提知識の明確化**：各章で必要な知識と到達点の再定義
- **省略事項の決定**：スコープ外とする内容の明確化

#### 4.3 執筆計画の策定
- **執筆順序**：効率的な執筆の順番
- **参照関係**：章間の依存関係の整理
- **スケジュール**：各章の執筆期限

### 成果物
- 改訂版詳細目次
- 執筆ガイドライン（確定版）
- 執筆スケジュール

---

## フェーズ5：本格執筆・内容充実

### 目的
確定した構造と方針に基づき、AI支援で完成度の高い原稿を作成する

### 実施内容

#### 5.1 AI支援による精密執筆
```
執筆アプローチ：
1. ラフ原稿を基にした詳細化
2. 概念と原理の説明を深化
3. 技術的正確性の向上
4. 具体例とメタファーの充実
5. 文体の統一と洗練
```

#### 5.2 品質基準の適用
- **技術的正確性**：事実関係、用語使用の確認
- **論理的整合性**：説明の流れ、前後関係
- **実用的価値**：読者が実際に活用できる内容か
- **Claude 4 Sonnet活用**：Opusで作成したラフ原稿を効率的に精緻化

#### 5.3 継続的な改善
- **相互参照の追加**：関連する内容への適切な誘導
- **重複の解消**：同じ内容の繰り返しを避ける
- **空白の補填**：説明不足の箇所を特定し補強
- **視覚的要素の最適化**：
  - 図表の最終調整
  - テキストと視覚要素のバランス確認
  - 読者の視線誘導の検証

#### 5.4 段階的リリースとフィードバック収集
- **マイルストーンリリース**：主要章完成時の限定公開
- **ユーザビリティテスト（第2回）**：
  - 本稿での理解度・満足度測定
  - 実践適用の成功事例収集
  - 改善前後の比較分析
- **早期フィードバック**：読者からの改善提案の収集
- **反復的改善**：フィードバックに基づく内容更新
- **変更履歴管理**：全ての変更の追跡と記録

### 成果物
- 完成原稿（全章）
- 相互参照リスト
- 図表最終版
- 改訂履歴（全ての変更記録）
- ユーザビリティテスト最終報告書

---

## フェーズ6：品質保証・最終調整

### 目的
技術書としての完成度を高め、出版可能な品質に仕上げる

### 実施内容

#### 6.1 技術的校正
- **専門家レビュー**：技術的正確性の検証
- **用語統一**：表記揺れの修正
- **最新情報の確認**：技術の更新への対応

#### 6.2 読みやすさの向上
- **文章校正**：冗長表現、不明瞭な文の修正
- **構成の微調整**：段落、節の区切りの最適化
- **視覚的改善**：レイアウト、強調表示の調整

#### 6.3 最終品質確認
- **通読テスト**：想定読者による理解度確認
- **目的達成度**：当初の企画意図の実現確認
- **索引・用語集**：検索性を高める要素の追加
- **最終ユーザビリティ検証**：
  - 全体を通しての読了率
  - 技術適用の成功事例
  - 読者満足度の最終測定

#### 6.4 継続的改善体制の確立
- **バージョン管理戦略**：セマンティックバージョニング（1.0、1.1、2.0）の導入
- **定期更新サイクル**：技術進化に応じた改訂計画
- **フィードバックチャネル**：読者からの継続的な意見収集方法
- **成果測定の継続**：KPIの定期的な測定と分析

### 成果物
- 出版可能原稿
- 校正記録
- 用語集・索引
- バージョン管理計画書
- 継続的改善プロセス文書
- 最終ユーザビリティ報告書（全テスト結果の統合）

---

## 執筆ツールとプロセス

### 推奨ツール
- **執筆**：VSCode、Typora等のMarkdownエディタ
- **バージョン管理**：Git、GitHub/GitLab
- **ビルド**：Pandoc、Sphinx等の変換ツール
- **レビュー**：プルリクエストベースのワークフロー
- **AIモデル**：
  - ラフ原稿：Claude 4 Opus（深い分析と創造性）
  - 本稿：Claude 4 Sonnet（効率的な精緻化）

### 基本ワークフロー
1. Claude 4 Opusで全章のラフ原稿を作成（概念と原理の説明中心）
2. Gitでバージョン管理
3. プルリクエストでレビュー
4. Claude 4 Sonnetで本稿を精緻化（文章説明を洗練）
5. 自動ビルドで各種フォーマットに変換
6. フィードバックを反映して継続的改善

## まとめ

この6フェーズ構成により、AI支援を最大限活用しながら、読者に体系的な知識を伝える高品質な技術書を執筆できます。各フェーズが明確な目的を持ち、継続的な改善サイクルによって、時代を超えて価値を持つ技術書の作成が可能になります。

この6フェーズ構成により、AI支援を最大限活用しながら、読者中心の設計で企画から完成、そして継続的改善まで体系的に技術書を執筆・管理できます。