#!/usr/bin/env node
import path from 'node:path';

import { loadCatalog, validateCatalog, DEFAULT_CATALOG_PATH } from './catalog-utils.mjs';
import { loadYoutubeData, validateYoutubeData } from './youtube-utils.mjs';

const catalogPath = process.argv[2] || DEFAULT_CATALOG_PATH;
const catalog = loadCatalog(catalogPath);
const errors = validateCatalog(catalog);
if (path.resolve(catalogPath) === path.resolve(DEFAULT_CATALOG_PATH) && errors.length === 0) {
  errors.push(...validateYoutubeData(catalog, loadYoutubeData()));
}
if (errors.length > 0) {
  for (const error of errors) console.error(`❌ ${error}`);
  process.exit(1);
}
console.log(`✅ catalog OK (${catalog.books.length} records, ${catalog.learningPaths.length} learning paths; YouTube data aligned)`);
