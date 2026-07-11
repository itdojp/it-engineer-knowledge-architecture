import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SHA_PATTERN = /^[0-9a-f]{40}$/i;

export function createBuildInfo(env = process.env, now = new Date()) {
  const sha = env.GITHUB_SHA;
  if (!SHA_PATTERN.test(sha || '')) {
    throw new Error('GITHUB_SHA must be a 40-character commit SHA');
  }

  return {
    repository: env.GITHUB_REPOSITORY || 'itdojp/it-engineer-knowledge-architecture',
    sha,
    ref: env.GITHUB_REF || 'refs/heads/main',
    runId: String(env.GITHUB_RUN_ID || ''),
    runAttempt: String(env.GITHUB_RUN_ATTEMPT || ''),
    builtAt: now.toISOString()
  };
}

export async function writeBuildInfo(outputPath, env = process.env, now = new Date()) {
  const target = resolve(outputPath);
  await mkdir(dirname(target), { recursive: true });
  const info = createBuildInfo(env, now);
  await writeFile(target, `${JSON.stringify(info, null, 2)}\n`, 'utf8');
  return info;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const outputPath = process.argv[2] || '_site/build-info.json';
  try {
    const info = await writeBuildInfo(outputPath);
    console.log(`build-info.json: ${outputPath} (${info.sha})`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
