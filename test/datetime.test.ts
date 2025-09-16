import { describe, it, expect } from 'bun:test';
import { dateToLLMReadable, llmReadableToDate } from '../src/utils/datetime';

describe('DateTime Utilities', () => {
  describe('dateToLLMReadable', () => {
    it('should format a date to LLM readable format', () => {
      const date = new Date(2025, 8, 15); // September 15, 2025
      expect(dateToLLMReadable(date)).toBe('September 15th, 2025');
    });

    it('should handle different day suffixes correctly', () => {
      expect(dateToLLMReadable(new Date(2025, 0, 1))).toBe('January 1st, 2025');
      expect(dateToLLMReadable(new Date(2025, 0, 2))).toBe('January 2nd, 2025');
      expect(dateToLLMReadable(new Date(2025, 0, 3))).toBe('January 3rd, 2025');
      expect(dateToLLMReadable(new Date(2025, 0, 4))).toBe('January 4th, 2025');
      expect(dateToLLMReadable(new Date(2025, 0, 11))).toBe('January 11th, 2025');
      expect(dateToLLMReadable(new Date(2025, 0, 21))).toBe('January 21st, 2025');
      expect(dateToLLMReadable(new Date(2025, 0, 22))).toBe('January 22nd, 2025');
      expect(dateToLLMReadable(new Date(2025, 0, 23))).toBe('January 23rd, 2025');
    });

    it('should handle all months correctly', () => {
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      months.forEach((month, index) => {
        const date = new Date(2025, index, 1);
        expect(dateToLLMReadable(date)).toBe(`${month} 1st, 2025`);
      });
    });
  });

  describe('llmReadableToDate', () => {
    it('should parse LLM readable format back to date', () => {
      const readable = 'September 15th, 2025';
      const date = llmReadableToDate(readable);
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(8); // September is month 8 (0-indexed)
      expect(date.getDate()).toBe(15);
    });

    it('should handle different day suffixes', () => {
      expect(llmReadableToDate('January 1st, 2025').getDate()).toBe(1);
      expect(llmReadableToDate('January 2nd, 2025').getDate()).toBe(2);
      expect(llmReadableToDate('January 3rd, 2025').getDate()).toBe(3);
      expect(llmReadableToDate('January 4th, 2025').getDate()).toBe(4);
      expect(llmReadableToDate('January 11th, 2025').getDate()).toBe(11);
      expect(llmReadableToDate('January 21st, 2025').getDate()).toBe(21);
      expect(llmReadableToDate('January 22nd, 2025').getDate()).toBe(22);
      expect(llmReadableToDate('January 23rd, 2025').getDate()).toBe(23);
    });

    it('should throw error for invalid format', () => {
      expect(() => llmReadableToDate('Invalid format')).toThrow();
      expect(() => llmReadableToDate('January 15, 2025')).toThrow(); // missing suffix
      expect(() => llmReadableToDate('InvalidMonth 15th, 2025')).toThrow();
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain consistency when converting back and forth', () => {
      const originalDate = new Date(2025, 5, 10); // June 10, 2025
      const readable = dateToLLMReadable(originalDate);
      const parsedDate = llmReadableToDate(readable);

      expect(parsedDate.getFullYear()).toBe(originalDate.getFullYear());
      expect(parsedDate.getMonth()).toBe(originalDate.getMonth());
      expect(parsedDate.getDate()).toBe(originalDate.getDate());
    });

    it('should work with multiple test dates', () => {
      const testDates = [
        new Date(2024, 0, 1),   // January 1, 2024
        new Date(2024, 11, 31), // December 31, 2024
        new Date(2025, 6, 4),   // July 4, 2025
        new Date(2026, 1, 29),  // February 29, 2026 (if leap year)
      ];

      testDates.forEach(date => {
        const readable = dateToLLMReadable(date);
        const parsed = llmReadableToDate(readable);
        expect(parsed.getTime()).toBe(date.getTime());
      });
    });
  });
});
