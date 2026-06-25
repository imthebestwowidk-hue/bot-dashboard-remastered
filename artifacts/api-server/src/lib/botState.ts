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

export interface FollowMode {
  enabled: boolean;
  targetPlayer: string | null;
}

export interface AutoDrop {
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
  followMode: FollowMode;
  autoDrop: AutoDrop;
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
  public followMode: FollowMode = { enabled: false, targetPlayer: null };
  public autoDrop: AutoDrop = { enabled: false };

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
  private autoDropInterval: ReturnType<typeof setInterval> | null = null;

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
      followMode: { ...this.followMode },
      autoDrop: { ...this.autoDrop },
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
      // If follow mode is active, disable it (attack mode takes over movement)
      if (this.followMode.enabled) {
        this._stopPathfinder();
      }

      this.attackInterval = setInterval(() => {
        try {
          const bot = this.bot;
          if (!bot || !this.botConnected) return;

          if (mode.targetPlayer) {
            const target = bot.players[mode.targetPlayer]?.entity;
            if (target) {
              const dist = bot.entity.position.distanceTo(target.position);
              // Move toward the player if farther than melee range
              if (dist > 3) {
                this._navigateTo(target, 2);
              } else {
                // Stop moving and attack
                this._stopPathfinder();
                bot.lookAt(target.position.offset(0, target.height, 0));
                bot.attack(target);
              }
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
              const dist = bot.entity.position.distanceTo(nearestMob.position);
              if (dist > 2.5) {
                this._navigateTo(nearestMob, 1.5);
              } else {
                bot.attack(nearestMob);
              }
            }
          }
        } catch (err) {
          logger.error({ err }, "Attack interval error");
        }
      }, 500);
    }
  }

  setFollowMode(mode: FollowMode) {
    this.followMode = mode;

    // Stop pathfinder first
    this._stopPathfinder();

    if (mode.enabled && this.bot && this.botConnected) {
      // Disable attack mode movement when follow mode is active
      if (this.attackMode.enabled && this.attackInterval) {
        clearInterval(this.attackInterval);
        this.attackInterval = null;
      }

      this._startFollowing(mode.targetPlayer);
      this.addLog("system", `FOLLOW MODE: Tracking ${mode.targetPlayer ?? "no target"}`);
    } else if (!mode.enabled) {
      this.addLog("system", "FOLLOW MODE: Disabled");
    }
  }

  private _startFollowing(targetPlayer: string | null) {
    if (!targetPlayer || !this.bot || !this.botConnected) return;

    try {
      const bot = this.bot;
      const { pathfinder, goals } = this._getPathfinder(bot);
      if (!pathfinder || !goals) return;

      // Re-run goal every 500ms to keep following dynamically
      const followLoop = () => {
        if (!this.followMode.enabled || !this.bot || !this.botConnected) return;
        try {
          const target = bot.players[targetPlayer]?.entity;
          if (target) {
            bot.pathfinder.setGoal(new goals.GoalFollow(target, 2), true);
          }
        } catch (_err) {}
        if (this.followMode.enabled) {
          setTimeout(followLoop, 500);
        }
      };
      followLoop();
    } catch (err) {
      logger.error({ err }, "Follow mode error");
    }
  }

  private _navigateTo(entity: any, distance: number) {
    try {
      const bot = this.bot;
      if (!bot) return;
      const { goals } = this._getPathfinder(bot);
      if (!goals) return;
      bot.pathfinder.setGoal(new goals.GoalFollow(entity, distance), true);
    } catch (_err) {}
  }

  private _stopPathfinder() {
    try {
      if (this.bot?.pathfinder) {
        this.bot.pathfinder.stop();
      }
    } catch (_err) {}
  }

  private _getPathfinder(bot: any): { pathfinder: any; goals: any } {
    try {
      // mineflayer-pathfinder is externalized so we access via require
      const pf = require("mineflayer-pathfinder");
      if (!bot.pathfinder) {
        bot.loadPlugin(pf.pathfinder);
        const { Movements } = pf;
        const movements = new Movements(bot);
        bot.pathfinder.setMovements(movements);
      }
      return { pathfinder: bot.pathfinder, goals: pf.goals };
    } catch (err) {
      logger.error({ err }, "Pathfinder load error");
      return { pathfinder: null, goals: null };
    }
  }

  setAutoDrop(config: AutoDrop) {
    this.autoDrop = config;

    if (this.autoDropInterval) {
      clearInterval(this.autoDropInterval);
      this.autoDropInterval = null;
    }

    if (config.enabled && this.bot && this.botConnected) {
      this.addLog("system", "AUTO-DROP: Enabled — dropping all items");
      // Immediately drop everything, then poll
      this._dropAllItems();
      this.autoDropInterval = setInterval(() => {
        this._dropAllItems();
      }, 2000);
    } else if (!config.enabled) {
      this.addLog("system", "AUTO-DROP: Disabled — equipping armor/elytra if available");
      // Try to equip armor/elytra now
      this._equipArmorAndElytra();
    }
  }

  private async _dropAllItems() {
    try {
      const bot = this.bot;
      if (!bot || !this.botConnected || !this.autoDrop.enabled) return;
      const items = bot.inventory.items();
      for (const item of items) {
        try {
          await bot.toss(item.type, null, item.count);
        } catch (_err) {}
      }
    } catch (err) {
      logger.error({ err }, "Auto-drop error");
    }
  }

  private async _equipArmorAndElytra() {
    try {
      const bot = this.bot;
      if (!bot || !this.botConnected) return;

      const items = bot.inventory.items();
      for (const item of items) {
        const name: string = item.name ?? "";

        // Elytra
        if (name.includes("elytra")) {
          try {
            await bot.equip(item, "torso");
            this.addLog("system", `AUTO-EQUIP: Equipped ${name} as chestplate`);
            continue;
          } catch (_err) {}
        }

        // Helmets
        if (
          name.includes("helmet") ||
          name.includes("cap") ||
          name.endsWith("_skull") ||
          name.includes("turtle_shell")
        ) {
          try {
            await bot.equip(item, "head");
            this.addLog("system", `AUTO-EQUIP: Equipped ${name} as helmet`);
            continue;
          } catch (_err) {}
        }

        // Chestplates (skip elytra already handled above)
        if (name.includes("chestplate")) {
          try {
            await bot.equip(item, "torso");
            this.addLog("system", `AUTO-EQUIP: Equipped ${name} as chestplate`);
            continue;
          } catch (_err) {}
        }

        // Leggings
        if (name.includes("leggings")) {
          try {
            await bot.equip(item, "legs");
            this.addLog("system", `AUTO-EQUIP: Equipped ${name} as leggings`);
            continue;
          } catch (_err) {}
        }

        // Boots
        if (name.includes("boots")) {
          try {
            await bot.equip(item, "feet");
            this.addLog("system", `AUTO-EQUIP: Equipped ${name} as boots`);
            continue;
          } catch (_err) {}
        }
      }
    } catch (err) {
      logger.error({ err }, "Auto-equip error");
    }
  }

  // Called when bot picks up an item — if autoDrop is enabled, drop it immediately
  async handleItemPickup() {
    if (!this.autoDrop.enabled) {
      // Try to equip armor/elytra that was just picked up
      await this._equipArmorAndElytra();
      return;
    }
    await this._dropAllItems();
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
    if (this.autoDropInterval) {
      clearInterval(this.autoDropInterval);
      this.autoDropInterval = null;
    }
    this._stopPathfinder();
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
    this.followMode = { enabled: false, targetPlayer: null };
    this.autoDrop = { enabled: false };
  }
}

export const botState = new BotStateManager();
