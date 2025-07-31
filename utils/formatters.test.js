import { describe, it, expect } from 'vitest';
import {
  generateSearchableText,
  formatLastModified,
  formatRelativeTime,
  getSizeRange
} from './formatters.js';


describe('generateSearchableText', () => {
  it('should combine all searchable fields', () => {
    const model = {
      name: 'Mistral 7B Instruct',
      modelId: 'mistralai/Mistral-7B-Instruct-v0.2',
      filename: 'Mistral-7B-Instruct-v0.2.Q4_K_M.gguf',
      quantization: 'Q4_K_M',
      architecture: 'Mistral',
      family: 'mistralai',
      sizeFormatted: '4.2 GB',
      tags: ['Popular', '7B']
    };

    const searchText = generateSearchableText(model);
    
    expect(searchText).toContain('mistral 7b instruct');
    expect(searchText).toContain('q4_k_m');
    expect(searchText).toContain('mistralai');
    expect(searchText).toContain('4.2 gb');
    expect(searchText).toContain('popular');
    expect(searchText).toContain('7b');
  });

  it('should handle missing fields gracefully', () => {
    const model = {
      name: 'Test Model',
      quantization: 'Q4_K_M'
    };

    const searchText = generateSearchableText(model);
    expect(searchText).toContain('test model');
    expect(searchText).toContain('q4_k_m');
  });

  it('should filter out non-string values', () => {
    const model = {
      name: 'Test Model',
      downloads: 1000, // number should be filtered out
      tags: null // null should be filtered out
    };

    const searchText = generateSearchableText(model);
    expect(searchText).toBe('test model');
  });
});

describe('formatLastModified', () => {
  it('should format valid ISO timestamps', () => {
    const timestamp = '2024-01-15T10:30:00Z';
    const formatted = formatLastModified(timestamp);
    expect(formatted).toBe('Jan 15, 2024');
  });

  it('should handle different date formats', () => {
    const timestamp = '2024-12-25T00:00:00.000Z';
    const formatted = formatLastModified(timestamp);
    expect(formatted).toBe('Dec 25, 2024');
  });

  it('should handle edge cases', () => {
    expect(formatLastModified(null)).toBe('Unknown');
    expect(formatLastModified(undefined)).toBe('Unknown');
    expect(formatLastModified('')).toBe('Unknown');
    expect(formatLastModified('invalid-date')).toBe('Invalid Date');
  });
});

describe('formatRelativeTime', () => {
  it('should format recent times correctly', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    expect(formatRelativeTime(fiveMinutesAgo.toISOString())).toBe('5 minutes ago');
    expect(formatRelativeTime(twoHoursAgo.toISOString())).toBe('2 hours ago');
    expect(formatRelativeTime(threeDaysAgo.toISOString())).toBe('3 days ago');
  });

  it('should handle singular forms', () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    expect(formatRelativeTime(oneMinuteAgo.toISOString())).toBe('1 minute ago');
    expect(formatRelativeTime(oneHourAgo.toISOString())).toBe('1 hour ago');
    expect(formatRelativeTime(oneDayAgo.toISOString())).toBe('1 day ago');
  });

  it('should fall back to absolute date for old timestamps', () => {
    const oldDate = new Date('2023-01-01T00:00:00Z');
    const formatted = formatRelativeTime(oldDate.toISOString());
    expect(formatted).toBe('Jan 1, 2023');
  });

  it('should handle very recent times', () => {
    const now = new Date();
    const justNow = new Date(now.getTime() - 30 * 1000); // 30 seconds ago

    expect(formatRelativeTime(justNow.toISOString())).toBe('Just now');
  });

  it('should handle edge cases', () => {
    expect(formatRelativeTime(null)).toBe('Unknown');
    expect(formatRelativeTime(undefined)).toBe('Unknown');
    expect(formatRelativeTime('invalid-date')).toBe('Invalid Date');
  });
});

describe('getSizeRange', () => {
  it('should categorize file sizes correctly', () => {
    const mb = 1024 * 1024;
    const gb = mb * 1024;

    expect(getSizeRange(500 * mb)).toBe('<1GB');
    expect(getSizeRange(2 * gb)).toBe('1-4GB');
    expect(getSizeRange(6 * gb)).toBe('4-8GB');
    expect(getSizeRange(12 * gb)).toBe('8-16GB');
    expect(getSizeRange(20 * gb)).toBe('>16GB');
  });

  it('should handle edge cases', () => {
    expect(getSizeRange(0)).toBe('Unknown');
    expect(getSizeRange(null)).toBe('Unknown');
    expect(getSizeRange(undefined)).toBe('Unknown');
  });

  it('should handle boundary values', () => {
    const gb = 1024 * 1024 * 1024;
    
    expect(getSizeRange(gb - 1)).toBe('<1GB');
    expect(getSizeRange(gb)).toBe('1-4GB');
    expect(getSizeRange(4 * gb)).toBe('4-8GB');
    expect(getSizeRange(8 * gb)).toBe('8-16GB');
    expect(getSizeRange(16 * gb)).toBe('>16GB');
  });
});