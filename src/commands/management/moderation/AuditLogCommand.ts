import { db } from "@/db";
import { guildConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Command } from "@/core/typings";
import { ApplicationCommandOptionType, ChannelType, ApplicationCommandType } from "discord.js";
import { Embed } from "@/core/Embed";

const logTypes = [
    { name: "Member Join", value: "guildMemberAdd" },
    { name: "Member Leave", value: "guildMemberRemove" },
    { name: "Message Delete", value: "messageDelete" },
    { name: "Guild Update Event", value: "guildUpdate" },
] as const;

export default {
    name: "auditlog",
    description: "Configure the audit log for this server.",
    type: ApplicationCommandType.ChatInput,
    usage: ["/auditlog enable #channel", "/auditlog disable", "/auditlog toggle <event>", "/auditlog status"],
    options: [
        {
            name: "enable",
            description: "Enable the audit log and set the channel.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "channel",
                    description: "The channel to send audit logs to.",
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                    channelTypes: [ChannelType.GuildText]
                }
            ]
        },
        {
            name: "disable",
            description: "Disable the audit log.",
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: "toggle",
            description: "Toggle a specific audit log event.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "event",
                    description: "The event to toggle.",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    choices: logTypes.map(lt => ({ name: lt.name, value: lt.value }))
                }
            ]
        },
        {
            name: "status",
            description: "Show the current status of all audit log events.",
            type: ApplicationCommandOptionType.Subcommand,
        }
    ],
    run: async ({ ctx, args }) => {
        if (!ctx.guild) return;

        const subcommand = args.getSubcommand(true);

        if (subcommand === "enable") {
            const channel = args.getChannel("channel", true);

            await db.update(guildConfig)
                .set({ logsChannelId: channel.id })
                .where(eq(guildConfig.id, ctx.guild.id));

            return ctx.reply({ content: `Audit log channel set to <#${channel.id}>`, flags: ["Ephemeral"] });
        } else if (subcommand === "disable") {
            await db.update(guildConfig)
                .set({ logsChannelId: null })
                .where(eq(guildConfig.id, ctx.guild.id));

            return ctx.reply({ content: "Audit log disabled.", flags: ["Ephemeral"] });
        } else if (subcommand === "toggle") {
            const eventToToggle = args.getString("event", true) as typeof logTypes[number]['value'];
            
            const [gConfig] = await db.select().from(guildConfig).where(eq(guildConfig.id, ctx.guild.id));

            if (!gConfig) {
                return ctx.reply({ content: "Could not find guild configuration.", flags: ["Ephemeral"] });
            }

            const enabledLogs = gConfig.enabledLogs || [];
            const isEnabled = enabledLogs.includes(eventToToggle);
            
            const newEnabledLogs = isEnabled
                ? enabledLogs.filter(el => el !== eventToToggle)
                : [...enabledLogs, eventToToggle];

            await db.update(guildConfig)
                .set({ enabledLogs: newEnabledLogs })
                .where(eq(guildConfig.id, ctx.guild.id));
            
            const eventName = logTypes.find(lt => lt.value === eventToToggle)?.name || eventToToggle;

            return ctx.reply({ content: `${isEnabled ? "Disabled" : "Enabled"} logging for **${eventName}**.`, flags: ["Ephemeral"] });
        } else if (subcommand === "status") {
            const [gConfig] = await db.select().from(guildConfig).where(eq(guildConfig.id, ctx.guild.id));

            if (!gConfig) {
                return ctx.reply({ content: "Could not find guild configuration.", flags: ["Ephemeral"] });
            }

            const logChannel = gConfig.logsChannelId ? `<#${gConfig.logsChannelId}>` : "Not set";
            const overallStatus = gConfig.logsChannelId ? "Enabled" : "Disabled";

            const enabledLogs = gConfig.enabledLogs || [];

            const eventsStatus = logTypes.map(logType => {
                const isEnabled = enabledLogs.includes(logType.value);
                return `**${logType.name}**: ${isEnabled ? '✅' : '❌'}`;
            }).join('\n');

            const embed = new Embed({
                title: "Audit Log Status",
                description: `**Overall Status**: ${overallStatus}\n**Log Channel**: ${logChannel}\n\n**Events**:\n${eventsStatus}`,
            });

            return ctx.reply({
                embeds: [embed],
                flags: ["Ephemeral"]
            });
        }
    }
} as Command;