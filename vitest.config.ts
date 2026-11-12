import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "backend",
          root: "backend",
          environment: "node",
          include: ["test/**/*.test.ts"],
          globalSetup: ["test/global-setup.ts"],
          fileParallelism: false,
        },
      },
      {
        test: {
          name: "frontend",
          root: "frontend",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
        },
      },
    ],
  },
});
