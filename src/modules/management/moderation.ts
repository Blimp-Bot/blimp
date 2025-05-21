import {
  Attachment,
  Guild,
  InteractionReplyOptions,
  InteractionResponse,
  Message,
  MessagePayload,
  resolveColor,
  TextBasedChannel,
  TextChannel,
  User,
} from "discord.js";
import {
  MessageResponse,
  Module,
  ModuleBooleanFn,
  moduleValid,
  ModuleValidation,
} from "..";
import CoreBot from "@/core/Core";
import { Command, ExtendedInteraction } from "@/core/typings";
import { defaultEmbeds, Embed } from "@/core/Embed";
import config from "@/config";
import { infraction, InfractionSelect } from "@/db/schema";
import { createId, err } from "@/utils";
import { db } from "@/db";
import { SQL, Placeholder } from "drizzle-orm";

export default class Moderation {
  constructor() {}

  public async warn(guild: Guild) {
    return new WarningSystem(guild);
  }

  public async ban(guild: Guild) {
    return new BanSystem(guild);
  }
}

export type BanSystemLogic = {
  user: User;
  reason: string;
  silent: boolean | null;
  proof: Attachment | null;
  history: number | null;
  ctx: ExtendedInteraction;
  client: CoreBot;
};

export class BanSystem extends Module {
  guild: Guild;
  constructor(guild: Guild) {
    super();
    this.guild = guild;
  }

  public async logic({
    ...data
  }: BanSystemLogic): Promise<InteractionReplyOptions | MessagePayload> {
    const history = await fetchMessages(
      data.ctx.channel,
      data.user.id,
      data.history
    );
    const uId = createId(35);
    const silenced = typeof data.silent !== "boolean" ? true : false;

    //@ts-ignore
    return this.guild.members.cache
      .find((f) => f.id === data.user.id)
      ?.ban({
        reason: data.reason,
        deleteMessageSeconds: 60 * 60 * 60,
      })
      .then(async () => {
        return (await db
          .insert(infraction)
          .values({
            type: "ban",
            guildId: data.ctx.guild?.id as string,
            reason: data.reason,
            moderatorId: data.ctx.user.id,
            userId: data.user.id,
            id: uId,
            silenced,
            proofUrl: data.proof?.url || null,
            history: history.length > 0 ? history : null,
          })
          .execute()
          .then(() => {
            return {
              flags: silenced ? ["Ephemeral"] : [],
              embeds: [
                new Embed({
                  color: resolveColor(config.colors.success),
                  description: `${config.emojis.tick} Banned: <@${data.user.id}> *(@${data.user.username})*\n${config.emojis.mod} Moderator: <@${data.ctx.user.id}>`,
                  fields: [
                    {
                      name: "Options",
                      value: `>>> ${moduleValid(
                        silenced,
                        "Silenced?"
                      )}\n ${moduleValid(
                        data.history,
                        "History Saved?"
                      )}\n ${moduleValid(data.proof, "Proof Attached?")}`,
                    },
                    {
                      name: "Reason",
                      value: `*${data.reason}*`,
                    },
                  ],
                  footer: {
                    text: `Case ID: #${uId}`,
                  },
                }),
              ],
            } as MessageResponse;
          })
          .catch(() => {
            return {
              flags: ["Ephemeral"],
              embeds: [
                new Embed({
                  color: resolveColor(config.colors.error),
                  description: `${config.emojis.cross} Failed to ban <@${data.user.id}>.`,
                }),
              ],
            } as MessageResponse;
          })) as MessageResponse;
      })
      .catch((error) => {
        err(`${error}`);
        return {
          flags: ["Ephemeral"],
          embeds: [
            new Embed({
              color: resolveColor(config.colors.error),
              description: `${config.emojis.cross} Failed to ban <@${data.user.id}>.`,
            }),
          ],
        } as MessageResponse;
      });
  }

  public valid(cases: ModuleBooleanFn[]): ModuleValidation {
    let v = false;

    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      if (!c()) {
        v = false;
        break;
      } else {
        v = true;
      }
    }

    return (cmd: Command, client: CoreBot) => ({
      value: v,
      response: {
        flags: ["Ephemeral"],
        embeds: [defaultEmbeds["missing-values"](cmd, client)],
      },
    });
  }
}

export type WarningSystemLogic = {
  user: User;
  reason: string;
  silent: boolean | null;
  permanant: boolean | null;
  proof: Attachment | null;
  history: number | null;
  ctx: ExtendedInteraction;
  client: CoreBot;
};

export class WarningSystem extends Module {
  guild: Guild;
  constructor(guild: Guild) {
    super();
    this.guild = guild;
  }

  public async logic({
    ...data
  }: WarningSystemLogic): Promise<InteractionReplyOptions | MessagePayload> {
    const uId = createId(15);
    const history = await fetchMessages(
      data.ctx.channel,
      data.user.id,
      data.history
    );
    const silenced = typeof data.silent !== "boolean" ? true : false;
    return await db
      .insert(infraction)
      .values({
        type: "warn",
        guildId: data.ctx.guild?.id as string,
        reason: data.reason,
        moderatorId: data.ctx.user.id,
        userId: data.user.id,
        id: uId,
        permanent: data.permanant,
        silenced: silenced,
        proofUrl: data.proof?.url || null,
        history: history.length > 0 ? history : null,
      })
      .execute()
      .then(() => {
        return {
          flags: silenced ? ["Ephemeral"] : [],
          embeds: [
            new Embed({
              color: resolveColor(config.colors.success),
              description: `${config.emojis.tick} Warned: <@${data.user.id}> *(@${data.user.username})*\n${config.emojis.mod} Moderator: <@${data.ctx.user.id}>`,
              fields: [
                {
                  name: "Options",
                  value: `>>> ${moduleValid(
                    silenced,
                    "Silenced?"
                  )}\n ${moduleValid(
                    data.permanant,
                    "Permanant?"
                  )}\n ${moduleValid(
                    data.history,
                    "History Saved?"
                  )}\n ${moduleValid(data.proof, "Proof Attached?")}`,
                },
                {
                  name: "Reason",
                  value: `*${data.reason}*`,
                },
              ],
              footer: {
                text: `Case ID: #${uId}`,
              },
            }),
          ],
        } as MessageResponse;
      })
      .catch((error) => {
        err(`${error}`);
        return {
          flags: ["Ephemeral"],
          embeds: [
            new Embed({
              color: resolveColor(config.colors.error),
              description: `${config.emojis.cross} Failed to warn <@${data.user.id}>.`,
            }),
          ],
        } as MessageResponse;
      });
  }

  public valid(cases: ModuleBooleanFn[]): ModuleValidation {
    let v = false;

    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      if (!c()) {
        v = false;
        break;
      } else {
        v = true;
      }
    }

    return (cmd: Command, client: CoreBot) => ({
      value: v,
      response: {
        flags: ["Ephemeral"],
        embeds: [defaultEmbeds["missing-values"](cmd, client)],
      },
    });
  }
}

export async function fetchMessages(
  channel: TextBasedChannel | null,
  userId: string,
  history: number | null = 0
) {
  const historyMessages = [];

  if (!channel) return historyMessages;
  if (history && history > 0) {
    let messageHistoryLength = history > 24 ? 24 : history;
    let messageHistory = await channel.messages.fetch({
      limit: 100,
    });

    let lastMessageId: string | undefined = undefined;

    while (historyMessages.length < messageHistoryLength) {
      const userMessages = messageHistory
        ?.filter((f) => f.author.id === userId)
        .toJSON()
        .slice(0, 24) as Message<boolean>[];

      historyMessages.push(
        //@ts-ignore
        ...userMessages.map((z) => ({
          id: z.id,
          content: z.content,
          time: z.createdTimestamp,
          edited: z.editedTimestamp,
          reference: z.reference,
        }))
      );

      if (userMessages.length < 24) {
        break;
      }

      lastMessageId = userMessages[userMessages.length - 1]?.id || undefined;

      messageHistory = await channel.messages.fetch({
        limit: 100,
        before: lastMessageId,
      });
    }
  }
  return historyMessages;
}
