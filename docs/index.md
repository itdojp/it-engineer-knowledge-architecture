---
layout: default
title: ITエンジニア知識アーキテクチャ / IT Engineer Knowledge Architecture
description: 実務で活かせるITエンジニア学習ロードマップ – 技術書による体系的スキル構築
---

# ITエンジニア知識アーキテクチャ / IT Engineer Knowledge Architecture

実務で活かせるITエンジニア学習ロードマップ  
– 技術書による体系的スキル構築

Building Your Tech Career, One Book at a Time

- [日本語概要](#日本語概要)
- [書籍一覧](#書籍一覧)
- [学習ロードマップ](#学習ロードマップ)
- [専門分野別学習パス](#専門分野別学習パス)
- [計画書籍](#計画書籍)
- [コミュニティ・フィードバック](#コミュニティフィードバック)
- [組織情報](#組織情報)
- [ライセンス](#ライセンス)
- [English Overview](#english-overview)

---

## 日本語概要

### プロジェクト概要

このプロジェクトは、ITエンジニア（特にインフラ系）が実務で必要とする知識を体系化し、段階的な学習ロードマップを提供することを目的としています。

- 既存書籍: 24冊（レビュー済み）
- 計画書籍: 6冊（新規制作予定）
- 合計: 30冊による総合的な知識体系

各書籍は GitHub リポジトリとして公開され、GitHub Pages を通じて無料で閲覧できます。  
ライセンスは Creative Commons BY-NC-SA 4.0（非営利利用は自由、商用利用は別途契約）です。

### 想定読者

- 新人〜シニアITエンジニア
- インフラエンジニア、SRE、DevOpsエンジニア
- セキュリティエンジニア、クラウドエンジニア
- エンジニアリングマネージャー、技術組織のリーダー

### 主な特徴

- 「インフラ／クラウド／セキュリティ／AI時代の開発プロセス」にフォーカス
- 未経験〜エキスパートまでをカバーするレベル別・専門分野別パス
- すべての書籍をオンラインで無料公開（非営利利用）
- ITDO Inc. の社内研修・インターン・外部向け研修と連動した内容

---

## 企業・組織での利用イメージ

### 1. 社内育成・研修カリキュラムとして利用

- 新人研修  
  - Linux基礎、ITインフラ基礎、GitHub入門などを組み合わせた「最初の3ヶ月カリキュラム」
- 若手〜中堅育成  
  - クラウドインフラ、トラブルシューティング、情報セキュリティなどを体系的に学ぶロードマップ
- マネージャー育成  
  - 思考法・コミュニケーション・交渉・教養系の書籍で「技術が分かるマネージャー」を育成

### 2. 実務プロジェクトと紐づけた教育

- コンテナ化・モダナイズ案件  
  - 『Podman完全ガイド』を元に、実案件の設計・構築を進める
- ID管理・認証基盤案件  
  - 『実践 認証認可システム設計』『インフラエンジニアのための情報セキュリティ実装ガイド』をベースに要件定義〜構築までを整理
- クラウドインフラ設計案件  
  - 『クラウドインフラ設計・構築ガイド』と IaC ツールを組み合わせて標準パターンを整備

### 3. 外部研修・共同開発との連携

- 大学・専門学校・自治体との連携講座の教材として利用
- 他社との共同プロジェクトで「共通の教科書」として採用し、共通言語を作る
- 技術書典・勉強会・オンラインイベントと連動した学習プログラム

> 企業・教育機関での体系的な利用、商用利用に関する相談は  
> **knowledge@itdo.jp** までお問い合わせください。

---

## 個人エンジニア向けの利用イメージ

- 未経験からインフラエンジニアを目指すロードマップとして
- 自社に体系的な教育制度が無い場合の「自己学習カリキュラム」として
- クラウド・セキュリティ・SREなど専門分野へステップアップするためのガイドとして
- 「AI時代の開発プロセス」「形式的手法」など、現場では学びづらい領域のキャッチアップとして

---

## 書籍一覧

### ✅ 既存書籍（24冊）

#### 未経験者向け

対象: IT未経験者・初学者 / プログラミングやLinuxの基礎を楽しく学ぶ

1. 図解でわかるLinux基礎  
   [書籍を読む](https://itdojp.github.io/illustrated-linux-basics-book/) | [リポジトリ](https://github.com/itdojp/illustrated-linux-basics-book)

2. やさしく学ぶLinux WSL2ではじめる基礎  
   [書籍を読む](https://itdojp.github.io/wsl2-linux-essentials-book/) | [リポジトリ](https://github.com/itdojp/wsl2-linux-essentials-book)

#### 技術基盤（基礎）

対象: 新人〜中級者（経験0–2年）/ ITインフラの土台となる必修知識

3. 実践Linux インフラエンジニア入門  
   [書籍を読む](https://itdojp.github.io/linux-infra-textbook2/) | [リポジトリ](https://github.com/itdojp/linux-infra-textbook2)  
   （旧版 [書籍を読む](https://itdojp.github.io/linux-infra-textbook/) | [リポジトリ](https://github.com/itdojp/linux-infra-textbook)）

4. ITインフラエンジニアのためのソフトウェア基礎知識  
   [書籍を読む](https://itdojp.github.io/it-infra-software-essentials-book/) | [リポジトリ](https://github.com/itdojp/it-infra-software-essentials-book)

5. ITインフラストラクチャ技術ガイド  
   [書籍を読む](https://itdojp.github.io/IT-infra-book/) | [リポジトリ](https://github.com/itdojp/IT-infra-book)

#### 技術基盤（発展）

対象: 中級〜上級者（経験2年以上）/ 高度な設計・運用・問題解決スキル

6. ITインフラトラブルシューティング実践ガイド  
   [書籍を読む](https://itdojp.github.io/IT-infra-troubleshooting-book/) | [リポジトリ](https://github.com/itdojp/IT-infra-troubleshooting-book)

7. クラウドインフラ設計・構築ガイド  
   [書籍を読む](https://itdojp.github.io/cloud-infra-book/) | [リポジトリ](https://github.com/itdojp/cloud-infra-book)

8. インフラエンジニアのための情報セキュリティ実装ガイド  
   [書籍を読む](https://itdojp.github.io/it-infra-security-guide-book/) | [リポジトリ](https://github.com/itdojp/it-infra-security-guide-book)

#### 応用技術

対象: 中級者以上 / 特定技術スタックの実践的活用

9. Podman完全ガイド  
   [書籍を読む](https://itdojp.github.io/podman-book/) | [リポジトリ](https://github.com/itdojp/podman-book)

10. 実践 認証認可システム設計
    [書籍を読む](https://itdojp.github.io/practical-auth-book/) | [リポジトリ](https://github.com/itdojp/practical-auth-book)

11. Supabaseアーキテクチャ
    [書籍を読む](https://itdojp.github.io/supabase-architecture-patterns-book/) | [リポジトリ](https://github.com/itdojp/supabase-architecture-patterns-book)

#### コンピューターサイエンス理論

対象: 中級者以上 / 理論的バックグラウンドの深化

12. 理論計算機科学教科書
    [書籍を読む](https://itdojp.github.io/theoretical-computer-science-textbook/) | [リポジトリ](https://github.com/itdojp/theoretical-computer-science-textbook)

#### 開発・運用プロセス

対象: 全レベル / 開発効率化・品質向上

13. GitHub初心者ガイド
    [書籍を読む](https://itdojp.github.io/github-guide-for-beginners-book/) | [リポジトリ](https://github.com/itdojp/github-guide-for-beginners-book)

14. AI開発のためのGitHubワークフロー実践ガイド
    [書籍を読む](https://itdojp.github.io/github-workflow-book/) | [リポジトリ](https://github.com/itdojp/github-workflow-book)

15. AI主導開発時代のソフトウェアテスト戦略
    [書籍を読む](https://itdojp.github.io/ai-testing-strategy-book/) | [リポジトリ](https://github.com/itdojp/ai-testing-strategy-book)

16. 形式的手法の基礎と応用
    [書籍を読む](https://itdojp.github.io/formal-methods-book/) | [リポジトリ](https://github.com/itdojp/formal-methods-book)

#### 特定領域・ドメイン知識

対象: 専門分野従事者 / 業界特化の専門知識

17. バイオインフォマティクス実践ガイド
    [書籍を読む](https://itdojp.github.io/BioinformaticsGuide-book/) | [リポジトリ](https://github.com/itdojp/BioinformaticsGuide-book)

#### ソフトスキル・思考法

対象: 全レベル / キャリア発展・コミュニケーション

18. AI時代に差がつく論理的思考と表現力
    [書籍を読む](https://itdojp.github.io/LogicalThinking-AI-Era-Guide/) | [リポジトリ](https://github.com/itdojp/LogicalThinking-AI-Era-Guide)

19. AI時代のプロフェッショナルITエンジニアの思考法
    [書籍を読む](https://itdojp.github.io/ai-era-engineers-mind-book/) | [リポジトリ](https://github.com/itdojp/ai-era-engineers-mind-book)

20. エンジニアの交渉力アーキテクチャ
    [書籍を読む](https://itdojp.github.io/negotiation-for-engineers-book/) | [リポジトリ](https://github.com/itdojp/negotiation-for-engineers-book)

21. 生成AIコミュニケーション技術
    [書籍を読む](https://itdojp.github.io/ai-communication-book/) | [リポジトリ](https://github.com/itdojp/ai-communication-book)

22. エンジニアのための実践コミュニケーション設計
    [書籍を読む](https://itdojp.github.io/IT-engineer-communication-book/) | [リポジトリ](https://github.com/itdojp/IT-engineer-communication-book)

#### 教養・哲学

対象: 全レベル / 技術的教養・視野拡大

23. デジタル革命の先駆者たち
    [書籍を読む](https://itdojp.github.io/cs-visionaries-book/) | [リポジトリ](https://github.com/itdojp/cs-visionaries-book)

24. 計算論的物理主義
    [書籍を読む](https://itdojp.github.io/computational-physicalism-book/) | [リポジトリ](https://github.com/itdojp/computational-physicalism-book)

---

## 学習ロードマップ

### レベル別学習パス

#### 未経験者・初学者

Linux基礎

- 図解でわかるLinux基礎 → やさしく学ぶLinux WSL2ではじめる基礎

次のステップへ

- 実践Linux インフラエンジニア入門

#### 初級者（経験0–2年）

基礎固め

- 実践Linux インフラエンジニア入門 → ITインフラ全般
- デジタル革命の先駆者たち（教養）

実践スキル

- AI開発のためのGitHubワークフロー実践ガイド → Podman完全ガイド

#### 中級者（経験3–5年）

専門技術

- 実践 認証認可システム設計
- 『インフラ監視・運用自動化実践ガイド』（計画）

思考・プロセス

- AI時代に差がつく論理的思考と表現力
- AI主導開発時代のソフトウェアテスト戦略

#### 上級者（経験6年以上）

アーキテクチャ・設計

- 『エンタープライズクラウドアーキテクチャ設計・運用』（計画）
- 『災害対策・事業継続計画（BCP）実装ガイド』（計画）

リーダーシップ

- AI時代のプロフェッショナルITエンジニアの思考法
- エンジニアの交渉力アーキテクチャ

#### エキスパート（シニア・責任者）

組織・戦略

- 『実践的セキュリティインフラ構築』（計画）
- 『コンプライアンス対応インフラ設計・運用』（計画）

先端技術

- 『次世代インフラ技術実践ガイド』（計画）

---

## 専門分野別学習パス

### インフラエンジニア

- 基礎: 実践Linux インフラエンジニア入門 → ITインフラエンジニアのためのソフトウェア基礎知識 → ITインフラストラクチャ技術ガイド  
- 発展: ITインフラトラブルシューティング実践ガイド → クラウドインフラ設計・構築ガイド → インフラエンジニアのための情報セキュリティ実装ガイド  
- 応用技術: Podman完全ガイド → 実践 認証認可システム設計  

### クラウドエンジニア

- 基礎: ITインフラエンジニアのためのソフトウェア基礎知識 → ITインフラストラクチャ技術ガイド  
- 発展: クラウドインフラ設計・構築ガイド → ITインフラトラブルシューティング実践ガイド  
- 応用技術: Podman完全ガイド → Supabaseアーキテクチャ  

### セキュリティエンジニア

- 基礎: ITインフラエンジニアのためのソフトウェア基礎知識  
- 発展: インフラエンジニアのための情報セキュリティ実装ガイド  
- 応用技術: 実践 認証認可システム設計  

### SRE・テストエンジニア

- 基礎: ITインフラエンジニアのためのソフトウェア基礎知識 → ITインフラストラクチャ技術ガイド  
- 発展: ITインフラトラブルシューティング実践ガイド → クラウドインフラ設計・構築ガイド  
- プロセス: AI主導開発時代のソフトウェアテスト戦略 → AI開発のためのGitHubワークフロー実践ガイド  
- 応用技術: Podman完全ガイド  

### エンジニアリングマネージャー

- ソフトスキル: AI時代に差がつく論理的思考と表現力 → AI時代のプロフェッショナルITエンジニアの思考法 → エンジニアの交渉力アーキテクチャ → 生成AIコミュニケーション技術  
- 技術理解: 基礎分野の概要習得 → 理論計算機科学教科書（理論的背景）  
- 教養: デジタル革命の先駆者たち → 計算論的物理主義  

---

## 計画書籍

### 優先度: 高（必須追加）

25. 『インフラ監視・運用自動化実践ガイド』 – Prometheus/Grafana、SRE実践  
26. 『エンタープライズクラウドアーキテクチャ設計・運用』 – AWS/Azure/GCP、IaC、FinOps  
27. 『災害対策・事業継続計画（BCP）実装ガイド』 – DR計画、RTO/RPO設計  
28. 『実践的セキュリティインフラ構築』 – ゼロトラスト、SIEM/SOC  

### 優先度: 中（価値向上）

29. 『インフラ性能管理・キャパシティプランニング』 – 性能テスト、ボトルネック分析  
30. 『コンプライアンス対応インフラ設計・運用』 – ISO27001、SOX法対応  

### 優先度: 低（将来投資）

31. 『次世代インフラ技術実践ガイド』 – エッジコンピューティング、AI/MLOps  

---

## コミュニティ・フィードバック

### 参加方法

- Issues: 改善提案、質問、議論
- Discussions: 学習経験の共有、ロードマップの議論
- Pull Requests: ドキュメント改善、新しい学習パスの提案

### フィードバック観点

- 学習パスの実用性
- 書籍間の連携・順序
- 不足領域の特定
- 実務での活用事例

---

## 組織情報

主催: ITDO Inc.（株式会社アイティードゥ）  
GitHub: [@itdojp](https://github.com/itdojp)  
Contact: knowledge@itdo.jp  

---

## ライセンス

ITDO Inc. が公開する技術書籍は **Creative Commons BY-NC-SA 4.0** ライセンスで提供されています。

### 自由な利用

- 教育・研究・個人学習での利用
- 非営利団体での活用
- 内容の改変・派生作品の作成（同一ライセンス条件での共有が必要）

### 商用利用

法人・営利団体での利用には事前の商用ライセンス契約が必要です。  
（例: 社内研修教材としての利用、社外向け有償研修での利用、商用サービスへの直接組み込みなど）

詳細はリポジトリ内の LICENSE.md を参照してください。

### 対象書籍一覧（リポジトリ）

- 図解でわかるLinux基礎 – https://github.com/itdojp/illustrated-linux-basics-book  
- やさしく学ぶLinux WSL2ではじめる基礎 – https://github.com/itdojp/wsl2-linux-essentials-book  
- 実践Linux インフラエンジニア入門 – https://github.com/itdojp/linux-infra-textbook2  
- ITインフラエンジニアのためのソフトウェア基礎知識 – https://github.com/itdojp/it-infra-software-essentials-book  
- ITインフラストラクチャ技術ガイド – https://github.com/itdojp/IT-infra-book  
- ITインフラトラブルシューティング実践ガイド – https://github.com/itdojp/IT-infra-troubleshooting-book  
- クラウドインフラ設計・構築ガイド – https://github.com/itdojp/cloud-infra-book  
- インフラエンジニアのための情報セキュリティ実装ガイド – https://github.com/itdojp/it-infra-security-guide-book  
- Podman完全ガイド – https://github.com/itdojp/podman-book  
- 実践 認証認可システム設計 – https://github.com/itdojp/practical-auth-book  
- Supabaseアーキテクチャ – https://github.com/itdojp/supabase-architecture-patterns-book  
- 理論計算機科学教科書 – https://github.com/itdojp/theoretical-computer-science-textbook  
- GitHub初心者ガイド – https://github.com/itdojp/github-guide-for-beginners-book  
- AI開発のためのGitHubワークフロー実践ガイド – https://github.com/itdojp/github-workflow-book  
- AI主導開発時代のソフトウェアテスト戦略 – https://github.com/itdojp/ai-testing-strategy-book  
- 形式的手法の基礎と応用 – https://github.com/itdojp/formal-methods-book  
- バイオインフォマティクス実践ガイド – https://github.com/itdojp/BioinformaticsGuide-book  
- AI時代に差がつく論理的思考と表現力 – https://github.com/itdojp/LogicalThinking-AI-Era-Guide  
- AI時代のプロフェッショナルITエンジニアの思考法 – https://github.com/itdojp/ai-era-engineers-mind-book  
- エンジニアの交渉力アーキテクチャ – https://github.com/itdojp/negotiation-for-engineers-book  
- 生成AIコミュニケーション技術 – https://github.com/itdojp/ai-communication-book  
- エンジニアのための実践コミュニケーション設計 – https://github.com/itdojp/IT-engineer-communication-book  
- デジタル革命の先駆者たち – https://github.com/itdojp/cs-visionaries-book  
- 計算論的物理主義 – https://github.com/itdojp/computational-physicalism-book  

お問い合わせ: 株式会社アイティードゥ（ITDO Inc.） / knowledge@itdo.jp  

---

公開日: 2025/07/23  
一冊ずつ積み上げる、エンジニアキャリアの基盤

---

## English Overview

### What is this project?

**IT Engineer Knowledge Architecture** is a curated collection of technical books and learning paths for IT engineers, especially infrastructure engineers.

- 24 published books (Japanese, free to read online)
- 6 planned books
- Coverage from absolute beginners to senior architects and engineering managers
- Focus on infrastructure, cloud, security, reliability, and AI-era development practices

All books are written and maintained by **ITDO Inc.**, an infrastructure-focused systems integrator based in Japan.

### Intended audience

- Infrastructure / cloud / security engineers
- SRE and test engineers
- Software engineers who want solid infrastructure fundamentals
- Engineering managers and technical leaders

At the moment, all books are written in Japanese, but the structure and roadmaps can be used as a reference for designing training programs in any language.

### How companies can use this

Typical use cases for companies and organizations:

- As an internal training curriculum for junior to mid-level engineers
- As a reference roadmap for cloud / security / SRE skill development
- As a common “textbook set” for joint projects with ITDO Inc.
- As core material for university / vocational school courses in collaboration with ITDO

If you are interested in using these materials for **corporate training** or **commercial services**, please contact:

- knowledge@itdo.jp

### License and commercial use

All books in this project are licensed under **Creative Commons BY-NC-SA 4.0**:

- Free for personal learning, education, and research
- Non-commercial organizations can adapt and share under the same license
- **Commercial use requires a separate license agreement with ITDO Inc.**

For details, see `LICENSE.md` in this repository.

### About ITDO Inc.

- Name: ITDO Inc. (株式会社アイティードゥ)  
- Focus: IT infrastructure design / build / operations, cloud, identity & access management, automation, and security  
- GitHub: https://github.com/itdojp  
- Contact for this project: knowledge@itdo.jp  

---

