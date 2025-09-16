import { describe, it, expect } from 'bun:test';
import { formatDollarAmount, parseDollarAmount } from '../src/utils/currency';

describe('Currency Utilities', () => {
  describe('formatDollarAmount', () => {
    it('should format positive amounts with commas and dollar sign', () => {
      expect(formatDollarAmount(1000)).toBe('$1,000.00');
      expect(formatDollarAmount(1234.56)).toBe('$1,234.56');
      expect(formatDollarAmount(1000000)).toBe('$1,000,000.00');
      expect(formatDollarAmount(1234567.89)).toBe('$1,234,567.89');
    });

    it('should format negative amounts correctly', () => {
      expect(formatDollarAmount(-1000)).toBe('-$1,000.00');
      expect(formatDollarAmount(-1234.56)).toBe('-$1,234.56');
      expect(formatDollarAmount(-1000000)).toBe('-$1,000,000.00');
    });

    it('should format small amounts correctly', () => {
      expect(formatDollarAmount(0)).toBe('$0.00');
      expect(formatDollarAmount(0.99)).toBe('$0.99');
      expect(formatDollarAmount(10.5)).toBe('$10.50');
      expect(formatDollarAmount(999.99)).toBe('$999.99');
    });

    it('should format whole numbers with .00', () => {
      expect(formatDollarAmount(5)).toBe('$5.00');
      expect(formatDollarAmount(100)).toBe('$100.00');
      expect(formatDollarAmount(1000)).toBe('$1,000.00');
    });

    it('should handle very large amounts', () => {
      expect(formatDollarAmount(1234567890.12)).toBe('$1,234,567,890.12');
      expect(formatDollarAmount(999999999999.99)).toBe('$999,999,999,999.99');
    });

    it('should throw error for invalid input', () => {
      expect(() => formatDollarAmount(NaN)).toThrow();
      expect(() => formatDollarAmount(Infinity)).toThrow();
      expect(() => formatDollarAmount(-Infinity)).toThrow();
    });
  });

  describe('parseDollarAmount', () => {
    it('should parse formatted dollar amounts', () => {
      expect(parseDollarAmount('$1,000.00')).toBe(1000);
      expect(parseDollarAmount('$1,234.56')).toBe(1234.56);
      expect(parseDollarAmount('$1,000,000.00')).toBe(1000000);
      expect(parseDollarAmount('$1,234,567.89')).toBe(1234567.89);
    });

    it('should parse negative amounts', () => {
      expect(parseDollarAmount('-$1,000.00')).toBe(-1000);
      expect(parseDollarAmount('-$1,234.56')).toBe(-1234.56);
    });

    it('should parse amounts without commas', () => {
      expect(parseDollarAmount('$1000.00')).toBe(1000);
      expect(parseDollarAmount('$1234.56')).toBe(1234.56);
    });

    it('should parse amounts with different decimal places', () => {
      expect(parseDollarAmount('$10.5')).toBe(10.5);
      expect(parseDollarAmount('$10.50')).toBe(10.50);
      expect(parseDollarAmount('$999')).toBe(999);
    });

    it('should handle whitespace', () => {
      expect(parseDollarAmount('  $1,000.00  ')).toBe(1000);
      expect(parseDollarAmount('\t$500.50\n')).toBe(500.50);
    });

    it('should parse zero amounts', () => {
      expect(parseDollarAmount('$0.00')).toBe(0);
      expect(parseDollarAmount('$0')).toBe(0);
    });

    it('should throw error for invalid formats', () => {
      expect(() => parseDollarAmount('invalid')).toThrow();
      expect(() => parseDollarAmount('1000')).toThrow(); // missing $ sign
      expect(() => parseDollarAmount('$1,000.123')).toThrow(); // too many decimal places
      expect(() => parseDollarAmount('$1,00.00')).toThrow(); // malformed commas
      expect(() => parseDollarAmount('$$1000.00')).toThrow(); // double dollar sign
      expect(() => parseDollarAmount('$abc.00')).toThrow(); // non-numeric
    });

    it('should handle edge cases', () => {
      expect(parseDollarAmount('$0.01')).toBe(0.01);
      expect(parseDollarAmount('$999,999,999.99')).toBe(999999999.99);
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain consistency when converting back and forth', () => {
      const testAmounts = [
        0,
        0.01,
        0.99,
        10.50,
        999.99,
        1000,
        1234.56,
        10000.00,
        1000000,
        1234567.89,
        -500.25,
        -1000000
      ];

      testAmounts.forEach(amount => {
        const formatted = formatDollarAmount(amount);
        const parsed = parseDollarAmount(formatted);
        expect(parsed).toBe(amount);
      });
    });

    it('should handle precision correctly', () => {
      // Test floating point edge cases
      const amount = 123.45;
      const formatted = formatDollarAmount(amount);
      const parsed = parseDollarAmount(formatted);
      expect(parsed).toBe(amount);
    });
  });
});
