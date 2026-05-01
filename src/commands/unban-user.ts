import { Composer } from "grammy";

import { db } from "../config/db";
import { env } from "../config/env";

const composer = new Composer();

composer.command("unban", async (ctx) => {
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

  if (!existingBan) {
    return ctx.reply(`⚠️ ${user.name} is not banned`);
  }

  await db.collection("bannedUsers").deleteOne({ userId: user.id });

  ctx.reply(`Unbanned ${user.name} from the bot`);
});

export const unbanCommand = composer;
