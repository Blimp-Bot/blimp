import {
  resolveColor,
  type ClientEvents,
  type CommandInteractionOptionResolver,
  type GuildMember,
  type Interaction,
} from "discord.js";
import type { Event, ExtendedInteraction } from "../core/typings";
import { app } from "..";
import { int } from "drizzle-orm/mysql-core";
import { disabledCommand } from "../utils/misc";
import config from "../config";
import { reactionRole } from "@/db/schema";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { defaultEmbeds, Embed } from "../core/Embed";

export default {
  name: "interactionCreate",
  run: async (interaction: Interaction) => {
    if (!interaction.guild) return;

    interaction.member = interaction.guild?.members.cache.find(
      (f) => f.id === interaction.user.id
    ) as GuildMember;
  
    if (interaction.isCommand() && interaction.guild) {
      const cmdName = interaction.commandName
        ? interaction.commandName.toLowerCase()
        : null;
      if (!cmdName) {
        return interaction.reply({
          content: `${config.emojis.cross} Unable to find command: \`/${cmdName}\``,
          flags: ["Ephemeral"],
        });
      }

      const command = app.commands.get(cmdName);
      if (!command) {
        return interaction.reply({
          content: `${config.emojis.cross} Unable to find command: \`/${cmdName}\``,
          flags: ["Ephemeral"],
        });
      }

      if (
        await disabledCommand(command.name.toLowerCase(), interaction.guild.id)
      ) {
        return interaction.reply({
          flags: ["Ephemeral"],
          embeds: [
            new Embed({
              color: resolveColor(config.colors.info),
              description: `${config.emojis.cross} This command is disabled.`,
            }),
          ],
        });
      }

      if (
        command.adminOnly &&
        !interaction.member.permissions.has("Administrator")
      ) {
        return interaction.reply({
          flags: ["Ephemeral"],
          embeds: [defaultEmbeds["missing-permissions"]()],
        });
      }

      if (
        command.defaultMemberPermissions &&
        interaction.member.permissions.missing(command.defaultMemberPermissions)
          .length > 0 &&
        !interaction.member.permissions.has("Administrator")
      ) {
        return interaction.reply({
          flags: ["Ephemeral"],
          embeds: [defaultEmbeds["missing-permissions"]()],
        });
      }

      command.run({
        args: interaction.options as CommandInteractionOptionResolver,
        client: app,
        ctx: interaction as ExtendedInteraction,
      });
    }
  },
} as Event<keyof ClientEvents>;
