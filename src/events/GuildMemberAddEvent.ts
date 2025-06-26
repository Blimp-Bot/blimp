import { Event } from "@/core/typings";
import { db } from "@/db";
import { guildConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EmbedBuilder, Events, GuildMember, TextChannel } from "discord.js";
import config from "@/config";

export default {
    name: Events.GuildMemberAdd,
    run: async (member: GuildMember) => {
        if (member.user.bot) return;

        const [gConfig] = await db.select().from(guildConfig).where(eq(guildConfig.id, member.guild.id));
        if (!gConfig || !gConfig.logsChannelId || !gConfig.enabledLogs?.includes("guildMemberAdd")) return;

        const channel = await member.guild.channels.fetch(gConfig.logsChannelId) as TextChannel;
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: "Member Joined", iconURL: member.user.displayAvatarURL() })
            .setColor(config.colors.success)
            .setDescription(`${member.user} ${member.user.tag}`)
            .addFields(
                { name: "Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            )
            .setTimestamp()
            .setFooter({ text: `ID: ${member.id}` });

        await channel.send({ embeds: [embed] });
    }
} as Event<"guildMemberAdd">;
