import { describe, it, expect } from 'bun:test';
import { toRelativeTime, parseRelativeTime } from '../src/utils/relative-time';

describe('Relative Time Utilities', () => {
  const baseDate = new Date(2025, 8, 15, 12, 0, 0); // September 15, 2025, 12:00 PM

  describe('toRelativeTime', () => {
    it('should format seconds correctly', () => {
      const date30SecsAgo = new Date(baseDate.getTime() - 30 * 1000);
      const date30SecsFromNow = new Date(baseDate.getTime() + 30 * 1000);

      expect(toRelativeTime(date30SecsAgo, baseDate)).toBe('30 seconds ago');
      expect(toRelativeTime(date30SecsFromNow, baseDate)).toBe('30 seconds from now');
    });

    it('should format minutes correctly', () => {
      const date5MinsAgo = new Date(baseDate.getTime() - 5 * 60 * 1000);
      const date1MinFromNow = new Date(baseDate.getTime() + 1 * 60 * 1000);

      expect(toRelativeTime(date5MinsAgo, baseDate)).toBe('5 minutes ago');
      expect(toRelativeTime(date1MinFromNow, baseDate)).toBe('1 minute from now');
    });

    it('should format hours correctly', () => {
      const date3HrsAgo = new Date(baseDate.getTime() - 3 * 60 * 60 * 1000);
      const date1HrFromNow = new Date(baseDate.getTime() + 1 * 60 * 60 * 1000);

      expect(toRelativeTime(date3HrsAgo, baseDate)).toBe('3 hours ago');
      expect(toRelativeTime(date1HrFromNow, baseDate)).toBe('1 hour from now');
    });

    it('should use special phrases for yesterday and tomorrow', () => {
      const yesterday = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);

      expect(toRelativeTime(yesterday, baseDate)).toBe('yesterday');
      expect(toRelativeTime(tomorrow, baseDate)).toBe('tomorrow');
    });

    it('should format days correctly (not yesterday/tomorrow)', () => {
      const date3DaysAgo = new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000);
      const date5DaysFromNow = new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000);

      expect(toRelativeTime(date3DaysAgo, baseDate)).toBe('3 days ago');
      expect(toRelativeTime(date5DaysFromNow, baseDate)).toBe('5 days from now');
    });

    it('should format weeks correctly', () => {
      const date2WeeksAgo = new Date(baseDate.getTime() - 2 * 7 * 24 * 60 * 60 * 1000);
      const date1WeekFromNow = new Date(baseDate.getTime() + 1 * 7 * 24 * 60 * 60 * 1000);

      expect(toRelativeTime(date2WeeksAgo, baseDate)).toBe('2 weeks ago');
      expect(toRelativeTime(date1WeekFromNow, baseDate)).toBe('1 week from now');
    });

    it('should format months correctly', () => {
      const date3MonthsAgo = new Date(baseDate.getTime() - 3 * 30.44 * 24 * 60 * 60 * 1000);
      const date2MonthsFromNow = new Date(baseDate.getTime() + 2 * 30.44 * 24 * 60 * 60 * 1000);

      expect(toRelativeTime(date3MonthsAgo, baseDate)).toBe('3 months ago');
      expect(toRelativeTime(date2MonthsFromNow, baseDate)).toBe('2 months from now');
    });

    it('should format years correctly', () => {
      const date2YearsAgo = new Date(baseDate.getTime() - 2 * 365.25 * 24 * 60 * 60 * 1000);
      const date1YearFromNow = new Date(baseDate.getTime() + 1 * 365.25 * 24 * 60 * 60 * 1000);

      expect(toRelativeTime(date2YearsAgo, baseDate)).toBe('2 years ago');
      expect(toRelativeTime(date1YearFromNow, baseDate)).toBe('1 year from now');
    });
  });

  describe('parseRelativeTime', () => {
    it('should parse special cases', () => {
      expect(parseRelativeTime('yesterday', baseDate).getTime())
        .toBe(baseDate.getTime() - 24 * 60 * 60 * 1000);

      expect(parseRelativeTime('tomorrow', baseDate).getTime())
        .toBe(baseDate.getTime() + 24 * 60 * 60 * 1000);

      expect(parseRelativeTime('now', baseDate).getTime())
        .toBe(baseDate.getTime());
    });

    it('should parse past time expressions', () => {
      const result30SecsAgo = parseRelativeTime('30 seconds ago', baseDate);
      expect(result30SecsAgo.getTime()).toBe(baseDate.getTime() - 30 * 1000);

      const result5MinsAgo = parseRelativeTime('5 minutes ago', baseDate);
      expect(result5MinsAgo.getTime()).toBe(baseDate.getTime() - 5 * 60 * 1000);

      const result2HrsAgo = parseRelativeTime('2 hours ago', baseDate);
      expect(result2HrsAgo.getTime()).toBe(baseDate.getTime() - 2 * 60 * 60 * 1000);
    });

    it('should parse future time expressions', () => {
      const result1HrFromNow = parseRelativeTime('1 hour from now', baseDate);
      expect(result1HrFromNow.getTime()).toBe(baseDate.getTime() + 1 * 60 * 60 * 1000);

      const result3DaysFromNow = parseRelativeTime('3 days from now', baseDate);
      expect(result3DaysFromNow.getTime()).toBe(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    });

    it('should handle singular and plural forms', () => {
      const result1SecAgo = parseRelativeTime('1 second ago', baseDate);
      expect(result1SecAgo.getTime()).toBe(baseDate.getTime() - 1000);

      const result1DayAgo = parseRelativeTime('1 day ago', baseDate);
      expect(result1DayAgo.getTime()).toBe(baseDate.getTime() - 24 * 60 * 60 * 1000);
    });

    it('should throw error for invalid formats', () => {
      expect(() => parseRelativeTime('invalid format')).toThrow();
      expect(() => parseRelativeTime('5 invalid ago')).toThrow();
      expect(() => parseRelativeTime('not a time')).toThrow();
    });

    it('should be case insensitive', () => {
      const result = parseRelativeTime('5 HOURS AGO', baseDate);
      expect(result.getTime()).toBe(baseDate.getTime() - 5 * 60 * 60 * 1000);
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain consistency for common time periods', () => {
      const testCases = [
        new Date(baseDate.getTime() - 30 * 1000),        // 30 seconds ago
        new Date(baseDate.getTime() - 5 * 60 * 1000),    // 5 minutes ago
        new Date(baseDate.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      ];

      testCases.forEach(testDate => {
        const relative = toRelativeTime(testDate, baseDate);
        // Skip special cases like "yesterday"/"tomorrow" for round-trip test
        if (!relative.includes('yesterday') && !relative.includes('tomorrow')) {
          const parsed = parseRelativeTime(relative, baseDate);
          const timeDiff = Math.abs(parsed.getTime() - testDate.getTime());
          // Allow for small rounding differences in milliseconds
          expect(timeDiff).toBeLessThan(1000);
        }
      });
    });
  });
});
