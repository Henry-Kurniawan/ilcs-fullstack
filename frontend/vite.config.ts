import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Polling dipakai di Docker Desktop (macOS/Windows), tempat bind mount
    // tidak meneruskan event inotify. Di Linux watcher bawaan lebih cepat.
    watch: process.env.VITE_USE_POLLING === "true" ? { usePolling: true } : undefined,
    // Di Docker Compose, backend hidup di service `backend`, bukan localhost.
    proxy: {
      "/api": process.env.API_PROXY_TARGET ?? `http://localhost:${process.env.PORT ?? 3000}`,
    },
  },
});
