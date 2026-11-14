import { defineConfig, devices } from "@playwright/test";

const productionPreview = process.env.MOTIONUX_TEST_PREVIEW === "1";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  workers: 2,
  use: { baseURL: "http://127.0.0.1:4186" },
  webServer: {
    command: productionPreview
      ? "npm exec -- vite preview --host 127.0.0.1 --port 4186 --strictPort"
      : "npm run dev -- --port 4186 --strictPort",
    url: "http://127.0.0.1:4186",
  },
  projects: [
    { name: "desktop Chromium", use: { browserName: "chromium", viewport: { width: 1440, height: 900 } } },
    { name: "touch Chromium", use: { ...devices["iPhone 13"], browserName: "chromium", viewport: { width: 375, height: 812 } } },
    { name: "touch WebKit", use: { ...devices["iPhone 13"], browserName: "webkit" } },
  ],
});
