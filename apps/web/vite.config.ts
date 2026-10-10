import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const page = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:3001" } },
  build: {
    rollupOptions: {
      // The business portal is a separate page; building it keeps its URL
      // (/src/features/business/portal.html) the same in dev and production,
      // which is where Stripe Checkout returns to.
      input: {
        main: page("./index.html"),
        business: page("./src/features/business/portal.html")
      }
    }
  }
});
