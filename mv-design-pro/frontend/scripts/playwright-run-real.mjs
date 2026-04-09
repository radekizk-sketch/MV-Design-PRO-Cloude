import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { getPlaywrightEnv } from './playwright-env.mjs';

const extraArgs = process.argv.slice(2);
const playwrightCliPath = resolve('./node_modules/playwright/cli.js');
const env = getPlaywrightEnv({
  ...process.env,
  PLAYWRIGHT_REAL_BACKEND: '1',
});
const hasReporterArg = extraArgs.some((arg) => arg === '--reporter' || arg.startsWith('--reporter='));
const cliArgs = [
  playwrightCliPath,
  'test',
  ...(hasReporterArg ? [] : ['--reporter=line']),
  ...extraArgs,
];

const result = spawnSync(
  process.execPath,
  cliArgs,
  {
    stdio: 'inherit',
    env,
  },
);

if (result.error) {
  console.error('[playwright-run-real] Nie udało się uruchomić Playwrighta:', result.error.message);
}

process.exit(result.status ?? 1);
