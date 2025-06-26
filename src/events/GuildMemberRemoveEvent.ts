import { Event } from "@/core/typings";
import { db } from "@/db";
import { guildConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EmbedBuilder, Events, GuildMember, TextChannel } from "discord.js";
import config from "@/config";

export default {
    name: Events.GuildMemberRemove,
    run: async (member: GuildMember) => {
        if (member.user.bot) return;

        const [gConfig] = await db.select().from(guildConfig).where(eq(guildConfig.id, member.guild.id));
        if (!gConfig || !gConfig.logsChannelId || !gConfig.enabledLogs?.includes("guildMemberRemove")) return;

        const channel = await member.guild.channels.fetch(gConfig.logsChannelId) as TextChannel;
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: "Member Left", iconURL: member.user.displayAvatarURL() })
            .setColor(config.colors.error)
            .setDescription(`${member.user} ${member.user.tag}`)
            .setTimestamp()
            .setFooter({ text: `ID: ${member.id}` });

        await channel.send({ embeds: [embed] });
    }
} as Event<"guildMemberRemove">;
