import { db } from "../config/db";
import { AllowedWordLength } from "../config/constants";
import type { AllowedChatSearchKey, AllowedChatTimeKey } from "../types";
import { getTimeRange } from "../util/time-range";

export async function getUserScores({
  chatId,
  searchKey,
  userId,
  timeKey,
  wordLength = 5,
}: {
  chatId: string;
  searchKey: AllowedChatSearchKey;
  userId: string;
  timeKey: AllowedChatTimeKey;
  wordLength?: AllowedWordLength;
}) {
  const bannedUserIds = await db.collection("bannedUsers").distinct("userId");
  if (bannedUserIds.includes(userId)) return null;

  const match: Record<string, unknown> = {
    wordLength: wordLength.toString(),
  };

  if (searchKey === "group") {
    match.chatId = chatId;
  }

  if (bannedUserIds.length > 0) {
    match.userId = { $nin: bannedUserIds };
  }

  const range = getTimeRange(timeKey);
  if (range) {
    match.createdAt = { $gte: range.start, $lt: range.end };
  }

  const leaderboardEntries = await db
    .collection("leaderboard")
    .aggregate([
      { $match: match },
      { $group: { _id: "$userId", totalScore: { $sum: "$score" } } },
      { $sort: { totalScore: -1 } },
    ])
    .toArray();

  const rankIndex = leaderboardEntries.findIndex((entry) => entry._id === userId);
  if (rankIndex === -1) return null;

  const user = await db.collection("users").findOne({ id: userId });
  if (!user) return null;

  const userStats = await db.collection("userStats").findOne({ userId });

  return {
    id: user.id,
    name: user.name,
    username: user.username ?? null,
    totalScore: Number(leaderboardEntries[rankIndex]?.totalScore ?? 0),
    rank: rankIndex + 1,
    highestStreak: userStats?.highestStreak ?? 0,
    currentStreak: userStats?.currentStreak ?? 0,
  };
}
