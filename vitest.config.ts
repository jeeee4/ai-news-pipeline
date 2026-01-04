import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/index.ts",
        "src/types/**/*.ts", // Type definitions only
        "src/pipeline/**/*.ts", // Requires external API integration
        "src/summarizer/service.ts", // Requires LLM API
        "src/sources/aishinbun.ts", // Requires external site scraping
        "src/sources/ainow.ts", // Requires external site scraping
        "src/sources/ledge.ts", // Requires external site scraping
        "src/sources/itmedia.ts", // Requires external RSS feed
        "src/sources/qiita.ts", // Requires external Atom feed
        "src/sources/hackernews.ts", // Wrapper for existing API module
        "src/sources/scraper-utils.ts", // Utility for scraping sources
      ],
      thresholds: {
        lines: 60,
        functions: 70,
        branches: 60,
        statements: 60,
      },
    },
  },
});
