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

const REGISTER_PATTERNS = [
  /\/register/i,
  /please register/i,
  /you need to register/i,
  /register with/i,
  /use \/register/i,
  /type \/register/i,
  /not registered/i,
  /register an account/i,
  /to register/i,
];

const LOGIN_PATTERNS = [
  /\/login/i,
  /please login/i,
  /please log in/i,
  /you need to log ?in/i,
  /log in to/i,
  /type \/login/i,
  /use \/login/i,
  /already registered/i,
  /to login/i,
];

const DOUBLE_PASSWORD_PATTERNS = [
  /repeat/i,
  /confirm/i,
  /twice/i,
  /again/i,
  /retype/i,
  /second/i,
  /two times/i,
  /<password> <password>/i,
  /password password/i,
  /\[password\] \[password\]/i,
];

function classifyMessage(text: string): "register" | "login" | null {
  const lower = text.toLowerCase();
  if (LOGIN_PATTERNS.some((p) => p.test(lower))) return "login";
  if (REGISTER_PATTERNS.some((p) => p.test(lower))) return "register";
  return null;
}

function needsDoublePassword(text: string): boolean {
  return DOUBLE_PASSWORD_PATTERNS.some((p) => p.test(text));
}

let authHandled = false;

function handleAuthMessage(
  text: string,
  serverKey: string,
  password: string,
  bot: any
) {
  const kind = classifyMessage(text);
  if (!kind) return;

  if (authHandled) return;

  const existing = botState.getMemoryEntry(serverKey);

  if (kind === "login" || (kind === "register" && existing?.registered)) {
    const pw = existing?.password ?? password;
    authHandled = true;
    setTimeout(() => {
      try {
        bot.chat(`/login ${pw}`);
        botState.addLog("system", `AUTO-AUTH: sent /login (vault entry found for ${serverKey})`);
      } catch (err: any) {
        logger.error({ err }, "Error sending /login");
      }
    }, 600);
    return;
  }

  if (kind === "register" && !existing?.registered) {
    const useDouble = needsDoublePassword(text);
    const cmd = useDouble
      ? `/register ${password} ${password}`
      : `/register ${password}`;

    authHandled = true;
    setTimeout(() => {
      try {
        bot.chat(cmd);
        botState.addLog(
          "system",
          `AUTO-AUTH: sent ${useDouble ? "/register <pw> <pw>" : "/register <pw>"} (first time on ${serverKey})`
        );
        botState.setMemoryEntry({ server: serverKey, registered: true, password });
      } catch (err: any) {
        logger.error({ err }, "Error sending /register");
      }
    }, 600);
  }
}

export function connectBot(opts: ConnectOptions) {
  if (botState.bot) {
    try {
      botState.bot.quit();
    } catch {}
    botState.reset();
  }

  authHandled = false;

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

  const password = opts.password || botState.pendingPassword;

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
  });

  bot.on("message", (jsonMsg: any) => {
    const text = jsonMsg.toString();
    botState.addLog("info", text);
    if (password) {
      handleAuthMessage(text, serverKey, password, bot);
    }
  });

  bot.on("whisper", (username: string, message: string) => {
    const text = `[whisper] ${username}: ${message}`;
    botState.addLog("info", text);
    if (password) {
      handleAuthMessage(text, serverKey, password, bot);
    }
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
    authHandled = false;
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
  authHandled = false;
  botState.reset();
  botState.addLog("system", "Bot disconnected by operator.");
}
