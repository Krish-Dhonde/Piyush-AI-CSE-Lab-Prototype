import { describe, it, expect } from 'vitest';
import { validateInputArray } from '../../src/core/validator.js';
import { ErrorCode } from '../../src/core/types.js';
import { EngineError } from '../../src/core/errors.js';

describe('Input Array Validator (Unit)', () => {
  it('should accept and freeze a valid array of finite numbers', () => {
    const raw = [5, 2, 8, -3, 0, 4.5];
    const validated = validateInputArray(raw);

    expect(validated).toEqual([5, 2, 8, -3, 0, 4.5]);
    expect(Object.isFrozen(validated)).toBe(true);

    // Verify original array was not mutated
    expect(raw).toEqual([5, 2, 8, -3, 0, 4.5]);
    expect(Object.isFrozen(raw)).toBe(false);
  });

  it('should accept an empty array', () => {
    const validated = validateInputArray([]);
    expect(validated).toEqual([]);
    expect(Object.isFrozen(validated)).toBe(true);
  });

  it('should accept a single element array', () => {
    const validated = validateInputArray([42]);
    expect(validated).toEqual([42]);
  });

  it('should accept an array at the maximum permitted size of 100 elements', () => {
    const maxArray = Array.from({ length: 100 }, (_, i) => i);
    const validated = validateInputArray(maxArray);
    expect(validated.length).toBe(100);
  });

  it('should reject non-array inputs with INVALID_INPUT_TYPE', () => {
    const nonArrays = [null, undefined, 42, 'string', {}, true, Symbol('test'), () => {}];

    for (const val of nonArrays) {
      expect(() => validateInputArray(val)).toThrowError(EngineError);
      try {
        validateInputArray(val);
      } catch (err) {
        expect(err.code).toBe(ErrorCode.INVALID_INPUT_TYPE);
      }
    }
  });

  it('should reject inputs exceeding MAX_ARRAY_SIZE with INPUT_SIZE_EXCEEDED', () => {
    const oversized = Array.from({ length: 101 }, (_, i) => i);

    expect(() => validateInputArray(oversized)).toThrowError(EngineError);
    try {
      validateInputArray(oversized);
    } catch (err) {
      expect(err.code).toBe(ErrorCode.INPUT_SIZE_EXCEEDED);
      expect(err.details.length).toBe(101);
      expect(err.details.maxArraySize).toBe(100);
    }
  });

  it('should respect custom maxArraySize option', () => {
    const array = [1, 2, 3, 4, 5];
    expect(() => validateInputArray(array, { maxArraySize: 3 })).toThrowError(EngineError);

    try {
      validateInputArray(array, { maxArraySize: 3 });
    } catch (err) {
      expect(err.code).toBe(ErrorCode.INPUT_SIZE_EXCEEDED);
    }
  });

  it('should reject non-finite and non-numeric elements with INVALID_ELEMENT_VALUE', () => {
    const invalidArrays = [
      [1, NaN, 3],
      [1, Infinity, 3],
      [1, -Infinity, 3],
      [1, 'two', 3],
      [1, null, 3],
      [1, undefined, 3],
      [1, {}, 3],
      [1, [2], 3]
    ];

    for (const arr of invalidArrays) {
      expect(() => validateInputArray(arr)).toThrowError(EngineError);
      try {
        validateInputArray(arr);
      } catch (err) {
        expect(err.code).toBe(ErrorCode.INVALID_ELEMENT_VALUE);
      }
    }
  });

  it('should reject sparse arrays with unassigned slots', () => {
    const sparse = [1, , 3]; // index 1 is empty hole

    expect(() => validateInputArray(sparse)).toThrowError(EngineError);
    try {
      validateInputArray(sparse);
    } catch (err) {
      expect(err.code).toBe(ErrorCode.INVALID_ELEMENT_VALUE);
      expect(err.message).toContain('sparse');
    }
  });

  it('should guarantee immutability on validated output', () => {
    const validated = validateInputArray([10, 20]);
    expect(() => {
      // In strict mode, mutating a frozen array throws a TypeError
      validated[0] = 99;
    }).toThrow(TypeError);
  });

  describe('validateAlgorithmOptions & Resource Ceilings', () => {
    it('should reject hostile non-object options parameter', () => {
      expect(() => validateInputArray([1], 'hostile_string')).toThrowError(EngineError);
      expect(() => validateInputArray([1], 12345)).toThrowError(EngineError);
    });

    it('should reject non-integer, negative, or non-finite maxArraySize', () => {
      const invalidValues = [-1, 2.5, NaN, Infinity, -Infinity, '50'];
      for (const val of invalidValues) {
        expect(() => validateInputArray([1], { maxArraySize: val })).toThrowError(EngineError);
      }
    });

    it('should enforce absolute hard ceiling on maxArraySize', () => {
      expect(() => validateInputArray([1], { maxArraySize: 101 })).toThrowError(EngineError);
      expect(() => validateInputArray([1], { maxArraySize: 1000 })).toThrowError(EngineError);
      try {
        validateInputArray([1], { maxArraySize: 500 });
      } catch (err) {
        expect(err.code).toBe(ErrorCode.INPUT_SIZE_EXCEEDED);
        expect(err.details.hardCeiling).toBe(100);
      }
    });
  });
});

