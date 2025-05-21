import config from "@/config";
import { defaultEmbeds, Embed } from "@/core/Embed";
import { Command } from "@/core/typings";
import { moduleValid } from "@/modules";
import { findHighestPermission } from "@/utils";
import { permissionWeightToEmoji } from "@/utils/permissions";
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  GuildMember,
  resolveColor,
} from "discord.js";

export default {
  name: "info",
  description: "General purpose info commands.",
  usage: [
    "/info server",
    "/info user",
    "/info avatar",
    "/info emoji",
    "/info banner",
  ],
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "server",
      type: ApplicationCommandOptionType.Subcommand,
      description: "General server information",
    },

    {
      name: "emoji",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Information about an emoji (or multiple) & steal them.",
      options: [
        {
          name: "emojis",
          type: ApplicationCommandOptionType.String,
          description: "the emoji(s)",
          required: true,
        },
      ],
    },
    {
      name: "banner",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Fetch an banner of a target/the server.",
      options: [
        {
          name: "target",
          type: ApplicationCommandOptionType.User,
          description: "the banner target",
          required: false,
        },
      ],
    },
    {
      name: "avatar",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Fetch an avatar of a target.",
      options: [
        {
          name: "target",
          type: ApplicationCommandOptionType.User,
          description: "the avatar target",
          required: true,
        },
      ],
    },
    {
      name: "user",
      type: ApplicationCommandOptionType.Subcommand,
      description: "General user information",
      options: [
        {
          name: "target",
          type: ApplicationCommandOptionType.User,
          description: "the information target",
          required: true,
        },
      ],
    },
  ],
  run: ({ ctx, client, args }) => {
    const subCommand = args.getSubcommand(true) as string;
    switch (subCommand.toLowerCase()) {
      case "user":
        const user = args.getUser("target", true);
        const member = ctx.guild?.members.cache.find(
          (f) => f.id === user.id
        ) as GuildMember;

        const highestPermission = findHighestPermission(member);

        if (!member)
          return ctx.reply({
            embeds: [
              defaultEmbeds["unexpected-error"](
                new Error(
                  `No guild member found: ${ctx.guild?.name} (${ctx.guild?.id}) -> ${ctx.user.id}`
                )
              ),
            ],
          });

        return ctx.reply({
          flags: ["Ephemeral"],
          embeds: [
            new Embed({
              author: {
                name: `User Information`,
                url: `https://discord.com/users/${user.id}`,
              },
              description: `<@${user.id}> (${user.username}) \`[${user.id}]\`\n\n>>> ${config.emojis.text} Roles Total: *${member.roles.cache.size}*\n ${permissionWeightToEmoji(highestPermission)} Highest Permission: *${highestPermission.name}* (weight: ${highestPermission.weight})\n ${moduleValid(user.bot, "Bot")}\n ${config.emojis.member} Created At: <t:${user.createdTimestamp / 1000}:D>\n ${config.emojis.member} Joined At: <t:${(member.joinedTimestamp as number) / 1000}:D>`,
              thumbnail: user.avatar
                ? {
                    url: user.avatarURL({ size: 128 }) as string,
                  }
                : undefined,
              image: user.banner
                ? {
                    url: user.bannerURL({ size: 1024 }) as string,
                  }
                : undefined,
            }),
          ],
        });
      default:
        return ctx.reply({
          flags: ["Ephemeral"],
          embeds: [
            new Embed({
              color: resolveColor(config.colors.error),
              description: `${config.emojis.cross} Unknown information subcommand.`,
            }),
          ],
        });
    }
  },
} as Command;
