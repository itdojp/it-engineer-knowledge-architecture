# Sidebar TOC overlap investigation (2026-06-07)

## Scope

This note records the initial investigation for Issue #168: mobile / tablet portrait layouts where a fixed left Table of Contents (TOC) sidebar overlaps article content.

Issue #168 names `it-engineer-knowledge-architecture` as the initial investigation target and lists multiple potentially affected book repositories. The catalog site itself is a Jekyll landing site without a sidebar TOC, so the reader-facing overlap does **not** reproduce on `https://itdojp.github.io/it-engineer-knowledge-architecture/`. The defect does reproduce on several registered book sites that use the shared book layout.

## Reproduction matrix

Local Playwright probe, Chromium, 2026-06-07 JST. Widths are the issue-specified matrix; heights are fixed to realistic portrait / small-window values for measurement.

| Target | 480px | 768px | 820px | 1024px | Evidence |
| --- | --- | --- | --- | --- | --- |
| `formal-methods-book` chapter 1 | overlap | overlap | overlap | overlap | `#sidebar` fixed at x=0..280; `article.page-content` starts at x=16. |
| `categorical-software-design-book` chapter 1 | overlap | overlap | overlap | overlap | `#sidebar` fixed at x=0..280; `article.page-content` starts at x=16. |
| `BioinformaticsGuide-book` chapter introduction | overlap | overlap | overlap | overlap | `#sidebar` fixed at x=0..280; `article.page-content` starts at x=16. |
| `theoretical-computer-science-textbook` introduction | overlap | overlap | overlap | overlap | `#sidebar` fixed at x=0..280; `article.page-content` starts at x=16. |
| `it-engineer-knowledge-architecture` root | no sidebar | no sidebar | no sidebar | no sidebar | Catalog layout has no `#sidebar`. |

Representative baseline screenshot captured by the existing visual checker:

- `.codex-local/issue168-baseline/screenshots/formal-methods-book/chromium/tablet/chapters__chapter01.jpg`

The screenshot shows the left TOC drawer covering the chapter title and body text at tablet portrait width.

## Root cause

The affected book sites import `mobile-responsive.css` at the top of `main.css`:

```css
@import url('./mobile-responsive.css');
```

CSS `@import` rules are applied before the remaining declarations in the importing stylesheet. Therefore later declarations in `main.css`, especially:

```css
.book-sidebar {
  transform: translateX(0);
}
```

override the mobile/tablet closed-drawer rule in `mobile-responsive.css`:

```css
@media (max-width: 1024px) {
  .book-sidebar {
    transform: translateX(-100%);
  }
}
```

The main content correctly removes the desktop left margin at `<=1024px`, but the sidebar is not translated off-canvas. The result is a fixed 280px sidebar overlaying article content.

## Tooling change in this repository

`tools/pages-visual-check` now includes an explicit `sidebarContentOverlap` check:

- detects visible `#sidebar` / `.book-sidebar` elements;
- detects article/content candidates such as `article`, `.page-content`, `.book-content`, and `main`;
- reports a failure when a fixed/absolute/sticky sidebar geometrically overlaps the article content in the normal, closed-drawer page state;
- adds issue-relevant viewport aliases: `phone480`, `tablet820`, and `laptop1024` in addition to the existing `mobile`, `tablet`, and `desktop` viewports.

Useful command for the Issue #168 matrix:

```bash
cd tools/pages-visual-check
node run.mjs \
  --registry ../../docs/publishing/book-registry.json \
  --browsers chromium \
  --viewports phone480,tablet,tablet820,laptop1024,desktop \
  --onlyBooks formal-methods-book,categorical-software-design-book,BioinformaticsGuide-book,theoretical-computer-science-textbook \
  --maxPagesPerBook 2 \
  --captureSidebar \
  --enforceFontSpec
```

## Validation of the detector

- Positive control: the command above fails on the four affected book sites at `phone480`, `tablet`, `tablet820`, and `laptop1024`, reporting messages such as `sidebar/content overlap: aside#sidebar.book-sidebar covers article.page-content`.
- Negative control: the same four sites pass at the existing `desktop` viewport (`1280px`), so the check does not flag the intended desktop sidebar layout.
- Catalog control: `it-engineer-knowledge-architecture` has no sidebar TOC and did not reproduce the overlap in the standalone probe.

## Follow-up plan

The detector is a guardrail. The reader-facing fix must be applied in affected book repositories by ensuring the closed-drawer rule wins at `<=1024px`, for example by strengthening or moving the mobile/tablet sidebar transform rule while preserving the desktop layout.

Initial follow-up targets from Issue #168:

1. `itdojp/formal-methods-book`
2. `itdojp/categorical-software-design-book`
3. `itdojp/BioinformaticsGuide-book`
4. `itdojp/theoretical-computer-science-textbook`

After those four are fixed, run the detector against the full registry to identify and file additional follow-up issues for any other registered book sites that still fail.
