import { MongoClient, ObjectId } from "mongodb";

import { env } from "./env";

export const mongoClient = new MongoClient(env.MONGODB_URI);

const connectWithRetry = async (attempts = 5, delayMs = 2000) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mongoClient.connect();
      return;
    } catch (error) {
      if (attempt === attempts) throw error;
      console.error(
        `MongoDB connection failed (attempt ${attempt}/${attempts}). Retrying...`,
        error,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

await connectWithRetry();

export const db = mongoClient.db(env.MONGODB_DB);

export const createId = () => new ObjectId().toHexString();

async function ensureIndexes() {
  await Promise.all([
    db.collection("users").createIndex({ id: 1 }, { unique: true }),
    db.collection("broadcastChats").createIndex({ id: 1 }, { unique: true }),
    db.collection("bannedUsers").createIndex({ userId: 1 }, { unique: true }),
    db
      .collection("authorizedUsers")
      .createIndex({ chatId: 1, userId: 1 }, { unique: true }),
    db
      .collection("chatGameTopics")
      .createIndex({ chatId: 1, topicId: 1 }, { unique: true }),
    db
      .collection("games")
      .createIndex({ activeChat: 1, topicId: 1 }, { unique: true }),
    db.collection("dailyWords").createIndex({ date: 1 }, { unique: true }),
    db.collection("dailyWords").createIndex({ dayNumber: 1 }, { unique: true }),
    db
      .collection("dailyGuesses")
      .createIndex({ userId: 1, dailyWordId: 1 }),
    db.collection("userStats").createIndex({ userId: 1 }, { unique: true }),
    db.collection("jobs").createIndex({ type: 1, status: 1, runAt: 1 }),
    db.collection("cache").createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 },
    ),
  ]);
}

await ensureIndexes();
