import { db } from "../config/db";
import { AllowedWordLength } from "../config/constants";
import { AllowedChatSearchKey, AllowedChatTimeKey } from "../types";
import { getTimeRange } from "../util/time-range";

export async function getLeaderboardScores({
  chatId,
  searchKey,
  timeKey,
  wordLength = 5,
}: {
  chatId: string;
  searchKey: AllowedChatSearchKey;
  timeKey: AllowedChatTimeKey;
  wordLength?: AllowedWordLength;
}) {
  const bannedUserIds = await db.collection("bannedUsers").distinct("userId");
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
      { $limit: 20 },
    ])
    .toArray();

  const userIds = leaderboardEntries.map((entry) => entry._id);
  const users = await db
    .collection("users")
    .find({ id: { $in: userIds } })
    .toArray();
  const userMap = new Map(users.map((user) => [user.id, user]));

  return leaderboardEntries.map((entry) => {
    const user = userMap.get(entry._id);
    return {
      userId: entry._id,
      name: user?.name ?? "Unknown",
      username: user?.username ?? null,
      totalScore: Number(entry.totalScore ?? 0),
    };
  });
}
