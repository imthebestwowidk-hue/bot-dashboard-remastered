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

const AUTH_REGISTER_PATTERNS = [
  /register/i,
  /\/register/i,
  /please register/i,
  /you need to register/i,
  /register with/i,
];

const AUTH_LOGIN_PATTERNS = [
  /\/login/i,
  /please login/i,
  /please log in/i,
  /you need to log in/i,
  /log in to/i,
  /type \/login/i,
];

function isAuthPrompt(message: string): "register" | "login" | null {
  const lower = message.toLowerCase();
  if (AUTH_LOGIN_PATTERNS.some((p) => p.test(lower))) return "login";
  if (AUTH_REGISTER_PATTERNS.some((p) => p.test(lower))) return "register";
  return null;
}

export function connectBot(opts: ConnectOptions) {
  if (botState.bot) {
    try {
      botState.bot.quit();
    } catch {}
    botState.reset();
  }

  botState.botHost = opts.host;
  botState.botPort = opts.port;
  botState.botUsername = opts.username;
  botState.botVersion = opts.version;
  botState.pendingPassword = opts.password ?? null;
  botState.botState = "connecting";
  botState.addLog("system", `Initiating uplink to ${opts.host}:${opts.port}...`);

  const serverKey = `${opts.host}:${opts.port}`;

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

  bot.on("login", () => {
    botState.botConnected = true;
    botState.botState = "online";
    botState.addLog("system", `Connected to ${opts.host}:${opts.port} as ${opts.username}`);
  });

  bot.on("spawn", () => {
    botState.addLog("system", "Bot spawned in world.");
    if (botState.attackMode.enabled) {
      botState.setAttackMode(botState.attackMode);
    }
    if (botState.antiAfk.enabled) {
      botState.setAntiAfk(botState.antiAfk);
    }
  });

  bot.on("chat", (username: string, message: string) => {
    botState.addLog("chat", `<${username}> ${message}`);
  });

  bot.on("message", (jsonMsg: any) => {
    const text = jsonMsg.toString();
    botState.addLog("info", text);

    if (!opts.password && !botState.pendingPassword) return;

    const password = opts.password || botState.pendingPassword;
    if (!password) return;

    const authPrompt = isAuthPrompt(text);

    if (authPrompt === "login") {
      const existing = botState.getMemoryEntry(serverKey);
      if (existing) {
        setTimeout(() => {
          try {
            bot.chat(`/login ${existing.password}`);
            botState.addLog("system", "Sent /login command (auto-auth from vault).");
          } catch (err) {
            logger.error({ err }, "Error sending /login");
          }
        }, 500);
      }
    } else if (authPrompt === "register") {
      const existing = botState.getMemoryEntry(serverKey);
      if (existing && existing.registered) {
        setTimeout(() => {
          try {
            bot.chat(`/login ${existing.password}`);
            botState.addLog("system", "Already registered — sent /login (not /register again).");
          } catch (err) {
            logger.error({ err }, "Error sending /login");
          }
        }, 500);
      } else {
        setTimeout(() => {
          try {
            bot.chat(`/register ${password} ${password}`);
            botState.addLog("system", "Sent /register command (first time on this server).");
            botState.setMemoryEntry({ server: serverKey, registered: true, password });
          } catch (err) {
            logger.error({ err }, "Error sending /register");
          }
        }, 500);
      }
    }
  });

  bot.on("health", () => {
  });

  bot.on("error", (err: any) => {
    botState.addLog("error", `Error: ${err.message}`);
    logger.error({ err }, "Bot error");
  });

  bot.on("end", (reason: string) => {
    botState.stopIntervals();
    botState.botConnected = false;
    botState.botState = "disconnected";
    botState.bot = null;
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
    try {
      botState.bot.quit("Operator disconnect");
    } catch {}
  }
  botState.reset();
  botState.addLog("system", "Bot disconnected by operator.");
}
