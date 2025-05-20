import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  json,
  date,
} from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { MessageReference } from "discord.js";

export const guildConfig = pgTable("guild_config", {
  id: text("id").primaryKey(), // guild id
  disabledCommands: text("disabled_command").array().notNull().default([]),

  //Logging
  logsChannelId: text("logs_channel_id"),
  enabledLogs: text("enabled_loggers")
    .array()
    .notNull()
    .default(["moderation", "memberAdd"]),

  // toggables
  reactionRoles: boolean("reaction_roles").notNull().default(false),
});

export type GuildConfigSelect = typeof guildConfig.$inferSelect;
export type GuildConfigInsert = typeof guildConfig.$inferInsert;

export const reactionRole = pgTable("reaction_role", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  uniqueId: text("unique_id")
    .notNull()
    .$defaultFn(() => createId()),
  message: text("message").notNull(), // message payload JSON str
  reactions: text("reactions").notNull().array(), // Array of json stringifies, { roleId: string, emoji: string; label: string; style: string}
  messageId: text("message_id"), // links to existing message if there is one
  channelId: text("channel_id"),
  name: text("name").notNull(),
});

export type ReactionRoleSelect = typeof reactionRole.$inferSelect;
export type ReactionRoleInsert = typeof reactionRole.$inferInsert;

export const infraction = pgTable("infraction", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId(15)), // unique id,
  userId: text("user_id").notNull(),
  guildId: text("guild_id").notNull(),
  silenced: boolean("silenced").default(false),
  permanent: boolean("permanent").default(false),
  reason: text("reason").notNull(),
  proofUrl: text("proof_url"),
  moderatorId: text("moderator_id").notNull(),
  type: text("infraction_type").notNull(),
  history: json("history")
    .$type<
      {
        id: string;
        content: string | null | undefined;
        time: number;
        edited: number | undefined | null;
        reference: MessageReference;
      }[]
    >()
    .array(),

  timestampIssued: date("date_issued", {
    mode: "string",
  }).defaultNow(),
});

export type InfractionSelect = typeof infraction.$inferSelect;
export type InfractionInsert = typeof infraction.$inferInsert;
