import mineflayer from "mineflayer";
import { botState } from "./botState";
import { logger } from "./logger";

export interface ConnectOptions {
  host: string;
  port: number;
  username: string;
  version: string;
  password?: string | null;
}

// Very broad patterns — if the server mentions these words, treat it as an auth prompt
const REGISTER_PATTERNS = [
  /register/i,
];

const LOGIN_PATTERNS = [
  /login/i,
  /log.?in/i,
];

// If the server message implies typing the password twice
const DOUBLE_PASSWORD_PATTERNS = [
  /repeat/i,
  /confirm/i,
  /twice/i,
  /again/i,
  /retype/i,
  /second/i,
  /two.?times/i,
  /<password> <password>/i,
  /password> <password/i,
  /\[password\]\s*\[password\]/i,
];

function classifyText(text: string): "register" | "login" | null {
  if (LOGIN_PATTERNS.some((p) => p.test(text))) return "login";
  if (REGISTER_PATTERNS.some((p) => p.test(text))) return "register";
  return null;
}

function needsDoublePassword(text: string): boolean {
  return DOUBLE_PASSWORD_PATTERNS.some((p) => p.test(text));
}

// Extract plain text from various packet formats
function extractText(data: any): string {
  if (!data) return "";
  if (typeof data === "string") {
    // Try to parse as JSON (Minecraft chat component)
    try {
      const parsed = JSON.parse(data);
      return flattenComponent(parsed);
    } catch {
      return data;
    }
  }
  if (typeof data === "object") {
    return flattenComponent(data);
  }
  return String(data);
}

function flattenComponent(obj: any): string {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  let text = obj.text ?? obj.translate ?? "";
  if (Array.isArray(obj.extra)) {
    text += obj.extra.map(flattenComponent).join("");
  }
  if (Array.isArray(obj.with)) {
    // simple translate substitution — just join the args
    text += " " + obj.with.map(flattenComponent).join(" ");
  }
  return text;
}

export function connectBot(opts: ConnectOptions) {
  if (botState.bot) {
    try { botState.bot.quit(); } catch {}
    botState.reset();
  }

  botState.botHost = opts.host;
  botState.botPort = opts.port;
  botState.botUsername = opts.username;
  botState.botVersion = opts.version;
  botState.pendingPassword = opts.password ?? null;
  botState.botState = "connecting";
  botState.addLog("system", `Initiating uplink to ${opts.host}:${opts.port}...`);

  // Key includes username so different bot names on the same server have separate vault entries
  const serverKey = `${opts.host}:${opts.port}:${opts.username}`;
  // Capture password at connect time — opts.password could be "" which is falsy,
  // so store it separately and treat "" the same as null (no auto-auth)
  const password = (opts.password && opts.password.trim()) ? opts.password.trim() : null;

  let authSent = false;

  function tryAuth(rawText: string) {
    if (authSent) return;
    if (!password) return;

    const kind = classifyText(rawText);
    if (!kind) return;

    const existing = botState.getMemoryEntry(serverKey);

    if (kind === "login" || (kind === "register" && existing?.registered)) {
      const pw = existing?.password ?? password;
      authSent = true;
      setTimeout(() => {
        try {
          bot.chat(`/login ${pw}`);
          botState.addLog("system", `AUTO-AUTH: /login sent (vault: ${!!existing})`);
        } catch (err: any) {
          logger.error({ err }, "Error sending /login");
        }
      }, 600);
      return;
    }

    if (kind === "register" && !existing?.registered) {
      const useDouble = needsDoublePassword(rawText);
      const cmd = useDouble
        ? `/register ${password} ${password}`
        : `/register ${password}`;
      authSent = true;
      setTimeout(() => {
        try {
          bot.chat(cmd);
          botState.addLog(
            "system",
            `AUTO-AUTH: ${useDouble ? "/register <pw> <pw>" : "/register <pw>"} sent — saving to vault`
          );
          botState.setMemoryEntry({ server: serverKey, registered: true, password });
        } catch (err: any) {
          logger.error({ err }, "Error sending /register");
        }
      }, 600);
    }
  }

  let bot: any;
  try {
    bot = mineflayer.createBot({
      host: opts.host,
      port: opts.port,
      username: opts.username,
      version: opts.version,
      auth: "offline",
      hideErrors: false,
    });
  } catch (err: any) {
    botState.addLog("error", `Failed to create bot: ${err.message}`);
    botState.botState = "error";
    return;
  }

  botState.bot = bot;

  // ── mineflayer high-level events ────────────────────────────────────────────
  bot.on("login", () => {
    botState.botConnected = true;
    botState.botState = "online";
    botState.addLog("system", `Connected to ${opts.host}:${opts.port} as ${opts.username}`);
  });

  bot.on("spawn", () => {
    botState.addLog("system", "Bot spawned in world.");
    if (botState.attackMode.enabled) botState.setAttackMode(botState.attackMode);
    if (botState.antiAfk.enabled) botState.setAntiAfk(botState.antiAfk);
  });

  bot.on("chat", (username: string, message: string) => {
    botState.addLog("chat", `<${username}> ${message}`);
    tryAuth(message);
  });

  // mineflayer message event — catches system/server messages
  bot.on("message", (jsonMsg: any) => {
    const text = typeof jsonMsg?.toString === "function" ? jsonMsg.toString() : String(jsonMsg);
    botState.addLog("info", text);
    tryAuth(text);
  });

  // ── Raw packet listeners — catches EVERYTHING the server sends ───────────────
  // These fire for every packet, before mineflayer processes them,
  // so we catch auth prompts even if mineflayer drops or transforms them.
  const client = bot._client;

  if (client) {
    // 1.18 and below: "chat" packet
    client.on("chat", (packet: any) => {
      const text = extractText(packet.message ?? packet.chatMessage ?? packet.msg ?? "");
      if (text) tryAuth(text);
    });

    // 1.19+: "system_chat" packet
    client.on("system_chat", (packet: any) => {
      const text = extractText(packet.content ?? packet.message ?? "");
      if (text) tryAuth(text);
    });

    // Title packets (some servers send auth prompts as titles)
    client.on("title", (packet: any) => {
      const text = extractText(packet.text ?? packet.title ?? "");
      if (text) tryAuth(text);
    });

    // Action bar
    client.on("action_bar", (packet: any) => {
      const text = extractText(packet.text ?? "");
      if (text) tryAuth(text);
    });

    // Disconnect/kick reason also sometimes contains auth hint
    client.on("kick_disconnect", (packet: any) => {
      const text = extractText(packet.reason ?? "");
      botState.addLog("error", `Kicked: ${text}`);
    });
  }

  // ── Health / combat ─────────────────────────────────────────────────────────
  bot.on("health", () => {});

  // ── Error / disconnect ───────────────────────────────────────────────────────
  bot.on("error", (err: any) => {
    botState.addLog("error", `Error: ${err.message}`);
    logger.error({ err }, "Bot error");
  });

  bot.on("end", (reason: string) => {
    botState.stopIntervals();
    botState.botConnected = false;
    botState.botState = "disconnected";
    botState.bot = null;
    authSent = false;
    botState.addLog("system", `Disconnected: ${reason ?? "connection closed"}`);
    logger.info({ reason }, "Bot disconnected");
  });

  bot.on("kicked", (reason: any) => {
    let reasonStr: string;
    try {
      reasonStr = typeof reason === "string" ? reason : JSON.stringify(reason);
    } catch {
      reasonStr = "kicked";
    }
    botState.addLog("error", `Kicked: ${reasonStr}`);
    logger.warn({ reason: reasonStr }, "Bot kicked");
  });
}

export function disconnectBot() {
  if (botState.bot) {
    try { botState.bot.quit("Operator disconnect"); } catch {}
  }
  botState.reset();
  botState.addLog("system", "Bot disconnected by operator.");
}
