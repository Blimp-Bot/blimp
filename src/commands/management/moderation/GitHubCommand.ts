import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  Guild,
} from "discord.js";
import type { Command } from "@/core/typings";
import { getCommand } from "@/utils/misc";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});
export default {
  name: "github",
  description: "Get information about a GitHub repository.",
  usage: ["/github <user>"],
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "user",
      description: "The GitHub user to fetch information about.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  run: async ({ ctx, client, args }) => {
    const user = args.getString("user", true);

    await octokit.request("GET /users/{username}", {
      username: user,
      headers: {
      'X-GitHub-Api-Version': '2022-11-28'
  }
    }).then((response) => {
      const { data } = response;
      ctx.reply({
        embeds: [
          {
            title: data.login,
            url: data.html_url,
            description: data.bio || undefined,
            fields: [
              {
                name: "Followers",
                value: data.followers.toString(),
                inline: true,
              },
              {
                name: "Following",
                value: data.following.toString(),
                inline: true,
              },
              {
                name: "Public Repos",
                value: data.public_repos.toString(),
                inline: true,
              },
            ],
          },
        ],
      });
    }).catch((error) => {
      ctx.reply({
        content: "An error occurred while fetching the user information.",
        ephemeral: true,
      });
      console.error(error);
    });
  },
} as Command;
