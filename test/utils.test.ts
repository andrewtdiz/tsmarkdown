import { describe, it, expect } from "bun:test";
import {
  dateToLLMReadable,
  llmReadableToDate,
  toRelativeTime,
  parseRelativeTime,
  formatDollarAmount,
  parseDollarAmount,
} from "../src/utils";

describe("Utils Integration Tests", () => {
  it("should export all utility functions correctly", () => {
    expect(typeof dateToLLMReadable).toBe("function");
    expect(typeof llmReadableToDate).toBe("function");
    expect(typeof toRelativeTime).toBe("function");
    expect(typeof parseRelativeTime).toBe("function");
    expect(typeof formatDollarAmount).toBe("function");
    expect(typeof parseDollarAmount).toBe("function");
  });

  it("should work together in realistic scenarios", () => {
    // Test scenario: formatting a blog post with date, relative time, and price
    const publishDate = new Date(2025, 7, 1); // August 1, 2025
    const currentDate = new Date(2025, 8, 15); // September 15, 2025 (45 days later)
    const price = 29.99;

    // Format for display
    const readableDate = dateToLLMReadable(publishDate);
    const relativeTime = toRelativeTime(publishDate, currentDate);
    const formattedPrice = formatDollarAmount(price);

    expect(readableDate).toBe("August 1st, 2025");
    expect(relativeTime).toBe("1 month ago");
    expect(formattedPrice).toBe("$29.99");

    // Parse back
    const parsedDate = llmReadableToDate(readableDate);
    const parsedPrice = parseDollarAmount(formattedPrice);

    expect(parsedDate.getTime()).toBe(publishDate.getTime());
    expect(parsedPrice).toBe(price);

    // Note: Relative time parsing has inherent approximations (months = 30.44 days avg)
    // so we don't test round-trip conversion here, but verify the functions work independently
  });

  it("should handle edge cases gracefully across all utilities", () => {
    // Date edge cases
    const leapYearDate = new Date(2024, 1, 29); // February 29, 2024
    expect(() => dateToLLMReadable(leapYearDate)).not.toThrow();

    // Relative time edge cases
    const now = new Date();
    expect(() => toRelativeTime(now, now)).not.toThrow();
    expect(() => parseRelativeTime("now")).not.toThrow();

    // Currency edge cases
    expect(() => formatDollarAmount(0)).not.toThrow();
    expect(() => parseDollarAmount("$0.00")).not.toThrow();
  });
});
