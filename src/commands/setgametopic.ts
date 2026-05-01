import { Composer } from "grammy";

import { db } from "../config/db";
import { CommandsHelper } from "../util/commands-helper";
import { adminOnlyGuards, runGuards } from "../util/guards";

const composer = new Composer();

composer.command("setgametopic", async (ctx) => {
  if (!ctx.message) return;

  if (!ctx.chat.is_forum) {
    await ctx.reply("This command can only be used in forum groups.");
    return;
  }

  const guard = await runGuards(ctx, adminOnlyGuards);
  if (!guard.ok) return ctx.reply(guard.message);

  const topicId = ctx.msg.message_thread_id?.toString() || "general";

  const existing = await db.collection("chatGameTopics").findOne({
    chatId: ctx.chat.id.toString(),
    topicId,
  });

  if (existing) {
    return await ctx.reply(
      "Game has already been set for this topic.\nUse /unsetgametopic to unset it first.",
    );
  }

  const now = new Date();
  await db.collection("chatGameTopics").insertOne({
    _id: `${ctx.chat.id}:${topicId}`,
    chatId: ctx.chat.id.toString(),
    topicId,
    allowedLengths: [5, 4, 6],
    shouldRecreateOnExpire: false,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.reply(
    `@${ctx.me.username} will now use this topic for the game.`,
  );
});

CommandsHelper.addNewCommand("setgametopic", "Set current topic for the game");

export const setGameTopicCommand = composer;
