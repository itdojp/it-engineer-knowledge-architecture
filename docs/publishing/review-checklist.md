# Review Checklist (UX Core)

## 共通コア
- [ ] ヘッダーに書籍タイトルとトップ導線がある
- [ ] サイドバー（または同等のナビ）に章/付録への導線がある
- [ ] フッターにライセンス（CC BY-NC-SA 4.0、商用は別契約）とリポジトリ導線がある
- [ ] テーマ切替/検索導線が維持されている

## トップページ（index）
- [ ] `overview` / `audience` / `prerequisites` の基本スロットが揃っている
- [ ] `readingGuide` / `quickStart` は modules に従って表示される
- [ ] 目次（`toc`）が表示される
- [ ] 参照リンク（`links`）がある
- [ ] ライセンス表記（`license`）がある

## 章ページ（chapter）
- [ ] `objectives` が定義されている章では冒頭に表示される
- [ ] まとめ（`summary`）と次に読む導線（`nextSteps`）がある

## modules
- [ ] profile の必須 modules が有効化されている
- [ ] modules の表示位置が仕様に合っている

## 設定
- [ ] `book-config.json` に `ux.profile` と `ux.modules` が定義されている
- [ ] `license` が CC BY-NC-SA 4.0 である
- [ ] `repository.url` が実在リポジトリを指す
