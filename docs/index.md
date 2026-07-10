---
layout: default
title: ITエンジニア知識アーキテクチャ / IT Engineer Knowledge Architecture
description: 実務で活かせるITエンジニア学習ロードマップ – 技術書による体系的スキル構築
permalink: /
---
{% assign catalog = site.data.catalog %}
{% assign books = catalog.books | sort: 'displayOrder' %}
{% assign main_count = 0 %}
{% assign planned_count = 0 %}
{% assign related_count = 0 %}
{% for book in books %}
  {% if book.countingGroup == 'main-lineup' and book.countedInMainLineup %}{% assign main_count = main_count | plus: 1 %}{% endif %}
  {% if book.countingGroup == 'planned' %}{% assign planned_count = planned_count | plus: 1 %}{% endif %}
  {% if book.countingGroup == 'related-independent' %}{% assign related_count = related_count | plus: 1 %}{% endif %}
{% endfor %}

<h1>ITエンジニア知識アーキテクチャ</h1>

<p>実務で活かせるITエンジニア学習ロードマップを、書籍カタログと学習パスとして整理しています。</p>

<section class="catalog-summary" aria-label="シリーズ概要">
  <div class="summary-metric"><strong>{{ main_count }}</strong>公開書籍</div>
  <div class="summary-metric"><strong>{{ planned_count }}</strong>計画書籍</div>
  <div class="summary-metric"><strong>{{ related_count }}</strong>関連する独立英語書籍</div>
  <div class="summary-metric"><strong>{{ catalog.learningPaths | size }}</strong>学習パス</div>
</section>

<section class="path-grid" aria-label="主要入口">
  <article class="path-card">
    <h2>書籍から探す</h2>
    <p>公開済み、計画中、無料公開範囲、有料部分を含むPrivate管理書籍を、正本カタログから生成したカードで確認できます。</p>
    <p><a class="button-link" href="{{ '/books/' | relative_url }}">書籍一覧を見る</a></p>
  </article>
  <article class="path-card">
    <h2>学習パスから選ぶ</h2>
    <p>未経験者向け、クラウド/コンテナ、セキュリティ、AI支援開発、理論計算機科学などの読書順を確認できます。</p>
    <p><a class="button-link" href="{{ '/paths/' | relative_url }}">学習パスを見る</a></p>
  </article>
  <article class="path-card">
    <h2>出版・運用ガイド</h2>
    <p>書籍制作、公開前レビュー、UX仕様、品質スプリント、ライセンス方針などの運用資料を確認できます。</p>
    <p><a class="button-link" href="{{ '/publishing/' | relative_url }}">出版ガイドを見る</a></p>
  </article>
</section>

<section>
  <h2>初めて読む場合の推奨ルート</h2>
  <ol class="book-sequence">
    <li><strong>仕事の型を揃える:</strong> 根拠で進める開発仕事術、チケット駆動、ドキュメント、セキュリティ基礎、インシデント対応。</li>
    <li><strong>技術基盤へ進む:</strong> Linux / WSL2、ITインフラ、クラウド、コンテナ、認証認可、セキュリティ。</li>
    <li><strong>AI時代の開発運用を接続する:</strong> GitHub Workflow、AIエージェント協働、AgentOps、AIエージェント実践、AIテスト戦略、形式的手法。</li>
    <li><strong>意思決定と対人スキルで閉じる:</strong> 論理的思考、プロフェッショナルマインド、生成AIコミュニケーション、交渉、実務コミュニケーション。</li>
  </ol>
</section>

<section class="notice-box">
  <h2>利用方針</h2>
  <p>各書籍は原則としてGitHub Pagesで無料閲覧できます。無料公開範囲と有料版を分けて運用する書籍では、Pagesは試読範囲のみを公開し、管理リポジトリをPrivateにする場合があります。</p>
  <p>非営利利用は Creative Commons BY-NC-SA 4.0 に基づきます。商用利用、研修利用、組織導入は別途契約が必要です。</p>
</section>

<section>
  <h2>English</h2>
  <p>English overview and availability information are available in the <a href="{{ '/en/' | relative_url }}">English catalog</a>.</p>
</section>
