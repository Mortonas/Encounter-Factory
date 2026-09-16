import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { mechanicalInt, mechanicalNumber } from '../types.js';

describe('Zod Schema Recovery Helpers', () => {
  let warnSpy: any;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  const expectWarningForPath = (path: string, contentSnippet: string) => {
    const matchingCall = warnSpy.mock.calls.find((args: any[]) => {
      const logStr = args[0] || '';
      return logStr.includes(path) && logStr.includes(contentSnippet);
    });
    expect(matchingCall).toBeDefined();
  };

  const expectNoWarningForPath = (path: string) => {
    const matchingCall = warnSpy.mock.calls.find((args: any[]) => {
      const logStr = args[0] || '';
      return logStr.includes(path);
    });
    expect(matchingCall).toBeUndefined();
  };

  describe('mechanicalInt', () => {
    const schema = z.object({
      val: mechanicalInt(10, 'test.path.int')
    });

    const schemaWithBounds = z.object({
      val: mechanicalInt(10, 'test.path.int_bounds', { min: 2, max: 20 })
    });

    it('should parse valid integers directly without warnings', () => {
      const res = schema.parse({ val: 5 });
      expect(res.val).toBe(5);
      expectNoWarningForPath('test.path.int');
    });

    it('should round floating numbers to integers', () => {
      const res = schema.parse({ val: 5.7 });
      expect(res.val).toBe(6);
      expectNoWarningForPath('test.path.int');
    });

    it('should parse valid numeric strings to integers', () => {
      const res = schema.parse({ val: '42' });
      expect(res.val).toBe(42);
      const resFloatString = schema.parse({ val: '7.3' });
      expect(resFloatString.val).toBe(7);
      expectNoWarningForPath('test.path.int');
    });

    it('should silently hydrate default on null or undefined and log warning', () => {
      const resNull = schema.parse({ val: null });
      expect(resNull.val).toBe(10);
      expectWarningForPath('test.path.int', "[ZOD HYDRATION] Missing or null value");

      warnSpy.mockClear();
      const resUndefined = schema.parse({});
      expect(resUndefined.val).toBe(10);
      expectWarningForPath('test.path.int', "[ZOD HYDRATION] Missing or null value");
    });

    it('should silently hydrate default on invalid type and log warning', () => {
      const res = schema.parse({ val: { key: 'value' } });
      expect(res.val).toBe(10);
      expectWarningForPath('test.path.int', "[ZOD HYDRATION] Invalid value type (object)");
    });

    it('should silently hydrate default on invalid string and log warning', () => {
      const res = schema.parse({ val: 'not_a_number' });
      expect(res.val).toBe(10);
      expectWarningForPath('test.path.int', "[ZOD HYDRATION] Invalid string value 'not_a_number'");
    });

    it('should enforce min and max bounds and clamp out-of-bound values', () => {
      const resUnder = schemaWithBounds.parse({ val: 1 });
      expect(resUnder.val).toBe(2);
      expectWarningForPath('test.path.int_bounds', "out of bounds (< 2)");

      warnSpy.mockClear();
      const resOver = schemaWithBounds.parse({ val: 25 });
      expect(resOver.val).toBe(20);
      expectWarningForPath('test.path.int_bounds', "out of bounds (> 20)");
    });
  });

  describe('mechanicalNumber', () => {
    const schema = z.object({
      val: mechanicalNumber(15.5, 'test.path.number')
    });

    const schemaWithBounds = z.object({
      val: mechanicalNumber(15.5, 'test.path.number_bounds', { min: 5.0, max: 25.5 })
    });

    it('should parse valid float numbers directly without warnings', () => {
      const res = schema.parse({ val: 12.34 });
      expect(res.val).toBe(12.34);
      expectNoWarningForPath('test.path.number');
    });

    it('should parse valid numeric strings to floats', () => {
      const res = schema.parse({ val: '12.34' });
      expect(res.val).toBe(12.34);
      expectNoWarningForPath('test.path.number');
    });

    it('should silently hydrate default on null or undefined and log warning', () => {
      const resNull = schema.parse({ val: null });
      expect(resNull.val).toBe(15.5);
      expectWarningForPath('test.path.number', "[ZOD HYDRATION] Missing or null value");
    });

    it('should clamp numbers using bounds checks and log warnings', () => {
      const resUnder = schemaWithBounds.parse({ val: 3.5 });
      expect(resUnder.val).toBe(5.0);
      expectWarningForPath('test.path.number_bounds', "out of bounds (< 5)");

      warnSpy.mockClear();
      const resOver = schemaWithBounds.parse({ val: 30.2 });
      expect(resOver.val).toBe(25.5);
      expectWarningForPath('test.path.number_bounds', "out of bounds (> 25.5)");
    });
  });
});
