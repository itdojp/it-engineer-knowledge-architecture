import path from 'node:path';

import { ROOT, readJson } from './catalog-utils.mjs';

export const DEFAULT_YOUTUBE_PATH = path.join(ROOT, 'docs', '_data', 'youtube.json');

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const videoIdRe = /^[A-Za-z0-9_-]{11}$/;
const playlistIdRe = /^[A-Za-z0-9_-]{13,80}$/;
const channelIdRe = /^UC[A-Za-z0-9_-]{22}$/;

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function addDuplicateErrors(errors, values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) errors.push(`${label} contains duplicate value: ${value}`);
    seen.add(value);
  }
}

function validateVideo(errors, value, label) {
  if (!isObject(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  if (typeof value.videoId !== 'string' || !videoIdRe.test(value.videoId)) {
    errors.push(`${label}.videoId must be an 11-character YouTube video ID`);
  }
  if (value.url !== `https://youtu.be/${value.videoId}`) {
    errors.push(`${label}.url must match videoId`);
  }
  if (!Number.isInteger(value.durationSec) || value.durationSec < 1) {
    errors.push(`${label}.durationSec must be a positive integer`);
  }
}

function validatePlaylist(errors, value, label, expectedItemCount) {
  if (!isObject(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  if (typeof value.id !== 'string' || !playlistIdRe.test(value.id)) {
    errors.push(`${label}.id must be a valid YouTube playlist ID`);
  }
  if (typeof value.title !== 'string' || value.title.trim() === '') {
    errors.push(`${label}.title must be a non-empty string`);
  }
  if (value.url !== `https://www.youtube.com/playlist?list=${value.id}`) {
    errors.push(`${label}.url must match playlist id`);
  }
  if (value.itemCount !== expectedItemCount) {
    errors.push(`${label}.itemCount must be ${expectedItemCount}, got ${value.itemCount}`);
  }
}

function validateBookVideo(errors, value, index, catalogBook) {
  const prefix = `books[${index}](${value?.book_id || 'unknown'})`;
  if (!isObject(value)) {
    errors.push(`books[${index}] must be an object`);
    return [];
  }
  if (!catalogBook) {
    errors.push(`${prefix}: book_id is not present in the catalog`);
    return [value.video_ja_id, value.video_en_id].filter(Boolean);
  }

  const expectedFields = {
    catalog_display_order: catalogBook.displayOrder,
    title_ja: catalogBook.title?.ja,
    title_en: catalogBook.title?.en,
    status: catalogBook.status,
    counting_group: catalogBook.countingGroup,
    pages_url: catalogBook.pagesUrl
  };
  for (const [field, expected] of Object.entries(expectedFields)) {
    if (value[field] !== expected) {
      errors.push(`${prefix}.${field} must match catalog value ${JSON.stringify(expected)}`);
    }
  }
  if (catalogBook.status !== 'published') {
    errors.push(`${prefix}: only published books may define introduction videos`);
  }
  if (!Number.isInteger(value.playlist_position) || value.playlist_position < 1) {
    errors.push(`${prefix}.playlist_position must be a positive integer`);
  }
  for (const language of ['ja', 'en']) {
    const idField = `video_${language}_id`;
    const urlField = `video_${language}_url`;
    if (typeof value[idField] !== 'string' || !videoIdRe.test(value[idField])) {
      errors.push(`${prefix}.${idField} must be an 11-character YouTube video ID`);
    }
    if (value[urlField] !== `https://youtu.be/${value[idField]}`) {
      errors.push(`${prefix}.${urlField} must match ${idField}`);
    }
  }
  return [value.video_ja_id, value.video_en_id].filter(Boolean);
}

export function loadYoutubeData(filePath = DEFAULT_YOUTUBE_PATH) {
  return readJson(filePath);
}

export function validateYoutubeData(catalog, youtube) {
  const errors = [];
  if (!isObject(youtube)) return ['YouTube data root must be an object'];
  if (!isObject(youtube.meta)) errors.push('meta must be an object');
  if (!Array.isArray(youtube.books)) errors.push('books must be an array');
  if (errors.length > 0) return errors;

  const meta = youtube.meta;
  const videoBooks = youtube.books;
  const catalogBooks = Array.isArray(catalog?.books) ? catalog.books : [];
  const catalogById = new Map(catalogBooks.map((book) => [book.id, book]));
  const publishedBooks = catalogBooks
    .filter((book) => book.status === 'published')
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const plannedBooks = catalogBooks
    .filter((book) => book.status === 'planned')
    .sort((left, right) => left.displayOrder - right.displayOrder);

  if (typeof meta.generatedAt !== 'string' || !dateRe.test(meta.generatedAt)) {
    errors.push('meta.generatedAt must be YYYY-MM-DD');
  }
  if (!isObject(meta.channel)) {
    errors.push('meta.channel must be an object');
  } else {
    if (typeof meta.channel.id !== 'string' || !channelIdRe.test(meta.channel.id)) {
      errors.push('meta.channel.id must be a YouTube channel ID');
    }
    if (typeof meta.channel.handle !== 'string' || !/^@[A-Za-z0-9_.-]+$/.test(meta.channel.handle)) {
      errors.push('meta.channel.handle must start with @');
    }
    if (meta.channel.url !== `https://www.youtube.com/${meta.channel.handle}`) {
      errors.push('meta.channel.url must match channel handle');
    }
  }
  if (typeof meta.catalogSource !== 'string' || !/^docs\/_data\/catalog\.json @ origin\/main [0-9a-f]{7,40}$/.test(meta.catalogSource)) {
    errors.push('meta.catalogSource must identify the catalog path and source revision');
  }
  if (meta.booksWithVideo !== videoBooks.length) {
    errors.push(`meta.booksWithVideo must equal books length ${videoBooks.length}`);
  }

  const expectedPlaylistItems = videoBooks.length + 1;
  const playlistIds = [];
  for (const language of ['ja', 'en']) {
    validatePlaylist(errors, meta.playlists?.[language], `meta.playlists.${language}`, expectedPlaylistItems);
    if (meta.playlists?.[language]?.id) playlistIds.push(meta.playlists[language].id);
    validateVideo(errors, meta.seriesOverview?.[language], `meta.seriesOverview.${language}`);
  }
  addDuplicateErrors(errors, playlistIds, 'meta.playlists IDs');

  const mappedBookIds = videoBooks.map((book) => book?.book_id).filter(Boolean);
  addDuplicateErrors(errors, mappedBookIds, 'books.book_id');
  const playlistPositions = videoBooks.map((book) => book?.playlist_position).filter(Number.isInteger);
  addDuplicateErrors(errors, playlistPositions, 'books.playlist_position');
  const expectedPositions = Array.from({ length: videoBooks.length }, (_, index) => index + 1);
  if (JSON.stringify([...playlistPositions].sort((a, b) => a - b)) !== JSON.stringify(expectedPositions)) {
    errors.push(`books.playlist_position must contain every position from 1 to ${videoBooks.length}`);
  }

  const videoIds = [meta.seriesOverview?.ja?.videoId, meta.seriesOverview?.en?.videoId].filter(Boolean);
  for (const [index, value] of videoBooks.entries()) {
    videoIds.push(...validateBookVideo(errors, value, index, catalogById.get(value?.book_id)));
  }
  addDuplicateErrors(errors, videoIds, 'YouTube video IDs');

  const expectedPublishedIds = publishedBooks.map((book) => book.id);
  if (JSON.stringify(mappedBookIds) !== JSON.stringify(expectedPublishedIds)) {
    errors.push('books must cover every published catalog book exactly once in displayOrder');
  }

  const withoutVideo = Array.isArray(meta.booksWithoutVideo) ? meta.booksWithoutVideo : [];
  if (!Array.isArray(meta.booksWithoutVideo)) errors.push('meta.booksWithoutVideo must be an array');
  const actualWithoutVideo = withoutVideo.map((book) => ({
    id: book?.id,
    title_ja: book?.title_ja,
    status: book?.status
  }));
  const expectedWithoutVideo = plannedBooks.map((book) => ({
    id: book.id,
    title_ja: book.title?.ja,
    status: book.status
  }));
  if (JSON.stringify(actualWithoutVideo) !== JSON.stringify(expectedWithoutVideo)) {
    errors.push('meta.booksWithoutVideo must match planned catalog books in displayOrder');
  }

  return errors;
}
