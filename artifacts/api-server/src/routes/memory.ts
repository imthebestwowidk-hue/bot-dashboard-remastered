import { Router } from "express";
import { botState } from "../lib/botState";

const router = Router();

router.get("/memory", (_req, res) => {
  res.json(botState.getMemoryEntries());
});

router.delete("/memory/:server", (req, res) => {
  const server = decodeURIComponent(req.params["server"] ?? "");
  const deleted = botState.deleteMemoryEntry(server);
  if (!deleted) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }
  res.json({ message: "Entry deleted" });
});

export default router;
