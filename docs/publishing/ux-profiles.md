# UX Profiles v1

## 前提
- プロファイルは「書籍の目的」を優先して決定する
- 複合的な書籍は、主目的の profile を選び modules で補完する

## プロファイル定義
### Profile A: Learning / Onboarding
- 目的: 初学者の学習導入、全体像の把握
- 対象: 初学者、経験の浅い実務者
- 必須 modules: `readingGuide`, `quickStart`, `glossary`
- 推奨 modules: `conceptMap`, `checklistPack`

### Profile B: Practical / Reference
- 目的: 実務課題の解決、参照性の向上
- 対象: 実務者、運用担当者
- 必須 modules: `checklistPack`, `troubleshootingFlow`, `figureIndex`
- 推奨 modules: `quickStart`

### Profile C: Design / Theory
- 目的: 設計・理論・思考整理
- 対象: 中上級者、設計/研究志向
- 必須 modules: `conceptMap`, `glossary`
- 推奨 modules: `readingGuide`, `figureIndex`

## 判定ルール（簡易）
1. 主目的が「学習の導入/習得」なら A
2. 主目的が「実務の参照/運用」なら B
3. 主目的が「設計/理論/思考整理」なら C
4. 迷う場合は A/B/C のいずれか 1 つに決定し、必要な modules を追加する

## 運用メモ
- 必須 modules の強制は初期は warning とし、段階的に厳格化する
- profile 変更は「構成の再設計」ではなく「導線の調整」として扱う
