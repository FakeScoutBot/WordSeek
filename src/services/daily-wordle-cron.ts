import { CronJob } from "cron";
import crypto from "crypto";
import z from "zod";

import { SYSTEM_PROMPT } from "../config/constants";
import { createId, db } from "../config/db";
import { env } from "../config/env";
import words from "../data/daily-word-lists.json";
import { APIKeyManager } from "../util/key-manager";

const keyManager = new APIKeyManager();

keyManager.initialize();

const FREE_MODELS = [
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash-preview-09-2025",
  "gemini-2.0-flash",
];

const allowedTags = ["b", "i", "u"];

function sanitizeMeaning(input: string) {
  return input.replace(
    /<\/?([a-zA-Z0-9]+)([^>]*)>/g,
    (match, tagName: string) => {
      if (allowedTags.includes(tagName.toLowerCase())) {
        return match.replace(/ .*>/, ">");
      }
      return "";
    },
  );
}

const wordDetailsSchema = z.object({
  word: z.string(),
  phonetic: z.string(),
  meaning: z.string().transform((val) => sanitizeMeaning(val)),
  sentence: z.string(),
});

async function getWordDetails(
  word: string,
  maxRetries: number = env.GEMINI_API_KEYS.length * FREE_MODELS.length * 2,
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { genAI } = await keyManager.getWorkingKey();

      const modelIndex = (attempt - 1) % FREE_MODELS.length;
      const modelName = FREE_MODELS[modelIndex];
      if (!modelName) continue;

      const ai = genAI.getGenerativeModel({ model: modelName });

      const prompt = `${SYSTEM_PROMPT}\n **THE WORD TO CREATE HINTS FOR:** ${word}`;
      const result = await ai.generateContent(prompt);

      let text = result.response.text();
      text = text.replace(/```json|```/g, "").trim();

      const parsed = JSON.parse(text);
      const validated = wordDetailsSchema.parse(parsed);

      return validated;
    } catch (error) {
      const { key } = await keyManager.getWorkingKey();

      if (isAPIKeyError(error as Error)) {
        await keyManager.markKeyAsFailed(key);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (attempt === maxRetries || keyManager.getAvailableKeysCount() === 0) {
        break;
      }
    }
  }
}

function getDateStringFromDate(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return fmt.format(d);
}

export function getCurrentGameDateString() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: env.TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;

  const timeInTimezone = new Date(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`,
  );

  let baseDate = timeInTimezone;

  if (timeInTimezone.getHours() < 6) {
    baseDate = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000);
  }

  return getDateStringFromDate(baseDate);
}

async function resetStreaksForInactivePlayers(yesterdayDate: string) {
  try {
    console.log(
      `Resetting streaks for players who didn't play on ${yesterdayDate}`,
    );

    const yesterdayDateTime = new Date(yesterdayDate + "T00:00:00");

    const result = await db.collection("userStats").updateMany(
      {
        currentStreak: { $gt: 0 },
        $or: [{ lastGuessed: null }, { lastGuessed: { $lt: yesterdayDateTime } }],
      },
      { $set: { currentStreak: 0, updatedAt: new Date() } },
    );

    const resetCount = result.modifiedCount;

    if (resetCount > 0) {
      console.log(`Reset streaks for ${resetCount} inactive players`);
    } else {
      console.log("No inactive players found to reset");
    }
  } catch (error) {
    console.error("Error resetting streaks for inactive players:", error);
  }
}

async function generateDailyWordInternal(gameDate: string) {
  const gameDateValue = new Date(`${gameDate}T00:00:00`);
  const existingWord = await db
    .collection("dailyWords")
    .findOne({ date: gameDateValue });

  if (existingWord) return existingWord;

  const seed = seedFromSecret(env.DAILY_WORDLE_SECRET);
  const shuffled = deterministicShuffle(seed);
  const dayNumber = getDayNumberForDate(gameDate);
  const word = getWordOfTheDay(shuffled, dayNumber);

  const details = await getWordDetails(word);

  const now = new Date();
  const dailyWord = {
    id: createId(),
    word,
    date: gameDateValue,
    dayNumber,
    meaning: details?.meaning ?? null,
    phonetic: details?.phonetic ?? null,
    sentence: details?.sentence ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("dailyWords").insertOne({ _id: dailyWord.id, ...dailyWord });

  const yesterday = new Date(gameDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = getDateStringFromDate(yesterday);

  await resetStreaksForInactivePlayers(yesterdayString);

  console.log(`Successfully generated daily word: ${word} for ${gameDate}`);
  return dailyWord;
}

async function generateDailyWord() {
  try {
    const gameDate = getCurrentGameDateString();
    console.log(
      "Generating daily word for",
      gameDate,
      "at",
      new Date().toISOString(),
    );

    // Generate today's word
    await generateDailyWordInternal(gameDate);
  } catch (error) {
    console.error("Error generating daily word:", error);
  }
}

export async function ensureDailyWordExists(gameDate?: string) {
  try {
    const dateToUse = gameDate ?? getCurrentGameDateString();
    return await generateDailyWordInternal(dateToUse);
  } catch (error) {
    console.error("Error ensuring daily word exists:", error);
    return null;
  }
}

function seedFromSecret(secret: string) {
  const h = crypto
    .createHmac("sha256", secret)
    .update("wotd-permutation-seed")
    .digest();
  return h.readUInt32BE(0);
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicShuffle(seed: number) {
  const arr = words.slice();
  const rnd = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getWordOfTheDay(shuffled: string[], dayNumber: number) {
  return shuffled[dayNumber % shuffled.length];
}

function getDayNumberForDate(dateString: string) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const targetDate = new Date(`${dateString}T00:00:00`);
  const dayNumber = Math.floor(
    (targetDate.getTime() - env.DAILY_WORDLE_START_DATE.getTime()) / msPerDay,
  );

  return Math.max(0, dayNumber);
}

export const dailyWordleCron = new CronJob(
  "0 6 * * *",
  generateDailyWord,
  null,
  false,
  env.TIME_ZONE,
);

function isAPIKeyError(error: Error): boolean {
  const errorStr = error.toString().toLowerCase();
  const apiKeyErrorPatterns = [
    "api key",
    "unauthorized",
    "invalid key",
    "quota exceeded",
    "rate limit",
    "forbidden",
    "401",
    "403",
    "429",
  ];

  return apiKeyErrorPatterns.some((pattern) => errorStr.includes(pattern));
}
