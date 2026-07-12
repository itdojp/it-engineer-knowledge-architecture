import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_CATALOG_PATH = path.join(ROOT, 'docs', '_data', 'catalog.json');
export const DEFAULT_REGISTRY_PATH = path.join(ROOT, 'docs', 'publishing', 'book-registry.json');

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function loadCatalog(filePath = DEFAULT_CATALOG_PATH) {
  return readJson(filePath);
}

export function accessNoteFor({ repoVisibility, publicationScope }) {
  if (repoVisibility !== 'private') return null;
  if (publicationScope === 'free-preview') {
    return '有料部分を含むため管理リポジトリは非公開です。公開サイトでは無料試読範囲を読めます。';
  }
  if (publicationScope === 'full-public') {
    return '管理リポジトリは非公開ですが、公開サイトでは全文を読めます。';
  }
  return null;
}

const allowedProfiles = new Set(['A', 'B', 'C', null]);
const allowedBookStatus = new Set(['published', 'planned', 'archived']);
const allowedRepoVisibility = new Set(['public', 'private', 'not-created']);
const allowedPublicationScope = new Set(['full-public', 'free-preview', 'planned']);
const allowedCountingGroup = new Set(['main-lineup', 'planned', 'related-independent', 'archive']);
const allowedReviewStatus = new Set(['reviewed', 'review-needed', 'not-started', 'unknown']);
const allowedLanguages = new Set(['ja', 'en']);
const requiredBookFields = [
  'id', 'displayOrder', 'title', 'officialEnglishTitle', 'status', 'repo', 'repoVisibility',
  'pagesUrl', 'englishPagesUrl', 'publicationScope', 'countingGroup', 'countedInMainLineup', 'category',
  'subcategory', 'tags', 'levels', 'roles', 'audiences', 'summary', 'prerequisites',
  'estimatedWeeks', 'recommendedAfter', 'languages', 'relatedEditions', 'reviewStatus',
  'lastReviewedAt', 'reviewIssue', 'ux', 'addedAt', 'updatedAt', 'notes', 'sourceRefs'
];
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const repoRe = /^itdojp\/[A-Za-z0-9_.-]+$/;
const pagesRe = /^https:\/\/itdojp\.github\.io\/[A-Za-z0-9_.-]+\/$/;
const englishPagesRe = /^https:\/\/itdojp\.github\.io\/[A-Za-z0-9_.-]+\/(?:[A-Za-z0-9_.-]+\/)*$/;
const idRe = /^[A-Za-z0-9_.-]+$/;

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function requireArray(errors, value, label) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return [];
  }
  return value;
}

function requireStringArray(errors, value, label, { minItems = 0 } = {}) {
  const items = requireArray(errors, value, label);
  if (items.length < minItems) errors.push(`${label} must contain at least ${minItems} item(s)`);
  for (const [index, item] of items.entries()) {
    if (typeof item !== 'string') errors.push(`${label}[${index}] must be a string`);
  }
  return items;
}

function requireString(errors, value, label, { allowEmpty = true } = {}) {
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0)) {
    errors.push(`${label} must be a string`);
  }
}

export function validateCatalog(catalog) {
  const errors = [];
  if (!isObject(catalog)) {
    return ['catalog root must be an object'];
  }
  for (const key of ['schemaVersion', 'updatedAt', 'sourcePolicy', 'expectedCounts', 'moduleCatalog', 'books', 'learningPaths']) {
    if (!(key in catalog)) errors.push(`missing root field: ${key}`);
  }
  requireString(errors, catalog.schemaVersion, 'schemaVersion', { allowEmpty: false });
  if (typeof catalog.updatedAt !== 'string' || !dateRe.test(catalog.updatedAt)) {
    errors.push('updatedAt must be YYYY-MM-DD');
  }
  if (!isObject(catalog.sourcePolicy) || catalog.sourcePolicy.canonical !== 'docs/_data/catalog.json') {
    errors.push('sourcePolicy.canonical must be docs/_data/catalog.json');
  } else {
    requireStringArray(errors, catalog.sourcePolicy.derivedFiles, 'sourcePolicy.derivedFiles');
    requireStringArray(errors, catalog.sourcePolicy.externalDynamicFields, 'sourcePolicy.externalDynamicFields');
    requireString(errors, catalog.sourcePolicy.notes, 'sourcePolicy.notes', { allowEmpty: false });
  }
  const moduleCatalog = requireStringArray(errors, catalog.moduleCatalog, 'moduleCatalog');
  const moduleSet = new Set(moduleCatalog);
  if (moduleSet.size !== moduleCatalog.length) errors.push('moduleCatalog contains duplicate values');

  const books = requireArray(errors, catalog.books, 'books');
  const seenIds = new Map();
  const seenRepos = new Map();
  const seenPages = new Map();
  for (const [index, book] of books.entries()) {
    const prefix = `books[${index}]`;
    if (!isObject(book)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    for (const field of requiredBookFields) {
      if (!(field in book)) errors.push(`${prefix}.${field} is required`);
    }
    if (typeof book.id !== 'string' || !idRe.test(book.id)) errors.push(`${prefix}.id is invalid`);
    if (seenIds.has(book.id)) errors.push(`duplicate book id: ${book.id}`);
    seenIds.set(book.id, prefix);
    if (typeof book.displayOrder !== 'number') errors.push(`${prefix}.displayOrder must be a number`);
    if (!isObject(book.title)) {
      errors.push(`${prefix}.title must be an object`);
    } else {
      requireString(errors, book.title.ja, `${prefix}.title.ja`, { allowEmpty: false });
      requireString(errors, book.title.en, `${prefix}.title.en`, { allowEmpty: false });
    }
    if (book.officialEnglishTitle !== null && typeof book.officialEnglishTitle !== 'string') {
      errors.push(`${prefix}.officialEnglishTitle must be string or null`);
    }
    if (!allowedBookStatus.has(book.status)) errors.push(`${prefix}.status has invalid value: ${book.status}`);
    if (book.repo !== null) {
      if (typeof book.repo !== 'string' || !repoRe.test(book.repo)) errors.push(`${prefix}.repo is invalid`);
      if (seenRepos.has(book.repo)) errors.push(`duplicate repo: ${book.repo}`);
      seenRepos.set(book.repo, prefix);
    }
    if (!allowedRepoVisibility.has(book.repoVisibility)) errors.push(`${prefix}.repoVisibility invalid: ${book.repoVisibility}`);
    if (book.pagesUrl !== null) {
      if (typeof book.pagesUrl !== 'string' || !pagesRe.test(book.pagesUrl)) errors.push(`${prefix}.pagesUrl is invalid`);
      if (seenPages.has(book.pagesUrl)) errors.push(`duplicate pagesUrl: ${book.pagesUrl}`);
      seenPages.set(book.pagesUrl, prefix);
    }
    if (book.englishPagesUrl !== null && (typeof book.englishPagesUrl !== 'string' || !englishPagesRe.test(book.englishPagesUrl))) {
      errors.push(`${prefix}.englishPagesUrl is invalid`);
    }
    if (book.status !== 'planned' && (book.languages || []).includes('en') && !book.englishPagesUrl) {
      errors.push(`${prefix}: English-language book must define englishPagesUrl`);
    }
    if (book.englishPagesUrl && !(book.languages || []).includes('en')) {
      errors.push(`${prefix}: englishPagesUrl requires languages to include en`);
    }
    if (!allowedPublicationScope.has(book.publicationScope)) errors.push(`${prefix}.publicationScope invalid: ${book.publicationScope}`);
    if (!allowedCountingGroup.has(book.countingGroup)) errors.push(`${prefix}.countingGroup invalid: ${book.countingGroup}`);
    if (typeof book.countedInMainLineup !== 'boolean') errors.push(`${prefix}.countedInMainLineup must be boolean`);
    for (const field of ['tags', 'levels', 'roles', 'audiences', 'prerequisites', 'recommendedAfter', 'relatedEditions', 'notes']) {
      requireStringArray(errors, book[field], `${prefix}.${field}`);
    }
    requireStringArray(errors, book.languages, `${prefix}.languages`, { minItems: 1 });
    requireStringArray(errors, book.sourceRefs, `${prefix}.sourceRefs`, { minItems: 1 });
    for (const lang of book.languages || []) {
      if (!allowedLanguages.has(lang)) errors.push(`${prefix}.languages has invalid value: ${lang}`);
    }
    if (!isObject(book.summary)) {
      errors.push(`${prefix}.summary must be an object`);
    } else {
      requireString(errors, book.summary.ja, `${prefix}.summary.ja`);
      requireString(errors, book.summary.en, `${prefix}.summary.en`);
    }
    if (!allowedReviewStatus.has(book.reviewStatus)) errors.push(`${prefix}.reviewStatus invalid: ${book.reviewStatus}`);
    for (const field of ['lastReviewedAt', 'addedAt', 'updatedAt']) {
      if (book[field] !== null && (typeof book[field] !== 'string' || !dateRe.test(book[field]))) {
        errors.push(`${prefix}.${field} must be YYYY-MM-DD or null`);
      }
    }
    if (book.reviewIssue !== null && (!Number.isInteger(book.reviewIssue) || book.reviewIssue < 1)) {
      errors.push(`${prefix}.reviewIssue must be positive integer or null`);
    }
    if (!isObject(book.ux)) {
      errors.push(`${prefix}.ux must be an object`);
    } else {
      if (!allowedProfiles.has(book.ux.profile)) errors.push(`${prefix}.ux.profile invalid: ${book.ux.profile}`);
      if (!isObject(book.ux.modules)) {
        errors.push(`${prefix}.ux.modules must be an object`);
      } else {
        for (const [moduleName, enabled] of Object.entries(book.ux.modules)) {
          if (!moduleSet.has(moduleName)) errors.push(`${prefix}.ux.modules has unknown module: ${moduleName}`);
          if (typeof enabled !== 'boolean') errors.push(`${prefix}.ux.modules.${moduleName} must be boolean`);
        }
      }
    }
    if (book.status === 'planned') {
      if (book.repoVisibility !== 'not-created') errors.push(`${prefix}: planned book must use repoVisibility=not-created`);
      if (book.pagesUrl !== null) errors.push(`${prefix}: planned book must not define pagesUrl`);
      if (book.englishPagesUrl !== null) errors.push(`${prefix}: planned book must not define englishPagesUrl`);
      if (book.publicationScope !== 'planned') errors.push(`${prefix}: planned book must use publicationScope=planned`);
    }
    if (book.status === 'published') {
      if (!book.repo) errors.push(`${prefix}: published book must define repo`);
      if (!book.pagesUrl) errors.push(`${prefix}: published book must define pagesUrl`);
      if (book.repoVisibility === 'not-created') errors.push(`${prefix}: published book cannot use repoVisibility=not-created`);
      if (!['full-public', 'free-preview'].includes(book.publicationScope)) {
        errors.push(`${prefix}: published book must use publicationScope=full-public or free-preview`);
      }
    }
    if (book.countedInMainLineup && book.countingGroup !== 'main-lineup') {
      errors.push(`${prefix}: countedInMainLineup=true requires countingGroup=main-lineup`);
    }
  }

  const idSet = new Set(books.map((book) => book?.id).filter(Boolean));
  for (const book of books) {
    if (!book || !book.id) continue;
    for (const field of ['prerequisites', 'recommendedAfter', 'relatedEditions']) {
      for (const targetId of book[field] || []) {
        if (!idSet.has(targetId)) errors.push(`${book.id}.${field} references unknown book id: ${targetId}`);
      }
    }
  }

  const expected = catalog.expectedCounts || {};
  const actualMain = books.filter((book) => book.countingGroup === 'main-lineup' && book.countedInMainLineup).length;
  const actualPlanned = books.filter((book) => book.countingGroup === 'planned').length;
  const actualRelated = books.filter((book) => book.countingGroup === 'related-independent').length;
  if (expected.mainLineup !== actualMain) errors.push(`mainLineup count mismatch: expected ${expected.mainLineup}, got ${actualMain}`);
  if (expected.planned !== actualPlanned) errors.push(`planned count mismatch: expected ${expected.planned}, got ${actualPlanned}`);
  if (expected.relatedIndependent !== actualRelated) errors.push(`relatedIndependent count mismatch: expected ${expected.relatedIndependent}, got ${actualRelated}`);

  const learningPaths = requireArray(errors, catalog.learningPaths, 'learningPaths');
  const pathIds = new Set();
  for (const [index, learningPath] of learningPaths.entries()) {
    const prefix = `learningPaths[${index}]`;
    if (!isObject(learningPath)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    if (pathIds.has(learningPath.id)) errors.push(`duplicate learning path id: ${learningPath.id}`);
    pathIds.add(learningPath.id);
    requireStringArray(errors, learningPath.bookIds, `${prefix}.bookIds`, { minItems: 1 });
    requireStringArray(errors, learningPath.nextPathIds, `${prefix}.nextPathIds`);
    for (const bookId of learningPath.bookIds || []) {
      if (!idSet.has(bookId)) errors.push(`${prefix}.bookIds references unknown book id: ${bookId}`);
    }
  }
  for (const [index, learningPath] of learningPaths.entries()) {
    for (const nextId of learningPath.nextPathIds || []) {
      if (!pathIds.has(nextId)) errors.push(`learningPaths[${index}].nextPathIds references unknown path id: ${nextId}`);
    }
  }
  return errors;
}

export function prerequisiteCycles(catalog) {
  const books = catalog.books || [];
  const graph = new Map(books.map((book) => [book.id, book.prerequisites || []]));
  const visiting = new Set();
  const visited = new Set();
  const cycles = [];
  const stack = [];

  function visit(id) {
    if (visiting.has(id)) {
      const start = stack.indexOf(id);
      cycles.push([...stack.slice(start), id]);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    stack.push(id);
    for (const next of graph.get(id) || []) {
      if (graph.has(next)) visit(next);
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of graph.keys()) visit(id);
  return cycles;
}

export function learningPathCycles(catalog) {
  const paths = catalog.learningPaths || [];
  const graph = new Map(paths.map((item) => [item.id, item.nextPathIds || []]));
  const visiting = new Set();
  const visited = new Set();
  const cycles = [];
  const stack = [];

  function visit(id) {
    if (visiting.has(id)) {
      const start = stack.indexOf(id);
      cycles.push([...stack.slice(start), id]);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    stack.push(id);
    for (const next of graph.get(id) || []) {
      if (graph.has(next)) visit(next);
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of graph.keys()) visit(id);
  return cycles;
}

export function legacyRegistryFromCatalog(catalog) {
  const books = {};
  for (const book of [...catalog.books].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    if (book.status !== 'published') continue;
    if (book.countingGroup !== 'main-lineup') continue;
    if (!book.repo || !book.pagesUrl) continue;
    const legacyNotes = (book.notes || []).filter(
      (note) => !note.includes('日本語個別概要') && !note.includes('UX profile/modules')
    );
    books[book.id] = {
      repo: book.repo,
      pages: book.pagesUrl,
      profile: book.ux.profile,
      modules: book.ux.modules,
      notes: legacyNotes.join(' / ') || 'catalog generated'
    };
    if (book.repoVisibility !== 'public') books[book.id].repoVisibility = book.repoVisibility;
    if (book.publicationScope === 'free-preview') {
      books[book.id].publicationModel = 'free-preview-and-paid-edition';
      books[book.id].pagesPublicationScope = 'free-preview-aligned-with-zenn-free-scope';
    }
    if (book.repoVisibility === 'private') {
      books[book.id].accessNote = accessNoteFor(book);
    }
  }
  return {
    schemaVersion: '1.0.0',
    updatedAt: catalog.updatedAt,
    generatedFrom: 'docs/_data/catalog.json',
    modulesCatalog: catalog.moduleCatalog,
    books
  };
}
