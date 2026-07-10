#!/usr/bin/env node
import { loadCatalog, validateCatalog, DEFAULT_CATALOG_PATH } from './catalog-utils.mjs';

const catalogPath = process.argv[2] || DEFAULT_CATALOG_PATH;
const catalog = loadCatalog(catalogPath);
const errors = validateCatalog(catalog);
if (errors.length > 0) {
  for (const error of errors) console.error(`❌ ${error}`);
  process.exit(1);
}
console.log(`✅ catalog OK (${catalog.books.length} records, ${catalog.learningPaths.length} learning paths)`);
