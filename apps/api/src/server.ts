import cors from "cors";
import express from "express";
import { eventsRouter } from "./routes/events.js";
import { endorsementsRouter, reportsRouter } from "./routes/moderation.js";
import { profilesRouter } from "./routes/profiles.js";
import { recommendationsRouter } from "./routes/recommendations.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());
app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
app.use("/api/events", eventsRouter);
app.use("/api/profiles", profilesRouter);
app.use("/api/recommendations", recommendationsRouter);
app.use("/api/endorsements", endorsementsRouter);
app.use("/api/reports", reportsRouter);

app.listen(port, () => console.log(`API listening at http://localhost:${port}`));
