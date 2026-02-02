#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const registryPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', 'docs', 'publishing', 'book-registry.json');

const allowedProfiles = new Set(['A', 'B', 'C']);
const allowedModules = [
  'quickStart',
  'readingGuide',
  'checklistPack',
  'troubleshootingFlow',
  'conceptMap',
  'figureIndex',
  'legalNotice',
  'glossary'
];

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(registryPath)) {
  fail(`book-registry が見つかりません: ${registryPath}`);
}

let registry;
try {
  registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
} catch (error) {
  fail(`JSON の解析に失敗しました: ${error.message}`);
}

if (!registry || typeof registry !== 'object') {
  fail('book-registry の形式が不正です');
}

const books = registry.books;
if (!books || typeof books !== 'object' || Array.isArray(books)) {
  fail('books はオブジェクト形式である必要があります');
}

const bookNames = Object.keys(books);
if (bookNames.length === 0) {
  fail('books が空です');
}

let errorCount = 0;
for (const name of bookNames) {
  const entry = books[name];
  if (!entry || typeof entry !== 'object') {
    console.error(`❌ ${name}: entry が不正です`);
    errorCount++;
    continue;
  }
  if (!allowedProfiles.has(entry.profile)) {
    console.error(`❌ ${name}: profile が不正です (${entry.profile})`);
    errorCount++;
  }
  if (!entry.modules || typeof entry.modules !== 'object') {
    console.error(`❌ ${name}: modules が不正です`);
    errorCount++;
    continue;
  }
  for (const key of Object.keys(entry.modules)) {
    if (!allowedModules.includes(key)) {
      console.error(`❌ ${name}: modules に未定義キーがあります (${key})`);
      errorCount++;
    }
    if (typeof entry.modules[key] !== 'boolean') {
      console.error(`❌ ${name}: modules.${key} は boolean である必要があります`);
      errorCount++;
    }
  }
  for (const key of allowedModules) {
    if (!(key in entry.modules)) {
      console.error(`❌ ${name}: modules.${key} が欠落しています`);
      errorCount++;
    }
  }
}

if (errorCount > 0) {
  fail(`バリデーション失敗: ${errorCount} 件`);
}

console.log(`✅ book-registry OK (${bookNames.length} books)`);
