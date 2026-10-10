import { cpSync, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const page = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * Serves the pitch deck (../../presentation) at /demo/ in dev and copies it into dist/demo for the build.
 * The deck stays a standalone folder (`npx serve presentation` still works) and the app shows it in the Demo tab.
 */
const deckDir = fileURLToPath(new URL("../../presentation", import.meta.url));
const mime: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const demoDeck = (): Plugin => ({
  name: "thirdplace-demo-deck",
  configureServer(server) {
    server.middlewares.use("/demo", (request, response, next) => {
      const urlPath = decodeURIComponent((request.url ?? "/").split("?")[0]);
      const file = normalize(join(deckDir, urlPath === "/" ? "index.html" : urlPath));
      if (!file.startsWith(deckDir) || !existsSync(file) || !statSync(file).isFile()) return next();
      response.setHeader("Content-Type", mime[extname(file)] ?? "application/octet-stream");
      response.end(readFileSync(file));
    });
  },
  closeBundle() {
    cpSync(deckDir, fileURLToPath(new URL("./dist/demo", import.meta.url)), { recursive: true, filter: (source) => !source.endsWith(".md") });
  }
});

export default defineConfig({
  plugins: [react(), demoDeck()],
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
