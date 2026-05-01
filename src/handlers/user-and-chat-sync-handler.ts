import { Composer } from "grammy";

import { db } from "../config/db";

const composer = new Composer();

composer.use(async (ctx, next) => {
  try {
    const user = ctx.from;
    const chat = ctx.chat;

    if (user && !user.is_bot) {
      const userId = user.id.toString();
      const userName =
        user.first_name + (user.last_name ? " " + user.last_name : "");
      const userUsername = user.username || null;

      (async () => {
        try {
          // if (userUsername) {
          //   await db
          //     .updateTable("users")
          //     .set({ username: null })
          //     .where("username", "=", userUsername)
          //     .where("id", "!=", userId)
          //     .execute();
          // }
          const now = new Date();
          await db.collection("users").updateOne(
            { id: userId },
            {
              $set: {
                name: userName,
                username: userUsername,
                updatedAt: now,
              },
              $setOnInsert: {
                _id: userId,
                id: userId,
                createdAt: now,
              },
            },
            { upsert: true },
          );
        } catch (error) {
          console.error("Error in user sync:", error);
        }
      })();
    }

    if (chat && chat.type !== "channel") {
      const chatId = chat.id.toString();
      const chatName =
        chat.type === "private"
          ? user
            ? user.first_name + (user.last_name ? " " + user.last_name : "")
            : null
          : chat.title;
      const chatUsername = chat.username || null;

      (async () => {
        try {
          // if (chatUsername) {
          //   await db
          //     .updateTable("broadcastChats")
          //     .set({ username: null })
          //     .where("username", "=", chatUsername)
          //     .where("id", "!=", chatId)
          //     .execute();
          // }
          const now = new Date();
          await db.collection("broadcastChats").updateOne(
            { id: chatId },
            {
              $set: {
                name: chatName,
                username: chatUsername,
                updatedAt: now,
              },
              $setOnInsert: {
                _id: chatId,
                id: chatId,
                createdAt: now,
              },
            },
            { upsert: true },
          );
        } catch (error) {
          console.error("Error in chat sync:", error);
        }
      })();
    }
  } catch (error) {
    console.error("Error in sync middleware:", error);
  }

  return next();
});

export const userAndChatSyncHandler = composer;
