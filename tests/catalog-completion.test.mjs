import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findCatalogCompletionErrors
} from '../scripts/check-catalog-completion.mjs';
import {
  DEFAULT_CATALOG_PATH,
  loadCatalog
} from '../scripts/catalog-utils.mjs';

function book(overrides = {}) {
  return {
    id: 'fixture-book',
    status: 'published',
    languages: ['ja'],
    summary: { ja: '具体的な日本語概要', en: 'English summary' },
    reviewStatus: 'reviewed',
    lastReviewedAt: '2026-07-13',
    reviewIssue: 248,
    ...overrides
  };
}

test('canonical catalog satisfies the completion gate', () => {
  assert.deepEqual(findCatalogCompletionErrors(loadCatalog(DEFAULT_CATALOG_PATH)), []);
});

test('published Japanese books require a non-empty Japanese summary', () => {
  const errors = findCatalogCompletionErrors({
    books: [book({ summary: { ja: '  ', en: 'English summary' } })]
  });
  assert.match(errors.join('\n'), /published Japanese book must define summary\.ja/);
});

test('published English-only books may keep summary.ja empty', () => {
  const errors = findCatalogCompletionErrors({
    books: [book({ languages: ['en'], summary: { ja: '', en: 'English summary' } })]
  });
  assert.deepEqual(errors, []);
});

test('reviewed records require both review date and tracking Issue', () => {
  const errors = findCatalogCompletionErrors({
    books: [book({ lastReviewedAt: null, reviewIssue: null })]
  });
  assert.match(errors.join('\n'), /reviewStatus=reviewed requires lastReviewedAt/);
  assert.match(errors.join('\n'), /reviewStatus=reviewed requires reviewIssue/);
});

test('structured incomplete states may keep lastReviewedAt null', () => {
  const errors = findCatalogCompletionErrors({
    books: [
      book({ reviewStatus: 'review-needed', lastReviewedAt: null, reviewIssue: 222 }),
      book({ status: 'planned', reviewStatus: 'not-started', lastReviewedAt: null, reviewIssue: 245 })
    ]
  });
  assert.deepEqual(errors, []);
});
