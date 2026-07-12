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
export const DEFAULT_UX_REQUIRED_MODULE_DEBT_BASELINE_PATH = path.join(
  ROOT,
  'docs',
  'publishing',
  'ux-required-module-debt-baseline.json'
);
export const REQUIRED_UX_MODULES = Object.freeze({
  A: Object.freeze(['readingGuide', 'quickStart', 'glossary']),
  B: Object.freeze(['checklistPack', 'troubleshootingFlow', 'figureIndex']),
  C: Object.freeze(['conceptMap', 'glossary'])
});
export const DEFAULT_LEGACY_SOURCE_PATHS = [
  path.join(ROOT, 'README.md'),
  path.join(ROOT, 'books', 'existing-books.md'),
  path.join(ROOT, 'books', 'planned-books.md'),
  path.join(ROOT, 'docs', 'index.md'),
  path.join(ROOT, 'docs', 'books', 'index.html'),
  path.join(ROOT, 'docs', 'en', 'index.md'),
  path.join(ROOT, 'docs', 'paths', 'index.html'),
  path.join(ROOT, 'docs', 'publishing', 'catalog-migration-report.md'),
  path.join(ROOT, 'roadmap', 'learning-paths.md'),
  DEFAULT_CATALOG_PATH
];

export function legacySourcePathsForCatalog(catalogPath = DEFAULT_CATALOG_PATH) {
  return [...new Set(
    DEFAULT_LEGACY_SOURCE_PATHS
      .filter((sourcePath) => sourcePath !== DEFAULT_CATALOG_PATH)
      .concat(catalogPath)
  )];
}

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

function requiredModuleDebtKey({ bookId, profile, module }) {
  return `${bookId}\u0000${profile}\u0000${module}`;
}

function compareRequiredModuleDebt(left, right) {
  return compareText(left.bookId, right.bookId) ||
    compareText(left.profile, right.profile) ||
    compareText(left.module, right.module);
}

export function validateUxRequiredModuleDebtBaseline(baseline) {
  const errors = [];
  if (!baseline || typeof baseline !== 'object' || Array.isArray(baseline)) {
    return ['baseline must be an object'];
  }
  if (baseline.schemaVersion !== '1.0.0') {
    errors.push('schemaVersion must be 1.0.0');
  }
  if (!Array.isArray(baseline.entries)) {
    errors.push('entries must be an array');
    return errors;
  }

  const seen = new Set();
  for (const [index, entry] of baseline.entries.entries()) {
    const prefix = `entries[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    const bookIdIsValid = typeof entry.bookId === 'string' && entry.bookId.trim() !== '';
    const profileIsValid = Object.hasOwn(REQUIRED_UX_MODULES, entry.profile);
    const moduleIsValid = typeof entry.module === 'string' && entry.module.trim() !== '';
    if (!bookIdIsValid) {
      errors.push(`${prefix}.bookId must be a non-empty string`);
    }
    if (!profileIsValid) {
      errors.push(`${prefix}.profile must be A, B, or C`);
    }
    if (!moduleIsValid) {
      errors.push(`${prefix}.module must be a non-empty string`);
    } else if (profileIsValid && !REQUIRED_UX_MODULES[entry.profile].includes(entry.module)) {
      errors.push(`${prefix}.module ${entry.module} is not required by Profile ${entry.profile}`);
    }
    if (typeof entry.reason !== 'string' || entry.reason.trim() === '') {
      errors.push(`${prefix}.reason must be a non-empty string`);
    }
    if (!Number.isInteger(entry.evidenceIssue) || entry.evidenceIssue < 1) {
      errors.push(`${prefix}.evidenceIssue must be a positive integer`);
    }
    if (!Number.isInteger(entry.trackingIssue) || entry.trackingIssue < 1) {
      errors.push(`${prefix}.trackingIssue must be a positive integer`);
    }

    if (bookIdIsValid && profileIsValid && moduleIsValid) {
      const key = requiredModuleDebtKey(entry);
      if (seen.has(key)) errors.push(`${prefix} duplicates ${entry.bookId}/${entry.profile}/${entry.module}`);
      seen.add(key);
    }
  }
  return errors;
}

export function loadUxRequiredModuleDebtBaseline(
  filePath = DEFAULT_UX_REQUIRED_MODULE_DEBT_BASELINE_PATH
) {
  let baseline;
  try {
    baseline = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Unable to read UX required-module debt baseline at ${relativePath(filePath)}: ${error.message}`
    );
  }
  const errors = validateUxRequiredModuleDebtBaseline(baseline);
  if (errors.length > 0) {
    throw new Error(
      `UX required-module debt baseline validation failed at ${relativePath(filePath)}:\n- ${errors.join('\n- ')}`
    );
  }
  return {
    ...baseline,
    entries: [...baseline.entries].sort(compareRequiredModuleDebt)
  };
}

export function findMissingRequiredUxModules(books) {
  return books
    .filter((book) => book.status === 'published' && Object.hasOwn(REQUIRED_UX_MODULES, book.ux?.profile))
    .map((book) => ({
      id: book.id,
      profile: book.ux.profile,
      missingModules: REQUIRED_UX_MODULES[book.ux.profile]
        .filter((module) => book.ux.modules[module] !== true)
        .sort(compareText)
    }))
    .filter((book) => book.missingModules.length > 0)
    .sort((left, right) => compareText(left.id, right.id));
}

export function compareUxRequiredModuleDebt(missingBooks, baseline) {
  const baselineEntries = [...baseline.entries].sort(compareRequiredModuleDebt);
  const baselineByKey = new Map(baselineEntries.map((entry) => [requiredModuleDebtKey(entry), entry]));
  const actualEntries = missingBooks
    .flatMap((book) => book.missingModules.map((module) => ({
      bookId: book.id,
      profile: book.profile,
      module
    })))
    .sort(compareRequiredModuleDebt);
  const actualKeys = new Set(actualEntries.map(requiredModuleDebtKey));
  const unapproved = actualEntries.filter((entry) => !baselineByKey.has(requiredModuleDebtKey(entry)));
  const staleBaseline = baselineEntries.filter((entry) => !actualKeys.has(requiredModuleDebtKey(entry)));

  return {
    baselineEntries,
    baselineByKey,
    actualEntries,
    unapproved,
    staleBaseline
  };
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
        let matchIndex = line.indexOf(identifier);
        while (matchIndex !== -1) {
          occurrences.push({
            identifier,
            path: relativePath(filePath),
            line: index + 1,
            column: matchIndex + 1
          });
          matchIndex = line.indexOf(identifier, matchIndex + identifier.length);
        }
      }
    }
  }
  return occurrences.sort((a, b) =>
    compareText(a.identifier, b.identifier) || compareText(a.path, b.path) || a.line - b.line || a.column - b.column
  );
}

export function buildCatalogDebtReport(catalog, options = {}) {
  const errors = validateCatalog(catalog);
  if (errors.length > 0) {
    throw new Error(`Catalog validation failed:\n- ${errors.join('\n- ')}`);
  }

  const books = catalog.books;
  const uxRequiredModuleDebtBaseline = options.uxRequiredModuleDebtBaseline || {
    schemaVersion: '1.0.0',
    entries: []
  };
  const baselineErrors = validateUxRequiredModuleDebtBaseline(uxRequiredModuleDebtBaseline);
  if (baselineErrors.length > 0) {
    throw new Error(`UX required-module debt baseline validation failed:\n- ${baselineErrors.join('\n- ')}`);
  }
  const missingRequiredUxModules = findMissingRequiredUxModules(books);
  const requiredModuleDebtComparison = compareUxRequiredModuleDebt(
    missingRequiredUxModules,
    uxRequiredModuleDebtBaseline
  );
  const missingRequiredUxModuleBooks = missingRequiredUxModules.map((book) => ({
    id: book.id,
    profile: book.profile,
    missingModules: book.missingModules.map((module) => {
      const baselineEntry = requiredModuleDebtComparison.baselineByKey.get(requiredModuleDebtKey({
        bookId: book.id,
        profile: book.profile,
        module
      }));
      return {
        module,
        reason: baselineEntry?.reason || null,
        evidenceIssue: baselineEntry?.evidenceIssue || null,
        trackingIssue: baselineEntry?.trackingIssue || null
      };
    })
  }));
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
    options.legacySourcePaths || legacySourcePathsForCatalog(options.catalogPath)
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
      missingRequiredUxModules: {
        count: requiredModuleDebtComparison.actualEntries.length,
        bookCount: missingRequiredUxModuleBooks.length,
        books: missingRequiredUxModuleBooks
      },
      legacyIdentifierOccurrences: {
        count: legacyOccurrences.length,
        occurrences: legacyOccurrences
      }
    },
    gates: {
      requiredUxModuleDebt: {
        baselineCount: requiredModuleDebtComparison.baselineEntries.length,
        currentCount: requiredModuleDebtComparison.actualEntries.length,
        unapprovedCount: requiredModuleDebtComparison.unapproved.length,
        unapproved: requiredModuleDebtComparison.unapproved,
        staleBaselineCount: requiredModuleDebtComparison.staleBaseline.length,
        staleBaseline: requiredModuleDebtComparison.staleBaseline
      },
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
  if (report.gates.requiredUxModuleDebt.unapprovedCount > 0) {
    for (const entry of report.gates.requiredUxModuleDebt.unapproved) {
      errors.push(
        `unapproved required UX module debt: ${entry.bookId} / Profile ${entry.profile} / ${entry.module}`
      );
    }
  }
  if (report.gates.requiredUxModuleDebt.staleBaselineCount > 0) {
    for (const entry of report.gates.requiredUxModuleDebt.staleBaseline) {
      errors.push(
        `stale required UX module debt baseline: ${entry.bookId} / Profile ${entry.profile} / ${entry.module}`
      );
    }
  }
  if (report.debt.legacyIdentifierOccurrences.count > 0) {
    for (const occurrence of report.debt.legacyIdentifierOccurrences.occurrences) {
      errors.push(
        `legacy identifier ${occurrence.identifier} at ${occurrence.path}:${occurrence.line}:${occurrence.column}`
      );
    }
  }
  return errors;
}

function parseArgs(argv) {
  const options = {
    catalogPath: DEFAULT_CATALOG_PATH,
    readerViewPath: DEFAULT_READER_VIEW_PATH,
    reportPath: DEFAULT_REPORT_PATH,
    uxRequiredModuleDebtBaselinePath: DEFAULT_UX_REQUIRED_MODULE_DEBT_BASELINE_PATH,
    check: false,
    write: false,
    baselinePathExplicit: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--check') options.check = true;
    else if (arg === '--write') options.write = true;
    else if (arg === '--catalog') options.catalogPath = path.resolve(argv[++index]);
    else if (arg === '--reader-view') options.readerViewPath = path.resolve(argv[++index]);
    else if (arg === '--report') options.reportPath = path.resolve(argv[++index]);
    else if (arg === '--ux-debt-baseline') {
      options.uxRequiredModuleDebtBaselinePath = path.resolve(argv[++index]);
      options.baselinePathExplicit = true;
    }
    else if (arg === '--help') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.catalogPath !== DEFAULT_CATALOG_PATH && !options.baselinePathExplicit) {
    options.uxRequiredModuleDebtBaselinePath = null;
  }
  return options;
}

function printSummary(report) {
  const debt = report.debt;
  console.error(
    `Catalog debt: summary.ja=${debt.emptySummaryJa.count}, ` +
    `summary.en=${debt.emptySummaryEn.count}, estimatedWeeks=${debt.missingEstimatedWeeks.count}, ` +
    `reviewDate=${debt.missingLastReviewedAt.count}, reviewIssue=${debt.missingReviewIssue.count}, ` +
    `provisionalNotes=${debt.provisionalNotes.count}, ` +
    `requiredUxModules=${debt.missingRequiredUxModules.count}, ` +
    `unapprovedRequiredUxModules=${report.gates.requiredUxModuleDebt.unapprovedCount}, ` +
    `readerViewLeaks=${report.gates.readerViewLeaks.count}`
  );
}

export function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log('Usage: node scripts/report-catalog-debt.mjs [--write | --check] [--catalog PATH] [--reader-view PATH] [--report PATH] [--ux-debt-baseline PATH]');
    return 0;
  }
  if (options.write && options.check) throw new Error('--write and --check cannot be used together');

  const catalog = loadValidatedCatalog(options.catalogPath);
  const uxRequiredModuleDebtBaseline = options.uxRequiredModuleDebtBaselinePath
    ? loadUxRequiredModuleDebtBaseline(options.uxRequiredModuleDebtBaselinePath)
    : { schemaVersion: '1.0.0', entries: [] };
  const report = buildCatalogDebtReport(catalog, {
    catalogPath: options.catalogPath,
    readerViewPath: options.readerViewPath,
    sourceLabel: relativePath(options.catalogPath),
    uxRequiredModuleDebtBaseline
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
    console.log('✅ catalog debt report is in sync and catalog debt gates pass');
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
