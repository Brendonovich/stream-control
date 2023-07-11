import { z } from "zod";
import pkg from "./pkg";
import { botToken, setBotToken } from "./auth";
import { createResource, createRoot } from "solid-js";
import { GUILD_MEMBER_SCHEMA, ROLE_SCHEMA, USER_SCHEMA } from "./schemas";
import { createEndpoint, nativeFetch } from "../httpEndpoint";
import { Maybe, rspcClient, t } from "@macrograph/core";

const root = createEndpoint({
  path: "https://discord.com/api/v10",
  fetchFn: async (url, args) => {
    const token = botToken();
    if (token === null) throw new Error("No bot token!");

    return await nativeFetch(url, {
      ...args,
      headers: {
        ...args?.headers,
        "Content-Type": "application/json",
        Authorization: `Bot ${token}`,
      },
    });
  },
});

const api = {
  channels: (id: string) => {
    const channel = root.extend(`/channels/${id}`);

    return { messages: channel.extend(`/messages`) };
  },
  users: (id: string) => root.extend(`/users/${id}`),
  guilds: (guildId: string) => {
    const guild = root.extend(`/guilds/${guildId}`);

    return {
      members: guild.extend(`/members`),
      member: (userId: string) => guild.extend(`/members/${userId}`),
      roles: guild.extend(`/roles`),
    };
  },
};

const [bot] = createRoot(() =>
  createResource(botToken, async () => {
    try {
      return await api.users("@me").get(USER_SCHEMA);
    } catch (e) {
      setBotToken(null);
    }
  })
);

export { bot };

pkg.createNonEventSchema({
  name: "Send Discord Message",
  variant: "Exec",
  generateIO: (io) => {
    io.execInput({
      id: "exec",
    });
    io.dataInput({
      id: "message",
      name: "Message",
      type: t.string(),
    });
    io.dataInput({
      id: "channelId",
      name: "Channel ID",
      type: t.string(),
    });
  },
  async run({ ctx }) {
    await api.channels(ctx.getInput("channelId")).messages.post(z.any(), {
      body: { content: ctx.getInput("message") },
    });
  },
});

pkg.createNonEventSchema({
  name: "Get Discord User",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "userId",
      name: "User ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "username",
      name: "UserName",
      type: t.string(),
    });
    io.dataOutput({
      id: "avatarId",
      name: "Avatar ID",
      type: t.option(t.string()),
    });
    io.dataOutput({
      id: "bannerId",
      name: "Banner ID",
      type: t.option(t.string()),
    });
  },
  async run({ ctx }) {
    const response = await api.users(ctx.getInput("userId")).get(USER_SCHEMA);

    ctx.setOutput("username", response.username);
    ctx.setOutput("avatarId", Maybe(response.avatar));
    ctx.setOutput("bannerId", Maybe(response.avatar));
  },
});

pkg.createNonEventSchema({
  name: "Get Discord Guild User",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "guildId",
      name: "Guild ID",
      type: t.string(),
    });
    io.dataInput({
      id: "userId",
      name: "User ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "username",
      name: "UserName",
      type: t.string(),
    });
    io.dataOutput({
      id: "displayName",
      name: "Display Name",
      type: t.string(),
    });
    io.dataOutput({
      id: "avatarId",
      name: "Avatar ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "bannerId",
      name: "Banner ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "nick",
      name: "Nickname",
      type: t.string(),
    });
    io.dataOutput({
      id: "roles",
      name: "Roles",
      type: t.list(t.string()),
    });
  },
  async run({ ctx }) {
    const response = await api
      .guilds(ctx.getInput("guildId"))
      .member(ctx.getInput("userId"))
      .get(GUILD_MEMBER_SCHEMA);

    ctx.setOutput("username", Maybe(response.user?.username));
    ctx.setOutput("avatarId", Maybe(response.user?.avatar));
    ctx.setOutput("bannerId", Maybe(response.user?.banner));
    ctx.setOutput("nick", response.nick);
    ctx.setOutput("roles", response.roles);
  },
});

pkg.createNonEventSchema({
  name: "Get Discord Role By Id",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "guildId",
      name: "Guild ID",
      type: t.string(),
    });
    io.dataInput({
      id: "roleIdIn",
      name: "Role ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "name",
      name: "Name",
      type: t.string(),
    });
    io.dataOutput({
      id: "roleIdOut",
      name: "Role ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "position",
      name: "Position",
      type: t.int(),
    });
    io.dataOutput({
      id: "mentionable",
      name: "Mentionable",
      type: t.bool(),
    });
    io.dataOutput({
      id: "permissions",
      name: "Permissions",
      type: t.bool(),
    });
  },
  async run({ ctx }) {
    let roleId = ctx.getInput("roleIdIn");

    const roles = await api
      .guilds(ctx.getInput("guildId"))
      .roles.get(z.array(ROLE_SCHEMA));

    const role = roles.find((role) => role.id === roleId);

    if (!role) return;

    ctx.setOutput("name", role.name);
    ctx.setOutput("roleIdOut", role.id);
    ctx.setOutput("position", role.position);
    ctx.setOutput("mentionable", role.mentionable);
    ctx.setOutput("permissions", role.permissions);
  },
});

pkg.createNonEventSchema({
  name: "Send Discord Webhook",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "webhookUrl",
      name: "Webhook URL",
      type: t.string(),
    });
    io.dataInput({
      id: "content",
      name: "Message",
      type: t.string(),
    });
    io.dataInput({
      id: "username",
      name: "Username",
      type: t.string(),
    });
    io.dataInput({
      id: "avatarUrl",
      name: "Avatar URL",
      type: t.string(),
    });
    io.dataInput({
      id: "tts",
      name: "TTS",
      type: t.bool(),
    });
    //io.dataInput({
    //   id: "fileLocation",
    //   name: "File Location",
    //   type: types.option(types.string()),
    // });
    io.dataOutput({
      id: "status",
      name: "Status",
      type: t.int(),
    });
  },
  async run({ ctx }) {
    const body: Record<string, string> = {};
    if (ctx.getInput("content")) body.content = ctx.getInput("content");
    if (ctx.getInput("avatarUrl")) body.avatar_url = ctx.getInput("avatarUrl");
    if (ctx.getInput("username")) body.username = ctx.getInput("username");
    if (ctx.getInput("tts")) body.tts = ctx.getInput<boolean>("tts").toString();
    // ctx.getInput<Option<string>>("content").map((v) => (body.content = v));
    // ctx.getInput<Option<string>>("avatarUrl").map((v) => (body.avatar_url = v));
    // ctx.getInput<Option<string>>("username").map((v) => (body.username = v));
    // ctx.getInput<Option<boolean>>("tts").map((v) => (body.tts = v.toString()));
    // await ctx.getInput<Option<string>>("fileLocation").mapAsync(async (v) => {
    //   body["file[0]"] = JSON.stringify({
    //     file: await fs.readBinaryFile(v),
    //     fileName: ctx
    //       .getInput<string>("fileLocation")
    //       .split(/[\/\\]/)
    //       .at(-1),
    //   });
    // });

    let response = await rspcClient.query([
      "http.json",
      {
        url: ctx.getInput("webhookUrl"),
        method: "POST",
        body: {
          Form: body,
        },
      },
    ]);

    ctx.setOutput("status", response.status);
  },
});
