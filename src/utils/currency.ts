export function formatDollarAmount(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) {
    throw new Error("Amount must be a valid finite number");
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  // Format with commas and 2 decimal places
  const formatted = absAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sign = isNegative ? "-" : "";
  return `${sign}$${formatted}`;
}

export function parseDollarAmount(dollarString: string): number {
  const trimmed = dollarString.trim();

  // Must start with $ or -$
  if (!/^-?\$/.test(trimmed)) {
    throw new Error(`Invalid dollar amount format: ${dollarString}`);
  }

  // Remove dollar sign and handle negative amounts
  let cleanString = trimmed.replace(/^\$/, "").replace(/^-\$/, "");
  const isNegative = trimmed.startsWith("-");

  // Check for malformed commas before removing them
  if (/,\d{1,2}(\.|$)/.test(cleanString)) {
    throw new Error(`Invalid dollar amount format: ${dollarString}`);
  }

  // Remove commas
  cleanString = cleanString.replace(/,/g, "");

  // Validate the remaining string is a valid number
  if (!/^\d+(\.\d{1,2})?$/.test(cleanString)) {
    throw new Error(`Invalid dollar amount format: ${dollarString}`);
  }

  const amount = parseFloat(cleanString);

  if (isNaN(amount)) {
    throw new Error(`Unable to parse dollar amount: ${dollarString}`);
  }

  return isNegative ? -amount : amount;
}
