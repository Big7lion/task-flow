import { describe, it, expect } from 'vitest';
import { init } from './init.js';

describe('init', () => {
  it('should export init function', () => {
    expect(typeof init).toBe('function');
  });
});
