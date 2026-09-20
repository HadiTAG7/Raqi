import { defineConfig } from "@playwright/test";

/** اختبارات الوحدة للمنطق النقي (بدون متصفح أو خادم). */
export default defineConfig({
  testDir: "./tests/unit",
  fullyParallel: true,
  reporter: [["list"]],
  outputDir: "test-results/unit",
});
