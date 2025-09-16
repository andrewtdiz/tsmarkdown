export function toRelativeTime(date: Date, baseDate: Date = new Date()): string {
  const diffMs = date.getTime() - baseDate.getTime();
  const isPast = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);

  const second = 1000;
  const minute = second * 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30.44; // average month length
  const year = day * 365.25; // account for leap years

  let value: number;
  let unit: string;

  if (absDiffMs < minute) {
    value = Math.floor(absDiffMs / second);
    unit = value === 1 ? 'second' : 'seconds';
  } else if (absDiffMs < hour) {
    value = Math.floor(absDiffMs / minute);
    unit = value === 1 ? 'minute' : 'minutes';
  } else if (absDiffMs < day) {
    value = Math.floor(absDiffMs / hour);
    unit = value === 1 ? 'hour' : 'hours';
  } else if (absDiffMs < week) {
    value = Math.floor(absDiffMs / day);
    unit = value === 1 ? 'day' : 'days';
  } else if (absDiffMs < month) {
    value = Math.floor(absDiffMs / week);
    unit = value === 1 ? 'week' : 'weeks';
  } else if (absDiffMs < year) {
    value = Math.floor(absDiffMs / month);
    unit = value === 1 ? 'month' : 'months';
  } else {
    value = Math.floor(absDiffMs / year);
    unit = value === 1 ? 'year' : 'years';
  }

  // Special cases for common phrases
  if (value === 1 && unit === 'day') {
    return isPast ? 'yesterday' : 'tomorrow';
  }

  const timePhrase = value === 1 ? `${value} ${unit}` : `${value} ${unit}`;
  return isPast ? `${timePhrase} ago` : `${timePhrase} from now`;
}

export function parseRelativeTime(relativeString: string, baseDate: Date = new Date()): Date {
  const trimmed = relativeString.trim().toLowerCase();

  // Special cases
  if (trimmed === 'yesterday') {
    return new Date(baseDate.getTime() - 24 * 60 * 60 * 1000);
  }
  if (trimmed === 'tomorrow') {
    return new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
  }
  if (trimmed === 'now') {
    return new Date(baseDate);
  }

  // Pattern matching for "X time ago" or "X time from now"
  const pastPattern = /^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/;
  const futurePattern = /^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+from\s+now$/;

  let match = trimmed.match(pastPattern);
  let isPast = true;

  if (!match) {
    match = trimmed.match(futurePattern);
    isPast = false;
  }

  if (!match) {
    throw new Error(`Unable to parse relative time: ${relativeString}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const second = 1000;
  const minute = second * 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30.44;
  const year = day * 365.25;

  let multiplier: number;
  switch (unit) {
    case 'second': multiplier = second; break;
    case 'minute': multiplier = minute; break;
    case 'hour': multiplier = hour; break;
    case 'day': multiplier = day; break;
    case 'week': multiplier = week; break;
    case 'month': multiplier = month; break;
    case 'year': multiplier = year; break;
    default: throw new Error(`Unknown time unit: ${unit}`);
  }

  const diffMs = value * multiplier * (isPast ? -1 : 1);
  return new Date(baseDate.getTime() + diffMs);
}
