export function dateToLLMReadable(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  const suffix = getDaySuffix(day);

  return `${month} ${day}${suffix}, ${year}`;
}

export function llmReadableToDate(readable: string): Date {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const pattern = /^(\w+)\s+(\d+)(?:st|nd|rd|th),\s+(\d+)$/;
  const match = readable.match(pattern);

  if (!match) {
    throw new Error(`Invalid LLM readable date format: ${readable}`);
  }

  const [, monthName, dayStr, yearStr] = match;
  const monthIndex = months.indexOf(monthName);

  if (monthIndex === -1) {
    throw new Error(`Invalid month name: ${monthName}`);
  }

  const day = parseInt(dayStr, 10);
  const year = parseInt(yearStr, 10);

  return new Date(year, monthIndex, day);
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th';
  }

  const lastDigit = day % 10;
  switch (lastDigit) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
