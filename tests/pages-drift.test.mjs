import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { ALERT_MARKER, ALERT_TITLE, runPagesDriftCheck } from '../scripts/check-pages-drift.mjs';

const REPOSITORY = 'itdojp/it-engineer-knowledge-architecture';
const SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);

class FakeApi {
  constructor({ deploymentSha = SHA, publicIssues = [] } = {}) {
    this.deploymentSha = deploymentSha;
    this.issues = structuredClone(publicIssues);
    this.calls = [];
    this.nextIssue = 900;
  }

  async request(path, options = {}) {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : null;
    this.calls.push({ path, method, body });
    if (method === 'GET' && path === `/repos/${REPOSITORY}`) return { default_branch: 'main' };
    if (method === 'GET' && path === `/repos/${REPOSITORY}/commits/main`) return { sha: SHA };
    if (method === 'GET' && path.includes('/deployments?')) {
      return [{ id: 77, sha: this.deploymentSha, created_at: '2026-07-11T00:00:00Z' }];
    }
    if (method === 'GET' && path.includes('/deployments/77/statuses')) return [{ state: 'success' }];
    if (method === 'GET' && path.includes('/issues?state=open')) return this.issues.filter((issue) => issue.state !== 'closed');
    if (method === 'POST' && path === `/repos/${REPOSITORY}/issues`) {
      const issue = { number: this.nextIssue++, state: 'open', title: body.title, body: body.body };
      this.issues.push(issue);
      return issue;
    }
    const commentMatch = path.match(/\/issues\/(\d+)\/comments$/);
    if (method === 'POST' && commentMatch) return { id: 1, body: body.body };
    const issueMatch = path.match(/\/issues\/(\d+)$/);
    if (method === 'PATCH' && issueMatch) {
      const issue = this.issues.find((candidate) => candidate.number === Number(issueMatch[1]));
      Object.assign(issue, body);
      return issue;
    }
    throw new Error(`Unhandled fake API request: ${method} ${path}`);
  }
}

function smokeResult({ ok = true, actualSha = SHA } = {}) {
  return {
    ok,
    actualSha,
    attempts: 1,
    endpoints: ok ? [] : [{ label: '/build-info.json', errors: ['SHA mismatch'] }]
  };
}

async function runWith(api, smoke, override = '') {
  const scratchRoot = join(process.cwd(), '.test-tmp');
  await mkdir(scratchRoot, { recursive: true });
  const directory = await mkdtemp(join(scratchRoot, 'pages-drift-'));
  const config = {
    repository: REPOSITORY,
    token: 'test-token',
    apiUrl: 'https://api.example.test',
    baseUrl: 'https://example.test/site/',
    expectedShaOverride: override,
    maxAttempts: 1,
    retryDelayMs: 0,
    timeoutMs: 100,
    reportJson: join(directory, 'report.json'),
    reportMarkdown: join(directory, 'report.md')
  };
  try {
    const report = await runPagesDriftCheck(config, {
      api,
      smokeRunner: async () => smoke,
      now: () => new Date('2026-07-11T01:02:03Z')
    });
    return {
      report,
      reportJson: JSON.parse(await readFile(config.reportJson, 'utf8')),
      reportMarkdown: await readFile(config.reportMarkdown, 'utf8')
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test.after(async () => {
  await rm(join(process.cwd(), '.test-tmp'), { recursive: true, force: true });
});

test('all three revisions match without mutating Issues', async () => {
  const api = new FakeApi();
  const { report, reportJson, reportMarkdown } = await runWith(api, smokeResult());
  assert.equal(report.ok, true);
  assert.equal(report.alert.action, 'none');
  assert.equal(reportJson.defaultBranchSha, SHA);
  assert.match(reportMarkdown, /Result: \*\*PASS\*\*/);
  assert.equal(api.calls.some((call) => call.method !== 'GET'), false);
});

test('mismatch creates one marked alert Issue', async () => {
  const api = new FakeApi({ deploymentSha: OTHER_SHA });
  const { report } = await runWith(api, smokeResult({ ok: false, actualSha: OTHER_SHA }));
  assert.equal(report.ok, false);
  assert.equal(report.alert.action, 'created');
  assert.equal(api.issues.length, 1);
  assert.equal(api.issues[0].title, ALERT_TITLE);
  assert.match(api.issues[0].body, new RegExp(ALERT_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('repeated mismatch comments on the existing alert without duplication', async () => {
  const api = new FakeApi({
    deploymentSha: OTHER_SHA,
    publicIssues: [{ number: 42, state: 'open', title: ALERT_TITLE, body: ALERT_MARKER }]
  });
  const { report } = await runWith(api, smokeResult({ ok: false, actualSha: OTHER_SHA }));
  assert.equal(report.alert.action, 'commented');
  assert.equal(report.alert.issueNumber, 42);
  assert.equal(api.issues.length, 1);
  assert.equal(api.calls.filter((call) => call.path.endsWith('/comments')).length, 1);
  assert.equal(api.calls.some((call) => call.method === 'POST' && call.path === `/repos/${REPOSITORY}/issues`), false);
});

test('mismatch consolidates pre-existing duplicate alerts into one open Issue', async () => {
  const api = new FakeApi({
    deploymentSha: OTHER_SHA,
    publicIssues: [
      { number: 42, state: 'open', title: ALERT_TITLE, body: ALERT_MARKER },
      { number: 43, state: 'open', title: 'legacy duplicate', body: ALERT_MARKER }
    ]
  });
  const { report } = await runWith(api, smokeResult({ ok: false, actualSha: OTHER_SHA }));
  assert.equal(report.alert.issueNumber, 42);
  assert.equal(report.alert.closedDuplicateCount, 1);
  assert.deepEqual(api.issues.map((issue) => issue.state), ['open', 'closed']);
});

test('recovery comments on and closes every open drift alert', async () => {
  const api = new FakeApi({
    publicIssues: [
      { number: 42, state: 'open', title: ALERT_TITLE, body: ALERT_MARKER },
      { number: 43, state: 'open', title: 'legacy duplicate', body: ALERT_MARKER }
    ]
  });
  const { report } = await runWith(api, smokeResult());
  assert.equal(report.ok, true);
  assert.equal(report.alert.action, 'closed');
  assert.equal(report.alert.closedCount, 2);
  assert.deepEqual(api.issues.map((issue) => issue.state), ['closed', 'closed']);
  assert.equal(api.calls.filter((call) => call.path.endsWith('/comments')).length, 2);
});

test('workflow_dispatch override provides an intentional mismatch test', async () => {
  const api = new FakeApi();
  const { report } = await runWith(api, smokeResult({ ok: false, actualSha: SHA }), OTHER_SHA);
  assert.equal(report.ok, false);
  assert.equal(report.expectedSha, OTHER_SHA);
  assert.ok(report.reasons.some((reason) => reason.includes('意図的な期待SHA')));
  assert.equal(report.alert.action, 'created');
});

test('invalid override is rejected before any GitHub API request', async () => {
  const api = new FakeApi();
  await assert.rejects(
    runPagesDriftCheck({
      repository: REPOSITORY,
      token: 'test-token',
      expectedShaOverride: 'invalid'
    }, { api, smokeRunner: async () => smokeResult() }),
    /40-character commit SHA/
  );
  assert.equal(api.calls.length, 0);
});
