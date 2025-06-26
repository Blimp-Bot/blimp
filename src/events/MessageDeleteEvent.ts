import { Event } from "@/core/typings";
import { db } from "@/db";
import { guildConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EmbedBuilder, Events, Message, TextChannel } from "discord.js";
import config from "@/config";

export default {
    name: Events.MessageDelete,
    run: async (message: Message) => {
        if (!message.guild || !message.author || message.author.bot) return;

        const [gConfig] = await db.select().from(guildConfig).where(eq(guildConfig.id, message.guild.id));
        if (!gConfig || !gConfig.logsChannelId || !gConfig.enabledLogs?.includes("messageDelete")) return;

        const channel = await message.guild.channels.fetch(gConfig.logsChannelId) as TextChannel;
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: "Message Deleted", iconURL: message.author.displayAvatarURL() })
            .setColor(config.colors.error)
            .setDescription(`Message sent by ${message.author} deleted in ${message.channel}`)
            .addFields(
                { name: "Content", value: message.content || "No content" }
            )
            .setTimestamp()
            .setFooter({ text: `User ID: ${message.author.id} | Message ID: ${message.id}` });

        await channel.send({ embeds: [embed] });
    }
} as Event<"messageDelete">;
