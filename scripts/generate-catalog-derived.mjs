#!/usr/bin/env node
import fs from 'node:fs';
import { DEFAULT_CATALOG_PATH, DEFAULT_REGISTRY_PATH, legacyRegistryFromCatalog, loadCatalog, writeJson } from './catalog-utils.mjs';

const check = process.argv.includes('--check');
const catalog = loadCatalog(DEFAULT_CATALOG_PATH);
const registry = legacyRegistryFromCatalog(catalog);
const rendered = `${JSON.stringify(registry, null, 2)}\n`;
if (check) {
  const current = fs.existsSync(DEFAULT_REGISTRY_PATH) ? fs.readFileSync(DEFAULT_REGISTRY_PATH, 'utf8') : '';
  if (current !== rendered) {
    console.error(`❌ generated file is out of sync: ${DEFAULT_REGISTRY_PATH}`);
    process.exit(1);
  }
  console.log('✅ generated catalog-derived files are in sync');
} else {
  writeJson(DEFAULT_REGISTRY_PATH, registry);
  console.log(`✅ wrote ${DEFAULT_REGISTRY_PATH}`);
}
