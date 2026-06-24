import { Router } from "express";
import { botState } from "../lib/botState";

const router = Router();

router.get("/console", (req, res) => {
  const limit = Number(req.query["limit"] ?? 100);
  const logs = botState.getLogs(isNaN(limit) ? 100 : limit);
  res.json(logs);
});

router.post("/console/clear", (_req, res) => {
  botState.clearLogs();
  res.json({ message: "Console cleared" });
});

export default router;
