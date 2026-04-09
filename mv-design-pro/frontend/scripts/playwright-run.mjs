import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { getPlaywrightEnv, resolveChromiumExecutable } from './playwright-env.mjs';

const env = getPlaywrightEnv();
const executable = resolveChromiumExecutable();
if (!executable) {
  console.error('[playwright-run] Brak wykrytej przeglądarki. Uruchom: npm run test:e2e:setup');
  process.exit(1);
}

const extraArgs = process.argv.slice(2);
const playwrightCliPath = resolve('./node_modules/playwright/cli.js');
const result = spawnSync(
  process.execPath,
  [playwrightCliPath, 'test', ...extraArgs],
  {
    stdio: 'inherit',
    env,
  },
);
if (result.error) {
  console.error('[playwright-run] Nie udało się uruchomić Playwrighta:', result.error.message);
}
process.exit(result.status ?? 1);
