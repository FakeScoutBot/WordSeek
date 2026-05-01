import { Composer } from "grammy";

import { db } from "../config/db";
import { env } from "../config/env";

const composer = new Composer();

composer.command("transfer", async (ctx) => {
  if (!ctx.from || ctx.chat.type !== "private") return;
  if (!env.ADMIN_USERS.includes(ctx.from.id)) return;

  const args = ctx.match.trim().split(/\s+/);

  if (args.length !== 2) {
    return ctx.reply(
      "Usage: /transfer <from_user> <to_user>\n" +
        "Example: /transfer @username1 @username2\n" +
        "Or: /transfer user_id_1 user_id_2",
    );
  }

  const [fromIdentifier, toIdentifier] = args;

  const getUser = async (identifier: string) => {
    const isUsername = identifier.startsWith("@");
    return await db.collection("users").findOne({
      [isUsername ? "username" : "id"]: isUsername
        ? identifier.substring(1)
        : identifier,
    });
  };

  const fromUser = await getUser(fromIdentifier);
  const toUser = await getUser(toIdentifier);

  if (!fromUser) {
    return ctx.reply(`❌ Source user not found: ${fromIdentifier}`);
  }

  if (!toUser) {
    return ctx.reply(`❌ Destination user not found: ${toIdentifier}`);
  }

  if (fromUser.id === toUser.id) {
    return ctx.reply("❌ Cannot transfer to the same user");
  }

  try {
    const leaderboardEntries = await db
      .collection("leaderboard")
      .find({ userId: fromUser.id })
      .toArray();

    if (leaderboardEntries.length === 0) {
      return ctx.reply(
        `ℹ️ ${fromUser.name} has no leaderboard entries to transfer`,
      );
    }

    await db
      .collection("leaderboard")
      .updateMany(
        { userId: fromUser.id },
        { $set: { userId: toUser.id, updatedAt: new Date() } },
      );

    const totalScore = leaderboardEntries.reduce(
      (sum, entry) => sum + entry.score,
      0,
    );

    await ctx.reply(
      `✅ Successfully transferred leaderboard data:\n\n` +
        `From: ${fromUser.name} (${fromUser.id})\n` +
        `To: ${toUser.name} (${toUser.id})\n\n` +
        `Entries transferred: ${leaderboardEntries.length}\n` +
        `Total score transferred: ${totalScore}`,
    );
  } catch (error) {
    console.error("Error transferring leaderboard:", error);
    await ctx.reply("❌ An error occurred while transferring leaderboard data");
  }
});

export const transferCommand = composer;
