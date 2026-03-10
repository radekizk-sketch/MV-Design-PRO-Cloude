import { spawnSync } from 'node:child_process';
import { getPlaywrightEnv, resolveChromiumExecutable } from './playwright-env.mjs';

const env = getPlaywrightEnv();
const executable = resolveChromiumExecutable();
if (!executable) {
  console.error('[playwright-run] Brak wykrytej przeglądarki. Uruchom: npm run test:e2e:setup');
  process.exit(1);
}

const extraArgs = process.argv.slice(2);
const result = spawnSync(
  'npx',
  ['playwright', 'test', ...extraArgs],
  {
    stdio: 'inherit',
    env,
  },
);
process.exit(result.status ?? 1);
