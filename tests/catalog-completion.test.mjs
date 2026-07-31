import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkCatalogCompletion,
  findCatalogCompletionErrors
} from '../scripts/check-catalog-completion.mjs';
import {
  DEFAULT_CATALOG_PATH,
  loadCatalog
} from '../scripts/catalog-utils.mjs';
import {
  DEFAULT_YOUTUBE_PATH,
  loadYoutubeData,
  validateYoutubeData
} from '../scripts/youtube-utils.mjs';

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

test('schema errors short-circuit completion checks without throwing', () => {
  const malformedSummary = structuredClone(loadCatalog(DEFAULT_CATALOG_PATH));
  malformedSummary.books[0].summary.ja = 42;
  assert.match(checkCatalogCompletion(malformedSummary).join('\n'), /summary\.ja must be a string/);

  const malformedBooks = structuredClone(loadCatalog(DEFAULT_CATALOG_PATH));
  malformedBooks.books = {};
  assert.match(checkCatalogCompletion(malformedBooks).join('\n'), /books must be an array/);
});

test('YouTube data covers every published book and intentionally accepts 13-character playlist IDs', () => {
  const youtube = loadYoutubeData(DEFAULT_YOUTUBE_PATH);
  assert.equal(youtube.meta.playlists.ja.id.length, 13);
  assert.equal(youtube.meta.playlists.en.id.length, 13);
  assert.deepEqual(validateYoutubeData(loadCatalog(DEFAULT_CATALOG_PATH), youtube), []);
});

test('YouTube data rejects missing published coverage and stale planned-book exclusions', () => {
  const catalog = loadCatalog(DEFAULT_CATALOG_PATH);
  const youtube = structuredClone(loadYoutubeData(DEFAULT_YOUTUBE_PATH));
  youtube.books.pop();
  youtube.meta.booksWithVideo -= 1;
  youtube.meta.playlists.ja.itemCount -= 1;
  youtube.meta.playlists.en.itemCount -= 1;
  youtube.meta.booksWithoutVideo[0].title_ja = 'stale title';
  const errors = validateYoutubeData(catalog, youtube).join('\n');
  assert.match(errors, /cover every published catalog book exactly once/);
  assert.match(errors, /booksWithoutVideo must match planned catalog books/);
});

test('YouTube data rejects duplicate videos, duplicate positions, and URL mismatches', () => {
  const catalog = loadCatalog(DEFAULT_CATALOG_PATH);
  const youtube = structuredClone(loadYoutubeData(DEFAULT_YOUTUBE_PATH));
  youtube.books[1].playlist_position = youtube.books[0].playlist_position;
  youtube.books[1].video_ja_id = youtube.books[0].video_ja_id;
  youtube.books[1].video_ja_url = 'https://youtu.be/not-the-video';
  const errors = validateYoutubeData(catalog, youtube).join('\n');
  assert.match(errors, /playlist_position contains duplicate value/);
  assert.match(errors, /YouTube video IDs contains duplicate value/);
  assert.match(errors, /video_ja_url must match video_ja_id/);
});

test('YouTube data rejects catalog metadata drift', () => {
  const catalog = loadCatalog(DEFAULT_CATALOG_PATH);
  const youtube = structuredClone(loadYoutubeData(DEFAULT_YOUTUBE_PATH));
  youtube.books[0].title_ja = 'outdated title';
  youtube.books[0].pages_url = 'https://example.com/';
  const errors = validateYoutubeData(catalog, youtube).join('\n');
  assert.match(errors, /title_ja must match catalog value/);
  assert.match(errors, /pages_url must match catalog value/);
});
