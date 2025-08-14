# Font Specification for Technical Books

このドキュメントは、本書で使用している読みやすいフォントシステムを他の書籍でも使用するための仕様書です。

## 📖 本書のフォントシステム

本書では以下のフォントスタックを使用しており、非常に読みやすく、多くのプラットフォームで一貫した表示を実現しています：

### Sans-serif フォント（本文・見出し用）
```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
```

### Monospace フォント（コード・技術仕様用）
```css
--font-mono: "Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro", monospace;
```

## 🎯 他の書籍での適用方法

### 1. CSS変数として定義
```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --font-mono: "Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro", monospace;
}
```

### 2. 基本的な適用
```css
/* 本文 */
body {
  font-family: var(--font-sans);
}

/* コードブロック */
code, pre {
  font-family: var(--font-mono);
}

/* SVG図表内での使用 */
.sans-serif-text {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
}

.monospace-text {
  font-family: "Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro", monospace;
}
```

## 🌟 フォントスタックの特徴

### Sans-serif フォントの優位性
1. **クロスプラットフォーム対応**
   - macOS: `-apple-system`, `BlinkMacSystemFont`
   - Windows: `"Segoe UI"`
   - Android: `Roboto`
   - その他: `"Helvetica Neue"`, `Arial`, `"Noto Sans"`

2. **可読性の向上**
   - システムネイティブフォントを優先使用
   - 各OSに最適化されたレンダリング
   - 絵文字サポート完備

### Monospace フォントの優位性
1. **開発者フレンドリー**
   - macOS: `"Monaco"`, `"Menlo"`
   - Windows: `"Consolas"`
   - Linux: `"Ubuntu Mono"`
   - Web: `"source-code-pro"`

2. **技術文書に最適**
   - 文字間隔が等幅で整列しやすい
   - コードの構造が把握しやすい
   - 数字とアルファベットの区別が明確

## 📝 SVG図表での使用例

本書のSVG図表では以下のように使用しています：

```xml
<defs>
  <style>
    .title { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif; 
      font-size: 16px; 
      font-weight: 600; 
      fill: #1a1a1a; 
    }
    .command { 
      font-family: "Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro", monospace; 
      font-size: 9px; 
      font-weight: 400; 
      fill: #7b1fa2; 
    }
  </style>
</defs>
```

## ✅ 実装チェックリスト

他の書籍でこのフォントシステムを導入する際は、以下を確認してください：

- [ ] CSS変数でフォントスタックを定義
- [ ] 本文要素にsans-serifフォントを適用
- [ ] コード要素にmonospaceフォントを適用
- [ ] SVG図表内でフォント指定を統一
- [ ] 各デバイス・ブラウザで表示確認
- [ ] 日本語文字と英数字の混在での可読性確認

## 🔧 技術的な詳細

### フォント選定の優先順位
1. システムフォント（最優先）
2. 汎用フォント（フォールバック）
3. ジェネリックフォント（最終フォールバック）

### 実際のファイル場所
- 本書の設定ファイル: `assets/css/main.css` または `docs/assets/css/main.css`
- SVG図表の例: `assets/images/diagrams/` 配下の各SVGファイル

---

**作成者**: ITDO Inc.（株式会社アイティードゥ）  
**更新日**: 2024年8月  
**対象書籍**: Linuxインフラ教本 - サーバー構築・運用の基礎