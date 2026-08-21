import { describe, expect, it } from 'vitest';
import { FiringOrderService } from '../src/services/FiringOrderService.js';

describe('FiringOrderService', () => {
  const service = new FiringOrderService();

  it('should choose the first order through an injectable random source', () => {
    expect(service.createInitialOrder(['a', 'b', 'c'], () => 0)).toEqual(['b', 'c', 'a']);
  });

  it('should rotate one seat per round and remove eliminated players', () => {
    expect(service.rotateOne(['a', 'b', 'c'], new Set(['a', 'b', 'c']))).toEqual(['b', 'c', 'a']);
    expect(service.rotateOne(['a', 'b', 'c'], new Set(['a', 'c']))).toEqual(['c', 'a']);
  });
});
