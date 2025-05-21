import config from "@/config";
import { GuildMember, PermissionsBitField } from "discord.js";

export type Perm = {
  name: string;
  weight: number;
};

export function permissionWeightToEmoji(perm: Perm) {
  if (perm.weight >= 100) return config.emojis.owner;
  if (perm.weight >= 85) return config.emojis.admin;
  if (perm.weight >= 55) return config.emojis.mod;
  return config.emojis.member;
}

export function findHighestPermission(member: GuildMember): Perm {
  if (member.id === member.guild.ownerId) {
    return { name: "Server Owner", weight: 100 };
  }

  const permissionHierarchy = [
    {
      flag: PermissionsBitField.Flags.Administrator,
      name: "Administrator",
      weight: 99,
    },
    {
      flag: PermissionsBitField.Flags.ManageGuild,
      name: "Manage Server",
      weight: 90,
    },
    {
      flag: PermissionsBitField.Flags.BanMembers,
      name: "Ban Members",
      weight: 85,
    },
    {
      flag: PermissionsBitField.Flags.KickMembers,
      name: "Kick Members",
      weight: 80,
    },
    {
      flag: PermissionsBitField.Flags.ManageChannels,
      name: "Manage Channels",
      weight: 75,
    },
    {
      flag: PermissionsBitField.Flags.ManageRoles,
      name: "Manage Roles",
      weight: 70,
    },
    {
      flag: PermissionsBitField.Flags.ManageMessages,
      name: "Manage Messages",
      weight: 65,
    },
    {
      flag: PermissionsBitField.Flags.MentionEveryone,
      name: "Mention Everyone",
      weight: 87,
    },
    {
      flag: PermissionsBitField.Flags.ModerateMembers,
      name: "Timeout Members",
      weight: 55,
    },
    {
      flag: PermissionsBitField.Flags.ManageWebhooks,
      name: "Manage Webhooks",
      weight: 50,
    },
    {
      flag: PermissionsBitField.Flags.ManageEmojisAndStickers,
      name: "Manage Emojis and Stickers",
      weight: 45,
    },
    {
      flag: PermissionsBitField.Flags.ManageThreads,
      name: "Manage Threads",
      weight: 40,
    },
    {
      flag: PermissionsBitField.Flags.ManageEvents,
      name: "Manage Events",
      weight: 35,
    },
    {
      flag: PermissionsBitField.Flags.ManageNicknames,
      name: "Manage Nicknames",
      weight: 30,
    },
    {
      flag: PermissionsBitField.Flags.ViewAuditLog,
      name: "View Audit Log",
      weight: 25,
    },
  ];

  const permissions = member.permissions;

  for (const perm of permissionHierarchy) {
    if (permissions.has(perm.flag)) {
      return perm;
    }
  }

  return { name: "Regular Member", weight: 0 };
}
