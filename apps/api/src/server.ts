import "dotenv/config";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3001);

// On Render the public address is provided for us; Stripe uses it to send buyers back after checkout.
process.env.WEB_BASE_URL ??= process.env.RENDER_EXTERNAL_URL;

const app = createApp();

// One-service deployment: when the web app has been built, serve it from this server too,
// so the site and its /api share one address. In local development Vite serves the web app
// and this folder is simply absent or ignored.
const webDist = process.env.WEB_DIST ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/dist");
if (process.env.NODE_ENV === "production" && existsSync(path.join(webDist, "index.html"))) {
  app.use(express.static(webDist));
  console.log(`Serving the web app from ${webDist}`);
}

app.listen(port, () => console.log(`API listening at http://localhost:${port}`));
