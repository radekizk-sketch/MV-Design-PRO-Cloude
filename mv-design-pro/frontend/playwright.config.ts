/**
 * Playwright Configuration — E2E_STABILIZATION
 *
 * CANONICAL ALIGNMENT:
 * - UI_CORE_ARCHITECTURE.md § 12: E2E Testing
 *
 * Configuration for E2E tests covering:
 * - Happy path: Projekt → Case → Snapshot → Run → SLD/Results → Inspector → Proof
 * - Selection synchronization
 * - Navigation with Polish labels
 *
 * STABILIZATION:
 * - Explicit timeouts for expect/action/navigation
 * - Disabled animations via CSS injection
 * - Fixed viewport for consistent rendering
 * - Reduced retries (1 in CI to catch flaky tests)
 * - Trace/video only on failure (saves CI resources)
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',

  // Run tests sequentially for determinism
  fullyParallel: false,

  // Fail CI on test.only (prevent accidental focused tests)
  forbidOnly: !!process.env.CI,

  // Reduced retries in CI (1 retry catches transient issues, but 2+ masks flaky)
  retries: process.env.CI ? 1 : 0,

  // Single worker in CI for determinism, parallel locally for speed
  workers: process.env.CI ? 1 : undefined,

  // HTML reporter with failure details
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : 'html',

  // Global timeout for each test (60s max per test)
  timeout: 60000,

  // Expect timeout (for assertions)
  expect: {
    timeout: 10000,
  },

  use: {
    // Base URL for the app (matches vite dev server port)
    baseURL: 'http://localhost:5173',

    // Action timeout (clicks, fills, etc.)
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 15000,

    // Trace only on first retry (saves CI storage)
    trace: 'on-first-retry',

    // Screenshot only on failure
    screenshot: 'only-on-failure',

    // Video only on failure (saves CI storage)
    video: 'retain-on-failure',

    // Fixed viewport for consistent rendering
    viewport: { width: 1280, height: 720 },

    // Disable animations for deterministic screenshots
    // This is injected into every page
    launchOptions: {
      slowMo: process.env.CI ? 0 : undefined,
    },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Inject CSS to disable animations
        contextOptions: {
          reducedMotion: 'reduce',
        },
      },
    },
  ],

  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // Capture server output for debugging
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
