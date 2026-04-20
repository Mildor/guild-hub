const PARIS_TIME_ZONE = 'Europe/Paris';
const RESET_WEEKDAY = 3; // Wednesday
const RESET_HOUR = 7;

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
};

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const getZonedParts = (date: Date, timeZone: string): ZonedParts => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>(
    (acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value;
      }
      return acc;
    },
    {},
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAY_MAP[parts.weekday ?? 'Sun'] ?? 0,
  };
};

const getTimeZoneOffsetMs = (date: Date, timeZone: string): number => {
  const zoned = getZonedParts(date, timeZone);
  const asUtcTimestamp = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );

  return asUtcTimestamp - date.getTime();
};

const zonedLocalToUtcDate = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date => {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
};

export const getLastWednesdayReset = (now: Date = new Date()): Date => {
  const parisNow = getZonedParts(now, PARIS_TIME_ZONE);

  let daysSinceReset = (parisNow.weekday - RESET_WEEKDAY + 7) % 7;
  if (parisNow.weekday === RESET_WEEKDAY && parisNow.hour < RESET_HOUR) {
    daysSinceReset = 7;
  }

  const resetLocalNoonUtc = new Date(
    Date.UTC(parisNow.year, parisNow.month - 1, parisNow.day, 12, 0, 0),
  );
  resetLocalNoonUtc.setUTCDate(resetLocalNoonUtc.getUTCDate() - daysSinceReset);

  const resetDayParts = getZonedParts(resetLocalNoonUtc, PARIS_TIME_ZONE);

  return zonedLocalToUtcDate(
    resetDayParts.year,
    resetDayParts.month,
    resetDayParts.day,
    RESET_HOUR,
    0,
    0,
    PARIS_TIME_ZONE,
  );
};
