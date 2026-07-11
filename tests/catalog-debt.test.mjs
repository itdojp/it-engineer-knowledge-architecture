import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {
  buildCatalogDebtReport,
  evaluateCatalogDebtCheck,
  findLegacyIdentifierOccurrences,
  findReaderViewLeaks,
  loadValidatedCatalog,
  serializeCatalogDebtReport
} from '../scripts/report-catalog-debt.mjs';
import { ROOT } from '../scripts/catalog-utils.mjs';

const fixturePath = path.join(ROOT, 'tests', 'fixtures', 'catalog-valid.json');
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
  assert.equal(report.debt.legacyIdentifierOccurrences.count, 0);
  assert.equal(report.gates.readerViewLeaks.count, 0);
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
});
