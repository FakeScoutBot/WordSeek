import { db } from "../config/db";
import { AllowedWordLength } from "../config/constants";
import type { AllowedChatSearchKey, AllowedChatTimeKey } from "../types";

export async function getSmartDefaults({
  userId,
  chatId,
  requestedSearchKey,
  requestedTimeKey,
  requestedWordLength,
  chatType,
}: {
  userId: string;
  chatId: string;
  requestedSearchKey?: AllowedChatSearchKey;
  requestedTimeKey?: AllowedChatTimeKey;
  requestedWordLength?: AllowedWordLength;
  chatType: string;
}) {
  let searchKey: AllowedChatSearchKey =
    requestedSearchKey || (chatType === "private" ? "global" : "group");

  if (searchKey === "group" && chatType !== "private") {
    const groupScoresExist = await db.collection("leaderboard").findOne({
      userId,
      chatId,
    });

    if (!groupScoresExist) {
      searchKey = "global";
    }
  }

  const wordLength = requestedWordLength
    ? requestedWordLength
    : await getSmartDefaultWordLength({ userId, chatId, searchKey });

  let timeKey: AllowedChatTimeKey;

  if (requestedTimeKey) {
    timeKey = requestedTimeKey;
  } else {
    timeKey = await getSmartDefaultTimeKey({
      userId,
      chatId,
      searchKey,
      wordLength,
    });
  }

  const hasAnyScores = !!(await db.collection("leaderboard").findOne({
    userId,
    wordLength: wordLength.toString(),
    ...(searchKey === "group" ? { chatId } : {}),
  }));

  return { searchKey, timeKey, wordLength, hasAnyScores };
}

async function getSmartDefaultWordLength({
  userId,
  chatId,
  searchKey,
}: {
  userId: string;
  chatId: string;
  searchKey: AllowedChatSearchKey;
}): Promise<AllowedWordLength> {
  const preferenceOrder: AllowedWordLength[] = [5, 4, 6];

  for (const length of preferenceOrder) {
    const exists = await db.collection("leaderboard").findOne({
      userId,
      wordLength: length.toString(),
      ...(searchKey === "group" ? { chatId } : {}),
    });
    if (exists) return length;
  }

  return 5;
}

async function getSmartDefaultTimeKey({
  userId,
  chatId,
  searchKey,
  wordLength,
}: {
  userId: string;
  chatId: string;
  searchKey: AllowedChatSearchKey;
  wordLength: AllowedWordLength;
}): Promise<AllowedChatTimeKey> {
  const latestEntry = await db
    .collection("leaderboard")
    .find({
      userId,
      wordLength: wordLength.toString(),
      ...(searchKey === "group" ? { chatId } : {}),
    })
    .sort({ createdAt: -1 })
    .limit(1)
    .next();

  if (!latestEntry) return "all";

  const now = new Date();
  const latestDate = new Date(latestEntry.createdAt);

  if (
    latestDate.getFullYear() === now.getFullYear() &&
    latestDate.getMonth() === now.getMonth() &&
    latestDate.getDate() === now.getDate()
  ) {
    return "today";
  }

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  if (latestDate >= startOfWeek) return "week";

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (latestDate >= startOfMonth) return "month";

  const startOfYear = new Date(now.getFullYear(), 0, 1);
  if (latestDate >= startOfYear) return "year";

  return "all";
}
