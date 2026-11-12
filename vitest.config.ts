import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tes backend memakai satu database PostgreSQL bersama; file tes tidak boleh
    // saling menimpa data. Jalankan satu file pada satu waktu.
    fileParallelism: false,
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
