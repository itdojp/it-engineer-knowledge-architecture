#!/usr/bin/env node
import { loadCatalog, prerequisiteCycles, learningPathCycles, DEFAULT_CATALOG_PATH } from './catalog-utils.mjs';

const catalogPath = process.argv[2] || DEFAULT_CATALOG_PATH;
const catalog = loadCatalog(catalogPath);
const cycles = [
  ...prerequisiteCycles(catalog).map((cycle) => `book prerequisites: ${cycle.join(' -> ')}`),
  ...learningPathCycles(catalog).map((cycle) => `learning paths: ${cycle.join(' -> ')}`)
];
if (cycles.length > 0) {
  for (const cycle of cycles) console.error(`❌ cycle detected: ${cycle}`);
  process.exit(1);
}
console.log('✅ learning graph OK (no prerequisite/path cycles)');
