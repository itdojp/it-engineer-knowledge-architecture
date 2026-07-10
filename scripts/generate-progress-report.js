#!/usr/bin/env node

/*
 * Generates docs/progress_report.md (and tmp/book_status.json) from
 * docs/_data/catalog.json.
 *
 * Motivation:
 * - Keep docs/_data/catalog.json as the single metadata source of truth
 * - Avoid hardcoded book lists
 * - Reduce GitHub API calls (GraphQL batching) to mitigate 429
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatJst(date) {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const pick = (type) => parts.find((p) => p.type === type)?.value;
  const y = pick("year");
  const m = pick("month");
  const d = pick("day");
  const hh = pick("hour");
  const mm = pick("minute");
  const ss = pick("second");
  return `${y}年${m}月${d}日 ${hh}:${mm}:${ss} JST`;
}

function firstSentence(text) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return "";
  }
  const japanesePeriod = normalized.indexOf("。");
  if (japanesePeriod >= 0) {
    return normalized.slice(0, japanesePeriod + 1);
  }
  const englishPeriod = normalized.indexOf(". ");
  if (englishPeriod >= 0) {
    return normalized.slice(0, englishPeriod + 1);
  }
  return normalized;
}

function githubGraphql({ token, query }) {
  const payload = JSON.stringify({ query });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.github.com",
        path: "/graphql",
        method: "POST",
        headers: {
          "User-Agent": "itdojp/it-engineer-knowledge-architecture",
          Authorization: `bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          let json;
          try {
            json = JSON.parse(body || "{}");
          } catch (e) {
            const err = new Error(`invalid json: ${e.message}`);
            err.statusCode = res.statusCode;
            err.body = body;
            reject(err);
            return;
          }

          if (res.statusCode >= 400) {
            const err = new Error(
              `GitHub GraphQL HTTP ${res.statusCode}: ${json.message || "error"}`
            );
            err.statusCode = res.statusCode;
            err.body = json;
            reject(err);
            return;
          }

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            json,
          });
        });
      }
    );

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function githubGraphqlWithRetry({ token, query, maxAttempts = 5 }) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await githubGraphql({ token, query });

      const errors = Array.isArray(res?.json?.errors) ? res.json.errors : [];
      if (errors.length > 0) {
        const ignorable = errors.every((e) =>
          String(e?.message || "").includes("Could not resolve to a Repository")
        );

        if (!ignorable) {
          const message = errors.map((e) => e?.message).filter(Boolean).join(" / ");
          const err = new Error(`GitHub GraphQL errors: ${message || "unknown"}`);
          // Treat as transient when GitHub returns secondary rate limit or internal errors via 200+errors.
          const lower = (message || "").toLowerCase();
          err.statusCode =
            lower.includes("rate limit") || lower.includes("something went wrong")
              ? 429
              : 500;
          throw err;
        }
      }

      return res;
    } catch (err) {
      const status = err?.statusCode;
      const transient = [429, 500, 502, 503, 504].includes(status);
      if (!transient || attempt === maxAttempts) {
        throw err;
      }
      const backoffMs = 1000 * Math.pow(2, attempt - 1);
      console.warn(
        `⚠️ GitHub GraphQL transient error (HTTP ${status}). Retrying in ${backoffMs}ms... (attempt ${attempt}/${maxAttempts})`
      );
      await sleep(backoffMs);
    }
  }
  throw new Error("unreachable");
}

function buildRepoBatchQuery(repos) {
  // NOTE: alias names must be unique and GraphQL-safe.
  const fields = `
    name
    updatedAt
    isArchived
    stargazerCount
    issues(states: OPEN) { totalCount }
    pullRequests(states: OPEN) { totalCount }
  `;
  const parts = repos.map((r, i) => {
    const owner = r.owner.replace(/"/g, '\\"');
    const name = r.name.replace(/"/g, '\\"');
    return `r${i}: repository(owner: "${owner}", name: "${name}") { ${fields} }`;
  });
  return `query {\n${parts.join("\n")}\n}`;
}

async function main() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    fail("GITHUB_TOKEN が必要です（GitHub Actions / ローカル実行）");
  }

  const repoRoot = path.join(__dirname, "..");
  const catalogPath = path.join(repoRoot, "docs", "_data", "catalog.json");
  const outMdPath = path.join(repoRoot, "docs", "progress_report.md");
  const outJsonPath = path.join(repoRoot, "tmp", "book_status.json");

  if (!fs.existsSync(catalogPath)) {
    fail(`catalog が見つかりません: ${catalogPath}`);
  }

  let catalog;
  try {
    catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  } catch (e) {
    fail(`catalog の JSON 解析に失敗しました: ${e.message}`);
  }

  const books = catalog?.books;
  if (!Array.isArray(books)) {
    fail("catalog の books が不正です");
  }

  const entries = books
    .filter(
      (entry) =>
        entry.status === "published" &&
        entry.countingGroup === "main-lineup" &&
        entry.countedInMainLineup === true &&
        entry.repo &&
        entry.pagesUrl
    )
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((entry) => {
      const bookName = entry.id;
      const repo = entry.repo;
      const pages = entry.pagesUrl;
      const repoVisibility = entry.repoVisibility || "public";
      if (!["public", "private"].includes(repoVisibility)) {
        fail(`${bookName}: repoVisibility が不正です (${repoVisibility})`);
      }
      const [owner, name] = repo.split("/");
      if (!owner || !name) {
        fail(`${bookName}: repo の形式が不正です (${repo})`);
      }
      const accessNote =
        (entry.notes || []).find((note) => String(note).includes("Private")) ||
        (entry.notes || []).find((note) => String(note).includes("無料公開範囲"));
      return {
        bookName,
        owner,
        name,
        repo,
        pages,
        repoVisibility,
        pagesPublicationScope:
          entry.publicationScope === "free-preview"
            ? "free-preview-aligned-with-zenn-free-scope"
            : null,
        accessNote: accessNote || null,
        isPrivateManaged: repoVisibility === "private",
      };
    });

  // Fetch repository metadata in GraphQL batches to reduce API calls.
  // Intentionally private management repositories are skipped: the catalog
  // workflow token cannot read them, and they should not be treated as broken
  // public repositories.
  const batchSize = 20;
  const repoInfoByFullName = new Map();
  const queryEntries = entries.filter((e) => !e.isPrivateManaged);
  for (let i = 0; i < queryEntries.length; i += batchSize) {
    const batch = queryEntries.slice(i, i + batchSize);
    const query = buildRepoBatchQuery(batch);
    const res = await githubGraphqlWithRetry({ token, query });
    const data = res?.json?.data || {};
    for (let j = 0; j < batch.length; j++) {
      const alias = `r${j}`;
      const repoData = data[alias] || null;
      const fullName = `${batch[j].owner}/${batch[j].name}`;
      repoInfoByFullName.set(fullName, repoData);
    }
  }

  const rows = entries.map((e) => {
    const fullName = `${e.owner}/${e.name}`;

    if (e.isPrivateManaged) {
      return {
        ...e,
        status: "private",
        updatedAt: null,
        openIssues: 0,
        openPRs: 0,
        stars: 0,
        isArchived: false,
      };
    }

    const repoData = repoInfoByFullName.get(fullName) || null;

    if (!repoData) {
      return {
        ...e,
        status: "unavailable",
        updatedAt: null,
        openIssues: 0,
        openPRs: 0,
        stars: 0,
        isArchived: false,
      };
    }

    const isArchived = Boolean(repoData.isArchived);
    return {
      ...e,
      status: isArchived ? "archived" : "active",
      updatedAt: repoData.updatedAt || null,
      openIssues: repoData.issues?.totalCount ?? 0,
      openPRs: repoData.pullRequests?.totalCount ?? 0,
      stars: repoData.stargazerCount ?? 0,
      isArchived,
    };
  });

  const totalBooks = rows.length;
  const activeBooks = rows.filter((r) => r.status === "active").length;
  const archivedBooks = rows.filter((r) => r.status === "archived").length;
  const privateBooks = rows.filter((r) => r.status === "private").length;
  const unavailableBooks = rows.filter((r) => r.status === "unavailable").length;
  const totalOpenIssues = rows.reduce((acc, r) => acc + (r.openIssues || 0), 0);
  const totalOpenPRs = rows.reduce((acc, r) => acc + (r.openPRs || 0), 0);
  const totalStars = rows.reduce((acc, r) => acc + (r.stars || 0), 0);

  const now = new Date();
  const updatedAtJst = formatJst(now);

  const md = [];
  md.push("# 📊 IT Engineer Knowledge Architecture 進捗レポート");
  md.push("");
  md.push(`**更新日時**: ${updatedAtJst}`);
  md.push("");
  md.push("## 📈 全体統計");
  md.push("");
  md.push(`- **総書籍数**: ${totalBooks}冊`);
  md.push(`- **アクティブ書籍**: ${activeBooks}冊`);
  md.push(`- **アーカイブ書籍**: ${archivedBooks}冊`);
  md.push(`- **Private管理書籍**: ${privateBooks}冊`);
  md.push(`- **利用不可**: ${unavailableBooks}冊`);
  md.push(`- **総Open Issue数**: ${totalOpenIssues}件`);
  md.push(`- **総Open PR数**: ${totalOpenPRs}件`);
  md.push(`- **総Star数**: ${totalStars}個`);
  md.push("");
  md.push("## 📚 書籍別ステータス");
  md.push("");
  md.push(
    "| 書籍名 | Pages | Repo | ステータス | 最終更新 | Open Issues | Open PRs | Stars |"
  );
  md.push("|---|---|---|---|---|---:|---:|---:|");

  for (const r of rows) {
    const pagesLabel =
      r.pagesPublicationScope === "free-preview-aligned-with-zenn-free-scope"
        ? "読む（無料公開範囲）"
        : "読む";
    const pagesLink = `[${pagesLabel}](${r.pages})`;
    const repoLink =
      r.status === "private"
        ? firstSentence(r.accessNote) || "Private"
        : `[GitHub](https://github.com/${r.repo})`;
    md.push(
      `| ${r.bookName} | ${pagesLink} | ${repoLink} | ${r.status} | ${
        r.updatedAt || "N/A"
      } | ${r.openIssues} | ${r.openPRs} | ${r.stars} |`
    );
  }

  md.push("");
  md.push(
    "備考: `linux-infra-textbook` は `linux-infra-textbook2` に置換済みの旧版（アーカイブ）"
  );
  md.push("");
  md.push("生成元: `docs/_data/catalog.json`");
  md.push("");

  fs.mkdirSync(path.dirname(outMdPath), { recursive: true });
  fs.mkdirSync(path.dirname(outJsonPath), { recursive: true });

  fs.writeFileSync(outMdPath, md.join("\n"), "utf8");
  fs.writeFileSync(
    outJsonPath,
    JSON.stringify(
      {
        generatedAt: now.toISOString(),
        totalBooks,
        activeBooks,
        archivedBooks,
        privateBooks,
        unavailableBooks,
        totalOpenIssues,
        totalOpenPRs,
        totalStars,
        books: rows.map((r) => ({
          name: r.bookName,
          repo: r.repo,
          repoVisibility: r.repoVisibility,
          pages: r.pages,
          pagesPublicationScope: r.pagesPublicationScope,
          accessNote: r.accessNote,
          status: r.status,
          updatedAt: r.updatedAt,
          openIssues: r.openIssues,
          openPRs: r.openPRs,
          stars: r.stars,
        })),
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`✅ progress_report generated: ${path.relative(repoRoot, outMdPath)}`);
  console.log(`✅ book_status generated: ${path.relative(repoRoot, outJsonPath)}`);
}

main().catch((e) => fail(e?.stack || e?.message || String(e)));
