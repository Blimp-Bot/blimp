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
  parseEmoji,
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
  run: async ({ ctx, client, args }) => {
    const subCommand = args.getSubcommand(true) as string;
    switch (subCommand.toLowerCase()) {
      case "server": {
        const guild = ctx.guild;
        if (!guild)
          return ctx.reply({
            embeds: [defaultEmbeds["unexpected-error"](new Error())],
          });

        const owner = await guild.fetchOwner();

        return ctx.reply({
          flags: ["Ephemeral"],
          embeds: [
            new Embed({
              author: {
                name: `Server Information`,
                iconURL: guild.iconURL() ?? undefined,
              },
              fields: [
                {
                  name: "Name",
                  value: `${guild.name} (\`${guild.id}\`)`,
                  inline: true,
                },
                {
                  name: "Owner",
                  value: `${owner.user.tag} (\`${owner.id}\`)`,
                  inline: true,
                },
                {
                  name: "Created At",
                  value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`,
                  inline: true,
                },
                {
                  name: "Members",
                  value: `Total: ${guild.memberCount}`,
                  inline: true,
                },
                {
                  name: "Channels",
                  value: `Total: ${guild.channels.cache.size}`,
                  inline: true,
                },
                {
                  name: "Roles",
                  value: `Total: ${guild.roles.cache.size}`,
                  inline: true,
                },
              ],
              thumbnail: guild.iconURL()
                ? { url: guild.iconURL({ size: 128 }) as string }
                : undefined,
              image: guild.bannerURL()
                ? { url: guild.bannerURL({ size: 1024 }) as string }
                : undefined,
            }),
          ],
        });
      }
      case "emoji": {
        const emojiStr = args.getString("emojis", true);
        const emojiRegex = /<a?:\w+:\d+>/g;
        const customEmojis = emojiStr.match(emojiRegex);

        if (!customEmojis) {
          return ctx.reply({
            flags: ["Ephemeral"],
            embeds: [
              new Embed({
                description:
                  "Could not find any custom emojis in your message. Unicode emojis are not supported.",
              }),
            ],
          });
        }

        const embeds: Embed[] = [];

        for (const emoji of customEmojis) {
          const parsed = parseEmoji(emoji);
          if (parsed && parsed.id) {
            const url = `https://cdn.discordapp.com/emojis/${parsed.id}.${
              parsed.animated ? "gif" : "png"
            }`;
            embeds.push(
              new Embed({
                author: { name: `Emoji: ${parsed.name}` },
                description: `[Click here to download](${url})`,
                thumbnail: { url },
                fields: [
                  {
                    name: "Name",
                    value: parsed.name as string,
                    inline: true,
                  },
                  { name: "ID", value: parsed.id, inline: true },
                  {
                    name: "Animated",
                    value: String(parsed.animated),
                    inline: true,
                  },
                ],
              })
            );
          }
        }

        if (embeds.length === 0) {
          return ctx.reply({
            flags: ["Ephemeral"],
            embeds: [
              new Embed({
                description: "Could not parse any custom emojis.",
              }),
            ],
          });
        }

        return ctx.reply({
          flags: ["Ephemeral"],
          embeds: embeds.slice(0, 10),
        });
      }
      case "banner": {
        const user = args.getUser("target");
        if (user) {
          const fetchedUser = await user.fetch(true);
          if (!fetchedUser.banner) {
            return ctx.reply({
              flags: ["Ephemeral"],
              embeds: [
                new Embed({
                  color: resolveColor(config.colors.error),
                  description: `${config.emojis.cross} This user does not have a banner.`,
                }),
              ],
            });
          }
          return ctx.reply({
            flags: ["Ephemeral"],
            embeds: [
              new Embed({
                author: {
                  name: `${fetchedUser.username}'s Banner`,
                  url: fetchedUser.bannerURL({ size: 1024 }) ?? undefined,
                },
                image: {
                  url: fetchedUser.bannerURL({ size: 1024 }) as string,
                },
              }),
            ],
          });
        } else {
          if (!ctx.guild?.banner) {
            return ctx.reply({
              flags: ["Ephemeral"],
              embeds: [
                new Embed({
                  color: resolveColor(config.colors.error),
                  description: `${config.emojis.cross} This server does not have a banner.`,
                }),
              ],
            });
          }
          return ctx.reply({
            flags: ["Ephemeral"],
            embeds: [
              new Embed({
                author: {
                  name: `${ctx.guild.name}'s Banner`,
                  url: ctx.guild.bannerURL({ size: 1024 }) ?? undefined,
                },
                image: {
                  url: ctx.guild.bannerURL({ size: 1024 }) as string,
                },
              }),
            ],
          });
        }
      }
      case "avatar": {
        const user = args.getUser("target", true);
        return ctx.reply({
          flags: ["Ephemeral"],
          embeds: [
            new Embed({
              author: {
                name: `${user.username}'s Avatar`,
                url: user.displayAvatarURL({ size: 1024 }),
              },
              image: {
                url: user.displayAvatarURL({ size: 1024 }),
              },
            }),
          ],
        });
      }
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
