import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runProductionSmoke } from './smoke-production.mjs';

const DEFAULT_BASE_URL = 'https://itdojp.github.io/it-engineer-knowledge-architecture/';
const ALERT_MARKER = '<!-- pages-drift-alert -->';
const ALERT_TITLE = '[Alert][Pages Drift] 公開サイトのデプロイ不整合';

function normalizeApiUrl(value) {
  return (value || 'https://api.github.com').replace(/\/$/, '');
}

function parseInteger(value, fallback, minimum = 0) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
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
    repository: values.repository || env.GITHUB_REPOSITORY,
    token: values.token || env.GITHUB_TOKEN,
    apiUrl: normalizeApiUrl(values['api-url'] || env.GITHUB_API_URL),
    baseUrl: values['base-url'] || env.PAGES_BASE_URL || DEFAULT_BASE_URL,
    expectedShaOverride: values['expected-sha-override'] || env.EXPECTED_SHA_OVERRIDE || '',
    maxAttempts: parseInteger(values['max-attempts'] || env.DRIFT_MAX_ATTEMPTS, 4, 1),
    retryDelayMs: parseInteger(values['retry-delay-ms'] || env.DRIFT_RETRY_DELAY_MS, 3_000),
    timeoutMs: parseInteger(values['timeout-ms'] || env.DRIFT_TIMEOUT_MS, 15_000, 1),
    reportJson: values['report-json'] || env.DRIFT_REPORT_JSON || 'tmp/pages-drift/report.json',
    reportMarkdown: values['report-markdown'] || env.DRIFT_REPORT_MARKDOWN || 'tmp/pages-drift/report.md'
  };
}

function assertConfig(config) {
  if (!/^[^/]+\/[^/]+$/.test(config.repository || '')) {
    throw new Error('repository must be in owner/name format');
  }
  if (!config.token) throw new Error('GitHub token is required');
  if (config.expectedShaOverride && !/^[0-9a-f]{40}$/i.test(config.expectedShaOverride)) {
    throw new Error('expected SHA override must be a 40-character commit SHA');
  }
}

function createApiClient(config, fetchImpl) {
  const request = async (path, options = {}) => {
    const response = await fetchImpl(`${config.apiUrl}${path}`, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${config.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`GitHub API ${options.method || 'GET'} ${path} returned invalid JSON (HTTP ${response.status})`);
      }
    }
    if (!response.ok) {
      const message = data?.message ? `: ${data.message}` : '';
      throw new Error(`GitHub API ${options.method || 'GET'} ${path} failed with HTTP ${response.status}${message}`);
    }
    return data;
  };
  return { request };
}

async function findLatestSuccessfulPagesDeployment(api, repository) {
  const deployments = await api.request(`/repos/${repository}/deployments?environment=github-pages&per_page=30`);
  for (const deployment of deployments) {
    const statuses = await api.request(`/repos/${repository}/deployments/${deployment.id}/statuses?per_page=30`);
    if (statuses.some((status) => status.state === 'success')) {
      return { id: deployment.id, sha: deployment.sha, createdAt: deployment.created_at };
    }
  }
  return null;
}

async function findOpenAlerts(api, repository) {
  const alerts = [];
  for (let page = 1; ; page += 1) {
    const issues = await api.request(`/repos/${repository}/issues?state=open&per_page=100&page=${page}`);
    alerts.push(...issues.filter((issue) => !issue.pull_request && (issue.title === ALERT_TITLE || issue.body?.includes(ALERT_MARKER))));
    if (issues.length < 100) break;
  }
  return alerts;
}

function formatSha(value) {
  return value ? `\`${value}\`` : '`取得不能`';
}

function toMarkdown(report) {
  const lines = [
    '# Pages drift report',
    '',
    ALERT_MARKER,
    `- Result: **${report.ok ? 'PASS' : 'FAIL'}**`,
    `- Repository: \`${report.repository}\``,
    `- Default branch: \`${report.defaultBranch}\``,
    `- Default branch SHA: ${formatSha(report.defaultBranchSha)}`,
    `- Expected SHA: ${formatSha(report.expectedSha)}${report.expectedShaOverride ? ' (workflow_dispatch override)' : ''}`,
    `- Latest successful Pages deployment SHA: ${formatSha(report.deploymentSha)}`,
    `- Public build-info SHA: ${formatSha(report.publicSha)}`,
    `- Public URL: ${report.baseUrl}`,
    `- Checked at: ${report.checkedAt}`,
    ''
  ];
  if (report.reasons.length > 0) {
    lines.push('## Detected anomalies', '', ...report.reasons.map((reason) => `- ${reason}`), '');
  }
  lines.push(
    '## Production smoke',
    '',
    `- Result: **${report.smoke.ok ? 'PASS' : 'FAIL'}**`,
    `- Attempts: ${report.smoke.attempts}`,
    `- Failed endpoints: ${report.smoke.endpoints.filter((endpoint) => endpoint.errors.length > 0).map((endpoint) => endpoint.label).join(', ') || 'none'}`,
    '',
    'このIssueは定期確認Workflowが管理します。復旧確認時に証跡をコメントして自動クローズします。'
  );
  return `${lines.join('\n')}\n`;
}

async function updateAlert(api, repository, report) {
  const openAlerts = await findOpenAlerts(api, repository);
  const body = toMarkdown(report);
  if (!report.ok) {
    if (openAlerts.length === 0) {
      const issue = await api.request(`/repos/${repository}/issues`, {
        method: 'POST',
        body: JSON.stringify({ title: ALERT_TITLE, body })
      });
      return { action: 'created', issueNumber: issue.number, openAlertCount: 1 };
    }
    const primary = openAlerts.find((issue) => issue.title === ALERT_TITLE) || openAlerts[0];
    await api.request(`/repos/${repository}/issues/${primary.number}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: `## 不整合の継続を確認\n\n${body}` })
    });
    for (const duplicate of openAlerts.filter((issue) => issue.number !== primary.number)) {
      await api.request(`/repos/${repository}/issues/${duplicate.number}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: `重複Alertを #${primary.number} に集約するため、このIssueをクローズします。` })
      });
      await api.request(`/repos/${repository}/issues/${duplicate.number}`, {
        method: 'PATCH',
        body: JSON.stringify({ state: 'closed', state_reason: 'not_planned' })
      });
    }
    return {
      action: 'commented',
      issueNumber: primary.number,
      openAlertCount: 1,
      closedDuplicateCount: openAlerts.length - 1
    };
  }
  if (openAlerts.length === 0) return { action: 'none', issueNumber: null, openAlertCount: 0 };
  for (const issue of openAlerts) {
    await api.request(`/repos/${repository}/issues/${issue.number}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: `## 復旧を確認\n\n${body}` })
    });
    await api.request(`/repos/${repository}/issues/${issue.number}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'closed', state_reason: 'completed' })
    });
  }
  return { action: 'closed', issueNumber: openAlerts[0].number, openAlertCount: 0, closedCount: openAlerts.length };
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

export async function runPagesDriftCheck(inputConfig, dependencies = {}) {
  const config = {
    apiUrl: normalizeApiUrl(inputConfig.apiUrl),
    repository: inputConfig.repository,
    token: inputConfig.token,
    baseUrl: inputConfig.baseUrl || DEFAULT_BASE_URL,
    expectedShaOverride: inputConfig.expectedShaOverride || '',
    maxAttempts: inputConfig.maxAttempts ?? 4,
    retryDelayMs: inputConfig.retryDelayMs ?? 3_000,
    timeoutMs: inputConfig.timeoutMs ?? 15_000,
    reportJson: inputConfig.reportJson ?? 'tmp/pages-drift/report.json',
    reportMarkdown: inputConfig.reportMarkdown ?? 'tmp/pages-drift/report.md'
  };
  assertConfig(config);
  const fetchImpl = dependencies.fetchImpl || globalThis.fetch;
  const api = dependencies.api || createApiClient(config, fetchImpl);
  const smokeRunner = dependencies.smokeRunner || runProductionSmoke;
  const now = dependencies.now || (() => new Date());

  const repository = await api.request(`/repos/${config.repository}`);
  const defaultBranch = repository.default_branch;
  const commit = await api.request(`/repos/${config.repository}/commits/${encodeURIComponent(defaultBranch)}`);
  const deployment = await findLatestSuccessfulPagesDeployment(api, config.repository);
  const defaultBranchSha = commit.sha;
  const expectedSha = config.expectedShaOverride || defaultBranchSha;
  const smoke = await smokeRunner({
    baseUrl: config.baseUrl,
    expectedSha,
    maxAttempts: config.maxAttempts,
    retryDelayMs: config.retryDelayMs,
    timeoutMs: config.timeoutMs,
    reportJson: `${config.reportJson}.smoke.json`,
    reportMarkdown: `${config.reportMarkdown}.smoke.md`
  });
  const reasons = [];
  if (!deployment) reasons.push('成功済みの github-pages deployment が見つかりません。');
  if (config.expectedShaOverride && defaultBranchSha !== expectedSha) {
    reasons.push(`意図的な期待SHAとdefault branch SHAが一致しません: ${expectedSha} != ${defaultBranchSha}`);
  }
  if (deployment && deployment.sha !== expectedSha) {
    reasons.push(`Pages deployment SHAが期待SHAと一致しません: ${deployment.sha} != ${expectedSha}`);
  }
  if (smoke.actualSha !== expectedSha) {
    reasons.push(`公開build-info SHAが期待SHAと一致しません: ${smoke.actualSha || '取得不能'} != ${expectedSha}`);
  }
  if (!smoke.ok) reasons.push('本番スモークテストが失敗しました。');

  const report = {
    ok: reasons.length === 0,
    repository: config.repository,
    defaultBranch,
    defaultBranchSha,
    expectedSha,
    expectedShaOverride: config.expectedShaOverride || null,
    deploymentId: deployment?.id || null,
    deploymentSha: deployment?.sha || null,
    publicSha: smoke.actualSha || null,
    baseUrl: config.baseUrl,
    checkedAt: now().toISOString(),
    reasons,
    smoke,
    alert: null
  };
  report.alert = await updateAlert(api, config.repository, report);
  await writeReport(report, config);
  return report;
}

export { ALERT_MARKER, ALERT_TITLE, parseArgs, toMarkdown };

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const report = await runPagesDriftCheck(parseArgs(process.argv.slice(2)));
    console.log(toMarkdown(report));
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  }
}
