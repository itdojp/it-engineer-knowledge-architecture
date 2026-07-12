#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT, legacyRegistryFromCatalog, readJson, validateCatalog } from './catalog-utils.mjs';

const cases = [
  { file: 'tests/fixtures/catalog-valid.json', valid: true, script: 'scripts/validate-catalog.mjs' },
  {
    file: 'tests/fixtures/catalog-invalid-duplicate-id.json',
    valid: false,
    script: 'scripts/validate-catalog.mjs',
    mustContain: 'duplicate book id'
  },
  {
    file: 'tests/fixtures/catalog-invalid-missing-prereq.json',
    valid: false,
    script: 'scripts/validate-catalog.mjs',
    mustContain: 'references unknown book id'
  },
  {
    file: 'tests/fixtures/catalog-invalid-cycle.json',
    valid: false,
    script: 'scripts/validate-learning-graph.mjs',
    mustContain: 'cycle detected'
  },
  {
    file: 'tests/fixtures/catalog-invalid-published-planned-scope.json',
    valid: false,
    script: 'scripts/validate-catalog.mjs',
    mustContain: 'published book must use publicationScope=full-public or free-preview'
  }


];

let failed = 0;
for (const testCase of cases) {
  const result = spawnSync(process.execPath, [path.join(ROOT, testCase.script), path.join(ROOT, testCase.file)], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  const output = [result.stdout || '', result.stderr || ''].join('\n');
  const statusPassed = testCase.valid ? result.status === 0 : result.status !== 0;
  const outputPassed = !testCase.mustContain || output.includes(testCase.mustContain);
  const passed = statusPassed && outputPassed;
  if (!passed) {
    failed++;
    console.error(`❌ fixture expectation failed: ${testCase.file}`);
    console.error(result.stdout);
    console.error(result.stderr);
  } else {
    console.log(`✅ fixture ${testCase.valid ? 'valid' : 'invalid'} as expected: ${testCase.file}`);
  }
}


const validCatalog = readJson(path.join(ROOT, 'tests/fixtures/catalog-valid.json'));
const englishUrlCases = [
  {
    name: 'English language without englishPagesUrl',
    mutate: (book) => { book.languages = ['ja', 'en']; book.englishPagesUrl = null; },
    mustContain: 'English-language book must define englishPagesUrl'
  },
  {
    name: 'englishPagesUrl without English language',
    mutate: (book) => { book.languages = ['ja']; book.englishPagesUrl = 'https://itdojp.github.io/book-one/en/'; },
    mustContain: 'englishPagesUrl requires languages to include en'
  },
  {
    name: 'englishPagesUrl on an invalid host',
    mutate: (book) => { book.languages = ['ja', 'en']; book.englishPagesUrl = 'https://example.com/book-one/en/'; },
    mustContain: 'englishPagesUrl is invalid'
  },
  {
    name: 'planned book with englishPagesUrl',
    mutate: (book) => {
      book.status = 'planned';
      book.repoVisibility = 'not-created';
      book.pagesUrl = null;
      book.publicationScope = 'planned';
      book.countingGroup = 'planned';
      book.countedInMainLineup = false;
      book.languages = ['en'];
      book.englishPagesUrl = 'https://itdojp.github.io/book-one/en/';
    },
    mustContain: 'planned book must not define englishPagesUrl'
  }
];
for (const testCase of englishUrlCases) {
  const catalog = structuredClone(validCatalog);
  testCase.mutate(catalog.books[0]);
  const errors = validateCatalog(catalog);
  const passed = errors.some((error) => error.includes(testCase.mustContain));
  if (!passed) {
    failed++;
    console.error(`❌ inline fixture expectation failed: ${testCase.name}`);
    console.error(errors.join('\n'));
  } else {
    console.log(`✅ inline fixture invalid as expected: ${testCase.name}`);
  }
}

const plannedEnglishCatalog = structuredClone(validCatalog);
Object.assign(plannedEnglishCatalog.books[0], {
  status: 'planned',
  repoVisibility: 'not-created',
  pagesUrl: null,
  englishPagesUrl: null,
  publicationScope: 'planned',
  countingGroup: 'planned',
  countedInMainLineup: false,
  languages: ['en']
});
plannedEnglishCatalog.expectedCounts = { mainLineup: 1, planned: 1, relatedIndependent: 0 };
const plannedEnglishErrors = validateCatalog(plannedEnglishCatalog);
if (plannedEnglishErrors.length > 0) {
  failed++;
  console.error('❌ inline fixture expectation failed: planned English book without URL');
  console.error(plannedEnglishErrors.join('\n'));
} else {
  console.log('✅ inline fixture valid as expected: planned English book without URL');
}

const privateFullPublicCatalog = structuredClone(validCatalog);
Object.assign(privateFullPublicCatalog.books[0], {
  repoVisibility: 'private',
  publicationScope: 'full-public'
});
const privateFullPublicErrors = validateCatalog(privateFullPublicCatalog);
if (privateFullPublicErrors.length > 0) {
  failed++;
  console.error('❌ inline fixture expectation failed: private repository with full-public Pages');
  console.error(privateFullPublicErrors.join('\n'));
} else {
  console.log('✅ inline fixture valid as expected: private repository with full-public Pages');
}

const privateFullPublicRegistry = legacyRegistryFromCatalog(privateFullPublicCatalog);
const privateFullPublicBook = privateFullPublicRegistry.books[privateFullPublicCatalog.books[0].id];
if (privateFullPublicBook.accessNote !== '管理リポジトリは非公開ですが、公開サイトでは全文を読めます。') {
  failed++;
  console.error('❌ inline fixture expectation failed: private full-public access note');
} else {
  console.log('✅ inline fixture generated structured private full-public access note');
}

const privateFreePreviewCatalog = structuredClone(validCatalog);
Object.assign(privateFreePreviewCatalog.books[0], {
  repoVisibility: 'private',
  publicationScope: 'free-preview'
});
const privateFreePreviewRegistry = legacyRegistryFromCatalog(privateFreePreviewCatalog);
const privateFreePreviewBook = privateFreePreviewRegistry.books[privateFreePreviewCatalog.books[0].id];
if (privateFreePreviewBook.accessNote !== '有料部分を含むため管理リポジトリは非公開です。公開サイトでは無料試読範囲を読めます。') {
  failed++;
  console.error('❌ inline fixture expectation failed: private free-preview access note');
} else {
  console.log('✅ inline fixture generated structured private free-preview access note');
}

if (failed > 0) process.exit(1);
