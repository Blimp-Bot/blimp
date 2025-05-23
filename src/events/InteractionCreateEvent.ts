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
    if (interaction.isButton() && interaction.guild) {
      const id = interaction.customId;

      const [, , , uId, roleId] = id.split("_");
      if (uId && roleId) {
        const reactionRoleData = await db
          .select()
          .from(reactionRole)
          .where(
            and(
              eq(reactionRole.uniqueId, uId),
              eq(reactionRole.id, interaction.guild.id)
            )
          );

        if (!reactionRoleData) return;

        const role = interaction.guild.roles.cache.find((f) => f.id === roleId);
        if (!role) return;

        if (interaction.member.roles.cache.has(role.id)) {
          interaction.member.roles
            .remove(role)
            .then(() => {
              interaction.reply({
                flags: ["Ephemeral"],
                content: `${config.emojis.tick} <@&${role.id}> has been removed from you.`,
              });
            })
            .catch(() => {
              interaction.reply({
                flags: ["Ephemeral"],
                content: `${config.emojis.cross} Failed to remove <@&${role.id}> from you.`,
              });
            });
        } else {
          interaction.member.roles
            .add(role)
            .then(() => {
              interaction.reply({
                flags: ["Ephemeral"],
                content: `${config.emojis.tick} You have been given <@&${role.id}>`,
              });
            })
            .catch(() => {
              interaction.reply({
                flags: ["Ephemeral"],
                content: `${config.emojis.tick} Failed to give you <@&${role.id}>`,
              });
            });
        }
      }
    }
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
