import type { AllowedChatTimeKey } from "../types";

export function getTimeRange(timeKey: AllowedChatTimeKey) {
  if (timeKey === "all") return null;

  const now = new Date();
  const start = new Date(now);
  start.setMilliseconds(0);
  start.setSeconds(0);
  start.setMinutes(0);
  start.setHours(0);

  let end: Date;

  if (timeKey === "today") {
    end = new Date(start);
    end.setDate(end.getDate() + 1);
  } else if (timeKey === "week") {
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    end = new Date(start);
    end.setDate(end.getDate() + 7);
  } else if (timeKey === "month") {
    start.setDate(1);
    end = new Date(start);
    end.setMonth(end.getMonth() + 1);
  } else {
    start.setMonth(0, 1);
    end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
  }

  return { start, end };
}
