---
layout: default
title: English Catalog | IT Engineer Knowledge Architecture
description: English catalog for the IT Engineer Knowledge Architecture book lineup.
lang: en
permalink: /en/
header_title: IT Engineer Knowledge Architecture
header_description: English catalog for the ITDO technical book lineup.
---

[日本語]({{ '/' | relative_url }}) | **English**

Primary entry points:

- [Book catalog]({{ '/books/' | relative_url }}) — generated from the canonical catalog data
- [Learning paths]({{ '/paths/' | relative_url }}) — generated from catalog book IDs and next-path IDs
- [Publishing guide]({{ '/publishing/' | relative_url }}) — maintainer-facing publishing operations

# English Catalog

## Project overview

**IT Engineer Knowledge Architecture** is the public catalog for ITDO's technical book lineup.
The Japanese top page remains the primary landing page for Japanese readers, while this `/en/` page provides an English-language catalog view of the full lineup.

{% assign catalog_books = site.data.catalog.books | sort: "displayOrder" %}
{% assign main_books = catalog_books | where: "countingGroup", "main-lineup" %}
{% assign independent_books = catalog_books | where: "countingGroup", "related-independent" %}
{% assign planned_books = catalog_books | where: "countingGroup", "planned" %}

- Published books in the counted lineup: {{ main_books | size }}
- Related independent English books highlighted here: {{ independent_books | size }}
- Planned books: {{ planned_books | size }}
- Main coverage: infrastructure, cloud, security, software delivery, theory, and adjacent domains
- Main audience: learners from absolute beginner to senior architect / engineering manager

## How to read this page

- `JA only`: the book itself is currently available in Japanese only.
- `EN available`: a separate English edition exists for that book.
- `Independent EN book`: a separately published English-language book related to this catalog, but not counted in the 41-book Japanese lineup.
- `Planned`: the title is planned but not yet published.
- Unless an official English title is already established, this catalog keeps the canonical Japanese title and provides an English summary instead.
- Published titles in this lineup are cataloged as `JA only` unless explicitly marked otherwise.
- Some entries may link to related independent books outside the counted 41-book lineup when that relationship helps avoid reader confusion.

## Post-review catalog status

The canonical catalog currently contains {{ main_books | size }} published books in the counted lineup. The original 39 books covered by the 2026-05-24 cross-book review roadmap have completed the review process tracked in [Issue #153](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/153). The theoretical computer science prerequisites bridge book and the AI agent collaboration book were added after publication QA and GitHub Pages verification.

For operational follow-up, see the Japanese publishing notes:

- [2026 existing-book review summary]({{ '/' | relative_url }}publishing/content-review-summary-2026.html)
- [follow-up issue priorities]({{ '/' | relative_url }}publishing/follow-up-priorities.html)

Recommended reading flow after the review:

1. Start with Professional Foundations for evidence-based work, issue discipline, documentation, security basics, and incident response.
2. Move into infrastructure, cloud, containers, authentication, and security according to role.
3. Add GitHub / AI delivery practices when work needs AI agents, tests, formal checks, and reviewable artifacts.
4. Close the loop with soft skills: logical thinking, professional judgment, AI communication, negotiation, and engineer-to-engineer communication.

## Book catalog

The table below is rendered directly from `docs/_data/catalog.json`. Titles follow `officialEnglishTitle` when one is registered, then fall back to the canonical `title.en`. Empty English summaries use an explicit English fallback and never expose operational notes.

<div class="table-wrapper" role="region" aria-label="English book catalog">
<table id="english-book-catalog">
  <thead>
    <tr>
      <th scope="col">Canonical title</th>
      <th scope="col">Availability</th>
      <th scope="col">Category</th>
      <th scope="col">Audience</th>
      <th scope="col">Short English summary</th>
      <th scope="col">Links</th>
    </tr>
  </thead>
  <tbody>
  {% for book in catalog_books %}
    {% assign display_title = book.officialEnglishTitle %}
    {% if display_title == nil or display_title == '' %}{% assign display_title = book.title.en %}{% endif %}
    {% capture availability %}{% if book.status == 'planned' %}Planned{% elsif book.countingGroup == 'related-independent' %}Independent EN book{% elsif book.languages contains 'en' %}EN available{% else %}JA only{% endif %}{% if book.publicationScope == 'free-preview' %}; free preview{% endif %}{% endcapture %}
    {% capture category_label %}{% case book.category %}{% when 'beginner-track' %}Beginner Track{% when 'professional-foundations' %}Professional Foundations{% when 'core-infra-foundations' %}Core Infrastructure Foundations{% when 'advanced-infra-practice' %}Advanced Infrastructure Practice{% when 'security' %}Security{% when 'security-governance' %}Security / Governance{% when 'applied-technologies' %}Applied Technologies{% when 'computer-science-theory' %}Computer Science &amp; Theory{% when 'development-delivery' %}Development &amp; Delivery Process{% when 'domain-specific' %}Domain-Specific Knowledge{% when 'soft-skills-thinking' %}Soft Skills &amp; Thinking{% when 'liberal-arts-philosophy' %}Liberal Arts &amp; Philosophy{% when 'web3-blockchain' %}Web3 &amp; Blockchain{% else %}Other{% endcase %}{% endcapture %}
    {% capture level_labels %}{% for level in book.levels %}{% case level %}{% when 'beginner' %}Beginner{% when 'junior' %}Junior{% when 'intermediate' %}Intermediate{% when 'advanced' %}Advanced{% when 'all-levels' %}All levels{% else %}Unspecified level{% endcase %}{% unless forloop.last %}; {% endunless %}{% endfor %}{% endcapture %}
    {% capture role_labels %}{% for role in book.roles %}{% case role %}{% when 'all-engineers' %}All engineers{% when 'beginner' %}First-time learners{% when 'architect' %}Architects{% when 'backend-engineer' %}Backend engineers{% when 'domain-engineer' %}Domain engineers{% when 'engineering-manager' %}Engineering managers{% when 'infrastructure-engineer' %}Infrastructure engineers{% when 'security-engineer' %}Security engineers{% when 'software-engineer' %}Software engineers{% when 'sre' %}SREs{% when 'web3-engineer' %}Web3 engineers{% else %}Other roles{% endcase %}{% unless forloop.last %}; {% endunless %}{% endfor %}{% endcapture %}
    {% assign english_summary = book.summary.en %}
    {% if english_summary == '' %}{% if book.status == 'planned' %}{% assign english_summary = 'Planned book; details will be added when the scope is finalized.' %}{% else %}{% assign english_summary = 'English summary not yet available.' %}{% endif %}{% endif %}
    <tr data-en-book data-catalog-id="{{ book.id | escape }}" data-availability="{{ availability | strip | escape }}">
      <th scope="row">{{ display_title | escape }}</th>
      <td><code>{{ availability | strip }}</code></td>
      <td>{{ category_label | strip }}</td>
      <td>{{ level_labels | strip }} / {{ role_labels | strip }}</td>
      <td>{{ english_summary | escape }}</td>
      <td>
        {% if book.languages contains 'en' and book.englishPagesUrl %}{% if book.pagesUrl and book.pagesUrl != book.englishPagesUrl %}<a href="{{ book.pagesUrl | escape }}">JA</a> / {% endif %}<a href="{{ book.englishPagesUrl | escape }}">EN</a>{% elsif book.pagesUrl %}<a href="{{ book.pagesUrl | escape }}">Read</a>{% endif %}
        {% if book.repo and book.repoVisibility == 'public' %}{% if book.pagesUrl or book.englishPagesUrl %} / {% endif %}<a href="https://github.com/{{ book.repo | escape }}">Repository</a>{% elsif book.repoVisibility == 'private' %}{% if book.pagesUrl or book.englishPagesUrl %} / {% endif %}<span>Repository private</span>{% endif %}
        {% for related_id in book.relatedEditions %}{% assign related_book = catalog_books | where: 'id', related_id | first %}{% if related_book and related_book.pagesUrl %} / <a href="{{ related_book.pagesUrl | escape }}">Related: {{ related_book.officialEnglishTitle | default: related_book.title.en | escape }}</a>{% endif %}{% endfor %}
        {% if book.status == 'planned' or book.repoVisibility == 'not-created' %}<span>Not yet available</span>{% endif %}
      </td>
    </tr>
  {% endfor %}
  </tbody>
</table>
</div>

## License / commercial use

All books in this project are published under **CC BY-NC-SA 4.0** as the default license policy.
Commercial use is handled under a separate agreement with ITDO Inc.

- For the license scope in this repository: [LICENSE.md](https://github.com/itdojp/it-engineer-knowledge-architecture/blob/main/docs/LICENSE.md)
- For publishing policy notes: [license guideline](https://github.com/itdojp/it-engineer-knowledge-architecture/blob/main/docs/publishing/license-guideline.md)

## Contact

- Organization: ITDO Inc. (株式会社アイティードゥ)
- GitHub: [itdojp](https://github.com/itdojp)
- Contact: [knowledge@itdo.jp](mailto:knowledge@itdo.jp)
- Japanese main page: [IT Engineer Knowledge Architecture]({{ '/' | relative_url }})
