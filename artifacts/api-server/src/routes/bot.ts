import { Router } from "express";
import { ConnectBotBody, SetAttackModeBody, SetAntiAfkBody, SendChatBody } from "@workspace/api-zod";
import { connectBot, disconnectBot } from "../lib/botManager";
import { botState } from "../lib/botState";

const router = Router();

router.get("/bot/status", (_req, res) => {
  res.json(botState.getStatus());
});

router.post("/bot/connect", (req, res) => {
  const parsed = ConnectBotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { host, port, username, version, password } = parsed.data;
  try {
    connectBot({
      host,
      port: port ?? 25565,
      username,
      version,
      password: password ?? null,
    });
    res.json({ message: "Connection initiated" });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to connect" });
  }
});

router.post("/bot/disconnect", (_req, res) => {
  disconnectBot();
  res.json({ message: "Bot disconnected" });
});

router.post("/bot/attack", (req, res) => {
  const parsed = SetAttackModeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { enabled, targetPlayer, attackMobs } = parsed.data;
  botState.setAttackMode({
    enabled,
    targetPlayer: targetPlayer ?? null,
    attackMobs,
  });
  res.json({ message: "Attack mode updated" });
});

router.post("/bot/antiafk", (req, res) => {
  const parsed = SetAntiAfkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  botState.setAntiAfk({ enabled: parsed.data.enabled });
  res.json({ message: "Anti-AFK updated" });
});

router.post("/chat", (req, res) => {
  const parsed = SendChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const bot = botState.bot;
  if (!bot || !botState.botConnected) {
    res.status(400).json({ error: "Bot not connected" });
    return;
  }
  try {
    bot.chat(parsed.data.message);
    botState.addLog("chat", `[YOU] ${parsed.data.message}`);
    res.json({ message: "Message sent" });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to send chat" });
  }
});

export default router;
