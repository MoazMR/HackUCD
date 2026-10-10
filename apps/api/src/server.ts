import cors from "cors";
import express from "express";
import { eventsRouter } from "./routes/events.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());
app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
app.use("/api/events", eventsRouter);

app.listen(port, () => console.log(`API listening at http://localhost:${port}`));
