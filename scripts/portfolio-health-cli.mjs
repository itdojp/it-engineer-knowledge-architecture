#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  PORTFOLIO_HEALTH_ALERT_MARKER,
  buildPortfolioHealthReport,
  planPortfolioHealthAlert,
  renderPortfolioHealthAlert,
  renderPortfolioHealthHtml,
  renderPortfolioHealthMarkdown,
  selectPublishedBooks,
  serializePortfolioHealthReport
} from './portfolio-health.mjs';
import {
  collectPublicBookObservation,
  createGitHubClient,
  mergeCachedObservation,
  pruneSanitizedCache,
  readSanitizedCache,
  writeSanitizedCache
} from './portfolio-health-client.mjs';

function parseArgs(argv, env = process.env) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) throw new Error(`Unknown argument: ${key}`);
    if (key === '--manage-alerts') {
      values.manageAlerts = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
    values[key.slice(2)] = value;
    index += 1;
  }
  return {
    catalogPath: values.catalog || env.PORTFOLIO_HEALTH_CATALOG || 'docs/_data/catalog.json',
    apiUrl: values['api-url'] || env.GITHUB_API_URL || 'https://api.github.com',
    token: values.token || env.PORTFOLIO_HEALTH_READ_TOKEN || '',
    alertToken: values['alert-token'] || env.PORTFOLIO_HEALTH_ALERT_TOKEN || env.GITHUB_TOKEN || '',
    portalRepository: values['portal-repository'] || env.GITHUB_REPOSITORY || '',
    manageAlerts: values.manageAlerts === true,
    maxAttempts: Number.parseInt(values['max-attempts'] || env.PORTFOLIO_HEALTH_MAX_ATTEMPTS || '4', 10),
    retryDelayMs: Number.parseInt(values['retry-delay-ms'] || env.PORTFOLIO_HEALTH_RETRY_DELAY_MS || '1000', 10),
    concurrency: Number.parseInt(values.concurrency || env.PORTFOLIO_HEALTH_CONCURRENCY || '3', 10),
    reportJson: values['report-json'] || env.PORTFOLIO_HEALTH_REPORT_JSON || 'tmp/portfolio-health/report.json',
    reportHtml: values['report-html'] || env.PORTFOLIO_HEALTH_REPORT_HTML || 'tmp/portfolio-health/index.html',
    reportMarkdown: values['report-markdown'] || env.PORTFOLIO_HEALTH_REPORT_MARKDOWN || 'tmp/portfolio-health/summary.md',
    cacheDir: values['cache-dir'] || env.PORTFOLIO_HEALTH_CACHE_DIR || 'tmp/portfolio-health/cache',
    snapshotDir: values['snapshot-dir'] || env.PORTFOLIO_HEALTH_SNAPSHOT_DIR || ''
  };
}

function assertConfig(config) {
  if (!Number.isInteger(config.maxAttempts) || config.maxAttempts < 1) throw new Error('max-attempts must be a positive integer');
  if (!Number.isInteger(config.concurrency) || config.concurrency < 1 || config.concurrency > 5) throw new Error('concurrency must be between 1 and 5');
  if (config.manageAlerts && !/^[^/]+\/[^/]+$/.test(config.portalRepository)) {
    throw new Error('portal-repository must be in owner/name format when --manage-alerts is used');
  }
}

async function mapWithConcurrency(values, limit, task) {
  const results = new Array(values.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (next < values.length) {
      const index = next;
      next += 1;
      results[index] = await task(values[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function writeText(path, content) {
  await mkdir(dirname(resolve(path)), { recursive: true });
  await writeFile(resolve(path), content, 'utf8');
}

function repositoryPath(repository) {
  return repository.split('/').map(encodeURIComponent).join('/');
}

async function findOpenHealthAlerts(api, repository) {
  const alerts = [];
  const encodedRepository = repositoryPath(repository);
  for (let page = 1; page <= 10; page += 1) {
    const issues = await api.request(`/repos/${encodedRepository}/issues?state=open&per_page=100&page=${page}`);
    alerts.push(...issues.filter((issue) => !issue.pull_request && typeof issue.body === 'string' && issue.body.includes(PORTFOLIO_HEALTH_ALERT_MARKER)));
    if (issues.length < 100) break;
  }
  return alerts;
}

export async function executePortfolioHealthAlertPlan(api, repository, report, plan) {
  if (plan.action === 'none') return { action: 'none', issueNumber: plan.issueNumber, closedDuplicateCount: 0 };
  const body = plan.fingerprint ? renderPortfolioHealthAlert(report, plan.fingerprint) : null;
  const encodedRepository = repositoryPath(repository);
  for (const duplicate of plan.duplicateIssueNumbers || []) {
    await api.request(`/repos/${encodedRepository}/issues/${duplicate}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: `${PORTFOLIO_HEALTH_ALERT_MARKER}\n\n重複Alertをprimary Issue #${plan.issueNumber}へ統合します。` })
    });
    await api.request(`/repos/${encodedRepository}/issues/${duplicate}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'closed', state_reason: 'not_planned' })
    });
  }
  if (plan.action === 'create') {
    const issue = await api.request(`/repos/${encodedRepository}/issues`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '[Alert][Portfolio Health] 状態変化', body })
    });
    return { action: 'created', issueNumber: issue.number, closedDuplicateCount: 0 };
  }
  if (plan.action === 'update') {
    await api.request(`/repos/${encodedRepository}/issues/${plan.issueNumber}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body })
    });
    await api.request(`/repos/${encodedRepository}/issues/${plan.issueNumber}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body })
    });
    return { action: 'updated', issueNumber: plan.issueNumber, closedDuplicateCount: plan.duplicateIssueNumbers.length };
  }
  if (plan.action === 'deduplicate') {
    return { action: 'deduplicated', issueNumber: plan.issueNumber, closedDuplicateCount: plan.duplicateIssueNumbers.length };
  }
  await api.request(`/repos/${encodedRepository}/issues/${plan.issueNumber}/comments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: `## 復旧を確認\n\n${PORTFOLIO_HEALTH_ALERT_MARKER}\n\n状態が healthy/scheduled のみになったため、このAlertをクローズします。` })
  });
  await api.request(`/repos/${encodedRepository}/issues/${plan.issueNumber}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'closed', state_reason: 'completed' })
  });
  return { action: 'closed', issueNumber: plan.issueNumber, closedDuplicateCount: plan.duplicateIssueNumbers.length };
}

export async function runPortfolioHealth(inputConfig, dependencies = {}) {
  const config = { ...inputConfig };
  assertConfig(config);
  if (!dependencies.api && !config.token) {
    throw new Error('PORTFOLIO_HEALTH_READ_TOKEN is required for cross-repository collection');
  }
  if (config.manageAlerts && !dependencies.alertApi && !config.alertToken) {
    throw new Error('PORTFOLIO_HEALTH_ALERT_TOKEN is required when --manage-alerts is used');
  }
  const catalog = dependencies.catalog || JSON.parse(await readFile(resolve(config.catalogPath), 'utf8'));
  const api = dependencies.api || createGitHubClient({
    apiUrl: config.apiUrl, token: config.token, maxAttempts: config.maxAttempts, retryDelayMs: config.retryDelayMs,
    fetchImpl: dependencies.fetchImpl
  });
  const books = selectPublishedBooks(catalog);
  const cacheEligibleBookIds = books
    .filter((book) => book.repoVisibility !== 'private')
    .map((book) => book.id);
  await pruneSanitizedCache(config.cacheDir, cacheEligibleBookIds);
  const observations = {};
  await mapWithConcurrency(books, config.concurrency, async (book) => {
    if (book.repoVisibility === 'private') {
      // Private repositories are deliberately redacted in every public report.
      observations[book.id] = { access: 'redacted' };
      return;
    }
    const cached = await readSanitizedCache(config.cacheDir, book.id);
    try {
      const current = await collectPublicBookObservation(book, { api, fetchImpl: dependencies.fetchImpl });
      observations[book.id] = mergeCachedObservation(current, cached);
    } catch {
      observations[book.id] = mergeCachedObservation({
        access: 'authorized',
        partialAreas: ['collector'],
        securityScheduled: true
      }, cached);
    }
  });
  const report = buildPortfolioHealthReport(catalog, observations, { now: dependencies.now?.() || new Date() });
  await Promise.all(books.map((book) => writeSanitizedCache(config.cacheDir, book.id, observations[book.id])));
  const markdown = renderPortfolioHealthMarkdown(report);
  const html = renderPortfolioHealthHtml(report);
  await Promise.all([
    writeText(config.reportJson, serializePortfolioHealthReport(report)),
    writeText(config.reportHtml, html),
    writeText(config.reportMarkdown, markdown),
    ...(config.snapshotDir ? [
      writeText(`${config.snapshotDir}/portfolio-health.json`, serializePortfolioHealthReport(report)),
      writeText(`${config.snapshotDir}/portfolio-health/index.html`, html)
    ] : [])
  ]);
  let alert = { action: 'disabled', issueNumber: null };
  if (config.manageAlerts) {
    const alertApi = dependencies.alertApi || createGitHubClient({
      apiUrl: config.apiUrl, token: config.alertToken, maxAttempts: config.maxAttempts,
      retryDelayMs: config.retryDelayMs, fetchImpl: dependencies.fetchImpl
    });
    const openAlerts = await findOpenHealthAlerts(alertApi, config.portalRepository);
    alert = await executePortfolioHealthAlertPlan(alertApi, config.portalRepository, report, planPortfolioHealthAlert(report, openAlerts));
  }
  return { report, markdown, alert };
}

export { parseArgs };

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await runPortfolioHealth(parseArgs(process.argv.slice(2)));
    process.stdout.write(result.markdown);
  } catch (error) {
    // Never print HTTP response bodies, authorization headers, or token-bearing URLs.
    console.error(error instanceof Error ? error.message : 'Portfolio health failed');
    process.exitCode = 1;
  }
}
