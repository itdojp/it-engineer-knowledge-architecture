#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import {
  DEFAULT_CATALOG_PATH,
  loadCatalog,
  validateCatalog
} from './catalog-utils.mjs';

export function findCatalogCompletionErrors(catalog) {
  const errors = [];
  const books = Array.isArray(catalog?.books) ? catalog.books : [];

  for (const [index, book] of books.entries()) {
    if (!book || typeof book !== 'object' || Array.isArray(book)) continue;
    const prefix = `books[${index}](${book.id || 'unknown'})`;
    const languages = Array.isArray(book.languages) ? book.languages : [];
    const isPublishedJapaneseBook = book.status === 'published' && languages.includes('ja');

    if (isPublishedJapaneseBook && (typeof book.summary?.ja !== 'string' || !book.summary.ja.trim())) {
      errors.push(`${prefix}: published Japanese book must define summary.ja`);
    }

    if (book.reviewStatus === 'reviewed') {
      if (!book.lastReviewedAt) {
        errors.push(`${prefix}: reviewStatus=reviewed requires lastReviewedAt`);
      }
      if (!Number.isInteger(book.reviewIssue) || book.reviewIssue < 1) {
        errors.push(`${prefix}: reviewStatus=reviewed requires reviewIssue`);
      }
    }
  }

  return errors;
}

export function checkCatalogCompletion(catalog) {
  const validationErrors = validateCatalog(catalog);
  if (validationErrors.length > 0) return validationErrors;
  return findCatalogCompletionErrors(catalog);
}

function main() {
  const catalogPath = process.argv[2] || DEFAULT_CATALOG_PATH;
  const errors = checkCatalogCompletion(loadCatalog(catalogPath));
  if (errors.length > 0) {
    console.error('❌ catalog completion gate failed');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('✅ catalog completion gate OK');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
