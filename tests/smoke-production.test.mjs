import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { test } from 'node:test';

import catalog from '../docs/_data/catalog.json' with { type: 'json' };
import { runProductionSmoke } from '../scripts/smoke-production.mjs';
import { createBuildInfo, writeBuildInfo } from '../scripts/write-build-info.mjs';

const SHA = '1234567890abcdef1234567890abcdef12345678';
const OTHER_SHA = 'abcdef1234567890abcdef1234567890abcdef12';
const basePath = '/it-engineer-knowledge-architecture/';
const BOOK_COUNT = catalog.books.length;
const PATH_COUNT = catalog.learningPaths.length;

function page(title, content = '') {
  return `<!doctype html><html><body><nav aria-label="主要ナビゲーション"></nav><main id="main-content"><h1>${title}</h1>${content}</main></body></html>`;
}

async function startSite(options = {}) {
  let transientFailures = options.transientFailures || 0;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const relative = url.pathname.startsWith(basePath) ? url.pathname.slice(basePath.length) : null;
    if (options.delayPath === relative) await new Promise((resolve) => setTimeout(resolve, options.delayMs || 100));
    const forcedStatus = options.statuses?.[relative];
    if (forcedStatus) {
      response.writeHead(forcedStatus, { 'Content-Type': 'text/plain' });
      response.end(`forced ${forcedStatus}`);
      return;
    }
    if (options.transientPath === relative && transientFailures > 0) {
      transientFailures -= 1;
      response.writeHead(503, { 'Content-Type': 'text/plain' });
      response.end('deployment is still propagating');
      return;
    }
    const routes = {
      '': page(
        'ITエンジニア知識アーキテクチャ',
        `<a href="${basePath}books/">books</a><a href="${basePath}paths/">paths</a><a href="${basePath}en/">en</a>${options.oldMarker || ''}`
      ),
      'books/': page('書籍一覧', '<article data-book-card></article>'.repeat(options.cardCount ?? BOOK_COUNT)),
      'paths/': page('学習パス', '<article class="path-card"></article>'.repeat(options.pathCount ?? PATH_COUNT)),
      'en/': page('English Catalog', '<tr data-en-book></tr>'.repeat(options.enBookCount ?? BOOK_COUNT)),
      '404.html': page('ページが見つかりません')
    };
    if (relative === 'build-info.json') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({
        repository: 'itdojp/it-engineer-knowledge-architecture',
        sha: options.sha || SHA,
        ref: 'refs/heads/main',
        runId: '100',
        runAttempt: '1',
        builtAt: '2026-07-11T00:00:00.000Z'
      }));
      return;
    }
    if (relative !== null && routes[relative]) {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(routes[relative]);
      return;
    }
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('not found');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}${basePath}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}

async function withSite(options, callback) {
  const site = await startSite(options);
  const output = await mkdtemp(join(process.cwd(), '.smoke-test-'));
  try {
    return await callback(site, output);
  } finally {
    await site.close();
    await rm(output, { recursive: true, force: true });
  }
}

function config(site, output, overrides = {}) {
  return {
    baseUrl: site.baseUrl,
    expectedSha: SHA,
    maxAttempts: 1,
    retryDelayMs: 0,
    timeoutMs: 500,
    reportJson: join(output, 'report.json'),
    reportMarkdown: join(output, 'report.md'),
    ...overrides
  };
}

test('build info uses workflow SHA and writes only to the requested artifact path', async () => {
  const output = await mkdtemp(join(process.cwd(), '.build-info-test-'));
  try {
    const env = {
      GITHUB_REPOSITORY: 'itdojp/it-engineer-knowledge-architecture',
      GITHUB_SHA: SHA,
      GITHUB_REF: 'refs/heads/main',
      GITHUB_RUN_ID: '42',
      GITHUB_RUN_ATTEMPT: '3'
    };
    const expected = createBuildInfo(env, new Date('2026-07-11T01:02:03Z'));
    const target = join(output, 'site', 'build-info.json');
    await writeBuildInfo(target, env, new Date('2026-07-11T01:02:03Z'));
    assert.deepEqual(JSON.parse(await readFile(target, 'utf8')), expected);
    assert.equal(expected.sha, SHA);
    assert.equal(expected.builtAt, '2026-07-11T01:02:03.000Z');
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('production smoke passes all required pages and writes reports', async () => {
  await withSite({}, async (site, output) => {
    const report = await runProductionSmoke(config(site, output));
    assert.equal(report.ok, true);
    assert.equal(report.actualSha, SHA);
    assert.equal(report.endpoints.length, 6);
    assert.equal(JSON.parse(await readFile(join(output, 'report.json'), 'utf8')).ok, true);
    assert.match(await readFile(join(output, 'report.md'), 'utf8'), /Result: \*\*PASS\*\*/);
  });
});


test('production smoke detects an English catalog count mismatch', async () => {
  await withSite({ enBookCount: BOOK_COUNT - 1 }, async (site, output) => {
    const report = await runProductionSmoke(config(site, output));
    assert.equal(report.ok, false);
    const english = report.endpoints.find((endpoint) => endpoint.label === '/en/');
    assert.equal(english.markers.enBookCount, BOOK_COUNT - 1);
    assert.match(english.errors.join('\n'), new RegExp(`English catalog books ${BOOK_COUNT - 1}, expected ${BOOK_COUNT}`));
  });
});

test('production smoke detects a SHA mismatch', async () => {
  await withSite({ sha: OTHER_SHA }, async (site, output) => {
    const report = await runProductionSmoke(config(site, output));
    assert.equal(report.ok, false);
    assert.equal(report.actualSha, OTHER_SHA);
    assert.match(report.endpoints.at(-1).errors.join('\n'), new RegExp(`${OTHER_SHA}.*${SHA}`));
  });
});

test('production smoke retries a transient deployment response with backoff', async () => {
  await withSite({ transientPath: 'build-info.json', transientFailures: 1 }, async (site, output) => {
    const delays = [];
    const report = await runProductionSmoke(
      config(site, output, { maxAttempts: 2, retryDelayMs: 25 }),
      { sleep: async (delay) => delays.push(delay) }
    );
    assert.equal(report.ok, true);
    assert.equal(report.attempts, 2);
    assert.deepEqual(delays, [25]);
  });
});

test('production smoke detects a required page returning 404', async () => {
  await withSite({ statuses: { 'books/': 404 } }, async (site, output) => {
    const report = await runProductionSmoke(config(site, output));
    assert.equal(report.ok, false);
    const books = report.endpoints.find((endpoint) => endpoint.label === '/books/');
    assert.equal(books.status, 404);
    assert.match(books.errors.join('\n'), /HTTP status 404/);
  });
});

test('production smoke detects the legacy README home marker', async () => {
  await withSite({ oldMarker: 'Building Your Tech Career, One Book at a Time' }, async (site, output) => {
    const report = await runProductionSmoke(config(site, output));
    assert.equal(report.ok, false);
    const home = report.endpoints.find((endpoint) => endpoint.label === '/');
    assert.match(home.errors.join('\n'), /old home marker remains/);
  });
});

test('production smoke reports request timeouts', async () => {
  await withSite({ delayPath: 'paths/', delayMs: 150 }, async (site, output) => {
    const report = await runProductionSmoke(config(site, output, { timeoutMs: 20 }));
    assert.equal(report.ok, false);
    const paths = report.endpoints.find((endpoint) => endpoint.label === '/paths/');
    assert.match(paths.errors.join('\n'), /AbortError|aborted|abort/i);
  });
});
