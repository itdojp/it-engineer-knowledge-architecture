import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  PORTFOLIO_HEALTH_ALERT_MARKER,
  alertFingerprint,
  buildPortfolioHealthReport,
  escapeHtml,
  planPortfolioHealthAlert,
  renderPortfolioHealthHtml,
  renderPortfolioHealthMarkdown,
  selectPublishedBooks,
  serializePortfolioHealthReport
} from '../scripts/portfolio-health.mjs';
import {
  GitHubRequestError,
  cachePath,
  createGitHubClient,
  mergeCachedObservation,
  readSanitizedCache,
  summarizeOpenIssues,
  writeSanitizedCache
} from '../scripts/portfolio-health-client.mjs';
import { executePortfolioHealthAlertPlan, parseArgs, runPortfolioHealth } from '../scripts/portfolio-health-cli.mjs';

const fixtureDir = path.join(process.cwd(), 'tests', 'fixtures', 'portfolio-health');
const catalog = JSON.parse(await readFile(path.join(fixtureDir, 'catalog.json'), 'utf8'));
const observations = JSON.parse(await readFile(path.join(fixtureDir, 'observations.json'), 'utf8'));
const now = new Date('2026-07-23T00:00:00Z');

function report() {
  return buildPortfolioHealthReport(catalog, observations, { now, reviewMaxAgeDays: 180 });
}

test('CLI keeps cross-repository read and portal alert credentials separate', () => {
  const config = parseArgs([], {
    PORTFOLIO_HEALTH_READ_TOKEN: 'read-token',
    PORTFOLIO_HEALTH_ALERT_TOKEN: 'alert-token',
    GITHUB_TOKEN: 'repository-token'
  });
  assert.equal(config.token, 'read-token');
  assert.equal(config.alertToken, 'alert-token');
  const fallback = parseArgs([], { GITHUB_TOKEN: 'repository-token' });
  assert.equal(fallback.token, '');
  assert.equal(fallback.alertToken, 'repository-token');
});

test('CLI fails closed when a required credential is unavailable', async () => {
  await assert.rejects(
    runPortfolioHealth(parseArgs([], {})),
    /PORTFOLIO_HEALTH_READ_TOKEN is required/
  );
  const alertConfig = parseArgs(['--manage-alerts'], {
    PORTFOLIO_HEALTH_READ_TOKEN: 'read-token',
    GITHUB_REPOSITORY: 'org/portal'
  });
  await assert.rejects(
    runPortfolioHealth(alertConfig, { api: { request: async () => null } }),
    /PORTFOLIO_HEALTH_ALERT_TOKEN is required/
  );
});

test('uses every and only status=published catalog record as the live input set', () => {
  assert.deepEqual(selectPublishedBooks(catalog).map((book) => book.id), [
    'normal-book', 'blocked-book', 'partial-book', 'private-book'
  ]);
  assert.equal(report().source.recordCount, 4);
});

test('normal, blocked, partial, and private-redacted states have explicit reasons and debt', () => {
  const byId = Object.fromEntries(report().books.map((book) => [book.id, book]));
  assert.equal(byId['normal-book'].state, 'healthy');
  assert.equal(byId['blocked-book'].state, 'blocked');
  assert.equal(byId['blocked-book'].maintenance.security.count, 1);
  assert.equal(byId['blocked-book'].maintenance.freshness.count, 1);
  assert.equal(byId['blocked-book'].maintenance.qa.count, 1);
  assert.equal(byId['blocked-book'].maintenance.visual.count, 1);
  assert.equal(byId['blocked-book'].maintenance.build.count, 1);
  assert.equal(byId['partial-book'].state, 'attention');
  assert.equal(byId['private-book'].state, 'scheduled');
  assert.equal(byId['private-book'].redacted, true);
});

test('a nullable Pages API status does not override a successful deployment and public HTTP result', () => {
  const nullableStatus = structuredClone(observations['normal-book']);
  nullableStatus.pages.status = null;
  const result = buildPortfolioHealthReport({ books: [catalog.books[0]] }, { 'normal-book': nullableStatus }, { now });
  assert.equal(result.books[0].state, 'healthy');
  assert.equal(result.books[0].maintenance.build.count, 0);
});

test('absence of an optional visual workflow is not debt, but an observed failure is', () => {
  const withoutVisual = structuredClone(observations['normal-book']);
  withoutVisual.latestVisualCheck = null;
  const result = buildPortfolioHealthReport({ books: [catalog.books[0]] }, { 'normal-book': withoutVisual }, { now });
  assert.equal(result.books[0].state, 'healthy');
  assert.equal(result.books[0].maintenance.visual.count, 0);
  assert.equal(report().books.find((book) => book.id === 'blocked-book').maintenance.visual.count, 1);
});

test('private output is redacted and does not retain sentinel secrets or raw errors', () => {
  const output = [
    serializePortfolioHealthReport(report()),
    renderPortfolioHealthMarkdown(report()),
    renderPortfolioHealthHtml(report())
  ].join('\n');
  assert.doesNotMatch(output, /PRIVATE-SENTINEL|PRIVATE-ERROR-SENTINEL/);
  const privateBook = report().books.find((book) => book.id === 'private-book');
  assert.equal(privateBook.defaultBranchSha, null);
  assert.equal(privateBook.openIssues, null);
  assert.equal(privateBook.publicHttp, null);
  assert.equal(privateBook.latestBookQa, null);
  assert.equal(privateBook.repository, 'org/private-book');
  const allowedNonNull = new Set([
    'id', 'repository', 'repoVisibility', 'publicationScope', 'lastReviewedAt',
    'state', 'reasons', 'nextAction', 'redacted', 'maintenance'
  ]);
  assert.deepEqual(
    Object.entries(privateBook).filter(([field, value]) => value !== null && !allowedNonNull.has(field)).map(([field]) => field),
    []
  );
});

test('standalone HTML escapes catalog-controlled content', () => {
  const unsafe = structuredClone(report());
  unsafe.books[0].id = '<img src=x onerror="sentinel">';
  unsafe.books[0].nextAction = 'A & B';
  const html = renderPortfolioHealthHtml(unsafe);
  assert.match(html, /&lt;img src=x onerror=&quot;sentinel&quot;&gt;/);
  assert.match(html, /A &amp; B/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.equal(escapeHtml(`'\"&<>`), '&#39;&quot;&amp;&lt;&gt;');
  assert.match(html, /class="skip-link" href="#main-content"/);
  assert.match(html, /<header role="banner">/);
  assert.match(html, /<main id="main-content" tabindex="-1">/);
  assert.match(html, /<footer role="contentinfo">/);
});

test('standalone HTML distinguishes private redaction from unavailable public data', () => {
  const unavailable = structuredClone(report());
  const publicBook = unavailable.books.find((book) => book.id === 'normal-book');
  publicBook.defaultBranch = null;
  publicBook.defaultBranchSha = null;
  const html = renderPortfolioHealthHtml(unavailable);
  assert.match(html, /<td>取得不能<br><small>取得不能<\/small><\/td>/);
  assert.match(html, /<td>redacted<br><small>redacted<\/small><\/td>/);
  assert.match(html, /<td>redacted \/ redacted<\/td><td>redacted<\/td><td>redacted<\/td><td>redacted<\/td>/);
  assert.match(html, /<title>Portfolio Health<\/title>/);
  assert.match(html, /<h1>Portfolio Health<\/h1>/);
  const markdown = renderPortfolioHealthMarkdown(unavailable);
  assert.match(markdown, /\| private-book \| org\/private-book \| private \/ free-preview \| scheduled \| redacted \| redacted \| redacted \|/);
});

test('alert planner deduplicates unchanged state and only writes on change or recovery', () => {
  const unhealthy = report();
  const fingerprint = alertFingerprint(unhealthy);
  assert.ok(fingerprint);
  const existing = [{ number: 278, body: `${PORTFOLIO_HEALTH_ALERT_MARKER}\n<!-- portfolio-health-fingerprint:${fingerprint} -->` }];
  assert.deepEqual(planPortfolioHealthAlert(unhealthy, existing), {
    action: 'none', issueNumber: 278, duplicateIssueNumbers: [], fingerprint
  });

  const changed = structuredClone(unhealthy);
  changed.books.find((book) => book.id === 'partial-book').state = 'blocked';
  const changedPlan = planPortfolioHealthAlert(changed, existing);
  assert.equal(changedPlan.action, 'update');
  assert.notEqual(changedPlan.fingerprint, fingerprint);

  const recovered = structuredClone(unhealthy);
  for (const book of recovered.books) book.state = book.redacted ? 'scheduled' : 'healthy';
  assert.deepEqual(planPortfolioHealthAlert(recovered, existing), {
    action: 'recover', issueNumber: 278, duplicateIssueNumbers: [], fingerprint: null
  });
});

test('alert planner keeps the oldest alert as primary and consolidates duplicates', () => {
  const unhealthy = report();
  const fingerprint = alertFingerprint(unhealthy);
  const alerts = [
    { number: 300, body: `${PORTFOLIO_HEALTH_ALERT_MARKER}\n${fingerprint}` },
    { number: 278, body: `${PORTFOLIO_HEALTH_ALERT_MARKER}\n<!-- portfolio-health-fingerprint:${fingerprint} -->` }
  ];
  assert.deepEqual(planPortfolioHealthAlert(unhealthy, alerts), {
    action: 'deduplicate', issueNumber: 278, duplicateIssueNumbers: [300], fingerprint
  });
});

test('duplicate and recovery alert execution closes duplicates then the primary issue', async () => {
  const calls = [];
  const api = {
    async request(requestPath, options = {}) {
      calls.push({ requestPath, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : null });
      return {};
    }
  };
  const result = await executePortfolioHealthAlertPlan(api, 'org/portal', report(), {
    action: 'recover', issueNumber: 278, duplicateIssueNumbers: [300], fingerprint: null
  });
  assert.deepEqual(result, { action: 'closed', issueNumber: 278, closedDuplicateCount: 1 });
  assert.deepEqual(calls.map((call) => [call.requestPath, call.method, call.body?.state_reason]), [
    ['/repos/org/portal/issues/300/comments', 'POST', undefined],
    ['/repos/org/portal/issues/300', 'PATCH', 'not_planned'],
    ['/repos/org/portal/issues/278/comments', 'POST', undefined],
    ['/repos/org/portal/issues/278', 'PATCH', 'completed']
  ]);
});

test('scheduled private-redacted status alone never creates an alert', () => {
  const privateOnlyCatalog = { books: [catalog.books.find((book) => book.id === 'private-book')] };
  const privateOnly = buildPortfolioHealthReport(privateOnlyCatalog, observations, { now });
  assert.deepEqual(planPortfolioHealthAlert(privateOnly, []), {
    action: 'none', issueNumber: null, duplicateIssueNumbers: [], fingerprint: null
  });
});

test('rendering is deterministic for fixed inputs', () => {
  const first = serializePortfolioHealthReport(report());
  const second = serializePortfolioHealthReport(report());
  assert.equal(first, second);
  assert.match(renderPortfolioHealthMarkdown(report()), /status=published/);
});

test('open Issue summaries count work and classify debt without retaining Issue text', () => {
  const summary = summarizeOpenIssues([
    { number: 1, title: 'Security audit vulnerability', labels: [{ name: 'security' }] },
    { number: 2, title: 'Visual QA and Pages build', labels: [] },
    { number: 3, title: 'Scheduled maintenance: next review', labels: [{ name: 'security' }] },
    { number: 4, title: 'A PR title that must not be retained', pull_request: {} }
  ]);
  assert.deepEqual(summary, {
    openIssues: 3,
    openPullRequests: 1,
    scheduledMaintenanceAlerts: 1,
    issueDebt: { security: 1, freshness: 0, qa: 1, visual: 1, build: 1 }
  });
  assert.doesNotMatch(JSON.stringify(summary), /vulnerability|A PR title|next review/i);
});

test('GitHub client retries rate-limited 403, 429, and 5xx without exposing response bodies', async () => {
  for (const status of [403, 429, 503]) {
    let calls = 0;
    const delays = [];
    const client = createGitHubClient({
      maxAttempts: 2,
      retryDelayMs: 1,
      sleep: async (delay) => delays.push(delay),
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) return new Response(JSON.stringify({ message: 'PRIVATE-SENTINEL' }), {
          status, headers: status === 429 ? { 'Retry-After': '0' } : {
            'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000)),
            ...(status === 403 ? { 'X-RateLimit-Remaining': '0' } : {})
          }
        });
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
    });
    assert.deepEqual(await client.request('/safe'), { ok: true });
    assert.equal(calls, 2);
    assert.equal(delays.length, 1);
  }
});

test('GitHub client does not retry a permission-denied 403', async () => {
  let calls = 0;
  const client = createGitHubClient({
    maxAttempts: 4,
    retryDelayMs: 1,
    sleep: async () => assert.fail('permission 403 must not sleep'),
    fetchImpl: async () => {
      calls += 1;
      return new Response(JSON.stringify({ message: 'Resource not accessible by integration' }), { status: 403 });
    }
  });
  await assert.rejects(() => client.request('/permission'), (error) => {
    assert.ok(error instanceof GitHubRequestError);
    assert.equal(error.status, 403);
    assert.doesNotMatch(error.message, /Resource not accessible/);
    return true;
  });
  assert.equal(calls, 1);
});

test('sanitized cache restores only missing aggregates and preserves current partial state', async () => {
  const scratchRoot = path.join(process.cwd(), '.test-tmp');
  await mkdir(scratchRoot, { recursive: true });
  const directory = await mkdtemp(path.join(scratchRoot, 'portfolio-cache-'));
  const cachedSource = {
    access: 'authorized',
    defaultBranch: 'main',
    defaultBranchSha: 'e'.repeat(40),
    openIssues: 7,
    openPullRequests: 2,
    issueDebt: { security: 0, freshness: 1, qa: 0, visual: 0, build: 0 },
    scheduledMaintenanceAlerts: 1,
    latestBookQa: { status: 'completed', conclusion: 'success', createdAt: '2026-07-22T00:00:00Z' },
    latestVisualCheck: null,
    latestPagesDeployment: { status: 'success', sha: 'e'.repeat(40) },
    pages: { buildType: 'workflow', status: 'built' },
    publicHttp: { status: 200, ok: true },
    securityAlertCount: 0,
    securityScheduled: false,
    partialAreas: []
  };
  await writeSanitizedCache(directory, 'normal-book', cachedSource);
  const cached = await readSanitizedCache(directory, 'normal-book');
  assert.equal(cached.openIssues, 7);
  assert.doesNotMatch(JSON.stringify(cached), /PRIVATE|https?:\/\/|title|error/i);
  const merged = mergeCachedObservation({
    access: 'authorized',
    defaultBranch: 'main',
    defaultBranchSha: null,
    openIssues: null,
    openPullRequests: 9,
    issueDebt: null,
    scheduledMaintenanceAlerts: null,
    securityAlertCount: null,
    securityScheduled: true,
    partialAreas: ['open-work', 'default-branch']
  }, cached);
  assert.equal(merged.defaultBranchSha, 'e'.repeat(40));
  assert.equal(merged.openIssues, 7);
  assert.equal(merged.openPullRequests, 9);
  assert.equal(merged.securityScheduled, true);
  assert.equal(merged.cacheFallback, true);
});


test('CLI writes only requested tmp reports and Pages build-artifact snapshots', async () => {
  const scratchRoot = path.join(process.cwd(), '.test-tmp');
  await mkdir(scratchRoot, { recursive: true });
  const directory = await mkdtemp(path.join(scratchRoot, 'portfolio-health-'));
  const normal = catalog.books.find((book) => book.id === 'normal-book');
  const privateBook = catalog.books.find((book) => book.id === 'private-book');
  let actionsRequestPath = null;
  const api = {
    async request(requestPath) {
      if (requestPath === `/repos/${normal.repo}`) return { default_branch: 'main' };
      if (requestPath === `/repos/${normal.repo}/commits/main`) return { sha: 'd'.repeat(40) };
      if (requestPath.includes('/issues?state=open')) return [];
      if (requestPath.includes('/actions/runs?')) {
        actionsRequestPath = requestPath;
        return { workflow_runs: [
          { name: 'Book QA', head_branch: 'feature/broken', status: 'completed', conclusion: 'failure', created_at: '2026-07-23T00:00:00Z' },
          { name: 'Book QA', head_branch: 'main', status: 'completed', conclusion: 'success', created_at: '2026-07-22T00:00:00Z' },
          { name: 'Pages visual check', head_branch: 'feature/broken', status: 'completed', conclusion: 'failure', created_at: '2026-07-23T00:00:00Z' },
          { name: 'Pages visual check', head_branch: 'main', status: 'completed', conclusion: 'success', created_at: '2026-07-22T00:00:00Z' }
        ] };
      }
      if (requestPath.includes('/deployments?')) return [{ id: 1, sha: 'd'.repeat(40), created_at: '2026-07-22T00:00:00Z' }];
      if (requestPath.includes('/deployments/1/statuses')) return [{ state: 'success' }];
      if (requestPath.endsWith('/pages')) return { build_type: 'workflow', status: 'built' };
      throw new Error(`unexpected path ${requestPath}`);
    }
  };
  const reportJson = path.join(directory, 'tmp', 'report.json');
  const reportHtml = path.join(directory, 'tmp', 'index.html');
  const reportMarkdown = path.join(directory, 'tmp', 'summary.md');
  const snapshotDir = path.join(directory, '_site');
  const cacheDir = path.join(directory, 'tmp', 'cache');
  try {
    await writeSanitizedCache(cacheDir, privateBook.id, {
      access: 'authorized', defaultBranchSha: 'f'.repeat(40), openIssues: 9,
      openPullRequests: 3, latestPagesDeployment: { sha: 'e'.repeat(40), status: 'success' }, partialAreas: []
    });
    await writeSanitizedCache(cacheDir, 'obsolete-book', {
      access: 'authorized', defaultBranchSha: '0'.repeat(40), partialAreas: []
    });
    const result = await runPortfolioHealth({
      catalogPath: 'unused-by-injected-catalog', apiUrl: 'https://api.example.test', token: '',
      portalRepository: '', manageAlerts: false, maxAttempts: 1, retryDelayMs: 0, concurrency: 1,
      reportJson, reportHtml, reportMarkdown, cacheDir, snapshotDir
    }, {
      catalog: { books: [normal, privateBook] }, api,
      fetchImpl: async () => new Response('', { status: 200 }), now: () => now
    });
    assert.equal(result.report.source.recordCount, 2);
    const normalReport = result.report.books.find((book) => book.id === normal.id);
    assert.equal(normalReport.state, 'scheduled');
    assert.equal(normalReport.latestBookQa.conclusion, 'success');
    assert.match(actionsRequestPath, /[?&]branch=main(?:&|$)/);
    assert.equal(JSON.parse(await readFile(reportJson, 'utf8')).books.length, 2);
    assert.match(await readFile(reportHtml, 'utf8'), /<!doctype html>/i);
    assert.match(await readFile(reportMarkdown, 'utf8'), /Portfolio health/);
    assert.equal(JSON.parse(await readFile(path.join(snapshotDir, 'portfolio-health.json'), 'utf8')).books.length, 2);
    assert.match(await readFile(path.join(snapshotDir, 'portfolio-health', 'index.html'), 'utf8'), /<!doctype html>/i);
    for (const removed of [privateBook.id, 'obsolete-book']) {
      await assert.rejects(readFile(cachePath(cacheDir, removed), 'utf8'), (error) => error?.code === 'ENOENT');
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test.after(async () => {
  await rm(path.join(process.cwd(), '.test-tmp'), { recursive: true, force: true });
});
