import { db } from "./db";

type CacheEntry = {
  _id: string;
  type: "string" | "set";
  value?: string;
  setValues?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  expiresAt?: Date;
};

const collection = db.collection<CacheEntry>("cache");

const getExisting = async (key: string) => {
  const entry = await collection.findOne({ _id: key });
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt <= new Date()) {
    await collection.deleteOne({ _id: key });
    return null;
  }
  return entry;
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeKeyPattern = (pattern: string) => {
  let regex = "^";
  let escaping = false;

  for (const char of pattern) {
    if (escaping) {
      regex += escapeRegExp(char);
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (char === "*") {
      regex += ".*";
      continue;
    }

    if (char === "?") {
      regex += ".";
      continue;
    }

    regex += escapeRegExp(char);
  }

  if (escaping) {
    regex += "\\\\";
  }

  regex += "$";
  return new RegExp(regex);
};

class MongoPipeline {
  private operations: Array<() => Promise<unknown>> = [];

  smembers(key: string) {
    this.operations.push(() => cache.smembers(key));
    return this;
  }

  scard(key: string) {
    this.operations.push(() => cache.scard(key));
    return this;
  }

  sadd(key: string, ...members: string[]) {
    this.operations.push(() => cache.sadd(key, ...members));
    return this;
  }

  spop(key: string, count = 1) {
    this.operations.push(() => cache.spop(key, count));
    return this;
  }

  expire(key: string, seconds: number) {
    this.operations.push(() => cache.expire(key, seconds));
    return this;
  }

  async exec() {
    const results: Array<[Error | null, unknown]> = [];
    for (const op of this.operations) {
      try {
        const value = await op();
        results.push([null, value]);
      } catch (error) {
        results.push([error as Error, null]);
      }
    }
    return results;
  }
}

export const cache = {
  async get(key: string) {
    const entry = await getExisting(key);
    if (!entry || entry.type !== "string") return null;
    return entry.value ?? null;
  },

  async set(key: string, value: string, ...args: Array<string | number>) {
    let expiresAt: Date | undefined;
    let keepTtl = false;
    let nx = false;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === "EX") {
        const seconds = Number(args[i + 1]);
        if (!Number.isNaN(seconds)) {
          expiresAt = new Date(Date.now() + seconds * 1000);
        }
        i += 1;
      } else if (arg === "NX") {
        nx = true;
      } else if (arg === "KEEPTTL") {
        keepTtl = true;
      } else if (typeof arg === "string") {
        console.warn(`Unknown cache option: ${arg}`);
      }
    }

    const existing = await getExisting(key);

    if (nx && existing) return null;

    if (keepTtl && existing?.expiresAt && !expiresAt) {
      expiresAt = existing.expiresAt;
    }

    const now = new Date();
    const update: Record<string, unknown> = {
      type: "string",
      value,
      updatedAt: now,
    };

    if (expiresAt) {
      update.expiresAt = expiresAt;
    }

    const updateDoc: Record<string, unknown> = {
      $set: update,
      $setOnInsert: { createdAt: now },
    };

    if (!expiresAt && !keepTtl) {
      updateDoc.$unset = { expiresAt: "" };
    }

    await collection.updateOne({ _id: key }, updateDoc, { upsert: true });
    return "OK";
  },

  async setex(key: string, seconds: number, value: string) {
    return cache.set(key, value, "EX", seconds);
  },

  async del(key: string) {
    const result = await collection.deleteOne({ _id: key });
    return result.deletedCount ?? 0;
  },

  async keys(pattern: string) {
    const regex = normalizeKeyPattern(pattern);
    const now = new Date();
    const entries = await collection
      .find({
        _id: { $regex: regex },
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
      })
      .project({ _id: 1 })
      .toArray();
    return entries.map((entry) => entry._id);
  },

  pipeline() {
    return new MongoPipeline();
  },

  async sadd(key: string, ...members: string[]) {
    const existing = await getExisting(key);
    const currentValues =
      existing?.type === "set" && existing.setValues ? existing.setValues : [];
    const uniqueAdds = members.filter((member) => !currentValues.includes(member));
    const nextValues = Array.from(new Set([...currentValues, ...members]));
    const now = new Date();

    const update: Record<string, unknown> = {
      type: "set",
      setValues: nextValues,
      updatedAt: now,
    };

    if (existing?.expiresAt) {
      update.expiresAt = existing.expiresAt;
    }

    await collection.updateOne(
      { _id: key },
      {
        $set: update,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    return uniqueAdds.length;
  },

  async smembers(key: string) {
    const entry = await getExisting(key);
    if (!entry || entry.type !== "set") return [];
    return entry.setValues ?? [];
  },

  async scard(key: string) {
    const members = await cache.smembers(key);
    return members.length;
  },

  async spop(key: string, count = 1) {
    const entry = await getExisting(key);
    if (!entry || entry.type !== "set" || !entry.setValues?.length) return [];
    const existingValues = [...entry.setValues];
    const removed = existingValues.splice(0, count);

    await collection.updateOne(
      { _id: key },
      { $set: { setValues: existingValues, updatedAt: new Date() } },
    );

    return removed;
  },

  async expire(key: string, seconds: number) {
    const expiresAt = new Date(Date.now() + seconds * 1000);
    const result = await collection.updateOne(
      { _id: key },
      { $set: { expiresAt, updatedAt: new Date() } },
    );
    return result.matchedCount ? 1 : 0;
  },
};
