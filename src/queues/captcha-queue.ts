import { bot } from "../config/bot";
import { cache } from "../config/cache";
import { createId, db } from "../config/db";
import { captchaSchema } from "../schemas";
import { formatUserMention } from "../commands/captcha";

type CaptchaJob = {
  _id: string;
  type: "captcha-expiry";
  status: "pending" | "processing";
  runAt: Date;
  payload: {
    chatId: string;
    userId: string;
    messageId: number;
  };
  createdAt: Date;
};

const JOB_POLL_INTERVAL_MS = 5000;

async function processCaptchaJobs() {
  const now = new Date();
  const job = await db.collection<CaptchaJob>("jobs").findOneAndUpdate(
    { type: "captcha-expiry", status: "pending", runAt: { $lte: now } },
    { $set: { status: "processing" } },
    { sort: { runAt: 1 } },
  );

  if (!job.value) return;

  const { chatId, userId, messageId } = job.value.payload;
  const key = `captcha:${chatId}:${userId}`;
  const raw = await cache.get(key);

  if (!raw) {
    await db.collection("jobs").deleteOne({ _id: job.value._id });
    return;
  }

  const session = captchaSchema.parse(JSON.parse(raw));
  await cache.del(key);

  const mention = formatUserMention({
    id: session.userId,
    name: session.name,
    username: session.username,
  });

  try {
    await bot.api.editMessageText(
      chatId,
      messageId,
      `⏰ <b>Verification timed out</b>\n\n${mention} didn’t complete it in time.`,
      { parse_mode: "HTML" },
    );
  } catch (e) {
    console.error("Edit failed:", e);
  }

  try {
    await bot.api.sendMessage(
      session.adminId,
      `⏰ ${mention} did not complete the captcha in time.`,
      { parse_mode: "HTML" },
    );
  } catch (e) {
    console.error("Admin notify failed:", e);
  }

  await db.collection("jobs").deleteOne({ _id: job.value._id });
}

setInterval(() => {
  void processCaptchaJobs();
}, JOB_POLL_INTERVAL_MS);

export async function scheduleCaptchaExpiry({
  chatId,
  userId,
  messageId,
  delayMs,
}: {
  chatId: string;
  userId: string;
  messageId: number;
  delayMs: number;
}) {
  const jobId = createId();
  await db.collection("jobs").insertOne({
    _id: jobId,
    type: "captcha-expiry",
    status: "pending",
    runAt: new Date(Date.now() + delayMs),
    payload: { chatId, userId, messageId },
    createdAt: new Date(),
  });
}
