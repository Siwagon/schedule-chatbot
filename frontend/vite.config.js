import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // lets the frontend call /api/... during `npm run dev` without CORS setup
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
