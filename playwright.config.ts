import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

/** بيئة ثابتة للاختبارات الشاملة: قاعدة SQLite مؤقتة وتاريخ "اليوم" مثبّت. */
export const E2E_ENV = {
  TURSO_DATABASE_URL: "file:./data/e2e.db",
  TURSO_AUTH_TOKEN: "",
  APP_PASSWORD: "test-password-123",
  AUTH_SECRET: "e2e-secret-0123456789abcdef0123456789abcdef0123456789abcdef",
  RAQI_TODAY: "2026-09-20",
};

export const AUTH_STATE = "tests/.auth/state.json";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL,
    locale: "ar-SA",
    timezoneId: "Asia/Riyadh",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts$/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts$/,
      use: { storageState: AUTH_STATE },
    },
  ],
  webServer: {
    command: `rm -f data/e2e.db data/e2e.db-* && node scripts/migrate.mjs && npx next start -p ${PORT}`,
    url: `${baseURL}/login`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: E2E_ENV,
  },
});
