#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');

const DEFAULT_VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 }
};

const SUPPORTED_BROWSER_NAMES = new Set(['chromium', 'firefox', 'webkit']);

function usage() {
  // Keep CLI help minimal; detailed usage is in README.
  console.log(`Usage:
  node run.mjs [options]

Options:
  --registry <path>         book-registry.json (default: repo docs/publishing/book-registry.json)
  --output <dir>            output dir (default: tools/pages-visual-check/output/<timestamp>)
  --browsers <list>         chromium,firefox,webkit (default: chromium)
  --viewports <list>        mobile,tablet,desktop (default: mobile,desktop)
  --maxPagesPerBook <n>     pages per book incl. root (default: 4)
  --concurrency <n>         concurrent books (default: 3)
  --timeoutMs <ms>          navigation timeout (default: 45000)
  --fullPage                capture full-page screenshots (default: off)
  --skipScreenshots         do not capture screenshots (default: off)
  --onlyBooks <list>        book keys (default: all)
  --failOnWarnings          treat warnings as failures (default: off)
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
  const re = /href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
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
  consoleErrors,
  requestFailures,
  httpErrors,
  brokenImages,
  horizontalOverflow,
  fontVars,
  prevNext
}) {
  const issues = { fail: [], warn: [] };

  if (typeof documentStatus === 'number' && documentStatus >= 400) {
    issues.fail.push(`document status ${documentStatus}`);
  }

  for (const err of pageErrors) {
    issues.fail.push(`pageerror: ${err}`);
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
  skipScreenshots
}) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
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
                ? `.${el.className.trim().split(/\\s+/).slice(0, 2).join('.')}`
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

      const prev = document.querySelector('a[rel=\"prev\"]');
      const next = document.querySelector('a[rel=\"next\"]');

      return {
        fontVars: { fontSans, fontMono },
        brokenImages,
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
        horizontalOverflow: { overflow: false, overflowPx: 0, scrollWidth: 0, clientWidth: 0, offenders: [] },
        prevNext: { prevHref: null, nextHref: null }
      };
    });

  let screenshotRelPath = null;
  if (!skipScreenshots) {
    try {
      const ext = screenshotType === 'jpeg' ? 'jpg' : 'png';
      const pageSlug = slugFromUrl(baseUrl, url);
      const outDir = path.join(outputDir, 'screenshots', bookKey, browserName, viewportName);
      ensureDir(outDir);
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
  }

  await page.close().catch(() => {});

  const issues = classifyIssues({
    baseUrl,
    url,
    documentStatus,
    pageErrors,
    consoleErrors,
    requestFailures,
    httpErrors,
    brokenImages: evalResult.brokenImages,
    horizontalOverflow: evalResult.horizontalOverflow,
    fontVars: evalResult.fontVars,
    prevNext: evalResult.prevNext
  });

  return {
    url,
    documentStatus,
    viewport: { name: viewportName, ...viewport },
    fontVars: evalResult.fontVars,
    prevNext: evalResult.prevNext,
    brokenImages: evalResult.brokenImages,
    horizontalOverflow: evalResult.horizontalOverflow,
    consoleErrors,
    pageErrors,
    requestFailures,
    httpErrors,
    screenshot: screenshotRelPath,
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

  const report = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    registryPath: path.relative(REPO_ROOT, registryPath),
    config: {},
    summary: {
      books: 0,
      pagesChecked: 0,
      ok: 0,
      warn: 0,
      fail: 0
    },
    books: {}
  };

  const launched = {};
  let exitCode = 0;
  let skipScreenshots = false;
  let dryRun = false;
  let failOnWarnings = false;

  const writeReport = () => {
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    } catch (err) {
      console.error(`❌ failed to write report: ${err?.message ? String(err.message) : String(err)}`);
    }
  };

  try {
    const browsersRaw = args.browsers === undefined ? 'chromium' : args.browsers;
    const viewportsRaw = args.viewports === undefined ? 'mobile,desktop' : args.viewports;

    const browsers = toList(browsersRaw);
    const viewports = toList(viewportsRaw);
    assertNonEmptyList(browsers, 'browsers');
    assertNonEmptyList(viewports, 'viewports');

    const maxPagesPerBook = parsePositiveIntArg(args.maxPagesPerBook, 'maxPagesPerBook', 4, { min: 1, max: 10 });
    const concurrency = parsePositiveIntArg(args.concurrency, 'concurrency', 3, { min: 1, max: 10 });
    const timeoutMs = parsePositiveIntArg(args.timeoutMs, 'timeoutMs', 45_000, { min: 1_000, max: 300_000 });

    const fullPage = parseBooleanArg(args.fullPage, 'fullPage');
    skipScreenshots = parseBooleanArg(args.skipScreenshots, 'skipScreenshots');
    dryRun = parseBooleanArg(args.dryRun, 'dryRun');
    failOnWarnings = parseBooleanArg(args.failOnWarnings, 'failOnWarnings');
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
    for (const name of viewports) {
      if (!DEFAULT_VIEWPORTS[name]) {
        throw new Error(`unsupported viewport: ${name} (supported: ${Object.keys(DEFAULT_VIEWPORTS).join(',')})`);
      }
      resolvedViewports[name] = DEFAULT_VIEWPORTS[name];
    }
    assertNonEmptyList(Object.keys(resolvedViewports), 'viewports');

    const resolvedBrowsers = [];
    for (const name of browsers) {
      if (!SUPPORTED_BROWSER_NAMES.has(name)) {
        throw new Error(`unsupported browser: ${name} (supported: ${Array.from(SUPPORTED_BROWSER_NAMES).join(',')})`);
      }
      resolvedBrowsers.push(name);
    }
    assertNonEmptyList(resolvedBrowsers, 'browsers');

    report.summary.books = bookEntries.length;
    report.config = {
      browsers: resolvedBrowsers,
      viewports: Object.keys(resolvedViewports),
      maxPagesPerBook,
      concurrency,
      timeoutMs,
      screenshot: { type: screenshotType, quality: screenshotQuality, fullPage, skip: skipScreenshots }
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
      const { chromium, firefox, webkit } = await import('playwright');
      const browserTypes = { chromium, firefox, webkit };

      for (const name of resolvedBrowsers) {
        launched[name] = await browserTypes[name].launch({ headless: true });
      }

      await runWithConcurrency(bookEntries, concurrency, async ({ key }) => {
        const book = report.books[key] ?? {};
        const baseUrl = book.baseUrl;
        if (!baseUrl) return;

        book.results = book.results ?? {};

        for (const browserName of resolvedBrowsers) {
          book.results[browserName] = book.results[browserName] ?? {};
          for (const [viewportName, viewport] of Object.entries(resolvedViewports)) {
            const results = [];
            let context;
            try {
              context = await launched[browserName].newContext({
                viewport,
                deviceScaleFactor: 1,
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
                  skipScreenshots
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

    const hasFails = report.summary.fail > 0;
    const hasWarnings = report.summary.warn > 0;
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
    `✅ done: books=${report.summary.books} pages=${report.summary.pagesChecked} ok=${report.summary.ok} warn=${report.summary.warn} fail=${report.summary.fail}`
  );
  console.log(`report: ${reportPath}`);
  if (!skipScreenshots) console.log(`screenshots: ${path.join(outputDir, 'screenshots')}`);

  return exitCode;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
