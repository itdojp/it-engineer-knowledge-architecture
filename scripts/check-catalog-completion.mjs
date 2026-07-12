#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import {
  DEFAULT_CATALOG_PATH,
  loadCatalog,
  validateCatalog
} from './catalog-utils.mjs';

export function findCatalogCompletionErrors(catalog) {
  const errors = [];

  for (const [index, book] of (catalog.books || []).entries()) {
    const prefix = `books[${index}](${book.id || 'unknown'})`;
    const isPublishedJapaneseBook = book.status === 'published' && (book.languages || []).includes('ja');

    if (isPublishedJapaneseBook && !book.summary?.ja?.trim()) {
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
  return [...validateCatalog(catalog), ...findCatalogCompletionErrors(catalog)];
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
