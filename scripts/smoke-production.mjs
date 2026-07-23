import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'https://itdojp.github.io/it-engineer-knowledge-architecture/';
const DEFAULT_EXPECTED_SHA = '';
const canonicalCatalog = JSON.parse(readFileSync(new URL('../docs/_data/catalog.json', import.meta.url), 'utf8'));
const CANONICAL_BOOK_COUNT = canonicalCatalog.books.length;
const CANONICAL_PUBLISHED_BOOKS = canonicalCatalog.books.filter((book) => book.status === 'published');
const CANONICAL_PUBLISHED_IDS = CANONICAL_PUBLISHED_BOOKS.map((book) => book.id).sort();
const CANONICAL_PATH_COUNT = canonicalCatalog.learningPaths.length;
const OLD_HOME_MARKERS = [
  'Building Your Tech Career, One Book at a Time',
  'id="日本語概要"',
  'id="専門分野別学習パス"'
];

const HTML_TARGETS = [
  { path: '', label: '/', h1: 'ITエンジニア知識アーキテクチャ' },
  { path: 'books/', label: '/books/', h1: '書籍一覧', cardCount: CANONICAL_BOOK_COUNT },
  { path: 'paths/', label: '/paths/', h1: '学習パス', pathCount: CANONICAL_PATH_COUNT },
  { path: 'en/', label: '/en/', h1: 'English Catalog', enBookCount: CANONICAL_BOOK_COUNT },
  { path: 'portfolio-health/', label: '/portfolio-health/', h1: 'Portfolio health', fullLandmarks: true },
  { path: '404.html', label: '/404.html', h1: 'ページが見つかりません' }
];

const REQUIRED_ROOT_LINKS = ['books/', 'paths/', 'portfolio-health/', 'en/'];
const PRIVATE_ALLOWED_NON_NULL_FIELDS = new Set([
  // Catalog-published identifiers plus generic derived state; no private API value.
  'id', 'repository', 'repoVisibility', 'publicationScope', 'lastReviewedAt',
  'state', 'reasons', 'nextAction', 'redacted', 'maintenance'
]);

function parseInteger(value, fallback, minimum = 1) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}

function normalizeBaseUrl(value) {
  const url = new URL(value || DEFAULT_BASE_URL);
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.toString();
}

function parseArgs(argv, env = process.env) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) throw new Error(`Unknown argument: ${key}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
    values[key.slice(2)] = value;
    index += 1;
  }
  return {
    baseUrl: normalizeBaseUrl(values['base-url'] || env.SMOKE_BASE_URL || DEFAULT_BASE_URL),
    expectedSha: values['expected-sha'] || env.SMOKE_EXPECTED_SHA || DEFAULT_EXPECTED_SHA,
    maxAttempts: parseInteger(values['max-attempts'] || env.SMOKE_MAX_ATTEMPTS, 8),
    retryDelayMs: parseInteger(values['retry-delay-ms'] || env.SMOKE_RETRY_DELAY_MS, 3_000, 0),
    timeoutMs: parseInteger(values['timeout-ms'] || env.SMOKE_TIMEOUT_MS, 15_000),
    reportJson: values['report-json'] || env.SMOKE_REPORT_JSON || 'tmp/production-smoke/report.json',
    reportMarkdown: values['report-markdown'] || env.SMOKE_REPORT_MARKDOWN || 'tmp/production-smoke/report.md'
  };
}

function stripHtml(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractH1(html) {
  const match = html.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i);
  return match ? stripHtml(match[1]) : null;
}

function markerSummary(html) {
  return {
    h1: extractH1(html),
    hasNavigation: /<nav\b[^>]*aria-label=["']主要ナビゲーション["']/i.test(html),
    hasMain: /<main\b[^>]*id=["']main-content["']/i.test(html),
    hasSkipLink: /<a\b[^>]*class=["'][^"']*\bskip-link\b[^"']*["'][^>]*href=["']#main-content["']/i.test(html),
    hasHeader: /<header\b[^>]*role=["']banner["']/i.test(html),
    hasFooter: /<footer\b[^>]*role=["']contentinfo["']/i.test(html),
    mainTabbable: /<main\b[^>]*id=["']main-content["'][^>]*tabindex=["']-1["']/i.test(html),
    oldMarkers: OLD_HOME_MARKERS.filter((marker) => html.includes(marker))
  };
}

async function fetchWithTimeout(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      headers: {
        'Cache-Control': 'no-cache, no-store',
        Pragma: 'no-cache'
      },
      redirect: 'follow',
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function cacheBustedUrl(baseUrl, path, attempt, now) {
  const url = new URL(path, baseUrl);
  url.searchParams.set('deployment_check', `${now()}-${attempt}`);
  return url;
}

async function checkHtmlTarget(fetchImpl, config, target, attempt, now) {
  const url = cacheBustedUrl(config.baseUrl, target.path, attempt, now);
  const result = { label: target.label, url: url.toString(), status: null, errors: [], markers: {} };
  try {
    const response = await fetchWithTimeout(fetchImpl, url, config.timeoutMs);
    result.status = response.status;
    const html = await response.text();
    result.markers = markerSummary(html);
    if (response.status !== 200) result.errors.push(`HTTP status ${response.status}, expected 200`);
    if (!result.markers.h1?.includes(target.h1)) {
      result.errors.push(`H1 ${JSON.stringify(result.markers.h1)}, expected text ${JSON.stringify(target.h1)}`);
    }
    if (!result.markers.hasNavigation) result.errors.push('common navigation was not found');
    if (!result.markers.hasMain) result.errors.push('main#main-content was not found');
    if (target.fullLandmarks) {
      if (!result.markers.hasSkipLink) result.errors.push('skip link to main content was not found');
      if (!result.markers.hasHeader) result.errors.push('header banner was not found');
      if (!result.markers.hasFooter) result.errors.push('contentinfo footer was not found');
      if (!result.markers.mainTabbable) result.errors.push('main#main-content is not programmatically focusable');
    }
    if (target.label === '/' && result.markers.oldMarkers.length > 0) {
      result.errors.push(`old home marker remains: ${result.markers.oldMarkers.join(', ')}`);
    }
    if (target.cardCount !== undefined) {
      const count = (html.match(/\bdata-book-card(?:\s|=|>)/g) || []).length;
      result.markers.cardCount = count;
      if (count !== target.cardCount) result.errors.push(`catalog cards ${count}, expected ${target.cardCount}`);
    }
    if (target.pathCount !== undefined) {
      const count = (html.match(/<article\b[^>]*class=["'][^"']*\bpath-card\b[^"']*["']/gi) || []).length;
      result.markers.pathCount = count;
      if (count !== target.pathCount) result.errors.push(`learning paths ${count}, expected ${target.pathCount}`);
    }
    if (target.enBookCount !== undefined) {
      const count = (html.match(/\bdata-en-book(?:\s|=|>)/g) || []).length;
      result.markers.enBookCount = count;
      if (count !== target.enBookCount) result.errors.push(`English catalog books ${count}, expected ${target.enBookCount}`);
    }
    if (target.label === '/') {
      const basePath = new URL(config.baseUrl).pathname;
      for (const path of REQUIRED_ROOT_LINKS) {
        const expectedHref = `${basePath}${path}`.replace(/\/{2,}/g, '/');
        if (!html.includes(`href="${expectedHref}"`) && !html.includes(`href='${expectedHref}'`)) {
          result.errors.push(`major link missing or outside Pages base path: ${expectedHref}`);
        }
      }
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  }
  return result;
}

async function checkBuildInfo(fetchImpl, config, attempt, now) {
  const url = cacheBustedUrl(config.baseUrl, 'build-info.json', attempt, now);
  const result = { label: '/build-info.json', url: url.toString(), status: null, errors: [], markers: {}, buildInfo: null };
  try {
    const response = await fetchWithTimeout(fetchImpl, url, config.timeoutMs);
    result.status = response.status;
    const body = await response.text();
    if (response.status !== 200) result.errors.push(`HTTP status ${response.status}, expected 200`);
    try {
      result.buildInfo = JSON.parse(body);
    } catch {
      result.errors.push('response is not valid JSON');
      return result;
    }
    const actualSha = result.buildInfo?.sha;
    result.markers.actualSha = actualSha || null;
    if (actualSha !== config.expectedSha) {
      result.errors.push(`build SHA ${JSON.stringify(actualSha)}, expected ${JSON.stringify(config.expectedSha)}`);
    }
    if (result.buildInfo?.repository !== 'itdojp/it-engineer-knowledge-architecture') {
      result.errors.push(`unexpected repository ${JSON.stringify(result.buildInfo?.repository)}`);
    }
    if (!result.buildInfo?.builtAt || Number.isNaN(Date.parse(result.buildInfo.builtAt))) {
      result.errors.push('builtAt is missing or invalid');
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  }
  return result;
}

async function checkPortfolioHealth(fetchImpl, config, attempt, now) {
  const url = cacheBustedUrl(config.baseUrl, 'portfolio-health.json', attempt, now);
  const result = { label: '/portfolio-health.json', url: url.toString(), status: null, errors: [], markers: {}, report: null };
  try {
    const response = await fetchWithTimeout(fetchImpl, url, config.timeoutMs);
    result.status = response.status;
    const body = await response.text();
    if (response.status !== 200) result.errors.push(`HTTP status ${response.status}, expected 200`);
    try {
      result.report = JSON.parse(body);
    } catch {
      result.errors.push('response is not valid JSON');
      return result;
    }
    const health = result.report;
    const books = Array.isArray(health?.books) ? health.books : [];
    const ids = books.map((book) => book?.id).filter((id) => typeof id === 'string').sort();
    result.markers = {
      schemaVersion: health?.schemaVersion || null,
      catalogStatus: health?.source?.catalogStatus || null,
      recordCount: health?.source?.recordCount ?? null,
      bookCount: books.length,
      privateCount: books.filter((book) => book?.repoVisibility === 'private').length,
      partialObservations: health?.summary?.partialObservations ?? null
    };
    if (health?.schemaVersion !== '1.0.0') result.errors.push(`schemaVersion ${JSON.stringify(health?.schemaVersion)}, expected "1.0.0"`);
    if (health?.source?.catalogStatus !== 'published') result.errors.push('source.catalogStatus must be published');
    if (health?.source?.recordCount !== CANONICAL_PUBLISHED_BOOKS.length) {
      result.errors.push(`source recordCount ${health?.source?.recordCount}, expected ${CANONICAL_PUBLISHED_BOOKS.length}`);
    }
    if (books.length !== CANONICAL_PUBLISHED_BOOKS.length) {
      result.errors.push(`portfolio books ${books.length}, expected ${CANONICAL_PUBLISHED_BOOKS.length}`);
    }
    if (!health?.summary?.states || !health?.summary?.debt || !health?.summary?.scheduledMaintenance) {
      result.errors.push('summary contract is incomplete');
    }
    const publicBooks = books.filter((book) => book?.repoVisibility === 'public');
    const partialPublicBooks = publicBooks.filter((book) => book?.partialObservation === true);
    if (health?.summary?.partialObservations !== partialPublicBooks.length) {
      result.errors.push('summary.partialObservations does not match book records');
    }
    if (publicBooks.length > 0 && partialPublicBooks.length === publicBooks.length) {
      result.errors.push('all public book observations are partial; check Pages workflow API permissions');
    }
    if (JSON.stringify(ids) !== JSON.stringify(CANONICAL_PUBLISHED_IDS)) {
      result.errors.push('portfolio book ids do not exactly match catalog status=published');
    }
    for (const book of books.filter((entry) => entry?.repoVisibility === 'private')) {
      if (book.redacted !== true) result.errors.push(`private book ${book.id} is not redacted`);
      for (const field of ['defaultBranch', 'defaultBranchSha', 'openIssues', 'openPullRequests', 'latestBookQa', 'latestVisualCheck', 'latestPagesDeployment', 'pages', 'publicHttp']) {
        if (book[field] !== null) result.errors.push(`private book ${book.id} exposes ${field}`);
      }
      for (const [field, value] of Object.entries(book)) {
        if (value !== null && !PRIVATE_ALLOWED_NON_NULL_FIELDS.has(field)) {
          result.errors.push(`private book ${book.id} exposes unexpected field ${field}`);
        }
      }
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  }
  return result;
}

function toMarkdown(report) {
  const lines = [
    '# Production smoke report',
    '',
    `- Result: **${report.ok ? 'PASS' : 'FAIL'}**`,
    `- Base URL: ${report.baseUrl}`,
    `- Expected SHA: \`${report.expectedSha}\``,
    `- Actual SHA: \`${report.actualSha || 'unknown'}\``,
    `- Attempts: ${report.attempts}`,
    '',
    '| Path | Status | Result | Markers |',
    '|---|---:|---|---|'
  ];
  for (const endpoint of report.endpoints) {
    const markers = JSON.stringify(endpoint.markers || {}).replaceAll('|', '\\|');
    lines.push(`| ${endpoint.label} | ${endpoint.status ?? '-'} | ${endpoint.errors.length === 0 ? 'PASS' : endpoint.errors.join('; ')} | \`${markers}\` |`);
  }
  return `${lines.join('\n')}\n`;
}

async function writeReport(report, config) {
  for (const [path, content] of [
    [config.reportJson, `${JSON.stringify(report, null, 2)}\n`],
    [config.reportMarkdown, toMarkdown(report)]
  ]) {
    const target = resolve(path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  }
}

export async function runProductionSmoke(inputConfig, dependencies = {}) {
  const config = {
    baseUrl: normalizeBaseUrl(inputConfig.baseUrl),
    expectedSha: inputConfig.expectedSha,
    maxAttempts: inputConfig.maxAttempts ?? 8,
    retryDelayMs: inputConfig.retryDelayMs ?? 3_000,
    timeoutMs: inputConfig.timeoutMs ?? 15_000,
    reportJson: inputConfig.reportJson ?? 'tmp/production-smoke/report.json',
    reportMarkdown: inputConfig.reportMarkdown ?? 'tmp/production-smoke/report.md'
  };
  if (!/^[0-9a-f]{40}$/i.test(config.expectedSha || '')) {
    throw new Error('expected SHA must be a 40-character commit SHA');
  }
  const fetchImpl = dependencies.fetchImpl || globalThis.fetch;
  const sleep = dependencies.sleep || ((ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms)));
  const now = dependencies.now || Date.now;
  let report;
  for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
    const endpoints = [];
    for (const target of HTML_TARGETS) {
      endpoints.push(await checkHtmlTarget(fetchImpl, config, target, attempt, now));
    }
    endpoints.push(await checkPortfolioHealth(fetchImpl, config, attempt, now));
    endpoints.push(await checkBuildInfo(fetchImpl, config, attempt, now));
    const ok = endpoints.every((endpoint) => endpoint.errors.length === 0);
    report = {
      ok,
      baseUrl: config.baseUrl,
      expectedSha: config.expectedSha,
      actualSha: endpoints.at(-1)?.buildInfo?.sha || null,
      attempts: attempt,
      checkedAt: new Date(now()).toISOString(),
      endpoints
    };
    if (ok) break;
    if (attempt < config.maxAttempts) {
      const delay = Math.min(config.retryDelayMs * 2 ** (attempt - 1), 30_000);
      await sleep(delay);
    }
  }
  await writeReport(report, config);
  return report;
}

export { parseArgs, toMarkdown };

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const config = parseArgs(process.argv.slice(2));
    const report = await runProductionSmoke(config);
    console.log(toMarkdown(report));
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  }
}
