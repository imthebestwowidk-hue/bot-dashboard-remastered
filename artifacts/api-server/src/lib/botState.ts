import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import { logger } from "./logger";

export interface ConsoleLog {
  id: string;
  timestamp: string;
  type: "info" | "error" | "chat" | "system";
  message: string;
}

export interface MemoryEntry {
  server: string;
  registered: boolean;
  password: string;
}

export interface AttackMode {
  enabled: boolean;
  targetPlayer: string | null;
  attackMobs: boolean;
}

export interface AntiAfk {
  enabled: boolean;
}

export interface BotStatus {
  connected: boolean;
  state: string;
  host: string | null;
  port: number | null;
  username: string | null;
  version: string | null;
  health: number | null;
  food: number | null;
  position: { x: number; y: number; z: number } | null;
  attackMode: AttackMode;
  antiAfk: AntiAfk;
  ping: number | null;
}

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data");
const memoryFile = path.resolve(dataDir, "memory.json");

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadMemory(): Map<string, MemoryEntry> {
  ensureDataDir();
  try {
    if (fs.existsSync(memoryFile)) {
      const raw = fs.readFileSync(memoryFile, "utf8");
      const entries: MemoryEntry[] = JSON.parse(raw);
      return new Map(entries.map((e) => [e.server, e]));
    }
  } catch (err) {
    logger.error({ err }, "Failed to load memory vault");
  }
  return new Map();
}

function saveMemory(memory: Map<string, MemoryEntry>) {
  ensureDataDir();
  try {
    const entries = Array.from(memory.values());
    fs.writeFileSync(memoryFile, JSON.stringify(entries, null, 2), "utf8");
  } catch (err) {
    logger.error({ err }, "Failed to save memory vault");
  }
}

const MAX_CONSOLE_LOGS = 500;

class BotStateManager {
  private consoleLogs: ConsoleLog[] = [];
  private memory: Map<string, MemoryEntry>;
  public attackMode: AttackMode = {
    enabled: false,
    targetPlayer: null,
    attackMobs: false,
  };
  public antiAfk: AntiAfk = { enabled: false };

  public bot: any = null;
  public botConnected = false;
  public botState = "disconnected";
  public botHost: string | null = null;
  public botPort: number | null = null;
  public botUsername: string | null = null;
  public botVersion: string | null = null;
  public pendingPassword: string | null = null;

  private attackInterval: ReturnType<typeof setInterval> | null = null;
  private antiAfkInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.memory = loadMemory();
  }

  addLog(type: ConsoleLog["type"], message: string) {
    const log: ConsoleLog = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      message,
    };
    this.consoleLogs.push(log);
    if (this.consoleLogs.length > MAX_CONSOLE_LOGS) {
      this.consoleLogs.splice(0, this.consoleLogs.length - MAX_CONSOLE_LOGS);
    }
    logger.info({ type, message }, "Bot console log");
  }

  getLogs(limit = 100): ConsoleLog[] {
    return this.consoleLogs.slice(-limit);
  }

  clearLogs() {
    this.consoleLogs = [];
  }

  getStatus(): BotStatus {
    const bot = this.bot;
    return {
      connected: this.botConnected,
      state: this.botState,
      host: this.botHost,
      port: this.botPort,
      username: this.botUsername,
      version: this.botVersion,
      health: bot && this.botConnected ? (bot.health ?? null) : null,
      food: bot && this.botConnected ? (bot.food ?? null) : null,
      position: bot && this.botConnected && bot.entity?.position
        ? {
            x: bot.entity.position.x,
            y: bot.entity.position.y,
            z: bot.entity.position.z,
          }
        : null,
      attackMode: { ...this.attackMode },
      antiAfk: { ...this.antiAfk },
      ping: bot && this.botConnected ? (bot.player?.ping ?? null) : null,
    };
  }

  getMemoryEntries(): Array<{ server: string; registered: boolean; password: string }> {
    return Array.from(this.memory.values()).map((e) => ({
      server: e.server,
      registered: e.registered,
      password: e.password,
    }));
  }

  getMemoryEntry(server: string): MemoryEntry | undefined {
    return this.memory.get(server);
  }

  setMemoryEntry(entry: MemoryEntry) {
    this.memory.set(entry.server, entry);
    saveMemory(this.memory);
  }

  deleteMemoryEntry(server: string): boolean {
    const existed = this.memory.has(server);
    this.memory.delete(server);
    saveMemory(this.memory);
    return existed;
  }

  setAttackMode(mode: AttackMode) {
    this.attackMode = mode;

    if (this.attackInterval) {
      clearInterval(this.attackInterval);
      this.attackInterval = null;
    }

    if (mode.enabled && this.bot && this.botConnected) {
      this.attackInterval = setInterval(() => {
        try {
          const bot = this.bot;
          if (!bot || !this.botConnected) return;

          if (mode.targetPlayer) {
            const target = bot.players[mode.targetPlayer]?.entity;
            if (target) {
              bot.lookAt(target.position.offset(0, target.height, 0));
              bot.attack(target);
            }
          }

          if (mode.attackMobs) {
            const nearestMob = bot.nearestEntity((entity: any) => {
              return (
                entity.type === "mob" &&
                entity.position.distanceTo(bot.entity.position) < 5
              );
            });
            if (nearestMob) {
              bot.attack(nearestMob);
            }
          }
        } catch (err) {
          logger.error({ err }, "Attack interval error");
        }
      }, 1000);
    }
  }

  setAntiAfk(config: AntiAfk) {
    this.antiAfk = config;

    if (this.antiAfkInterval) {
      clearInterval(this.antiAfkInterval);
      this.antiAfkInterval = null;
    }

    if (config.enabled && this.bot && this.botConnected) {
      this.antiAfkInterval = setInterval(() => {
        try {
          const bot = this.bot;
          if (!bot || !this.botConnected) return;
          const directions = ["forward", "back", "left", "right"] as const;
          const dir = directions[Math.floor(Math.random() * directions.length)];
          bot.setControlState(dir, true);
          setTimeout(() => {
            try {
              bot.setControlState(dir, false);
            } catch {}
          }, 300);
          if (Math.random() > 0.5) {
            bot.setControlState("jump", true);
            setTimeout(() => {
              try {
                bot.setControlState("jump", false);
              } catch {}
            }, 200);
          }
        } catch (err) {
          logger.error({ err }, "Anti-AFK interval error");
        }
      }, 5000);
    }
  }

  stopIntervals() {
    if (this.attackInterval) {
      clearInterval(this.attackInterval);
      this.attackInterval = null;
    }
    if (this.antiAfkInterval) {
      clearInterval(this.antiAfkInterval);
      this.antiAfkInterval = null;
    }
  }

  reset() {
    this.stopIntervals();
    this.bot = null;
    this.botConnected = false;
    this.botState = "disconnected";
    this.botHost = null;
    this.botPort = null;
    this.botUsername = null;
    this.botVersion = null;
    this.pendingPassword = null;
    this.attackMode = { enabled: false, targetPlayer: null, attackMobs: false };
    this.antiAfk = { enabled: false };
  }
}

export const botState = new BotStateManager();
