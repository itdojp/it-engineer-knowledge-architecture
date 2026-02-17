#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');

const FONT_SPEC_PATH = path.join(REPO_ROOT, 'docs', 'FONT-SPECIFICATION.md');

const DEFAULT_VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 }
};

const SUPPORTED_BROWSER_NAMES = new Set(['chromium', 'firefox', 'webkit']);

const FALLBACK_EXPECTED_FONT_VARS = {
  fontSans:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  fontMono: '"Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro", monospace'
};

const DEVICE_PROFILE_ALIASES = new Map([
  // iOS Safari
  ['iphone13', 'iPhone 13'],
  ['iphone13landscape', 'iPhone 13 landscape'],
  ['iphonese', 'iPhone SE'],
  ['iphonese3rdgen', 'iPhone SE (3rd gen)'],
  ['ipadmini', 'iPad Mini'],
  ['ipadminilandscape', 'iPad Mini landscape'],

  // Android Chrome
  ['pixel7', 'Pixel 7'],
  ['pixel7landscape', 'Pixel 7 landscape']
]);

function usage() {
  // Keep CLI help minimal; detailed usage is in README.
  console.log(`Usage:
  node run.mjs [options]

Options:
  --registry <path>         book-registry.json (default: repo docs/publishing/book-registry.json)
  --output <dir>            output dir (default: tools/pages-visual-check/output/<timestamp>)
  --browsers <list>         chromium,firefox,webkit (default: chromium)
  --viewports <list>        mobile,tablet,desktop (default: mobile,desktop)
  --devices <list>          Playwright device names or aliases (default: off; when set, viewports are ignored)
  --maxPagesPerBook <n>     pages per book incl. root (default: 4)
  --concurrency <n>         concurrent books (default: 3)
  --timeoutMs <ms>          navigation timeout (default: 45000)
  --fullPage                capture full-page screenshots (default: off)
  --captureSidebar          capture screenshots with sidebar/drawer opened (default: off)
  --skipScreenshots         do not capture screenshots (default: off)
  --onlyBooks <list>        book keys (default: all)
  --failOnWarnings          treat warnings as failures (default: off)
  --enforceFontSpec         fail when font vars drift from FONT-SPECIFICATION.md (default: off)
  --dryRun                  only resolve target URLs; do not run Playwright
  --help                    show this help
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    if (!raw.startsWith('--')) continue;

    const [key, inlineValue] = raw.slice(2).split('=');
    if (inlineValue !== undefined) {
      args[key] = inlineValue;
      continue;
    }

    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i++;
  }
  return args;
}

function toList(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBooleanArg(value, name) {
  if (value === undefined || value === null) return false;
  if (value === true) return true;
  if (value === false) return false;

  const normalized = String(value).trim().toLowerCase();
  if (normalized === '') return false;

  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;

  throw new Error(`invalid boolean for --${name}: ${value}`);
}

function parsePositiveIntArg(value, name, defaultValue, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = value === undefined || value === null ? String(defaultValue) : String(value);
  const normalized = raw.trim();
  if (!/^-?\d+$/.test(normalized)) {
    throw new Error(`invalid integer for --${name}: ${raw}`);
  }
  const n = Number.parseInt(normalized, 10);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Error(`out of range for --${name}: ${n} (allowed: ${min}..${max})`);
  }
  return n;
}

function assertNonEmptyList(list, name) {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`no ${name} specified`);
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toUrlPath(value) {
  // Normalize Windows path separators for use in HTML href/src.
  return String(value ?? '').replaceAll('\\', '/');
}

function summarizeStatuses(results) {
  const summary = { ok: 0, warn: 0, fail: 0 };
  for (const r of results ?? []) {
    if (r?.status === 'ok') summary.ok += 1;
    else if (r?.status === 'warn') summary.warn += 1;
    else if (r?.status === 'fail') summary.fail += 1;
  }
  return summary;
}

function buildHtmlReport(report) {
  const title = 'Pages Visual Check Report';
  const generatedAt = escapeHtml(report?.generatedAt ?? '');
  const fatalError = report?.fatalError ? escapeHtml(report.fatalError) : '';

  const cfg = report?.config ?? {};
  const cfgJson = escapeHtml(JSON.stringify(cfg, null, 2));

  const summary = report?.summary ?? {};
  const summaryLine = `books=${summary.books ?? 0} pages=${summary.pagesChecked ?? 0} ok=${summary.ok ?? 0} warn=${
    summary.warn ?? 0
  } fail=${summary.fail ?? 0} globalWarn=${summary.globalWarn ?? 0}`;

  const globalWarnings = Array.isArray(report?.globalWarnings) ? report.globalWarnings : [];

  const bookEntries = Object.entries(report?.books ?? {}).sort(([a], [b]) => a.localeCompare(b));

  const sections = bookEntries
    .map(([bookKey, book]) => {
      const baseUrl = book?.baseUrl ?? '';
      const err = book?.error ?? '';

      const results = book?.results ?? {};
      const browserBlocks = Object.entries(results)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([browserName, byProfile]) => {
          const profileBlocks = Object.entries(byProfile ?? {})
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([profileName, pageResults]) => {
              const statusSummary = summarizeStatuses(pageResults);
              const summaryBadge = `${statusSummary.ok} ok / ${statusSummary.warn} warn / ${statusSummary.fail} fail`;
              const pages = (pageResults ?? [])
                .map((r) => {
                  const statusRaw = String(r?.status ?? '');
                  const statusClass =
                    statusRaw === 'ok' || statusRaw === 'warn' || statusRaw === 'fail' ? statusRaw : 'unknown';
                  const statusLabel = statusClass.toUpperCase();

                  const pageUrlRaw = String(r?.url ?? '');
                  const pageUrlAttr = pageUrlRaw ? escapeHtml(pageUrlRaw) : '';
                  const pageUrlText = pageUrlRaw ? escapeHtml(pageUrlRaw) : '';

                  const captionText = pageUrlRaw ? `${statusLabel}: ${pageUrlRaw}` : statusLabel;
                  const captionEsc = escapeHtml(captionText);

                  const hasIssues = (r?.issues?.fail?.length ?? 0) > 0 || (r?.issues?.warn?.length ?? 0) > 0;
                  const issuesJson = hasIssues ? JSON.stringify(r.issues, null, 2) : '';

                  const tocVis = r?.tocActiveSidebarVisibility ?? null;
                  const tocVisShouldShow = Boolean(tocVis && (tocVis.outOfView === true || tocVis.activeFound === false));
                  const tocVisJson = tocVisShouldShow ? JSON.stringify(tocVis, null, 2) : '';

                  const shotRaw = r?.screenshot ? toUrlPath(r.screenshot) : '';
                  const shot = shotRaw ? escapeHtml(shotRaw) : '';
                  const sidebarShotRaw = r?.screenshotSidebar ? toUrlPath(r.screenshotSidebar) : '';
                  const sidebarShot = sidebarShotRaw ? escapeHtml(sidebarShotRaw) : '';

                  const shotBlocks = [];
                  if (shot) {
                    shotBlocks.push(
                      `<div class="shot-block"><div class="shot-label">page</div><a class="shot" href="${shot}" target="_blank" rel="noopener noreferrer"><img loading="lazy" src="${shot}" alt="${captionEsc} (page)"></a></div>`
                    );
                  }
                  if (sidebarShot) {
                    shotBlocks.push(
                      `<div class="shot-block"><div class="shot-label">sidebar</div><a class="shot" href="${sidebarShot}" target="_blank" rel="noopener noreferrer"><img loading="lazy" src="${sidebarShot}" alt="${captionEsc} (sidebar)"></a></div>`
                    );
                  }

                  const img =
                    shotBlocks.length > 0
                      ? `<div class="shots">${shotBlocks.join('')}</div>`
                      : `<div class="shot shot-missing">(screenshot skipped)</div>`;

                  const issuesBlock = hasIssues ? `<pre class="issues">${escapeHtml(issuesJson)}</pre>` : '';
                  const tocVisBlock = tocVisJson
                    ? `<details class="toc-vis"><summary>toc active visibility</summary><pre>${escapeHtml(
                        tocVisJson
                      )}</pre></details>`
                    : '';

                  const caption =
                    pageUrlRaw && pageUrlAttr
                      ? `<span class="status-pill">${escapeHtml(statusLabel)}</span><a class="page-link" href="${pageUrlAttr}" target="_blank" rel="noopener noreferrer">${pageUrlText}</a>`
                      : `<span class="status-pill">${escapeHtml(statusLabel)}</span>`;

                  return `<figure class="page ${statusClass}"><figcaption>${caption}</figcaption>${img}${issuesBlock}${tocVisBlock}</figure>`;
                })
                .join('\n');

              return `<details class="profile"><summary><span class="mono">${escapeHtml(
                browserName
              )}</span> / <span class="mono">${escapeHtml(profileName)}</span> <span class="badge">${escapeHtml(
                summaryBadge
              )}</span></summary><div class="grid">${pages}</div></details>`;
            })
            .join('\n');
          return profileBlocks;
        })
        .join('\n');

      const baseUrlAttr = baseUrl ? escapeHtml(baseUrl) : '';

      const header = baseUrlAttr
        ? `<a href="${baseUrlAttr}" target="_blank" rel="noopener noreferrer">${escapeHtml(bookKey)}</a>`
        : escapeHtml(bookKey);

      const meta = err
        ? `<div class="error">error: ${escapeHtml(err)}</div>`
        : baseUrlAttr
          ? `<div class="meta"><span class="mono">${baseUrlAttr}</span></div>`
          : '';

      return `<details class="book"><summary>${header}</summary>${meta}${browserBlocks}</details>`;
    })
    .join('\n');

  const globalWarningsHtml =
    globalWarnings.length > 0
      ? `<details class="global-warnings" open><summary>Global warnings</summary><pre>${escapeHtml(
          JSON.stringify(globalWarnings, null, 2)
        )}</pre></details>`
      : '';

  const fatalErrorHtml = fatalError
    ? `<details class="fatal" open><summary>Fatal error</summary><pre>${fatalError}</pre></details>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 16px; }
      h1 { margin: 0 0 8px; font-size: 20px; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace; }
      .muted { color: #666; }
      details { border: 1px solid #eee; border-radius: 8px; padding: 8px 10px; margin: 10px 0; background: #fff; }
      details > summary { cursor: pointer; font-weight: 600; }
      .meta { margin: 6px 0 0; font-size: 12px; }
      .badge { display: inline-block; margin-left: 8px; padding: 1px 8px; font-size: 12px; border: 1px solid #ddd; border-radius: 999px; background: #fafafa; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-top: 10px; }
      figure { margin: 0; padding: 10px; border: 1px solid #eee; border-radius: 8px; background: #fcfcfc; }
      figure.ok { border-left: 4px solid #1a7f37; }
      figure.warn { border-left: 4px solid #bf8700; }
      figure.fail { border-left: 4px solid #cf222e; }
      figcaption { font-size: 12px; margin-bottom: 8px; }
      a { color: #0969da; text-decoration: none; }
      a:hover { text-decoration: underline; }
      .status-pill { display: inline-block; margin-right: 6px; padding: 1px 8px; font-weight: 700; border: 1px solid #ddd; border-radius: 999px; background: #fff; }
      figure.ok .status-pill { border-color: #1a7f37; color: #1a7f37; }
      figure.warn .status-pill { border-color: #bf8700; color: #bf8700; }
      figure.fail .status-pill { border-color: #cf222e; color: #cf222e; }
      .shots { display: grid; gap: 8px; }
      .shot-label { font-size: 11px; color: #57606a; margin-bottom: 4px; }
      img { max-width: 100%; height: auto; border: 1px solid #e5e5e5; border-radius: 6px; background: #fff; }
      .shot-missing { color: #999; padding: 40px 10px; text-align: center; border: 1px dashed #ddd; border-radius: 6px; background: #fff; }
      pre { white-space: pre-wrap; word-break: break-word; font-size: 12px; background: #f6f8fa; border: 1px solid #eee; border-radius: 8px; padding: 10px; margin: 10px 0 0; }
      .issues { margin-top: 8px; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <div class="muted">generatedAt: <span class="mono">${generatedAt}</span></div>
    <div class="muted">summary: <span class="mono">${escapeHtml(summaryLine)}</span></div>
    ${fatalErrorHtml}
    ${globalWarningsHtml}
    <details open><summary>Config</summary><pre>${cfgJson}</pre></details>
    ${sections}
  </body>
</html>
`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeFontStack(value) {
  if (!value) return '';
  return String(value)
    .trim()
    .replace(/;\s*$/, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ');
}

function normalizeDeviceToken(value) {
  return String(value).trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function toSafeId(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function resolveDeviceProfiles({ deviceTokens, playwrightDevices, selectedBrowsers }) {
  if (!Array.isArray(deviceTokens) || deviceTokens.length === 0) return [];

  const resolved = [];
  const seenDeviceNames = new Set();
  const usedIds = new Map();
  for (const token of deviceTokens) {
    const normalized = normalizeDeviceToken(token);
    const name = DEVICE_PROFILE_ALIASES.get(normalized) ?? String(token).trim();
    const descriptor = playwrightDevices?.[name];
    if (!descriptor) {
      throw new Error(`unsupported device: ${token} (resolved: ${name})`);
    }

    // Avoid accidental duplicate runs (e.g., --devices pixel7,pixel7).
    if (seenDeviceNames.has(name)) continue;
    seenDeviceNames.add(name);

    const defaultBrowserType = descriptor.defaultBrowserType;
    if (!selectedBrowsers.includes(defaultBrowserType)) {
      throw new Error(
        `device ${name} requires browser ${defaultBrowserType}, but --browsers=${selectedBrowsers.join(',')} was selected`
      );
    }

    const { defaultBrowserType: _, ...contextOptions } = descriptor;
    const baseId = `device_${toSafeId(name)}`;
    const n = (usedIds.get(baseId) ?? 0) + 1;
    usedIds.set(baseId, n);
    const id = n === 1 ? baseId : `${baseId}_${n}`;
    resolved.push({
      id,
      name,
      defaultBrowserType,
      contextOptions,
      viewport: descriptor.viewport
    });
  }

  return resolved;
}

function formatFontStackForMessage(value, maxLen = 160) {
  const str = String(value ?? '').trim();
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

function loadExpectedFontVarsFromSpec(specPath) {
  if (!fs.existsSync(specPath)) return null;
  const md = fs.readFileSync(specPath, 'utf8');

  const extract = (varName) => {
    const re = new RegExp(`${escapeRegExp(varName)}\\s*:\\s*([^;\\n]+);`, 'm');
    const match = md.match(re);
    return match?.[1]?.trim() ? match[1].trim() : null;
  };

  const fontSans = extract('--font-sans');
  const fontMono = extract('--font-mono');
  if (!fontSans || !fontMono) return null;

  return { fontSans, fontMono };
}

function computeFontVarDrift(books) {
  const sansCounts = new Map();
  const monoCounts = new Map();
  let pagesWithFontVars = 0;

  for (const book of Object.values(books ?? {})) {
    const results = book?.results;
    if (!results) continue;
    for (const browserResults of Object.values(results)) {
      for (const viewportResults of Object.values(browserResults ?? {})) {
        for (const pageResult of viewportResults ?? []) {
          const sans = normalizeFontStack(pageResult?.fontVars?.fontSans ?? '');
          const mono = normalizeFontStack(pageResult?.fontVars?.fontMono ?? '');
          if (!sans || !mono) continue;
          pagesWithFontVars += 1;
          sansCounts.set(sans, (sansCounts.get(sans) ?? 0) + 1);
          monoCounts.set(mono, (monoCounts.get(mono) ?? 0) + 1);
        }
      }
    }
  }

  const toList = (counts) =>
    Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

  const uniqueFontSans = toList(sansCounts);
  const uniqueFontMono = toList(monoCounts);
  const hasDrift = uniqueFontSans.length > 1 || uniqueFontMono.length > 1;

  return { hasDrift, pagesWithFontVars, uniqueFontSans, uniqueFontMono };
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function normalizeBaseUrl(url) {
  const u = new URL(url);
  if (!u.pathname.endsWith('/')) u.pathname += '/';
  u.hash = '';
  // Keep query intact (should not be used for Pages root).
  return u.toString();
}

function isLikelyAssetUrl(url) {
  try {
    const u = new URL(url);
    if (u.pathname.includes('/assets/')) return true;
    const last = u.pathname.split('/').pop() || '';
    if (!last.includes('.')) return false;
    const ext = last.slice(last.lastIndexOf('.') + 1).toLowerCase();
    return !['html', 'htm'].includes(ext);
  } catch {
    return true;
  }
}

function extractInternalPageLinks(html, baseUrl) {
  const links = [];
  // NOTE: `href=""` (empty) is valid HTML. If we require `+` here, it falls
  // through to the unquoted branch and becomes `""`, which later resolves to
  // `/%22%22` and causes false failures. Allow empty quoted values and skip.
  const re = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const href = match[1] ?? match[2] ?? match[3] ?? '';
    if (!href) continue;
    if (href.startsWith('#')) continue;
    if (href.startsWith('mailto:')) continue;
    if (href.startsWith('javascript:')) continue;

    let resolved;
    try {
      const u = new URL(href, baseUrl);
      u.hash = '';
      u.search = '';
      resolved = u.toString();
    } catch {
      continue;
    }

    if (!resolved.startsWith(baseUrl)) continue;
    if (isLikelyAssetUrl(resolved)) continue;
    links.push(resolved);
  }

  const uniq = [];
  const seen = new Set();
  for (const u of links) {
    if (seen.has(u)) continue;
    seen.add(u);
    uniq.push(u);
  }
  return uniq;
}

function selectSamplePages(baseUrl, internalLinks, maxPagesPerBook) {
  const pages = [];
  const add = (u) => {
    if (!u) return;
    if (pages.includes(u)) return;
    pages.push(u);
  };

  add(baseUrl);

  const candidates = internalLinks.filter((u) => u !== baseUrl);
  const chapters = candidates.filter((u) => u.includes('/chapters/'));
  const afterword = candidates.find((u) => u.includes('/afterword/'));
  const appendices = candidates.filter((u) => u.includes('/appendices/'));

  const pickFirstMidLast = (arr) => {
    if (arr.length === 0) return;
    add(arr[0]);
    add(arr[Math.floor(arr.length / 2)]);
    add(arr[arr.length - 1]);
  };

  if (chapters.length > 0) {
    pickFirstMidLast(chapters);
  } else {
    pickFirstMidLast(candidates);
  }

  add(afterword);
  if (appendices.length > 0) add(appendices[0]);

  for (const u of candidates) {
    if (pages.length >= maxPagesPerBook) break;
    add(u);
  }

  return pages.slice(0, maxPagesPerBook);
}

function slugFromUrl(baseUrl, url) {
  try {
    const base = new URL(baseUrl);
    const u = new URL(url);
    let rel = u.pathname.startsWith(base.pathname) ? u.pathname.slice(base.pathname.length) : u.pathname;
    rel = rel.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!rel) return 'root';
    const safe = rel.replace(/[^a-zA-Z0-9/_-]+/g, '_').replace(/[\/]+/g, '__');
    return safe.slice(0, 140);
  } catch {
    return 'page';
  }
}

async function fetchHtml(url) {
  return fetchHtmlWithTimeout(url, 15_000);
}

async function fetchHtmlWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) break;
      try {
        results[i] = await worker(items[i], i);
      } catch (err) {
        results[i] = { error: err?.message ? String(err.message) : String(err) };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

function classifyIssues({
  baseUrl,
  url,
  documentStatus,
  pageErrors,
  sidebarScreenshotErrors,
  consoleErrors,
  requestFailures,
  httpErrors,
  brokenImages,
  emptyTocLinks,
  tocActive,
  tocActiveSidebarVisibility,
  horizontalOverflow,
  fontVars,
  expectedFontVars,
  expectedFontVarsSource,
  enforceFontSpec,
  prevNext
}) {
  const issues = { fail: [], warn: [] };

  if (typeof documentStatus === 'number' && documentStatus >= 400) {
    issues.fail.push(`document status ${documentStatus}`);
  }

  for (const err of pageErrors) {
    issues.fail.push(`pageerror: ${err}`);
  }

  for (const err of sidebarScreenshotErrors ?? []) {
    issues.warn.push(`sidebar screenshot error: ${err}`);
  }

  const criticalTypes = new Set(['document', 'stylesheet', 'script', 'font']);
  const sameOriginHttpErrors = httpErrors.filter((e) => e.url.startsWith(baseUrl));
  for (const e of sameOriginHttpErrors) {
    if (criticalTypes.has(e.resourceType)) {
      issues.fail.push(`same-origin http ${e.status} (${e.resourceType}): ${e.url}`);
    } else {
      issues.warn.push(`same-origin http ${e.status} (${e.resourceType}): ${e.url}`);
    }
  }

  const sameOriginReqFailures = requestFailures.filter((e) => e.url.startsWith(baseUrl));
  for (const e of sameOriginReqFailures) {
    if (criticalTypes.has(e.resourceType)) {
      issues.fail.push(`same-origin request failed (${e.resourceType}): ${e.url} (${e.failure})`);
    } else {
      issues.warn.push(`same-origin request failed (${e.resourceType}): ${e.url} (${e.failure})`);
    }
  }

  if (!fontVars || !fontVars.fontSans || !fontVars.fontMono) {
    issues.fail.push('missing CSS font variables (--font-sans/--font-mono)');
  } else if (enforceFontSpec) {
    const expectedSans = expectedFontVars?.fontSans ? normalizeFontStack(expectedFontVars.fontSans) : '';
    const expectedMono = expectedFontVars?.fontMono ? normalizeFontStack(expectedFontVars.fontMono) : '';
    const actualSans = normalizeFontStack(fontVars.fontSans);
    const actualMono = normalizeFontStack(fontVars.fontMono);
    const source = expectedFontVarsSource ? String(expectedFontVarsSource) : 'FONT-SPECIFICATION.md';
    if (expectedSans && actualSans !== expectedSans) {
      issues.fail.push(
        `font spec mismatch (--font-sans, expected from ${source}): expected="${formatFontStackForMessage(
          expectedSans
        )}", actual="${formatFontStackForMessage(actualSans)}"`
      );
    }
    if (expectedMono && actualMono !== expectedMono) {
      issues.fail.push(
        `font spec mismatch (--font-mono, expected from ${source}): expected="${formatFontStackForMessage(
          expectedMono
        )}", actual="${formatFontStackForMessage(actualMono)}"`
      );
    }
  }

  for (const msg of consoleErrors) {
    issues.warn.push(`console.error: ${msg}`);
  }

  const externalHttpErrors = httpErrors.filter((e) => !e.url.startsWith(baseUrl));
  for (const e of externalHttpErrors) {
    issues.warn.push(`external http ${e.status} (${e.resourceType}): ${e.url}`);
  }

  const externalReqFailures = requestFailures.filter((e) => !e.url.startsWith(baseUrl));
  for (const e of externalReqFailures) {
    issues.warn.push(`external request failed (${e.resourceType}): ${e.url} (${e.failure})`);
  }

  for (const img of brokenImages) {
    issues.warn.push(`broken image: ${img.src}`);
  }

  if (emptyTocLinks?.count > 0) {
    issues.warn.push(`empty toc links: ${emptyTocLinks.count}`);
  }

  if (tocActive?.tocLinkCount > 0) {
    const matches = tocActive.matchesCurrentCount ?? 0;
    if (matches === 0) {
      const current = tocActive.currentPath ?? '';
      const activeCount = tocActive.activeCount ?? 0;
      issues.warn.push(`toc active mismatch: current=${current} activeCount=${activeCount}`);
    }
  }

  if (tocActiveSidebarVisibility?.activeFound && tocActiveSidebarVisibility.outOfView) {
    const current = tocActiveSidebarVisibility.currentPath ?? '';
    const activeText = tocActiveSidebarVisibility.activeText ?? '';
    issues.warn.push(`toc active not visible in sidebar viewport: current=${current} active="${activeText}"`);
  }

  if (horizontalOverflow?.overflow) {
    const px = horizontalOverflow.overflowPx ?? '?';
    issues.warn.push(`horizontal overflow: +${px}px`);
  }

  if (url !== baseUrl) {
    const hasPrev = Boolean(prevNext?.prevHref);
    const hasNext = Boolean(prevNext?.nextHref);
    if (!hasPrev && !hasNext) {
      issues.warn.push('missing prev/next navigation (rel=prev/next)');
    }
  }

  return issues;
}

async function checkPage({
  context,
  browserName,
  bookKey,
  baseUrl,
  url,
  viewportName,
  viewport,
  outputDir,
  screenshotType,
  screenshotQuality,
  fullPage,
  timeoutMs,
  captureSidebar,
  skipScreenshots,
  expectedFontVars,
  expectedFontVarsSource,
  enforceFontSpec
}) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const sidebarScreenshotErrors = [];
  const requestFailures = [];
  const httpErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err?.message ? String(err.message) : String(err));
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    requestFailures.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      failure: failure?.errorText ?? 'unknown'
    });
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status < 400) return;
    httpErrors.push({
      url: response.url(),
      status,
      resourceType: response.request().resourceType()
    });
  });

  let documentStatus = null;
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    documentStatus = response ? response.status() : null;
    try {
      await page.waitForLoadState('networkidle', { timeout: Math.min(10_000, timeoutMs) });
    } catch {
      // Some pages keep small background requests; do not fail here.
    }
  } catch (err) {
    pageErrors.push(err?.message ? String(err.message) : String(err));
  }

  const evalResult = await page
    .evaluate(() => {
      const rootStyle = getComputedStyle(document.documentElement);
      const fontSans = rootStyle.getPropertyValue('--font-sans').trim();
      const fontMono = rootStyle.getPropertyValue('--font-mono').trim();

      const brokenImages = Array.from(document.images)
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .slice(0, 20)
        .map((img) => ({ src: img.currentSrc || img.src || '', alt: img.alt || '' }));

      const emptyTocAnchors = Array.from(document.querySelectorAll('a.toc-link')).filter(
        (a) => (a.getAttribute('href') ?? '') === ''
      );
      const emptyTocLinks = {
        count: emptyTocAnchors.length,
        samples: emptyTocAnchors.slice(0, 10).map((a) => ({
          text: (a.textContent || '').trim().slice(0, 120)
        }))
      };

      const normalizePath = (p) =>
        String(p || '')
          .replace(/index\.html$/, '')
          .replace(/\/+$/, '/');

      const currentPath = window.location.pathname;
      const currentNormalizedPath = normalizePath(currentPath);

      const tocLinks = Array.from(document.querySelectorAll('a.toc-link'));
      const tocLinkCount = tocLinks.length;
      const activeTocLinks = tocLinks.filter((a) => a.classList.contains('active'));
      const activeCount = activeTocLinks.length;
      const matchesCurrentCount = activeTocLinks
        .filter((a) => {
          try {
            const pathname = new URL(a.href).pathname;
            return normalizePath(pathname) === currentNormalizedPath;
          } catch {
            return false;
          }
        })
        .length;
      const activeSamples = activeTocLinks.slice(0, 5).map((a) => {
        let pathname = '';
        try {
          pathname = new URL(a.href).pathname;
        } catch {}
        return {
          text: (a.textContent || '').trim().slice(0, 120),
          href: (a.getAttribute('href') ?? '').slice(0, 200),
          pathname
        };
      });
      const tocActive = {
        tocLinkCount,
        activeCount,
        matchesCurrentCount,
        currentPath,
        currentNormalizedPath,
        activeSamples
      };

      const docEl = document.documentElement;
      const scrollWidth = docEl.scrollWidth;
      const clientWidth = docEl.clientWidth;
      const overflowPx = Math.max(0, scrollWidth - clientWidth);

      let offenders = [];
      if (overflowPx > 1) {
        offenders = [];
        const limit = 3000;
        const all = document.querySelectorAll('body *');
        const max = Math.min(all.length, limit);
        for (let i = 0; i < max; i++) {
          const el = all[i];
          const tag = (el.tagName || '').toLowerCase();
          if (!tag || tag === 'script' || tag === 'style') continue;
          const rect = el.getBoundingClientRect();
          if (rect.width <= 0) continue;
          if (rect.right > clientWidth + 1 || rect.left < -1) {
            const id = el.id ? `#${el.id}` : '';
            const cls =
              typeof el.className === 'string' && el.className.trim()
                ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
                : '';
            offenders.push({
              selector: `${tag}${id}${cls}`,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width)
            });
          }
          if (offenders.length >= 8) break;
        }
      }

      const prev = document.querySelector('a[rel="prev"]');
      const next = document.querySelector('a[rel="next"]');

      return {
        fontVars: { fontSans, fontMono },
        brokenImages,
        emptyTocLinks,
        tocActive,
        horizontalOverflow: {
          overflow: overflowPx > 1,
          overflowPx,
          scrollWidth,
          clientWidth,
          offenders
        },
        prevNext: {
          prevHref: prev ? prev.getAttribute('href') : null,
          nextHref: next ? next.getAttribute('href') : null
        }
      };
    })
    .catch((err) => {
      // If evaluation fails, treat as page error.
      pageErrors.push(err?.message ? String(err.message) : String(err));
      return {
        fontVars: { fontSans: '', fontMono: '' },
        brokenImages: [],
        emptyTocLinks: { count: 0, samples: [] },
        tocActive: {
          tocLinkCount: 0,
          activeCount: 0,
          matchesCurrentCount: 0,
          currentPath: '',
          currentNormalizedPath: '',
          activeSamples: []
        },
        horizontalOverflow: { overflow: false, overflowPx: 0, scrollWidth: 0, clientWidth: 0, offenders: [] },
        prevNext: { prevHref: null, nextHref: null }
      };
    });

  let screenshotRelPath = null;
  let screenshotSidebarRelPath = null;
  let tocActiveSidebarVisibility = null;
  if (!skipScreenshots) {
    const ext = screenshotType === 'jpeg' ? 'jpg' : 'png';
    const pageSlug = slugFromUrl(baseUrl, url);
    const outDir = path.join(outputDir, 'screenshots', bookKey, browserName, viewportName);
    let outDirReady = true;
    try {
      ensureDir(outDir);
    } catch (err) {
      outDirReady = false;
      pageErrors.push(err?.message ? `screenshot dir error: ${err.message}` : `screenshot dir error: ${String(err)}`);
    }

    if (outDirReady) {
      try {
        const filename = `${pageSlug}.${ext}`;
        const outPath = path.join(outDir, filename);
        await page.screenshot({
          path: outPath,
          type: screenshotType,
          quality: screenshotType === 'jpeg' ? screenshotQuality : undefined,
          fullPage
        });
        screenshotRelPath = path.relative(outputDir, outPath);
      } catch (err) {
        pageErrors.push(err?.message ? `screenshot error: ${err.message}` : `screenshot error: ${String(err)}`);
      }

      if (captureSidebar) {
        try {
          const checkbox = page.locator('#sidebar-toggle-checkbox');
          const hasCheckbox = (await checkbox.count()) > 0;
          if (hasCheckbox) {
            // Legacy layout: checkbox controls sidebar visibility via CSS.
            // Use direct property assignment (setChecked may fail for hidden inputs).
            await page
              .evaluate(() => {
                const cb = document.getElementById('sidebar-toggle-checkbox');
                if (!cb || !(cb instanceof HTMLInputElement)) return false;
                cb.checked = true;
                cb.dispatchEvent(new Event('input', { bubbles: true }));
                cb.dispatchEvent(new Event('change', { bubbles: true }));
                return cb.checked;
              })
              .catch(() => {});
          }

          let opened = await page
            .evaluate(() => {
              const cb = document.getElementById('sidebar-toggle-checkbox');
              if (cb && cb instanceof HTMLInputElement && cb.checked) return true;
              const sidebar = document.getElementById('sidebar');
              return Boolean(sidebar && sidebar.classList.contains('active'));
            })
            .catch(() => false);

          if (!opened) {
            // Fallback: click the toggle (some layouts use a label linked to the checkbox).
            const toggle = page.locator('.sidebar-toggle');
            if ((await toggle.count()) > 0) {
              await toggle.first().click({ timeout: 5_000, force: true });
            }

            await page.waitForTimeout(50);

            opened = await page
              .evaluate(() => {
                const cb = document.getElementById('sidebar-toggle-checkbox');
                if (cb && cb instanceof HTMLInputElement && cb.checked) return true;
                const sidebar = document.getElementById('sidebar');
                return Boolean(sidebar && sidebar.classList.contains('active'));
              })
              .catch(() => false);
          }

          if (!opened) {
            throw new Error('sidebar did not open');
          }

          // Measure whether the active TOC item is visible *before* any forced scrolling.
          // This reflects the UX when a user opens the drawer on mobile.
          await page.waitForTimeout(50);
          try {
            tocActiveSidebarVisibility = await page.evaluate(() => {
              const normalizePath = (p) =>
                String(p || '')
                  .replace(/index\.html$/, '')
                  .replace(/\/+$/, '/');

              const currentPath = window.location.pathname;
              const currentNormalizedPath = normalizePath(currentPath);

              const activeLinks = Array.from(document.querySelectorAll('a.toc-link.active'));
              const activeMatch =
                activeLinks.find((a) => {
                  try {
                    const pathname = new URL(a.href).pathname;
                    return normalizePath(pathname) === currentNormalizedPath;
                  } catch {
                    return false;
                  }
                }) ?? null;
              const active = activeMatch || activeLinks[0] || null;

              const sidebar = document.getElementById('sidebar');

              const describeEl = (el) => {
                if (!el || !(el instanceof Element)) return '';
                const tag = (el.tagName || '').toLowerCase();
                const id = el.id ? `#${el.id}` : '';
                const cls =
                  typeof el.className === 'string' && el.className.trim()
                    ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
                    : '';
                return `${tag}${id}${cls}`;
              };

              if (!active) {
                return { activeFound: false, currentPath, currentNormalizedPath };
              }

              const isScrollable = (el) => {
                if (!el) return false;
                const style = getComputedStyle(el);
                const oy = style.overflowY;
                if (oy !== 'auto' && oy !== 'scroll') return false;
                return el.scrollHeight > el.clientHeight + 1;
              };

              let container = null;
              let cur = active.parentElement;
              while (cur) {
                if (sidebar && cur === sidebar) {
                  container = sidebar;
                  break;
                }
                if (isScrollable(cur)) {
                  container = cur;
                  break;
                }
                cur = cur.parentElement;
              }
              if (!container) container = sidebar || document.documentElement;

              const activeRect = active.getBoundingClientRect();
              const containerRect = container.getBoundingClientRect();

              const margin = 8;
              const top = containerRect.top + margin;
              const bottom = containerRect.bottom - margin;
              const outOfView = activeRect.bottom < top || activeRect.top > bottom;
              const fullyVisible = activeRect.top >= top && activeRect.bottom <= bottom;

              let activePathname = '';
              try {
                activePathname = new URL(active.href).pathname;
              } catch {}

              return {
                activeFound: true,
                currentPath,
                currentNormalizedPath,
                activeHref: (active.getAttribute('href') ?? '').slice(0, 200),
                activePathname,
                activeText: (active.textContent || '').trim().slice(0, 120),
                outOfView,
                fullyVisible,
                container: {
                  selector: describeEl(container),
                  clientHeight: container.clientHeight,
                  scrollHeight: container.scrollHeight,
                  scrollTop: Math.round(container.scrollTop)
                },
                containerRect: {
                  top: Math.round(containerRect.top),
                  bottom: Math.round(containerRect.bottom),
                  height: Math.round(containerRect.height)
                },
                activeRect: {
                  top: Math.round(activeRect.top),
                  bottom: Math.round(activeRect.bottom),
                  height: Math.round(activeRect.height)
                }
              };
            });
          } catch (err) {
            sidebarScreenshotErrors.push(
              err?.message ? `sidebar toc visibility error: ${err.message}` : `sidebar toc visibility error: ${String(err)}`
            );
          }

          // Ensure the active TOC item is visible in the screenshot.
          await page
            .evaluate(() => {
              const active = document.querySelector('a.toc-link.active');
              if (active && typeof active.scrollIntoView === 'function') {
                active.scrollIntoView({ block: 'center', behavior: 'auto' });
              }
            })
            .catch(() => {});

          // Wait for sidebar open transition / layout settling.
          await page.waitForTimeout(350);

          const filename = `${pageSlug}__sidebar.${ext}`;
          const outPath = path.join(outDir, filename);
          await page.screenshot({
            path: outPath,
            type: screenshotType,
            quality: screenshotType === 'jpeg' ? screenshotQuality : undefined,
            fullPage
          });
          screenshotSidebarRelPath = path.relative(outputDir, outPath);
        } catch (err) {
          sidebarScreenshotErrors.push(err?.message ? String(err.message) : String(err));
        }
      }
    }
  }

  await page.close().catch(() => {});

  const issues = classifyIssues({
    baseUrl,
    url,
    documentStatus,
    pageErrors,
    sidebarScreenshotErrors,
    consoleErrors,
    requestFailures,
    httpErrors,
    brokenImages: evalResult.brokenImages,
    emptyTocLinks: evalResult.emptyTocLinks,
    tocActive: evalResult.tocActive,
    tocActiveSidebarVisibility,
    horizontalOverflow: evalResult.horizontalOverflow,
    fontVars: evalResult.fontVars,
    expectedFontVars,
    expectedFontVarsSource,
    enforceFontSpec,
    prevNext: evalResult.prevNext
  });

  return {
    url,
    documentStatus,
    viewport: { name: viewportName, ...viewport },
    fontVars: evalResult.fontVars,
    prevNext: evalResult.prevNext,
    brokenImages: evalResult.brokenImages,
    emptyTocLinks: evalResult.emptyTocLinks,
    tocActive: evalResult.tocActive,
    tocActiveSidebarVisibility,
    horizontalOverflow: evalResult.horizontalOverflow,
    consoleErrors,
    pageErrors,
    sidebarScreenshotErrors,
    requestFailures,
    httpErrors,
    screenshot: screenshotRelPath,
    screenshotSidebar: screenshotSidebarRelPath,
    issues,
    status: issues.fail.length > 0 ? 'fail' : issues.warn.length > 0 ? 'warn' : 'ok'
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return 0;
  }

  const registryPath = args.registry
    ? path.resolve(args.registry)
    : path.join(REPO_ROOT, 'docs', 'publishing', 'book-registry.json');

  const outputDir = args.output
    ? path.resolve(args.output)
    : path.join(SCRIPT_DIR, 'output', nowStamp());

  const screenshotType = 'jpeg';
  const screenshotQuality = 70;

  ensureDir(outputDir);

  const reportPath = path.join(outputDir, 'report.json');
  const htmlReportPath = path.join(outputDir, 'index.html');

  const report = {
    schemaVersion: '1.2',
    generatedAt: new Date().toISOString(),
    registryPath: path.relative(REPO_ROOT, registryPath),
    config: {},
    summary: {
      books: 0,
      pagesChecked: 0,
      ok: 0,
      warn: 0,
      fail: 0,
      globalWarn: 0
    },
    books: {}
  };

  const launched = {};
  let exitCode = 0;
  let skipScreenshots = false;
  let captureSidebar = false;
  let dryRun = false;
  let failOnWarnings = false;
  let enforceFontSpec = false;

  const writeReport = () => {
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      fs.writeFileSync(htmlReportPath, buildHtmlReport(report), 'utf8');
    } catch (err) {
      console.error(`❌ failed to write report: ${err?.message ? String(err.message) : String(err)}`);
    }
  };

  try {
    const browsersRaw = args.browsers === undefined ? 'chromium' : args.browsers;
    const viewportsRaw = args.viewports === undefined ? 'mobile,desktop' : args.viewports;
    const devicesRaw = args.devices === undefined ? '' : args.devices;

    const browsers = toList(browsersRaw);
    const viewports = toList(viewportsRaw);
    const deviceTokens = toList(devicesRaw);
    const useDevices = deviceTokens.length > 0;
    assertNonEmptyList(browsers, 'browsers');
    if (!useDevices) assertNonEmptyList(viewports, 'viewports');

    const maxPagesPerBook = parsePositiveIntArg(args.maxPagesPerBook, 'maxPagesPerBook', 4, { min: 1, max: 10 });
    const concurrency = parsePositiveIntArg(args.concurrency, 'concurrency', 3, { min: 1, max: 10 });
    const timeoutMs = parsePositiveIntArg(args.timeoutMs, 'timeoutMs', 45_000, { min: 1_000, max: 300_000 });

    const fullPage = parseBooleanArg(args.fullPage, 'fullPage');
    captureSidebar = parseBooleanArg(args.captureSidebar, 'captureSidebar');
    skipScreenshots = parseBooleanArg(args.skipScreenshots, 'skipScreenshots');
    dryRun = parseBooleanArg(args.dryRun, 'dryRun');
    failOnWarnings = parseBooleanArg(args.failOnWarnings, 'failOnWarnings');
    enforceFontSpec = parseBooleanArg(args.enforceFontSpec, 'enforceFontSpec');
    const onlyBooks = new Set(toList(args.onlyBooks));

    if (!fs.existsSync(registryPath)) {
      throw new Error(`registry not found: ${registryPath}`);
    }

    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const books = registry?.books;
    if (!books || typeof books !== 'object' || Array.isArray(books)) {
      throw new Error('invalid registry: books must be an object');
    }

    const bookEntries = Object.entries(books)
      .map(([key, entry]) => ({ key, entry }))
      .filter(({ key }) => (onlyBooks.size > 0 ? onlyBooks.has(key) : true));

    if (bookEntries.length === 0) {
      throw new Error('no target books (check --onlyBooks)');
    }

    const resolvedViewports = {};
    if (!useDevices) {
      for (const name of viewports) {
        if (!DEFAULT_VIEWPORTS[name]) {
          throw new Error(`unsupported viewport: ${name} (supported: ${Object.keys(DEFAULT_VIEWPORTS).join(',')})`);
        }
        resolvedViewports[name] = DEFAULT_VIEWPORTS[name];
      }
      assertNonEmptyList(Object.keys(resolvedViewports), 'viewports');
    }

    const resolvedBrowsers = [];
    for (const name of browsers) {
      if (!SUPPORTED_BROWSER_NAMES.has(name)) {
        throw new Error(`unsupported browser: ${name} (supported: ${Array.from(SUPPORTED_BROWSER_NAMES).join(',')})`);
      }
      resolvedBrowsers.push(name);
    }
    assertNonEmptyList(resolvedBrowsers, 'browsers');

    report.summary.books = bookEntries.length;

    const expectedFromSpec = loadExpectedFontVarsFromSpec(FONT_SPEC_PATH);
    const expectedFontVars = expectedFromSpec ?? FALLBACK_EXPECTED_FONT_VARS;
    const expectedFontVarsSource = expectedFromSpec ? path.relative(REPO_ROOT, FONT_SPEC_PATH) : 'fallback';
    if (enforceFontSpec && !expectedFromSpec) {
      throw new Error(`--enforceFontSpec requires ${FONT_SPEC_PATH} to define --font-sans/--font-mono`);
    }

    report.config = {
      mode: useDevices ? 'devices' : 'viewports',
      browsers: resolvedBrowsers,
      viewports: useDevices ? [] : Object.keys(resolvedViewports),
      devices: useDevices ? deviceTokens : [],
      maxPagesPerBook,
      concurrency,
      timeoutMs,
      screenshot: { type: screenshotType, quality: screenshotQuality, fullPage, skip: skipScreenshots, captureSidebar },
      enforceFontSpec,
      expectedFontVarsSource,
      expectedFontVars
    };

    const fetchTimeoutMs = Math.min(20_000, timeoutMs);

    // Resolve sample URLs for each book (cheap HTTP fetch).
    for (const { key, entry } of bookEntries) {
      const pagesUrl = entry?.pages;
      if (typeof pagesUrl !== 'string') {
        report.books[key] = { error: 'missing pages url in registry', pagesSelected: [] };
        continue;
      }
      const baseUrl = normalizeBaseUrl(pagesUrl);
      let internalLinks = [];
      let rootStatus = null;
      try {
        const { status, text } = await fetchHtmlWithTimeout(baseUrl, fetchTimeoutMs);
        rootStatus = status;
        internalLinks = extractInternalPageLinks(text, baseUrl);
      } catch (err) {
        report.books[key] = {
          baseUrl,
          error: err?.message ? String(err.message) : String(err),
          rootStatus,
          pagesSelected: [baseUrl]
        };
        continue;
      }
      const pagesSelected = selectSamplePages(baseUrl, internalLinks, maxPagesPerBook);
      report.books[key] = { baseUrl, rootStatus, pagesSelected };
    }

    if (!dryRun) {
      const { chromium, firefox, webkit, devices } = await import('playwright');
      const browserTypes = { chromium, firefox, webkit };

      for (const name of resolvedBrowsers) {
        launched[name] = await browserTypes[name].launch({ headless: true });
      }

      const deviceProfiles = useDevices
        ? resolveDeviceProfiles({ deviceTokens, playwrightDevices: devices, selectedBrowsers: resolvedBrowsers })
        : [];
      const profilesByBrowser = {};
      for (const profile of deviceProfiles) {
        const key = profile.defaultBrowserType;
        profilesByBrowser[key] = profilesByBrowser[key] ?? [];
        profilesByBrowser[key].push(profile);
      }

      if (useDevices) {
        report.config.devicesResolved = deviceProfiles.map((p) => ({
          id: p.id,
          name: p.name,
          defaultBrowserType: p.defaultBrowserType
        }));
      }

      await runWithConcurrency(bookEntries, concurrency, async ({ key }) => {
        const book = report.books[key] ?? {};
        const baseUrl = book.baseUrl;
        if (!baseUrl) return;

        book.results = book.results ?? {};

        for (const browserName of resolvedBrowsers) {
          book.results[browserName] = book.results[browserName] ?? {};
          const profiles = useDevices
            ? profilesByBrowser[browserName] ?? []
            : Object.entries(resolvedViewports).map(([name, viewport]) => ({
                id: name,
                name,
                defaultBrowserType: browserName,
                contextOptions: { viewport, deviceScaleFactor: 1 },
                viewport
              }));

          for (const profile of profiles) {
            const viewportName = profile.id;
            const viewport = useDevices ? { ...profile.viewport, device: profile.name } : profile.viewport;
            const results = [];
            let context;
            try {
              context = await launched[browserName].newContext({
                ...profile.contextOptions,
                colorScheme: 'light'
              });
            } catch (err) {
              results.push({
                url: baseUrl,
                documentStatus: null,
                viewport: { name: viewportName, ...viewport },
                fontVars: { fontSans: '', fontMono: '' },
                prevNext: { prevHref: null, nextHref: null },
                brokenImages: [],
                horizontalOverflow: { overflow: false, overflowPx: 0, scrollWidth: 0, clientWidth: 0, offenders: [] },
                consoleErrors: [],
                pageErrors: [err?.message ? String(err.message) : String(err)],
                requestFailures: [],
                httpErrors: [],
                screenshot: null,
                issues: { fail: ['failed to create browser context'], warn: [] },
                status: 'fail'
              });
              report.summary.pagesChecked += 1;
              report.summary.fail += 1;
              book.results[browserName][viewportName] = results;
              continue;
            }

            for (const url of book.pagesSelected ?? [baseUrl]) {
              let result;
              try {
                result = await checkPage({
                  context,
                  browserName,
                  bookKey: key,
                  baseUrl,
                  url,
                  viewportName,
                  viewport,
                  outputDir,
                  screenshotType,
                  screenshotQuality,
                  fullPage,
                  timeoutMs,
                  captureSidebar,
                  skipScreenshots,
                  expectedFontVars,
                  expectedFontVarsSource,
                  enforceFontSpec
                });
              } catch (err) {
                result = {
                  url,
                  documentStatus: null,
                  viewport: { name: viewportName, ...viewport },
                  fontVars: { fontSans: '', fontMono: '' },
                  prevNext: { prevHref: null, nextHref: null },
                  brokenImages: [],
                  horizontalOverflow: { overflow: false, overflowPx: 0, scrollWidth: 0, clientWidth: 0, offenders: [] },
                  consoleErrors: [],
                  pageErrors: [err?.message ? String(err.message) : String(err)],
                  requestFailures: [],
                  httpErrors: [],
                  screenshot: null,
                  issues: { fail: [`uncaught error: ${err?.message ? String(err.message) : String(err)}`], warn: [] },
                  status: 'fail'
                };
              }

              results.push(result);
              report.summary.pagesChecked += 1;
              if (result.status === 'ok') report.summary.ok += 1;
              else if (result.status === 'warn') report.summary.warn += 1;
              else report.summary.fail += 1;
            }

            await context.close().catch(() => {});
            book.results[browserName][viewportName] = results;
          }
        }
      });
    }

    report.fontVarDrift = dryRun ? null : computeFontVarDrift(report.books);
    report.globalWarnings = [];
    if (report.fontVarDrift?.hasDrift) {
      report.summary.globalWarn += 1;
      report.globalWarnings.push({
        type: 'fontVarDrift',
        message: `fontVar drift detected: uniqueSans=${report.fontVarDrift.uniqueFontSans.length} uniqueMono=${report.fontVarDrift.uniqueFontMono.length} (see report.json#fontVarDrift)`
      });
    }

    const hasFails = report.summary.fail > 0;
    const hasWarnings = report.summary.warn > 0 || report.summary.globalWarn > 0;
    exitCode = hasFails || (failOnWarnings && hasWarnings) ? 1 : 0;
  } catch (err) {
    exitCode = 1;
    report.fatalError = err?.message ? String(err.message) : String(err);
  } finally {
    for (const name of Object.keys(launched)) {
      await launched[name].close().catch(() => {});
    }
    writeReport();
  }

  console.log(
    `✅ done: books=${report.summary.books} pages=${report.summary.pagesChecked} ok=${report.summary.ok} warn=${report.summary.warn} fail=${report.summary.fail} globalWarn=${report.summary.globalWarn}`
  );
  if (Array.isArray(report.globalWarnings) && report.globalWarnings.length > 0) {
    for (const w of report.globalWarnings) {
      console.warn(`⚠️ ${w.type}: ${w.message}`);
    }
  }
  console.log(`report: ${reportPath}`);
  console.log(`html report: ${htmlReportPath}`);
  if (!skipScreenshots) console.log(`screenshots: ${path.join(outputDir, 'screenshots')}`);

  return exitCode;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
