import { describe, it, expect } from 'vitest';
import * as Engine from '../../src/index.js';

describe('Engine Public API Exports (Unit)', () => {
  it('should export all expected types, constants, and errors', () => {
    expect(Engine.EventType).toBeDefined();
    expect(Engine.EventType.ALGORITHM_START).toBe('ALGORITHM_START');
    expect(Engine.EventType.CANDIDATE_SELECT).toBe('CANDIDATE_SELECT');
    expect(Engine.EventType.CANDIDATE_UPDATE).toBe('CANDIDATE_UPDATE');
    expect(Engine.EventType.COMPARE).toBe('COMPARE');
    expect(Engine.EventType.SWAP).toBe('SWAP');
    expect(Engine.EventType.NO_SWAP).toBe('NO_SWAP');
    expect(Engine.EventType.PASS_START).toBe('PASS_START');
    expect(Engine.EventType.PASS_COMPLETE).toBe('PASS_COMPLETE');
    expect(Engine.EventType.ALGORITHM_COMPLETE).toBe('ALGORITHM_COMPLETE');

    expect(Engine.PlaybackState).toBeDefined();
    expect(Engine.ErrorCode).toBeDefined();
    expect(Engine.ErrorCode.INVALID_CODE_MAPPING).toBe('INVALID_CODE_MAPPING');

    expect(Engine.DEFAULT_CONFIG).toBeDefined();
    expect(Engine.HARD_LIMITS).toBeDefined();

    expect(Engine.BUBBLE_SORT_PSEUDOCODE).toBeDefined();
    expect(Engine.SELECTION_SORT_PSEUDOCODE).toBeDefined();
    expect(Array.isArray(Engine.BUBBLE_SORT_PSEUDOCODE)).toBe(true);
    expect(Array.isArray(Engine.SELECTION_SORT_PSEUDOCODE)).toBe(true);
    expect(Engine.ALGORITHM_PSEUDOCODE).toBeDefined();
    expect(Engine.ALGORITHM_PSEUDOCODE.bubbleSort).toBe(Engine.BUBBLE_SORT_PSEUDOCODE);
    expect(Engine.ALGORITHM_PSEUDOCODE.selectionSort).toBe(Engine.SELECTION_SORT_PSEUDOCODE);

    expect(Engine.EngineError).toBeDefined();
  });

  it('should export all validation utilities', () => {
    expect(typeof Engine.validateInputArray).toBe('function');
    expect(typeof Engine.validateAlgorithmOptions).toBe('function');
    expect(typeof Engine.validateCodeMapping).toBe('function');
    expect(typeof Engine.resolvePseudocodeBoundary).toBe('function');
  });

  it('should export core trace abstractions', () => {
    expect(typeof Engine.ExecutionTrace).toBe('function');
    expect(typeof Engine.deepFreeze).toBe('function');
  });

  it('should export algorithm implementations', () => {
    expect(typeof Engine.bubbleSort).toBe('function');
    expect(typeof Engine.selectionSort).toBe('function');

    // Quick sanity check with bubbleSort and selectionSort
    const traceB = Engine.bubbleSort([3, 1]);
    expect(traceB.finalArray).toEqual([1, 3]);

    const traceS = Engine.selectionSort([3, 1]);
    expect(traceS.finalArray).toEqual([1, 3]);
  });

  it('should export playback controller and clock abstractions', () => {
    expect(typeof Engine.RealClock).toBe('function');
    expect(typeof Engine.VirtualClock).toBe('function');
    expect(typeof Engine.PlaybackStateMachine).toBe('function');
    expect(typeof Engine.PlaybackController).toBe('function');
  });
});
