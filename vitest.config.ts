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
      ],
      thresholds: {
        // Note: LLM client API calls are tested via integration tests
        lines: 75,
        functions: 80,
        branches: 60,
        statements: 75,
      },
    },
  },
});
