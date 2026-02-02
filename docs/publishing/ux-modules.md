# UX Modules Catalog v1

## 目的
- `ux.modules` で ON/OFF できる UI 部品を定義する
- modules のキー名は lowerCamelCase で固定する

## モジュール一覧
| key | 目的 | 想定配置 | 備考 |
| --- | --- | --- | --- |
| quickStart | 初期セットアップ/導入手順 | index | Profile A/B で有効化を推奨 |
| readingGuide | 読み方/進め方のガイド | index | 学習導線の明確化 |
| checklistPack | 作業チェックリスト/手順のまとまり | index/appendix | 実務参照向け |
| troubleshootingFlow | トラブルシュート手順/判断フロー | index/appendix | 運用・診断向け |
| conceptMap | 概念図/構成図のまとめ | index | 理論/設計向け |
| figureIndex | 図表/表の索引 | appendix | 参照性向上 |
| legalNotice | 免責・法的注意事項 | appendix | 必要時のみ有効化 |
| glossary | 用語集 | appendix | 初学者/理論系で有効化を推奨 |

## 運用ルール
- 追加/変更は `docs/publishing/ux-modules.md` を更新する
- `ux.modules` に未定義キーが入った場合はエラー（または警告）とする
- profile の必須 modules は `docs/publishing/ux-profiles.md` を正とする
