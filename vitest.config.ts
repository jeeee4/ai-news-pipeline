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
