import { Composer } from "grammy";

import { db } from "../config/db";
import { env } from "../config/env";

const composer = new Composer();

composer.command("ban", async (ctx) => {
  if (!ctx.from || ctx.chat.type !== "private") return;
  if (!env.ADMIN_USERS.includes(ctx.from.id)) return;

  const isUsername = ctx.match.startsWith("@");

  const user = await db.collection("users").findOne({
    [isUsername ? "username" : "id"]: isUsername
      ? ctx.match.substring(1)
      : ctx.match,
  });

  if (!user) return ctx.reply("Can't find the user");

  const existingBan = await db
    .collection("bannedUsers")
    .findOne({ userId: user.id });

  if (existingBan) {
    return ctx.reply(`⚠️ ${user.name} is already banned`);
  }

  const now = new Date();
  await db.collection("bannedUsers").insertOne({
    _id: user.id,
    userId: user.id,
    createdAt: now,
    updatedAt: now,
  });

  ctx.reply(`Banned ${user.name} from the bot`);
});

export const banCommand = composer;
