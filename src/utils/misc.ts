import type { Guild } from "discord.js";
import { app } from "..";
import config from "../config";
import { db } from "@/db";
import { guildConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

export function createId(length: number = 35) {
  let str = "QWERTYUIOASDFGHJKLZXCVBNMqwertyuioasdfghjklzxcvbnm1234567890---";
  let chars = "";
  for (let i = 0; i < length; i++) {
    chars += str[Math.floor(Math.random() * str.length)];
  }
  return str;
}

export function updateDisabledCommands(
  currentDisabled: string[],
  enableList: string[],
  disableList: string[]
): string[] {
  const disabledSet = new Set(currentDisabled);

  for (const cmd of enableList) {
    if (disabledSet.has(cmd)) {
      disabledSet.delete(cmd);
    }
  }

  for (const cmd of disableList) {
    if (!disabledSet.has(cmd)) {
      disabledSet.add(cmd);
    }
  }

  return Array.from(disabledSet);
}

export async function getGuildConfig(id: string) {
  let d = await db.select().from(guildConfig).where(eq(guildConfig.id, id));
  if (!d || !d[0]) {
    await db
      .insert(guildConfig)
      .values({
        id: id,
      })
      .execute();

    d = await db.select().from(guildConfig).where(eq(guildConfig.id, id));
  }
  return d || d[0] ? d[0] : null;
}

export async function disabledCommand(name: string, guildId: string) {
  const config = await getGuildConfig(guildId);
  if (!config) return false;

  return config.disabledCommands.includes(name.toLowerCase());
}

export function getCommand(name: string) {
  return app.commands.get(name.toLowerCase());
}
