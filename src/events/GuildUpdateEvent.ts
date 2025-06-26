import { Event } from "@/core/typings";
import { db } from "@/db";
import { guildConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EmbedBuilder, Events, Guild, TextChannel } from "discord.js";
import config from "@/config";
import CoreBot from "@/core/Core";

export default {
    name: Events.GuildUpdate,
    run: async (oldGuild: Guild, newGuild: Guild) => {
        const client = newGuild.client as CoreBot;
        const [gConfig] = await db.select().from(guildConfig).where(eq(guildConfig.id, newGuild.id));
        if (!gConfig || !gConfig.logsChannelId || !gConfig.enabledLogs?.includes("guildUpdate")) return;

        const channel = await newGuild.channels.fetch(gConfig.logsChannelId).catch(() => null) as TextChannel | null;
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTimestamp()
            .setFooter({ text: `ID: ${newGuild.id}` });

        const changes: string[] = [];

        if (oldGuild.name !== newGuild.name) {
            changes.push(`**Name:** ${oldGuild.name} -> ${newGuild.name}`);
        }

        if (oldGuild.iconURL() !== newGuild.iconURL()) {
            changes.push(`**Icon:** [Old Icon](${oldGuild.iconURL()}) -> [New Icon](${newGuild.iconURL()})`);
            embed.setThumbnail(newGuild.iconURL());
        }
        
        if (oldGuild.bannerURL() !== newGuild.bannerURL()) {
            changes.push(`**Banner:** [Old Banner](${oldGuild.bannerURL()}) -> [New Banner](${newGuild.bannerURL()})`);
            embed.setImage(newGuild.bannerURL());
        }

        if (oldGuild.ownerId !== newGuild.ownerId) {
            const oldOwner = await client.users.fetch(oldGuild.ownerId).catch(() => ({ tag: "Unknown" }));
            const newOwner = await client.users.fetch(newGuild.ownerId).catch(() => ({ tag: "Unknown" }));
            changes.push(`**Owner:** ${oldOwner.tag} -> ${newOwner.tag}`);
        }

        if (changes.length > 0) {
            embed.setAuthor({ name: "Server Updated", iconURL: newGuild.iconURL() ?? undefined });
            embed.setDescription(changes.join('\n'));
            await channel.send({ embeds: [embed] });
        }
    }
} as Event<"guildUpdate">;
