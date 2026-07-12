import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  buildCatalogDebtReport,
  compareUxRequiredModuleDebt,
  evaluateCatalogDebtCheck,
  findLegacyIdentifierOccurrences,
  findMissingRequiredUxModules,
  findReaderViewLeaks,
  legacySourcePathsForCatalog,
  loadValidatedCatalog,
  loadUxRequiredModuleDebtBaseline,
  REQUIRED_UX_MODULES,
  serializeCatalogDebtReport,
  validateUxRequiredModuleDebtBaseline
} from '../scripts/report-catalog-debt.mjs';
import { ROOT } from '../scripts/catalog-utils.mjs';

const fixturePath = path.join(ROOT, 'tests', 'fixtures', 'catalog-valid.json');
const uxDebtBaselineFixturePath = path.join(
  ROOT,
  'tests',
  'fixtures',
  'ux-required-module-debt-baseline.json'
);
const safeReaderView = '<article>{{ book.title.ja }}</article>\n';

function fixtureReport() {
  return buildCatalogDebtReport(loadValidatedCatalog(fixturePath), {
    sourceLabel: 'tests/fixtures/catalog-valid.json',
    readerViewSource: safeReaderView,
    readerViewPath: path.join(ROOT, 'docs', 'books', 'index.html'),
    legacyOccurrences: []
  });
}

test('same input produces byte-for-byte identical output', () => {
  const first = serializeCatalogDebtReport(fixtureReport());
  const second = serializeCatalogDebtReport(fixtureReport());
  assert.equal(first, second);
});

test('known fixture produces expected debt counts', () => {
  const report = fixtureReport();
  assert.equal(report.recordCount, 2);
  assert.equal(report.debt.emptySummaryJa.count, 2);
  assert.equal(report.debt.emptySummaryEn.count, 0);
  assert.equal(report.debt.missingEstimatedWeeks.count, 2);
  assert.equal(report.debt.missingLastReviewedAt.count, 2);
  assert.equal(report.debt.missingReviewIssue.count, 2);
  assert.equal(report.debt.provisionalNotes.count, 2);
  assert.equal(report.debt.identicalLocalizedTitles.count, 2);
  assert.equal(report.debt.uxEvidenceCandidates.count, 2);
  assert.equal(report.debt.missingRequiredUxModules.count, 0);
  assert.equal(report.debt.legacyIdentifierOccurrences.count, 0);
  assert.equal(report.gates.requiredUxModuleDebt.unapprovedCount, 0);
  assert.equal(report.gates.requiredUxModuleDebt.staleBaselineCount, 0);
  assert.equal(report.gates.readerViewLeaks.count, 0);
});

test('required-module definitions stay aligned with the canonical UX profile document', () => {
  const source = fs.readFileSync(path.join(ROOT, 'docs', 'publishing', 'ux-profiles.md'), 'utf8');
  for (const [profile, modules] of Object.entries(REQUIRED_UX_MODULES)) {
    const expectedLine = `- 必須 modules: ${modules.map((module) => `\`${module}\``).join(', ')}`;
    const profileSection = source.split(`### Profile ${profile}:`)[1]?.split('\n### Profile ')[0] || '';
    assert.match(profileSection, new RegExp(expectedLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('Profile A, B, and C required-module debt is deterministic and carries fixture evidence', () => {
  const books = [
    {
      id: 'profile-c-book',
      status: 'published',
      ux: { profile: 'C', modules: { conceptMap: true, glossary: false } }
    },
    {
      id: 'profile-a-book',
      status: 'published',
      ux: { profile: 'A', modules: { readingGuide: true, quickStart: true, glossary: false } }
    },
    {
      id: 'profile-b-book',
      status: 'published',
      ux: {
        profile: 'B',
        modules: { checklistPack: true, troubleshootingFlow: true, figureIndex: false }
      }
    },
    {
      id: 'planned-profile-a-book',
      status: 'planned',
      ux: { profile: 'A', modules: { readingGuide: false, quickStart: false, glossary: false } }
    }
  ];
  const first = findMissingRequiredUxModules(books);
  const second = findMissingRequiredUxModules(structuredClone(books));
  assert.deepEqual(first, second);
  assert.deepEqual(first, [
    { id: 'profile-a-book', profile: 'A', missingModules: ['glossary'] },
    { id: 'profile-b-book', profile: 'B', missingModules: ['figureIndex'] },
    { id: 'profile-c-book', profile: 'C', missingModules: ['glossary'] }
  ]);

  const baseline = loadUxRequiredModuleDebtBaseline(uxDebtBaselineFixturePath);
  const comparison = compareUxRequiredModuleDebt(first, baseline);
  assert.equal(comparison.actualEntries.length, 3);
  assert.deepEqual(comparison.unapproved, []);
  assert.deepEqual(comparison.staleBaseline, []);
});

test('required-module debt comparison rejects new debt and detects resolved baseline entries', () => {
  const baseline = loadUxRequiredModuleDebtBaseline(uxDebtBaselineFixturePath);
  const missing = [
    { id: 'profile-a-book', profile: 'A', missingModules: ['glossary', 'quickStart'] },
    { id: 'profile-b-book', profile: 'B', missingModules: ['figureIndex'] }
  ];
  const comparison = compareUxRequiredModuleDebt(missing, baseline);
  assert.deepEqual(comparison.unapproved, [{
    bookId: 'profile-a-book',
    profile: 'A',
    module: 'quickStart'
  }]);
  assert.deepEqual(
    comparison.staleBaseline.map(({ bookId, profile, module }) => ({ bookId, profile, module })),
    [{ bookId: 'profile-c-book', profile: 'C', module: 'glossary' }]
  );
});

test('required-module debt baseline rejects duplicates and modules not required by the profile', () => {
  const duplicate = {
    schemaVersion: '1.0.0',
    entries: [
      {
        bookId: 'book-a',
        profile: 'A',
        module: 'glossary',
        reason: 'fixture',
        evidenceIssue: 1,
        trackingIssue: 2
      },
      {
        bookId: 'book-a',
        profile: 'A',
        module: 'glossary',
        reason: 'fixture duplicate',
        evidenceIssue: 1,
        trackingIssue: 2
      },
      {
        bookId: 'book-b',
        profile: 'C',
        module: 'quickStart',
        reason: '',
        evidenceIssue: 0,
        trackingIssue: 0
      },
      {
        bookId: '',
        profile: 'A',
        module: null,
        reason: 'invalid fields should not create a duplicate-key error',
        evidenceIssue: 1,
        trackingIssue: 2
      },
      {
        bookId: '',
        profile: 'A',
        module: null,
        reason: 'second invalid entry',
        evidenceIssue: 1,
        trackingIssue: 2
      }
    ]
  };
  assert.deepEqual(validateUxRequiredModuleDebtBaseline(duplicate), [
    'entries[1] duplicates book-a/A/glossary',
    'entries[2].module quickStart is not required by Profile C',
    'entries[2].reason must be a non-empty string',
    'entries[2].evidenceIssue must be a positive integer',
    'entries[2].trackingIssue must be a positive integer',
    'entries[3].bookId must be a non-empty string',
    'entries[3].module must be a non-empty string',
    'entries[4].bookId must be a non-empty string',
    'entries[4].module must be a non-empty string'
  ]);
});

test('invalid JSON and missing catalog structure fail with clear errors', () => {
  const invalidJsonPath = path.join(ROOT, 'tests', 'fixtures', 'catalog-debt-invalid-json.json');
  const invalidStructurePath = path.join(ROOT, 'tests', 'fixtures', 'catalog-debt-invalid-structure.json');
  assert.throws(
    () => loadValidatedCatalog(invalidJsonPath),
    /Unable to read catalog JSON.*JSON/s
  );
  assert.throws(
    () => loadValidatedCatalog(invalidStructurePath),
    /Catalog validation failed.*missing root field: books/s
  );
});

test('reader-view leak rules detect direct internal rendering', () => {
  const source = [
    '<div data-status="{{ book.status | escape }}"><span>{{ book.status | escape }}</span></div>',
    '{% for note in book.notes %}<li>{{ note }}</li>{% endfor %}',
    '<a href="#{{ prerequisite }}">{{ prerequisite | escape }}</a>'
  ].join('\n');
  assert.deepEqual(
    findReaderViewLeaks(source).map((finding) => finding.code),
    ['visible-status-enum', 'visible-operational-notes', 'raw-prerequisite-id']
  );
});

test('legacy identifier inventory counts repeated matches on the same line', () => {
  const legacyFixture = path.join(ROOT, 'tests', 'fixtures', 'catalog-debt-legacy-identifiers.txt');
  const occurrences = findLegacyIdentifierOccurrences([legacyFixture]);
  assert.equal(occurrences.length, 2);
  assert.deepEqual(occurrences.map((item) => item.column), [1, 26]);
});

test('custom catalog checks replace the default catalog scan target', () => {
  const customCatalog = path.join(ROOT, 'tests', 'fixtures', 'catalog-valid.json');
  const paths = legacySourcePathsForCatalog(customCatalog);
  assert.equal(paths.includes(customCatalog), true);
  assert.equal(paths.includes(path.join(ROOT, 'docs', '_data', 'catalog.json')), false);
  assert.equal(paths.includes(path.join(ROOT, 'docs', 'books', 'index.html')), true);
});

test('--check semantics reject stale reports, reader-view leaks, and legacy identifiers', () => {
  const report = fixtureReport();
  assert.deepEqual(evaluateCatalogDebtCheck(report, serializeCatalogDebtReport(report)), []);

  const stale = serializeCatalogDebtReport({ ...report, recordCount: 3 });
  assert.match(evaluateCatalogDebtCheck(report, stale).join('\n'), /out of sync/);

  const leakingReport = structuredClone(report);
  leakingReport.gates.readerViewLeaks = {
    count: 1,
    findings: [{
      code: 'visible-status-enum',
      path: 'docs/books/index.html',
      line: 1,
      description: 'status enum is rendered directly'
    }]
  };
  assert.match(
    evaluateCatalogDebtCheck(leakingReport, serializeCatalogDebtReport(leakingReport)).join('\n'),
    /visible-status-enum/
  );

  const legacyReport = structuredClone(report);
  legacyReport.debt.legacyIdentifierOccurrences = {
    count: 1,
    occurrences: [{
      identifier: 'cloud-infra-handbook',
      path: 'books/existing-books.md',
      line: 10,
      column: 1
    }]
  };
  assert.match(
    evaluateCatalogDebtCheck(legacyReport, serializeCatalogDebtReport(legacyReport)).join('\n'),
    /legacy identifier cloud-infra-handbook at books\/existing-books\.md:10:1/
  );

  const unapprovedUxDebtReport = structuredClone(report);
  unapprovedUxDebtReport.gates.requiredUxModuleDebt = {
    baselineCount: 0,
    currentCount: 1,
    unapprovedCount: 1,
    unapproved: [{ bookId: 'book-a', profile: 'A', module: 'glossary' }],
    staleBaselineCount: 0,
    staleBaseline: []
  };
  assert.match(
    evaluateCatalogDebtCheck(
      unapprovedUxDebtReport,
      serializeCatalogDebtReport(unapprovedUxDebtReport)
    ).join('\n'),
    /unapproved required UX module debt: book-a \/ Profile A \/ glossary/
  );

  const staleUxDebtReport = structuredClone(report);
  staleUxDebtReport.gates.requiredUxModuleDebt = {
    baselineCount: 1,
    currentCount: 0,
    unapprovedCount: 0,
    unapproved: [],
    staleBaselineCount: 1,
    staleBaseline: [{
      bookId: 'book-b',
      profile: 'B',
      module: 'figureIndex',
      reason: 'resolved fixture debt',
      evidenceIssue: 1,
      trackingIssue: 2
    }]
  };
  assert.match(
    evaluateCatalogDebtCheck(staleUxDebtReport, serializeCatalogDebtReport(staleUxDebtReport)).join('\n'),
    /stale required UX module debt baseline: book-b \/ Profile B \/ figureIndex/
  );
});
