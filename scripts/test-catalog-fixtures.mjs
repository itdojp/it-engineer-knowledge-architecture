#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './catalog-utils.mjs';

const cases = [
  { file: 'tests/fixtures/catalog-valid.json', valid: true, script: 'scripts/validate-catalog.mjs' },
  {
    file: 'tests/fixtures/catalog-invalid-duplicate-id.json',
    valid: false,
    script: 'scripts/validate-catalog.mjs',
    mustContain: 'duplicate book id'
  },
  {
    file: 'tests/fixtures/catalog-invalid-missing-prereq.json',
    valid: false,
    script: 'scripts/validate-catalog.mjs',
    mustContain: 'references unknown book id'
  },
  {
    file: 'tests/fixtures/catalog-invalid-cycle.json',
    valid: false,
    script: 'scripts/validate-learning-graph.mjs',
    mustContain: 'cycle detected'
  },
  {
    file: 'tests/fixtures/catalog-invalid-private-scope.json',
    valid: false,
    script: 'scripts/validate-catalog.mjs',
    mustContain: 'private managed book must declare publicationScope=free-preview'
  }
];

let failed = 0;
for (const testCase of cases) {
  const result = spawnSync(process.execPath, [path.join(ROOT, testCase.script), path.join(ROOT, testCase.file)], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  const output = [result.stdout || '', result.stderr || ''].join('\n');
  const statusPassed = testCase.valid ? result.status === 0 : result.status !== 0;
  const outputPassed = !testCase.mustContain || output.includes(testCase.mustContain);
  const passed = statusPassed && outputPassed;
  if (!passed) {
    failed++;
    console.error(`❌ fixture expectation failed: ${testCase.file}`);
    console.error(result.stdout);
    console.error(result.stderr);
  } else {
    console.log(`✅ fixture ${testCase.valid ? 'valid' : 'invalid'} as expected: ${testCase.file}`);
  }
}
if (failed > 0) process.exit(1);
