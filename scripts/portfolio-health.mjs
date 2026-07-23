import { createHash } from 'node:crypto';

export const PORTFOLIO_HEALTH_SCHEMA_VERSION = '1.0.0';
export const PORTFOLIO_HEALTH_ALERT_MARKER = '<!-- portfolio-health-alert -->';
export const PORTFOLIO_HEALTH_FINGERPRINT_PREFIX = '<!-- portfolio-health-fingerprint:';

const DAY_MS = 24 * 60 * 60 * 1000;
const HEALTHY_PAGES_STATUSES = new Set(['built', 'success']);

function compareBooks(left, right) {
  return (left.displayOrder ?? Number.MAX_SAFE_INTEGER) - (right.displayOrder ?? Number.MAX_SAFE_INTEGER) ||
    left.id.localeCompare(right.id);
}

function asCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function dateAgeDays(value, now) {
  if (typeof value !== 'string') return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(timestamp)) return null;
  return Math.floor((now.getTime() - timestamp) / DAY_MS);
}

function runConclusionDebt(run) {
  if (!run) return 1;
  return run.status === 'completed' && run.conclusion === 'success' ? 0 : 1;
}

function optionalRunConclusionDebt(run) {
  return run ? runConclusionDebt(run) : 0;
}

function fixedReason(code) {
  const messages = {
    'private-redacted': 'private リポジトリの動的情報は公開出力で非表示にし、権限を持つ定期実行へ委譲しています。',
    'public-http-failed': '公開HTTP応答が成功ではありません。',
    'pages-build-failed': 'GitHub Pages ビルドの状態が正常ではありません。',
    'pages-deployment-missing': '最新の Pages deployment を取得できません。',
    'partial-observation': '一部の動的観測を取得できませんでした。次回定期実行で再確認します。',
    'cache-fallback': '取得不能項目には前回のsanitized cacheを使用しています。',
    'scheduled-maintenance': '期限または上流更新を待つ定期メンテナンス項目があります。',
    'security-scheduled': '横断credentialを保存しないためDependabot alert APIは直接照会せず、security Issue・Book QAと書籍別保守で確認します。',
    'security-debt': 'セキュリティ関連の未解消項目があります。',
    'freshness-debt': 'カタログの最終レビューが未設定または更新期限を超えています。',
    'qa-debt': '最新 Book QA の失敗または未検出を確認してください。',
    'visual-debt': 'visual check の失敗または未解消のvisual課題を確認してください。',
    'build-debt': 'Pages build/deployment の状態を確認してください。'
  };
  return messages[code] || '定期メンテナンスで確認が必要です。';
}

function nonEmptyStrings(values) {
  return [...new Set((values || []).filter((value) => typeof value === 'string' && value !== ''))];
}

/** Returns the exact catalog input set: every and only `status === "published"` book. */
export function selectPublishedBooks(catalog) {
  if (!catalog || !Array.isArray(catalog.books)) throw new Error('catalog.books must be an array');
  return catalog.books.filter((book) => book?.status === 'published').sort(compareBooks);
}

export function buildBookHealth(book, observation = {}, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const reviewMaxAgeDays = options.reviewMaxAgeDays ?? 180;
  const privateRedacted = book.repoVisibility === 'private' && observation.access !== 'authorized';
  const reviewAgeDays = dateAgeDays(book.lastReviewedAt, now);

  const base = {
    // These identifiers are already published by the canonical catalog. Private
    // repository API observations are never copied into this record.
    id: book.id,
    repository: book.repo,
    repoVisibility: book.repoVisibility,
    publicationScope: book.publicationScope,
    lastReviewedAt: book.lastReviewedAt || null,
    state: 'scheduled',
    reasons: [],
    nextAction: '権限を持つ定期メンテナンスで確認する。',
    redacted: privateRedacted,
    defaultBranch: null,
    defaultBranchSha: null,
    openIssues: null,
    openPullRequests: null,
    latestBookQa: null,
    latestVisualCheck: null,
    latestPagesDeployment: null,
    pages: null,
    publicHttp: null,
    partialObservation: null,
    scheduledMaintenanceAlerts: null,
    maintenance: {
      security: { count: null, scheduled: true },
      freshness: { count: 0, scheduled: false },
      qa: { count: 0, scheduled: false },
      visual: { count: 0, scheduled: false },
      build: { count: 0, scheduled: false }
    }
  };

  if (privateRedacted) {
    base.reasons = [fixedReason('private-redacted')];
    return base;
  }

  const latestBookQa = observation.latestBookQa || null;
  const latestVisualCheck = observation.latestVisualCheck || null;
  const latestPagesDeployment = observation.latestPagesDeployment || null;
  const pages = observation.pages || null;
  const publicHttp = observation.publicHttp || null;
  const freshnessDebt = reviewAgeDays === null || reviewAgeDays > reviewMaxAgeDays ? 1 : 0;
  const qaDebt = runConclusionDebt(latestBookQa);
  // A dedicated visual workflow is not universal. Absence is not debt; an
  // observed failure or a classified open Issue is.
  const visualDebt = optionalRunConclusionDebt(latestVisualCheck);
  const pagesStatusKnown = typeof pages?.status === 'string' && pages.status !== '';
  const pagesStatusHealthy = pagesStatusKnown && HEALTHY_PAGES_STATUSES.has(pages.status);
  const pagesStatusFailed = pagesStatusKnown && !pagesStatusHealthy;
  const deploymentHealthy = latestPagesDeployment && latestPagesDeployment.status === 'success';
  const deploymentFailed = latestPagesDeployment && latestPagesDeployment.status && !deploymentHealthy;
  const buildDebt = pagesStatusFailed || !deploymentHealthy ? 1 : 0;
  const securityCount = asCount(observation.securityAlertCount);
  const issueDebt = observation.issueDebt || {};
  const scheduledMaintenanceAlerts = asCount(observation.scheduledMaintenanceAlerts) ?? 0;
  const partialAreas = nonEmptyStrings(observation.partialAreas);
  const securityScheduled = observation.securityScheduled === true || securityCount === null;

  base.defaultBranch = observation.defaultBranch || null;
  base.defaultBranchSha = observation.defaultBranchSha || null;
  base.openIssues = asCount(observation.openIssues);
  base.openPullRequests = asCount(observation.openPullRequests);
  base.latestBookQa = latestBookQa && {
    status: latestBookQa.status || null,
    conclusion: latestBookQa.conclusion || null,
    createdAt: latestBookQa.createdAt || null
  };
  base.latestVisualCheck = latestVisualCheck && {
    status: latestVisualCheck.status || null,
    conclusion: latestVisualCheck.conclusion || null,
    createdAt: latestVisualCheck.createdAt || null
  };
  base.latestPagesDeployment = latestPagesDeployment && {
    sha: latestPagesDeployment.sha || null,
    status: latestPagesDeployment.status || null,
    createdAt: latestPagesDeployment.createdAt || null
  };
  base.pages = pages && { buildType: pages.buildType || null, status: pages.status || null };
  base.publicHttp = publicHttp && { status: asCount(publicHttp.status), ok: publicHttp.ok === true };
  base.partialObservation = partialAreas.length > 0;
  base.scheduledMaintenanceAlerts = scheduledMaintenanceAlerts;
  const debt = {
    security: (securityCount ?? 0) + (asCount(issueDebt.security) ?? 0),
    freshness: freshnessDebt + (asCount(issueDebt.freshness) ?? 0),
    qa: qaDebt + (asCount(issueDebt.qa) ?? 0),
    visual: visualDebt + (asCount(issueDebt.visual) ?? 0),
    build: buildDebt + (asCount(issueDebt.build) ?? 0)
  };
  base.maintenance = {
    security: { count: securityCount === null && !Number.isInteger(issueDebt.security) ? null : debt.security, scheduled: securityScheduled },
    freshness: { count: debt.freshness, scheduled: false },
    qa: { count: debt.qa, scheduled: false },
    visual: { count: debt.visual, scheduled: false },
    build: { count: debt.build, scheduled: false }
  };

  const reasons = [];
  if (publicHttp && publicHttp.ok !== true) reasons.push('public-http-failed');
  if (pagesStatusFailed || deploymentFailed) reasons.push('pages-build-failed');
  if (!latestPagesDeployment) reasons.push('pages-deployment-missing');
  if (partialAreas.length > 0) reasons.push('partial-observation');
  if (observation.cacheFallback) reasons.push('cache-fallback');
  if (scheduledMaintenanceAlerts > 0) reasons.push('scheduled-maintenance');
  if (securityScheduled) reasons.push('security-scheduled');
  if (debt.security) reasons.push('security-debt');
  if (debt.freshness) reasons.push('freshness-debt');
  if (debt.qa) reasons.push('qa-debt');
  if (debt.visual) reasons.push('visual-debt');
  if (debt.build && !reasons.includes('pages-build-failed') && !reasons.includes('pages-deployment-missing')) {
    reasons.push('build-debt');
  }
  base.reasons = reasons.map(fixedReason);

  if ((publicHttp && publicHttp.ok !== true) || pagesStatusFailed || deploymentFailed) {
    base.state = 'blocked';
    base.nextAction = '公開経路または Pages build を復旧し、再実行する。';
  } else if (Object.values(debt).some((count) => count > 0) || partialAreas.length > 0) {
    base.state = 'attention';
    base.nextAction = '指摘された負債または部分取得失敗を確認し、次回定期実行で解消を検証する。';
  } else if (securityScheduled || scheduledMaintenanceAlerts > 0) {
    base.state = 'scheduled';
    base.nextAction = 'セキュリティ権限を持つ定期メンテナンスで確認する。';
  } else {
    base.state = 'healthy';
    base.nextAction = '次回の定期メンテナンスまで監視する。';
  }
  return base;
}

function summaryFor(books) {
  const states = { healthy: 0, attention: 0, blocked: 0, scheduled: 0 };
  const debt = { security: 0, freshness: 0, qa: 0, visual: 0, build: 0 };
  const scheduledMaintenance = { security: 0, freshness: 0, qa: 0, visual: 0, build: 0 };
  let scheduledAlerts = 0;
  let partialObservations = 0;
  for (const book of books) {
    states[book.state] += 1;
    for (const category of Object.keys(debt)) {
      debt[category] += book.maintenance[category].count || 0;
      scheduledMaintenance[category] += book.maintenance[category].scheduled ? 1 : 0;
    }
    scheduledAlerts += book.scheduledMaintenanceAlerts || 0;
    partialObservations += book.partialObservation === true ? 1 : 0;
  }
  return { states, debt, scheduledMaintenance, scheduledAlerts, partialObservations };
}

export function buildPortfolioHealthReport(catalog, observationsById = {}, options = {}) {
  const generatedAt = (options.now instanceof Date ? options.now : new Date()).toISOString();
  const books = selectPublishedBooks(catalog).map((book) => buildBookHealth(book, observationsById[book.id], options));
  return {
    schemaVersion: PORTFOLIO_HEALTH_SCHEMA_VERSION,
    generatedAt,
    source: { catalogStatus: 'published', recordCount: books.length },
    summary: summaryFor(books),
    books
  };
}

export function alertFingerprint(report) {
  const actionable = report.books
    .filter((book) => book.state === 'attention' || book.state === 'blocked')
    .map((book) => ({
      id: book.id,
      state: book.state,
      reasons: book.reasons,
      debt: Object.fromEntries(Object.entries(book.maintenance).map(([key, value]) => [key, value.count]))
    }));
  if (actionable.length === 0) return null;
  return createHash('sha256').update(JSON.stringify(actionable)).digest('hex').slice(0, 24);
}

export function fingerprintMarker(fingerprint) {
  return fingerprint ? `${PORTFOLIO_HEALTH_FINGERPRINT_PREFIX}${fingerprint} -->` : '';
}

export function planPortfolioHealthAlert(report, openAlerts = []) {
  const fingerprint = alertFingerprint(report);
  const alerts = openAlerts
    .filter((issue) => typeof issue?.body === 'string' && issue.body.includes(PORTFOLIO_HEALTH_ALERT_MARKER))
    .sort((left, right) => left.number - right.number);
  const primary = alerts[0] || null;
  const duplicateIssueNumbers = alerts.slice(1).map((issue) => issue.number);
  if (!fingerprint) {
    return primary ? { action: 'recover', issueNumber: primary.number, duplicateIssueNumbers, fingerprint: null } :
      { action: 'none', issueNumber: null, duplicateIssueNumbers: [], fingerprint: null };
  }
  if (!primary) return { action: 'create', issueNumber: null, duplicateIssueNumbers: [], fingerprint };
  if (primary.body.includes(fingerprintMarker(fingerprint))) {
    return duplicateIssueNumbers.length > 0
      ? { action: 'deduplicate', issueNumber: primary.number, duplicateIssueNumbers, fingerprint }
      : { action: 'none', issueNumber: primary.number, duplicateIssueNumbers: [], fingerprint };
  }
  return { action: 'update', issueNumber: primary.number, duplicateIssueNumbers, fingerprint };
}

function markdownCell(value) {
  return String(value ?? '取得不能').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function observationValue(book, value) {
  return book.redacted ? 'redacted' : (value ?? '取得不能');
}

export function renderPortfolioHealthMarkdown(report) {
  const { states, debt, scheduledMaintenance, scheduledAlerts, partialObservations } = report.summary;
  const lines = [
    '# Portfolio health',
    '',
    `- 生成日時: ${report.generatedAt}`,
    `- 対象: catalog の \`status=published\` ${report.source.recordCount}冊（完全一致）`,
    `- 状態: healthy ${states.healthy} / attention ${states.attention} / blocked ${states.blocked} / scheduled ${states.scheduled}`,
    `- 負債: security ${debt.security} / freshness ${debt.freshness} / QA ${debt.qa} / visual ${debt.visual} / build ${debt.build}`,
    `- 定期確認待ち: security ${scheduledMaintenance.security} / freshness ${scheduledMaintenance.freshness} / QA ${scheduledMaintenance.qa} / visual ${scheduledMaintenance.visual} / build ${scheduledMaintenance.build}`,
    `- scheduled maintenance alert: ${scheduledAlerts}`,
    `- partial observation: ${partialObservations}`,
    '',
    '| Book | Repository | Visibility / scope | State | Issues | PRs | HTTP | Next action |',
    '| --- | --- | --- | --- | ---: | ---: | --- | --- |'
  ];
  for (const book of report.books) {
    lines.push(`| ${markdownCell(book.id)} | ${markdownCell(book.repository)} | ${markdownCell(book.repoVisibility)} / ${markdownCell(book.publicationScope)} | ${book.state} | ${markdownCell(observationValue(book, book.openIssues))} | ${markdownCell(observationValue(book, book.openPullRequests))} | ${markdownCell(observationValue(book, book.publicHttp?.status))} | ${markdownCell(book.nextAction)} |`);
  }
  return `${lines.join('\n')}\n`;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

export function renderPortfolioHealthHtml(report) {
  const runText = (run) => run ? `${run.conclusion || run.status || '取得不能'} / ${run.createdAt || '日時不明'}` : '取得不能';
  const pagesText = (book) => book.redacted ? 'redacted' : `${book.pages?.buildType || '取得不能'} / ${book.pages?.status || '取得不能'} / ${book.latestPagesDeployment?.status || '取得不能'}`;
  const debtText = (book) => Object.entries(book.maintenance)
    .map(([key, value]) => `${key}:${value.count ?? '?'}${value.scheduled ? '(scheduled)' : ''}`).join(' / ');
  const rows = report.books.map((book) => `<tr><td>${escapeHtml(book.id)}<br><small>${escapeHtml(book.repository)}</small></td><td>${escapeHtml(book.repoVisibility)} / ${escapeHtml(book.publicationScope)}</td><td>${escapeHtml(book.state)}</td><td>${escapeHtml(observationValue(book, book.defaultBranch))}<br><small>${escapeHtml(observationValue(book, book.defaultBranchSha?.slice(0, 12)))}</small></td><td>${escapeHtml(observationValue(book, book.openIssues))} / ${escapeHtml(observationValue(book, book.openPullRequests))}</td><td>${escapeHtml(observationValue(book, book.latestBookQa ? runText(book.latestBookQa) : null))}</td><td>${escapeHtml(pagesText(book))}</td><td>${escapeHtml(observationValue(book, book.publicHttp?.status))}</td><td>${escapeHtml(book.lastReviewedAt ?? '未記録')}</td><td>${escapeHtml(debtText(book))}<br><small>scheduled alerts: ${escapeHtml(book.scheduledMaintenanceAlerts ?? '取得不能')}</small></td><td>${escapeHtml(book.nextAction)}</td></tr>`).join('');
  const { states, debt, scheduledMaintenance, scheduledAlerts, partialObservations } = report.summary;
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Portfolio Health</title><style>body{font-family:system-ui,sans-serif;margin:2rem;line-height:1.5}.skip-link{position:absolute;left:-9999px}.skip-link:focus{left:1rem;top:1rem;background:#fff;padding:.5rem;z-index:10}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:1500px;font-size:.85rem}th,td{border:1px solid #bbb;padding:.45rem;text-align:left;vertical-align:top}th{background:#f3f4f6}small{color:#555}</style></head><body><a class="skip-link" href="#main-content">本文へスキップ</a><header role="banner"><div>ITエンジニア知識アーキテクチャ</div><nav aria-label="主要ナビゲーション"><a href="../">ホーム</a></nav></header><main id="main-content" tabindex="-1"><h1>Portfolio Health</h1><p>生成日時: ${escapeHtml(report.generatedAt)}</p><p>対象: catalog の <code>status=published</code> ${report.source.recordCount}冊（完全一致）</p><ul><li>状態: healthy ${states.healthy} / attention ${states.attention} / blocked ${states.blocked} / scheduled ${states.scheduled}</li><li>負債: security ${debt.security} / freshness ${debt.freshness} / QA ${debt.qa} / visual ${debt.visual} / build ${debt.build}</li><li>定期確認待ち: security ${scheduledMaintenance.security} / freshness ${scheduledMaintenance.freshness} / QA ${scheduledMaintenance.qa} / visual ${scheduledMaintenance.visual} / build ${scheduledMaintenance.build}</li><li>scheduled maintenance alert: ${scheduledAlerts}</li><li>partial observation: ${partialObservations}</li></ul><div class="table-wrap"><table><thead><tr><th>Book / repository</th><th>Visibility / scope</th><th>State</th><th>Branch / SHA</th><th>Issues / PRs</th><th>Book QA</th><th>Pages type / status / deployment</th><th>HTTP</th><th>Last reviewed</th><th>Debt / scheduled</th><th>Next action</th></tr></thead><tbody>${rows}</tbody></table></div></main><footer role="contentinfo"><p>Portfolio HealthはPages build時点の観測結果です。</p></footer></body></html>
`;
}

export function serializePortfolioHealthReport(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function renderPortfolioHealthAlert(report, fingerprint) {
  const actionable = report.books.filter((book) => book.state === 'attention' || book.state === 'blocked');
  return [
    '# Portfolio health の状態変化',
    '',
    PORTFOLIO_HEALTH_ALERT_MARKER,
    fingerprintMarker(fingerprint),
    '',
    `- fingerprint: \`${fingerprint}\``,
    `- 生成日時: ${report.generatedAt}`,
    '',
    ...actionable.map((book) => `- **${book.state}** \`${book.id}\`: ${book.reasons.join(' ')}`),
    '',
    'このIssueは定期確認Workflowが管理します。状態が復旧すると記録して自動クローズします。'
  ].join('\n');
}
