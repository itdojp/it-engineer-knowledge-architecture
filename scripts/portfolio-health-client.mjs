import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';

export class GitHubRequestError extends Error {
  constructor(status, path) {
    super(`GitHub API request failed: HTTP ${status}`);
    this.status = status;
    this.path = path;
  }
}

function retryDelay(headers, attempt, fallbackMs) {
  const retryAfter = Number.parseFloat(headers.get('retry-after') || '');
  if (Number.isFinite(retryAfter) && retryAfter >= 0) return Math.ceil(retryAfter * 1000);
  const reset = Number.parseInt(headers.get('x-ratelimit-reset') || '', 10);
  if (Number.isFinite(reset)) return Math.min(60_000, Math.max(0, reset * 1000 - Date.now()));
  return Math.min(60_000, fallbackMs * (2 ** attempt));
}

function isRetryableApiResponse(response, body) {
  if (response.status === 429 || response.status >= 500) return true;
  if (response.status !== 403) return false;
  return response.headers.has('retry-after') ||
    response.headers.get('x-ratelimit-remaining') === '0' ||
    /secondary rate limit|abuse detection/i.test(body);
}

function isRetryablePublicStatus(status) {
  return status === 429 || status >= 500;
}

export function createGitHubClient({ apiUrl = 'https://api.github.com', token = '', maxAttempts = 4, retryDelayMs = 1_000, fetchImpl = globalThis.fetch, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const baseUrl = apiUrl.replace(/\/$/, '');
  async function request(path, options = {}) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      let response;
      try {
        response = await fetchImpl(`${baseUrl}${path}`, {
          ...options,
          headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers
          }
        });
      } catch {
        if (attempt + 1 >= maxAttempts) throw new GitHubRequestError(0, path);
        await sleep(retryDelay(new Headers(), attempt, retryDelayMs));
        continue;
      }
      const text = await response.text();
      if (!response.ok) {
        if (isRetryableApiResponse(response, text) && attempt + 1 < maxAttempts) {
          await sleep(retryDelay(response.headers, attempt, retryDelayMs));
          continue;
        }
        throw new GitHubRequestError(response.status, path);
      }
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
        throw new GitHubRequestError(response.status, path);
      }
    }
    throw new GitHubRequestError(0, path);
  }
  return { request };
}

function runSummary(run) {
  return run ? { status: run.status || null, conclusion: run.conclusion || null, createdAt: run.created_at || null } : null;
}

function matchingRun(runs, expression, defaultBranch) {
  return (runs || []).find((run) => expression.test(run.name || '') &&
    (!defaultBranch || run.head_branch === defaultBranch)) || null;
}

function safeErrorArea(area, error) {
  return { area, code: error instanceof GitHubRequestError ? `http-${error.status}` : 'request-failed' };
}

async function maybe(area, task, partialAreas) {
  try {
    return await task();
  } catch (error) {
    partialAreas.push(safeErrorArea(area, error));
    return null;
  }
}

const DEBT_PATTERNS = {
  security: /security|vulnerab|dependabot|audit|cve|脆弱|セキュリティ/i,
  freshness: /fresh|stale|outdated|source|citation|review|鮮度|更新|出典|レビュー/i,
  qa: /\bqa\b|quality|test|lint|品質|テスト|校正/i,
  visual: /visual|image|figure|diagram|mermaid|表示|画像|図表|図版/i,
  build: /build|jekyll|pages|dependency|gemfile|workflow|\bci\b|ビルド|依存/i
};
const SCHEDULED_PATTERN = /scheduled|maintenance|upstream|next[ -]?review|定期|保守|上流待ち|再確認/i;

function issueText(issue) {
  const labels = (issue.labels || []).map((label) => typeof label === 'string' ? label : label?.name || '');
  return `${issue.title || ''} ${labels.join(' ')}`;
}

export function summarizeOpenIssues(issues) {
  const summary = {
    openIssues: 0,
    openPullRequests: 0,
    scheduledMaintenanceAlerts: 0,
    issueDebt: { security: 0, freshness: 0, qa: 0, visual: 0, build: 0 }
  };
  for (const issue of issues || []) {
    if (issue.pull_request) {
      summary.openPullRequests += 1;
      continue;
    }
    summary.openIssues += 1;
    const text = issueText(issue);
    if (SCHEDULED_PATTERN.test(text)) {
      summary.scheduledMaintenanceAlerts += 1;
      continue;
    }
    for (const [category, pattern] of Object.entries(DEBT_PATTERNS)) {
      if (pattern.test(text)) summary.issueDebt[category] += 1;
    }
  }
  return summary;
}

async function collectOpenIssues(api, repo) {
  const issues = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = await api.request(`/repos/${repo}/issues?state=open&per_page=100&page=${page}`);
    issues.push(...batch);
    if (batch.length < 100) return summarizeOpenIssues(issues);
  }
  throw new GitHubRequestError(0, `/repos/${repo}/issues`);
}

async function requestPublicHttp(url, { fetchImpl, maxAttempts = 4, retryDelayMs = 1_000, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(15_000) });
      if (isRetryablePublicStatus(response.status) && attempt + 1 < maxAttempts) {
        await sleep(retryDelay(response.headers, attempt, retryDelayMs));
        continue;
      }
      return { status: response.status, ok: response.ok };
    } catch {
      if (attempt + 1 >= maxAttempts) throw new GitHubRequestError(0, 'public-http');
      await sleep(retryDelay(new Headers(), attempt, retryDelayMs));
    }
  }
  throw new GitHubRequestError(0, 'public-http');
}

export async function collectPublicBookObservation(book, { api, fetchImpl = globalThis.fetch } = {}) {
  const partial = [];
  const repo = book.repo;
  const repository = await maybe('repository', () => api.request(`/repos/${repo}`), partial);
  const defaultBranch = repository?.default_branch || null;
  const commit = defaultBranch ? await maybe('default-branch', () => api.request(`/repos/${repo}/commits/${encodeURIComponent(defaultBranch)}`), partial) : null;
  const [openWork, runs, deployments, pages, publicHttp] = await Promise.all([
    maybe('open-work', () => collectOpenIssues(api, repo), partial),
    maybe('actions', () => api.request(`/repos/${repo}/actions/runs?branch=${encodeURIComponent(defaultBranch || '')}&per_page=100`), partial),
    maybe('deployments', () => api.request(`/repos/${repo}/deployments?environment=github-pages&per_page=1`), partial),
    maybe('pages', () => api.request(`/repos/${repo}/pages`), partial),
    maybe('public-http', () => requestPublicHttp(book.pagesUrl, { fetchImpl }), partial)
  ]);
  let latestPagesDeployment = null;
  if (Array.isArray(deployments) && deployments[0]) {
    const deployment = deployments[0];
    const statuses = await maybe('deployment-status', () => api.request(`/repos/${repo}/deployments/${deployment.id}/statuses?per_page=1`), partial);
    latestPagesDeployment = { sha: deployment.sha || null, status: statuses?.[0]?.state || null, createdAt: deployment.created_at || null };
  }
  const workflowRuns = runs?.workflow_runs || [];
  return {
    access: 'authorized',
    defaultBranch,
    defaultBranchSha: commit?.sha || null,
    openIssues: openWork?.openIssues,
    openPullRequests: openWork?.openPullRequests,
    issueDebt: openWork?.issueDebt || null,
    scheduledMaintenanceAlerts: openWork?.scheduledMaintenanceAlerts,
    latestBookQa: runSummary(matchingRun(workflowRuns, /book\s*qa/i, defaultBranch)),
    latestVisualCheck: runSummary(matchingRun(workflowRuns, /visual/i, defaultBranch)),
    latestPagesDeployment,
    pages: pages ? { buildType: pages.build_type || null, status: pages.status || null } : null,
    publicHttp,
    // A repository-scoped GITHUB_TOKEN cannot inspect Dependabot alerts across
    // the portfolio. Security debt is derived from tracked Issues and Book QA;
    // direct alert review remains an explicit scheduled repository task.
    securityScheduled: true,
    partialAreas: partial.map((entry) => entry.area)
  };
}

export function cachePath(cacheDir, bookId) {
  return join(cacheDir, `${createHash('sha256').update(bookId).digest('hex')}.json`);
}

/** Removes restored entries that no longer belong to a published public catalog record. */
export async function pruneSanitizedCache(cacheDir, allowedBookIds) {
  if (!cacheDir) return;
  const allowedNames = new Set([...allowedBookIds].map((bookId) => cachePath('', bookId)));
  let entries;
  try {
    entries = await readdir(cacheDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  await Promise.all(entries.map(async (entry) => {
    if (!entry.isFile() || !allowedNames.has(entry.name)) {
      await rm(join(cacheDir, entry.name), { recursive: true, force: true });
    }
  }));
}

function sanitizedObservation(observation) {
  return {
    access: 'authorized',
    defaultBranch: observation.defaultBranch || null,
    defaultBranchSha: observation.defaultBranchSha || null,
    openIssues: Number.isInteger(observation.openIssues) ? observation.openIssues : null,
    openPullRequests: Number.isInteger(observation.openPullRequests) ? observation.openPullRequests : null,
    issueDebt: observation.issueDebt || null,
    scheduledMaintenanceAlerts: Number.isInteger(observation.scheduledMaintenanceAlerts)
      ? observation.scheduledMaintenanceAlerts : null,
    latestBookQa: observation.latestBookQa || null,
    latestVisualCheck: observation.latestVisualCheck || null,
    latestPagesDeployment: observation.latestPagesDeployment || null,
    pages: observation.pages || null,
    publicHttp: observation.publicHttp || null,
    securityScheduled: observation.securityScheduled === true
  };
}

/** Dynamic cache stores only sanitized aggregate observations, never issue text, raw errors, URLs, or credentials. */
export async function writeSanitizedCache(cacheDir, bookId, observation) {
  if (!cacheDir || observation?.access !== 'authorized' || (observation.partialAreas || []).length > 0) return;
  const safe = {
    cachedAt: new Date().toISOString(),
    bookId,
    observation: sanitizedObservation(observation)
  };
  const target = cachePath(cacheDir, bookId);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(safe)}\n`, 'utf8');
}

export async function readSanitizedCache(cacheDir, bookId) {
  if (!cacheDir) return null;
  try {
    const cached = JSON.parse(await readFile(cachePath(cacheDir, bookId), 'utf8'));
    return cached?.bookId === bookId && cached.observation?.access === 'authorized'
      ? cached.observation : null;
  } catch {
    return null;
  }
}

/** Reuses only missing aggregate fields and always preserves the current run's partial-failure marker. */
export function mergeCachedObservation(current, cached) {
  if (!cached || current?.access !== 'authorized') return current;
  const merged = { ...current };
  let usedCache = false;
  for (const field of [
    'defaultBranch', 'defaultBranchSha', 'openIssues', 'openPullRequests', 'issueDebt',
    'scheduledMaintenanceAlerts', 'latestBookQa', 'latestVisualCheck', 'latestPagesDeployment',
    'pages', 'publicHttp'
  ]) {
    if ((merged[field] === null || merged[field] === undefined) && cached[field] !== null && cached[field] !== undefined) {
      merged[field] = cached[field];
      usedCache = true;
    }
  }
  // The current run remains authoritative about permission/partial state even when
  // a previous aggregate value is displayed as a fallback.
  merged.cacheFallback = usedCache;
  return merged;
}
