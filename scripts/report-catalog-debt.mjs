#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  DEFAULT_CATALOG_PATH,
  ROOT,
  validateCatalog
} from './catalog-utils.mjs';

export const DEFAULT_REPORT_PATH = path.join(ROOT, 'docs', 'publishing', 'catalog-debt-report.json');
export const DEFAULT_READER_VIEW_PATH = path.join(ROOT, 'docs', 'books', 'index.html');
export const DEFAULT_LEGACY_SOURCE_PATHS = [
  path.join(ROOT, 'books', 'existing-books.md'),
  path.join(ROOT, 'books', 'planned-books.md'),
  path.join(ROOT, 'roadmap', 'learning-paths.md'),
  DEFAULT_CATALOG_PATH
];

const provisionalNotePattern = /(暫定|要確認|未記載|要更新|要レビュー)/;
const uxNotePattern = /(UX|profile|modules|暫定割当)/i;
const legacyIdentifiers = ['cloud-infra-handbook'];

const visibleVariableRules = [
  {
    code: 'visible-status-enum',
    description: 'status enum is rendered directly',
    pattern: /\{\{\s*book\.status(?:\s*\|[^}]*)?\s*\}\}/g
  },
  {
    code: 'visible-counting-group',
    description: 'countingGroup is rendered directly',
    pattern: /\{\{\s*book\.countingGroup(?:\s*\|[^}]*)?\s*\}\}/g
  },
  {
    code: 'visible-publication-scope-enum',
    description: 'publicationScope enum is rendered directly',
    pattern: /\{\{\s*book\.publicationScope(?:\s*\|[^}]*)?\s*\}\}/g
  },
  {
    code: 'visible-repository-enum',
    description: 'repoVisibility enum is rendered directly',
    pattern: /\{\{\s*book\.repoVisibility(?:\s*\|[^}]*)?\s*\}\}/g
  },
  {
    code: 'visible-category-enum',
    description: 'category enum is rendered directly',
    pattern: /\{\{\s*category(?:\s*\|[^}]*)?\s*\}\}/g
  },
  {
    code: 'visible-level-enum',
    description: 'level enum is rendered directly',
    pattern: /\{\{\s*level(?:\s*\|[^}]*)?\s*\}\}/g
  },
  {
    code: 'visible-language-enum',
    description: 'language enum is rendered directly',
    pattern: /\{\{\s*language(?:\s*\|[^}]*)?\s*\}\}/g
  }
];

const readerViewRules = [
  {
    code: 'visible-operational-notes',
    description: 'operational notes are iterated in the reader view',
    pattern: /\{%-?\s*for\s+\w+\s+in\s+book\.notes\s*-?%\}/g
  },
  {
    code: 'visible-source-refs',
    description: 'sourceRefs are iterated in the reader view',
    pattern: /\{%-?\s*for\s+\w+\s+in\s+book\.sourceRefs\s*-?%\}/g
  },
  {
    code: 'raw-prerequisite-id',
    description: 'a prerequisite catalog ID is rendered as link text',
    pattern: />\s*\{\{\s*prerequisite(?:\s*\|[^}]*)?\s*\}\}\s*<\/a>/g
  }
];

function relativePath(filePath, root = ROOT) {
  const relative = path.relative(root, filePath);
  return relative.startsWith('..') ? filePath : relative.split(path.sep).join('/');
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split('\n').length;
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function isInsideHtmlTag(source, index) {
  return source.lastIndexOf('<', index) > source.lastIndexOf('>', index);
}

function sortedBookIds(books, predicate) {
  return books.filter(predicate).map((book) => book.id).sort(compareText);
}

function collection(bookIds) {
  return { count: bookIds.length, bookIds };
}

export function loadValidatedCatalog(filePath = DEFAULT_CATALOG_PATH) {
  let catalog;
  try {
    catalog = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read catalog JSON at ${relativePath(filePath)}: ${error.message}`);
  }
  const errors = validateCatalog(catalog);
  if (errors.length > 0) {
    throw new Error(`Catalog validation failed at ${relativePath(filePath)}:\n- ${errors.join('\n- ')}`);
  }
  return catalog;
}

export function findReaderViewLeaks(source, filePath = DEFAULT_READER_VIEW_PATH) {
  const findings = [];
  for (const rule of visibleVariableRules) {
    rule.pattern.lastIndex = 0;
    for (const match of source.matchAll(rule.pattern)) {
      if (isInsideHtmlTag(source, match.index)) continue;
      findings.push({
        code: rule.code,
        path: relativePath(filePath),
        line: lineNumberAt(source, match.index),
        description: rule.description
      });
    }
  }
  for (const rule of readerViewRules) {
    rule.pattern.lastIndex = 0;
    for (const match of source.matchAll(rule.pattern)) {
      findings.push({
        code: rule.code,
        path: relativePath(filePath),
        line: lineNumberAt(source, match.index),
        description: rule.description
      });
    }
  }
  return findings.sort((a, b) =>
    compareText(a.path, b.path) || a.line - b.line || compareText(a.code, b.code)
  );
}

export function findLegacyIdentifierOccurrences(sourcePaths = DEFAULT_LEGACY_SOURCE_PATHS) {
  const occurrences = [];
  for (const filePath of [...sourcePaths].sort(compareText)) {
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const [index, line] of lines.entries()) {
      for (const identifier of legacyIdentifiers) {
        if (line.includes(identifier)) {
          occurrences.push({ identifier, path: relativePath(filePath), line: index + 1 });
        }
      }
    }
  }
  return occurrences.sort((a, b) =>
    compareText(a.identifier, b.identifier) || compareText(a.path, b.path) || a.line - b.line
  );
}

export function buildCatalogDebtReport(catalog, options = {}) {
  const errors = validateCatalog(catalog);
  if (errors.length > 0) {
    throw new Error(`Catalog validation failed:\n- ${errors.join('\n- ')}`);
  }

  const books = catalog.books;
  const provisionalNotes = books
    .map((book) => ({
      id: book.id,
      notes: (book.notes || []).filter((note) => provisionalNotePattern.test(note)).sort(compareText)
    }))
    .filter((book) => book.notes.length > 0)
    .sort((a, b) => compareText(a.id, b.id));
  const uxEvidenceCandidates = sortedBookIds(
    books,
    (book) => book.status === 'published' && (
      book.ux?.profile === null ||
      (book.notes || []).some((note) => provisionalNotePattern.test(note) && uxNotePattern.test(note))
    )
  );

  const readerViewPath = options.readerViewPath || DEFAULT_READER_VIEW_PATH;
  const readerViewSource = options.readerViewSource ?? fs.readFileSync(readerViewPath, 'utf8');
  const legacyOccurrences = options.legacyOccurrences ?? findLegacyIdentifierOccurrences(
    options.legacySourcePaths || DEFAULT_LEGACY_SOURCE_PATHS
  );
  const readerViewLeaks = findReaderViewLeaks(readerViewSource, readerViewPath);

  return {
    schemaVersion: '1.0.0',
    generatedFrom: options.sourceLabel || 'docs/_data/catalog.json',
    recordCount: books.length,
    scopeCounts: {
      published: books.filter((book) => book.status === 'published').length,
      mainLineup: books.filter((book) => book.countingGroup === 'main-lineup' && book.countedInMainLineup).length,
      planned: books.filter((book) => book.status === 'planned').length,
      relatedIndependent: books.filter((book) => book.countingGroup === 'related-independent').length
    },
    debt: {
      emptySummaryJa: collection(sortedBookIds(books, (book) => !book.summary.ja.trim())),
      emptySummaryEn: collection(sortedBookIds(books, (book) => !book.summary.en.trim())),
      missingEstimatedWeeks: collection(sortedBookIds(books, (book) => book.estimatedWeeks === null)),
      missingLastReviewedAt: collection(sortedBookIds(books, (book) => book.lastReviewedAt === null)),
      missingReviewIssue: collection(sortedBookIds(books, (book) => book.reviewIssue === null)),
      provisionalNotes: { count: provisionalNotes.length, books: provisionalNotes },
      identicalLocalizedTitles: collection(sortedBookIds(
        books,
        (book) => book.title.ja.trim() === book.title.en.trim()
      )),
      uxEvidenceCandidates: collection(uxEvidenceCandidates),
      legacyIdentifierOccurrences: {
        count: legacyOccurrences.length,
        occurrences: legacyOccurrences
      }
    },
    gates: {
      readerViewLeaks: {
        count: readerViewLeaks.length,
        findings: readerViewLeaks
      }
    }
  };
}

export function serializeCatalogDebtReport(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function evaluateCatalogDebtCheck(report, expectedReportText) {
  const errors = [];
  if (serializeCatalogDebtReport(report) !== expectedReportText) {
    errors.push('catalog debt report is out of sync; run npm run generate');
  }
  if (report.gates.readerViewLeaks.count > 0) {
    for (const finding of report.gates.readerViewLeaks.findings) {
      errors.push(`${finding.code} at ${finding.path}:${finding.line}: ${finding.description}`);
    }
  }
  return errors;
}

function parseArgs(argv) {
  const options = {
    catalogPath: DEFAULT_CATALOG_PATH,
    readerViewPath: DEFAULT_READER_VIEW_PATH,
    reportPath: DEFAULT_REPORT_PATH,
    check: false,
    write: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--check') options.check = true;
    else if (arg === '--write') options.write = true;
    else if (arg === '--catalog') options.catalogPath = path.resolve(argv[++index]);
    else if (arg === '--reader-view') options.readerViewPath = path.resolve(argv[++index]);
    else if (arg === '--report') options.reportPath = path.resolve(argv[++index]);
    else if (arg === '--help') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printSummary(report) {
  const debt = report.debt;
  console.error(
    `Catalog debt: summary.ja=${debt.emptySummaryJa.count}, ` +
    `summary.en=${debt.emptySummaryEn.count}, estimatedWeeks=${debt.missingEstimatedWeeks.count}, ` +
    `reviewDate=${debt.missingLastReviewedAt.count}, reviewIssue=${debt.missingReviewIssue.count}, ` +
    `provisionalNotes=${debt.provisionalNotes.count}, readerViewLeaks=${report.gates.readerViewLeaks.count}`
  );
}

export function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log('Usage: node scripts/report-catalog-debt.mjs [--write | --check] [--catalog PATH] [--reader-view PATH] [--report PATH]');
    return 0;
  }
  if (options.write && options.check) throw new Error('--write and --check cannot be used together');

  const catalog = loadValidatedCatalog(options.catalogPath);
  const report = buildCatalogDebtReport(catalog, {
    readerViewPath: options.readerViewPath,
    sourceLabel: relativePath(options.catalogPath)
  });

  if (options.write) {
    fs.mkdirSync(path.dirname(options.reportPath), { recursive: true });
    fs.writeFileSync(options.reportPath, serializeCatalogDebtReport(report), 'utf8');
    console.log(`✅ wrote ${relativePath(options.reportPath)}`);
  } else if (options.check) {
    if (!fs.existsSync(options.reportPath)) {
      throw new Error(`catalog debt report is missing: ${relativePath(options.reportPath)}`);
    }
    const errors = evaluateCatalogDebtCheck(report, fs.readFileSync(options.reportPath, 'utf8'));
    if (errors.length > 0) throw new Error(errors.join('\n'));
    console.log('✅ catalog debt report is in sync and reader-view gates pass');
  } else {
    process.stdout.write(serializeCatalogDebtReport(report));
  }
  printSummary(report);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = runCli();
  } catch (error) {
    console.error(`❌ catalog debt report failed: ${error.message}`);
    process.exitCode = 1;
  }
}
