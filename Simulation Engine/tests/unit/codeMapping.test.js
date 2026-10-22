import { describe, it, expect } from 'vitest';
import { validateCodeMapping, resolvePseudocodeBoundary } from '../../src/core/validator.js';
import { bubbleSort } from '../../src/algorithms/bubbleSort.js';
import { selectionSort } from '../../src/algorithms/selectionSort.js';
import {
  ErrorCode,
  EventType,
  BUBBLE_SORT_PSEUDOCODE,
  SELECTION_SORT_PSEUDOCODE,
  ALGORITHM_PSEUDOCODE
} from '../../src/core/types.js';
import { EngineError } from '../../src/core/errors.js';

describe('Event-to-Code Mapping Contract (Unit)', () => {
  describe('validateCodeMapping', () => {
    it('should validate and freeze a valid minimal code mapping', () => {
      const mapping = {
        line: 1,
        explanation: 'Initialize the algorithm'
      };

      const result = validateCodeMapping(mapping, 'test');
      expect(result.line).toBe(1);
      expect(result.lines).toEqual([1]);
      expect(result.explanation).toBe('Initialize the algorithm');
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.lines)).toBe(true);
    });

    it('should validate and freeze a complete mapping with lines and variables', () => {
      const mapping = {
        line: 4,
        explanation: 'Compare adjacent elements',
        lines: [4, 5],
        variables: { i: 0, j: 1, 'arr[j]': 5 }
      };

      const result = validateCodeMapping(mapping, 'test');
      expect(result.line).toBe(4);
      expect(result.lines).toEqual([4, 5]);
      expect(result.variables).toEqual({ i: 0, j: 1, 'arr[j]': 5 });
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.lines)).toBe(true);
      expect(Object.isFrozen(result.variables)).toBe(true);
    });

    it('should reject non-object or null mapping', () => {
      const invalidMappings = [null, undefined, 42, 'line 1', [], true];

      for (const val of invalidMappings) {
        expect(() => validateCodeMapping(val, 'ctx')).toThrowError(EngineError);
        try {
          validateCodeMapping(val, 'ctx');
        } catch (err) {
          expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
        }
      }
    });

    it('should reject non-integer or non-positive line numbers (enforcing 1-based indexing)', () => {
      const invalidLines = [0, -1, -5, 1.5, NaN, Infinity, -Infinity, '1', null, undefined, true];

      for (const line of invalidLines) {
        expect(() => validateCodeMapping({ line, explanation: 'Test explanation' }, 'ctx')).toThrowError(EngineError);
        try {
          validateCodeMapping({ line, explanation: 'Test explanation' }, 'ctx');
        } catch (err) {
          expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
        }
      }
    });

    it('should reject empty, whitespace-only, or non-string explanation', () => {
      const invalidExplanations = ['', '   ', '\t\n', null, undefined, 123, {}, []];

      for (const explanation of invalidExplanations) {
        expect(() => validateCodeMapping({ line: 1, explanation }, 'ctx')).toThrowError(EngineError);
        try {
          validateCodeMapping({ line: 1, explanation }, 'ctx');
        } catch (err) {
          expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
        }
      }
    });

    it('should reject lines property if not an array or if contains non-positive integers', () => {
      const invalidLinesProps = ['[1, 2]', { 0: 1 }, [0], [-1], [1.5], ['1'], []];

      for (const lines of invalidLinesProps) {
        expect(() => validateCodeMapping({ line: 1, explanation: 'Valid', lines }, 'ctx')).toThrowError(EngineError);
        try {
          validateCodeMapping({ line: 1, explanation: 'Valid', lines }, 'ctx');
        } catch (err) {
          expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
        }
      }
    });

    it('should reject lines array if it does not include the primary line', () => {
      expect(() => validateCodeMapping({
        line: 3,
        explanation: 'Valid explanation',
        lines: [1, 2]
      }, 'ctx')).toThrowError(EngineError);

      try {
        validateCodeMapping({
          line: 3,
          explanation: 'Valid explanation',
          lines: [1, 2]
        }, 'ctx');
      } catch (err) {
        expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
      }
    });

    it('should reject variables property if not a plain object or is null/array', () => {
      const invalidVariables = [null, [1, 2], 'var=1', 42, true];

      for (const variables of invalidVariables) {
        expect(() => validateCodeMapping({
          line: 1,
          explanation: 'Valid explanation',
          variables
        }, 'ctx')).toThrowError(EngineError);

        try {
          validateCodeMapping({
            line: 1,
            explanation: 'Valid explanation',
            variables
          }, 'ctx');
        } catch (err) {
          expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
        }
      }
    });

    it('should ensure mapping metadata is deeply immutable once validated', () => {
      const rawMapping = {
        line: 2,
        explanation: 'Loop iteration',
        lines: [2],
        variables: { i: 0 }
      };

      const validated = validateCodeMapping(rawMapping, 'ctx');

      expect(() => {
        validated.line = 3;
      }).toThrow();

      expect(() => {
        validated.explanation = 'Mutated';
      }).toThrow();

      expect(() => {
        validated.lines.push(4);
      }).toThrow();

      expect(() => {
        validated.variables.i = 99;
      }).toThrow();
    });

    it('should deeply freeze nested objects in variables (e.g. variables: { nested: { value: 1 } })', () => {
      const rawMapping = {
        line: 1,
        explanation: 'Testing nested object immutability',
        variables: {
          nested: {
            value: 1
          }
        }
      };

      const validated = validateCodeMapping(rawMapping, 'ctx');

      expect(Object.isFrozen(validated)).toBe(true);
      expect(Object.isFrozen(validated.variables)).toBe(true);
      expect(Object.isFrozen(validated.variables.nested)).toBe(true);
      expect(validated.variables.nested.value).toBe(1);

      // Verify mutation is blocked
      expect(() => {
        validated.variables.nested.value = 2;
      }).toThrow();

      expect(() => {
        validated.variables.nested.newProp = 'illegal';
      }).toThrow();

      expect(() => {
        delete validated.variables.nested.value;
      }).toThrow();

      expect(validated.variables.nested.value).toBe(1);
    });

    it('should deeply freeze nested arrays and array entries in variables (e.g. variables: { entries: [{ value: 1 }] })', () => {
      const rawMapping = {
        line: 1,
        explanation: 'Testing nested array and entries immutability',
        variables: {
          entries: [
            { value: 1 }
          ]
        }
      };

      const validated = validateCodeMapping(rawMapping, 'ctx');

      expect(Object.isFrozen(validated)).toBe(true);
      expect(Object.isFrozen(validated.variables)).toBe(true);
      expect(Object.isFrozen(validated.variables.entries)).toBe(true);
      expect(Object.isFrozen(validated.variables.entries[0])).toBe(true);
      expect(validated.variables.entries.length).toBe(1);
      expect(validated.variables.entries[0].value).toBe(1);

      // Verify array mutation is blocked
      expect(() => {
        validated.variables.entries.push({ value: 2 });
      }).toThrow();

      expect(() => {
        validated.variables.entries[0] = { value: 99 };
      }).toThrow();

      expect(() => {
        validated.variables.entries.pop();
      }).toThrow();

      // Verify entry object mutation is blocked
      expect(() => {
        validated.variables.entries[0].value = 2;
      }).toThrow();

      expect(() => {
        validated.variables.entries[0].addedProp = true;
      }).toThrow();

      expect(() => {
        delete validated.variables.entries[0].value;
      }).toThrow();

      expect(validated.variables.entries.length).toBe(1);
      expect(validated.variables.entries[0].value).toBe(1);
    });

    it('should deeply freeze arbitrary multi-level nested structures in variables', () => {
      const rawMapping = {
        line: 1,
        explanation: 'Multi-level nested variables',
        variables: {
          level1: {
            level2: {
              numbers: [10, 20, [30, 40]],
              meta: {
                flag: true,
                tags: ['a', 'b']
              }
            }
          }
        }
      };

      const validated = validateCodeMapping(rawMapping, 'ctx');

      expect(Object.isFrozen(validated.variables.level1)).toBe(true);
      expect(Object.isFrozen(validated.variables.level1.level2)).toBe(true);
      expect(Object.isFrozen(validated.variables.level1.level2.numbers)).toBe(true);
      expect(Object.isFrozen(validated.variables.level1.level2.numbers[2])).toBe(true);
      expect(Object.isFrozen(validated.variables.level1.level2.meta)).toBe(true);
      expect(Object.isFrozen(validated.variables.level1.level2.meta.tags)).toBe(true);

      expect(() => {
        validated.variables.level1.level2.numbers[2].push(50);
      }).toThrow();

      expect(() => {
        validated.variables.level1.level2.meta.tags[0] = 'z';
      }).toThrow();
    });

    it('should handle circular references in variables without infinite recursion and ensure frozen', () => {
      const circular = { id: 'root' };
      circular.self = circular;

      const validated = validateCodeMapping({
        line: 1,
        explanation: 'Circular structure',
        variables: circular
      }, 'ctx');

      expect(Object.isFrozen(validated.variables)).toBe(true);
      expect(Object.isFrozen(validated.variables.self)).toBe(true);
      expect(() => {
        validated.variables.id = 'mutated';
      }).toThrow();
    });
  });

  describe('Bubble Sort Code Mappings', () => {
    it('should attach valid, frozen codeMapping to all events in Bubble Sort', () => {
      const trace = bubbleSort([3, 1, 2]);

      expect(trace.events.length).toBeGreaterThan(0);

      for (const ev of trace.events) {
        expect(ev.codeMapping).toBeDefined();
        expect(typeof ev.codeMapping.line).toBe('number');
        expect(ev.codeMapping.line).toBeGreaterThanOrEqual(1);
        expect(Number.isInteger(ev.codeMapping.line)).toBe(true);
        expect(typeof ev.codeMapping.explanation).toBe('string');
        expect(ev.codeMapping.explanation.trim().length).toBeGreaterThan(0);
        expect(Object.isFrozen(ev.codeMapping)).toBe(true);
      }
    });

    it('should map Bubble Sort event types to corresponding pseudocode lines', () => {
      const trace = bubbleSort([2, 1]);

      const startEv = trace.events.find(e => e.type === EventType.ALGORITHM_START);
      expect(startEv.codeMapping.line).toBe(1);

      const passStartEv = trace.events.find(e => e.type === EventType.PASS_START);
      expect(passStartEv.codeMapping.line).toBe(2);

      const compareEv = trace.events.find(e => e.type === EventType.COMPARE);
      expect(compareEv.codeMapping.line).toBe(4);

      const swapEv = trace.events.find(e => e.type === EventType.SWAP);
      expect(swapEv.codeMapping.line).toBe(5);

      const passCompEv = trace.events.find(e => e.type === EventType.PASS_COMPLETE);
      expect(passCompEv.codeMapping.line).toBe(6);

      const compEv = trace.events.find(e => e.type === EventType.ALGORITHM_COMPLETE);
      expect(compEv.codeMapping.line).toBe(8);
    });
  });

  describe('Selection Sort Code Mappings', () => {
    it('should attach valid, frozen codeMapping to all events in Selection Sort', () => {
      const trace = selectionSort([3, 1, 2]);

      expect(trace.events.length).toBeGreaterThan(0);

      for (const ev of trace.events) {
        expect(ev.codeMapping).toBeDefined();
        expect(typeof ev.codeMapping.line).toBe('number');
        expect(ev.codeMapping.line).toBeGreaterThanOrEqual(1);
        expect(Number.isInteger(ev.codeMapping.line)).toBe(true);
        expect(typeof ev.codeMapping.explanation).toBe('string');
        expect(ev.codeMapping.explanation.trim().length).toBeGreaterThan(0);
        expect(Object.isFrozen(ev.codeMapping)).toBe(true);
      }
    });

    it('should map Selection Sort event types to corresponding pseudocode lines', () => {
      const trace = selectionSort([3, 1]);

      const startEv = trace.events.find(e => e.type === EventType.ALGORITHM_START);
      expect(startEv.codeMapping.line).toBe(1);

      const passStartEv = trace.events.find(e => e.type === EventType.PASS_START);
      expect(passStartEv.codeMapping.line).toBe(2);

      const candidateSelectEv = trace.events.find(e => e.type === EventType.CANDIDATE_SELECT);
      expect(candidateSelectEv.codeMapping.line).toBe(3);

      const compareEv = trace.events.find(e => e.type === EventType.COMPARE);
      expect(compareEv.codeMapping.line).toBe(5);

      const candidateUpdateEv = trace.events.find(e => e.type === EventType.CANDIDATE_UPDATE);
      expect(candidateUpdateEv.codeMapping.line).toBe(6);

      const swapEv = trace.events.find(e => e.type === EventType.SWAP);
      expect(swapEv.codeMapping.line).toBe(8);

      const passCompEv = trace.events.find(e => e.type === EventType.PASS_COMPLETE);
      expect(passCompEv.codeMapping.line).toBe(9);

      const compEv = trace.events.find(e => e.type === EventType.ALGORITHM_COMPLETE);
      expect(compEv.codeMapping.line).toBe(11);
    });

    it('should export frozen BUBBLE_SORT_PSEUDOCODE, SELECTION_SORT_PSEUDOCODE, and ALGORITHM_PSEUDOCODE', () => {
      expect(Array.isArray(BUBBLE_SORT_PSEUDOCODE)).toBe(true);
      expect(Array.isArray(SELECTION_SORT_PSEUDOCODE)).toBe(true);
      expect(Object.isFrozen(BUBBLE_SORT_PSEUDOCODE)).toBe(true);
      expect(Object.isFrozen(SELECTION_SORT_PSEUDOCODE)).toBe(true);
      expect(Object.isFrozen(ALGORITHM_PSEUDOCODE)).toBe(true);
      expect(ALGORITHM_PSEUDOCODE.bubbleSort).toBe(BUBBLE_SORT_PSEUDOCODE);
      expect(ALGORITHM_PSEUDOCODE.selectionSort).toBe(SELECTION_SORT_PSEUDOCODE);

      for (const item of BUBBLE_SORT_PSEUDOCODE) {
        expect(item.line).toBeGreaterThanOrEqual(1);
        expect(typeof item.text).toBe('string');
        expect(Object.isFrozen(item)).toBe(true);
      }

      for (const item of SELECTION_SORT_PSEUDOCODE) {
        expect(item.line).toBeGreaterThanOrEqual(1);
        expect(typeof item.text).toBe('string');
        expect(Object.isFrozen(item)).toBe(true);
      }
    });
  });

  describe('Algorithm-Aware Pseudocode Boundary Validation', () => {
    describe('Bubble Sort boundaries (max lines = 8)', () => {
      it('should reject line: 999 for Bubble Sort', () => {
        expect(() => validateCodeMapping(
          { line: 999, explanation: 'Out of bounds line' },
          { algorithm: 'bubbleSort' }
        )).toThrowError(EngineError);

        try {
          validateCodeMapping({ line: 999, explanation: 'Out of bounds line' }, { algorithm: 'bubbleSort' });
        } catch (err) {
          expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
          expect(err.message).toMatch(/exceeds maximum pseudocode line \(8\)/);
        }
      });

      it('should reject line: 9 (first out-of-range line) for Bubble Sort', () => {
        expect(() => validateCodeMapping(
          { line: 9, explanation: 'Line 9 invalid' },
          { algorithm: 'bubbleSort' }
        )).toThrowError(EngineError);

        try {
          validateCodeMapping({ line: 9, explanation: 'Line 9 invalid' }, { algorithm: 'bubbleSort' });
        } catch (err) {
          expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
        }
      });

      it('should reject lines array containing out-of-range entry (e.g. 999 or 9) for Bubble Sort', () => {
        expect(() => validateCodeMapping(
          { line: 1, explanation: 'Valid line but invalid lines array', lines: [1, 999] },
          { algorithm: 'bubbleSort' }
        )).toThrowError(EngineError);

        try {
          validateCodeMapping(
            { line: 1, explanation: 'Valid line but invalid lines array', lines: [1, 999] },
            { algorithm: 'bubbleSort' }
          );
        } catch (err) {
          expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
          expect(err.message).toMatch(/exceeds maximum pseudocode line \(8\)/);
        }

        expect(() => validateCodeMapping(
          { line: 1, explanation: 'Valid line but invalid lines array', lines: [1, 9] },
          { algorithm: 'bubbleSort' }
        )).toThrowError(EngineError);
      });

      it('should reject non-positive, non-integer, or non-finite lines with Bubble Sort context', () => {
        const invalidLines = [0, -1, 1.5, NaN, Infinity, -Infinity];
        for (const line of invalidLines) {
          expect(() => validateCodeMapping(
            { line, explanation: 'Invalid line' },
            { algorithm: 'bubbleSort' }
          )).toThrowError(EngineError);

          expect(() => validateCodeMapping(
            { line: 1, explanation: 'Invalid in lines array', lines: [1, line] },
            { algorithm: 'bubbleSort' }
          )).toThrowError(EngineError);
        }
      });

      it('should accept valid boundary line numbers (1 and 8) for Bubble Sort', () => {
        const minBoundary = validateCodeMapping(
          { line: 1, explanation: 'Boundary 1' },
          { algorithm: 'bubbleSort' }
        );
        expect(minBoundary.line).toBe(1);

        const maxBoundary = validateCodeMapping(
          { line: 8, explanation: 'Boundary 8' },
          { algorithm: 'bubbleSort' }
        );
        expect(maxBoundary.line).toBe(8);

        const rangeBoundary = validateCodeMapping(
          { line: 1, explanation: 'Boundary range [1, 8]', lines: [1, 8] },
          { algorithm: 'bubbleSort' }
        );
        expect(rangeBoundary.lines).toEqual([1, 8]);
      });

      it('should accept context passed as algorithmName: bubbleSort', () => {
        expect(() => validateCodeMapping(
          { line: 999, explanation: 'Out of bounds' },
          { algorithmName: 'bubbleSort' }
        )).toThrowError(EngineError);

        const valid = validateCodeMapping(
          { line: 8, explanation: 'Valid line 8' },
          { algorithmName: 'bubbleSort' }
        );
        expect(valid.line).toBe(8);
      });

      it('should reject bubbleSort mapping when maxLines is overridden to 999 (prevent boundary bypass)', () => {
        expect(() => validateCodeMapping(
          { line: 999, explanation: 'invalid' },
          { algorithm: 'bubbleSort', maxLines: 999 }
        )).toThrowError(EngineError);

        try {
          validateCodeMapping(
            { line: 999, explanation: 'invalid' },
            { algorithm: 'bubbleSort', maxLines: 999 }
          );
        } catch (err) {
          expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
          expect(err.message).toMatch(/Conflicting pseudocode configuration/);
        }
      });

      it('should reject conflicting maxLines for Bubble Sort even when line number is valid (<= 8)', () => {
        const conflictingMaxLines = [999, 5, 9, 100];
        for (const maxLines of conflictingMaxLines) {
          expect(() => validateCodeMapping(
            { line: 1, explanation: 'Valid line but conflicting maxLines' },
            { algorithm: 'bubbleSort', maxLines }
          )).toThrowError(EngineError);

          try {
            validateCodeMapping(
              { line: 1, explanation: 'Valid line but conflicting maxLines' },
              { algorithm: 'bubbleSort', maxLines }
            );
          } catch (err) {
            expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
            expect(err.message).toMatch(/Conflicting pseudocode configuration/);
          }
        }
      });

      it('should accept matching maxLines = 8 for Bubble Sort', () => {
        const result = validateCodeMapping(
          { line: 8, explanation: 'Boundary line 8 with matching maxLines' },
          { algorithm: 'bubbleSort', maxLines: 8 }
        );
        expect(result.line).toBe(8);
      });

      it('should reject conflicting pseudocode array for Bubble Sort', () => {
        expect(() => validateCodeMapping(
          { line: 1, explanation: 'Valid line but conflicting pseudocode' },
          { algorithm: 'bubbleSort', pseudocode: [{ line: 1, text: 'Single line' }] }
        )).toThrowError(EngineError);
      });

      it('should accept matching pseudocode array for Bubble Sort', () => {
        const result = validateCodeMapping(
          { line: 8, explanation: 'Valid line 8 with matching pseudocode' },
          { algorithm: 'bubbleSort', pseudocode: BUBBLE_SORT_PSEUDOCODE }
        );
        expect(result.line).toBe(8);
      });
    });

    describe('Selection Sort boundaries (max lines = 11)', () => {
      it('should reject line: 999 for Selection Sort', () => {
        expect(() => validateCodeMapping(
          { line: 999, explanation: 'Out of bounds line' },
          { algorithm: 'selectionSort' }
        )).toThrowError(EngineError);

        try {
          validateCodeMapping({ line: 999, explanation: 'Out of bounds line' }, { algorithm: 'selectionSort' });
        } catch (err) {
          expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
          expect(err.message).toMatch(/exceeds maximum pseudocode line \(11\)/);
        }
      });

      it('should reject line: 12 (first out-of-range line) for Selection Sort', () => {
        expect(() => validateCodeMapping(
          { line: 12, explanation: 'Line 12 invalid' },
          { algorithm: 'selectionSort' }
        )).toThrowError(EngineError);

        try {
          validateCodeMapping({ line: 12, explanation: 'Line 12 invalid' }, { algorithm: 'selectionSort' });
        } catch (err) {
          expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
        }
      });

      it('should reject lines array containing out-of-range entry (e.g. 999 or 12) for Selection Sort', () => {
        expect(() => validateCodeMapping(
          { line: 1, explanation: 'Valid line but invalid lines array', lines: [1, 999] },
          { algorithm: 'selectionSort' }
        )).toThrowError(EngineError);

        try {
          validateCodeMapping(
            { line: 1, explanation: 'Valid line but invalid lines array', lines: [1, 999] },
            { algorithm: 'selectionSort' }
          );
        } catch (err) {
          expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
          expect(err.message).toMatch(/exceeds maximum pseudocode line \(11\)/);
        }

        expect(() => validateCodeMapping(
          { line: 1, explanation: 'Valid line but invalid lines array', lines: [1, 12] },
          { algorithm: 'selectionSort' }
        )).toThrowError(EngineError);
      });

      it('should reject non-positive, non-integer, or non-finite lines with Selection Sort context', () => {
        const invalidLines = [0, -1, 1.5, NaN, Infinity, -Infinity];
        for (const line of invalidLines) {
          expect(() => validateCodeMapping(
            { line, explanation: 'Invalid line' },
            { algorithm: 'selectionSort' }
          )).toThrowError(EngineError);

          expect(() => validateCodeMapping(
            { line: 1, explanation: 'Invalid in lines array', lines: [1, line] },
            { algorithm: 'selectionSort' }
          )).toThrowError(EngineError);
        }
      });

      it('should accept valid boundary line numbers (1 and 11) for Selection Sort', () => {
        const minBoundary = validateCodeMapping(
          { line: 1, explanation: 'Boundary 1' },
          { algorithm: 'selectionSort' }
        );
        expect(minBoundary.line).toBe(1);

        const maxBoundary = validateCodeMapping(
          { line: 11, explanation: 'Boundary 11' },
          { algorithm: 'selectionSort' }
        );
        expect(maxBoundary.line).toBe(11);

        const rangeBoundary = validateCodeMapping(
          { line: 1, explanation: 'Boundary range [1, 11]', lines: [1, 11] },
          { algorithm: 'selectionSort' }
        );
        expect(rangeBoundary.lines).toEqual([1, 11]);
      });

      it('should accept context passed as algorithmName: selectionSort', () => {
        expect(() => validateCodeMapping(
          { line: 999, explanation: 'Out of bounds' },
          { algorithmName: 'selectionSort' }
        )).toThrowError(EngineError);

        const valid = validateCodeMapping(
          { line: 11, explanation: 'Valid line 11' },
          { algorithmName: 'selectionSort' }
        );
        expect(valid.line).toBe(11);
      });

      it('should reject selectionSort mapping when maxLines is overridden to 999 (prevent boundary bypass)', () => {
        expect(() => validateCodeMapping(
          { line: 999, explanation: 'invalid' },
          { algorithm: 'selectionSort', maxLines: 999 }
        )).toThrowError(EngineError);

        try {
          validateCodeMapping(
            { line: 999, explanation: 'invalid' },
            { algorithm: 'selectionSort', maxLines: 999 }
          );
        } catch (err) {
          expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
          expect(err.message).toMatch(/Conflicting pseudocode configuration/);
        }
      });

      it('should reject conflicting maxLines for Selection Sort even when line number is valid (<= 11)', () => {
        const conflictingMaxLines = [999, 5, 12, 100];
        for (const maxLines of conflictingMaxLines) {
          expect(() => validateCodeMapping(
            { line: 1, explanation: 'Valid line but conflicting maxLines' },
            { algorithm: 'selectionSort', maxLines }
          )).toThrowError(EngineError);

          try {
            validateCodeMapping(
              { line: 1, explanation: 'Valid line but conflicting maxLines' },
              { algorithm: 'selectionSort', maxLines }
            );
          } catch (err) {
            expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
            expect(err.message).toMatch(/Conflicting pseudocode configuration/);
          }
        }
      });

      it('should accept matching maxLines = 11 for Selection Sort', () => {
        const result = validateCodeMapping(
          { line: 11, explanation: 'Boundary line 11 with matching maxLines' },
          { algorithm: 'selectionSort', maxLines: 11 }
        );
        expect(result.line).toBe(11);
      });

      it('should reject conflicting pseudocode array for Selection Sort', () => {
        expect(() => validateCodeMapping(
          { line: 1, explanation: 'Valid line but conflicting pseudocode' },
          { algorithm: 'selectionSort', pseudocode: [{ line: 1, text: 'Single line' }] }
        )).toThrowError(EngineError);
      });

      it('should accept matching pseudocode array for Selection Sort', () => {
        const result = validateCodeMapping(
          { line: 11, explanation: 'Valid line 11 with matching pseudocode' },
          { algorithm: 'selectionSort', pseudocode: SELECTION_SORT_PSEUDOCODE }
        );
        expect(result.line).toBe(11);
      });
    });

    describe('Direct maxLines and pseudocode array context support', () => {
      it('should enforce boundary when maxLines is explicitly provided', () => {
        expect(() => validateCodeMapping(
          { line: 6, explanation: 'Exceeds 5' },
          { maxLines: 5 }
        )).toThrowError(EngineError);

        const valid = validateCodeMapping(
          { line: 5, explanation: 'Boundary 5' },
          { maxLines: 5 }
        );
        expect(valid.line).toBe(5);
      });

      it('should enforce boundary when pseudocode array is provided in context', () => {
        const customPseudo = [{ line: 1, text: 'line 1' }, { line: 2, text: 'line 2' }];
        expect(() => validateCodeMapping(
          { line: 3, explanation: 'Exceeds custom length 2' },
          { pseudocode: customPseudo }
        )).toThrowError(EngineError);

        const valid = validateCodeMapping(
          { line: 2, explanation: 'Boundary 2' },
          { pseudocode: customPseudo }
        );
        expect(valid.line).toBe(2);
      });

      it('should reject custom context when maxLines conflicts with pseudocode array length', () => {
        const customPseudo = [{ line: 1, text: 'line 1' }, { line: 2, text: 'line 2' }];
        expect(() => validateCodeMapping(
          { line: 2, explanation: 'Contradictory config' },
          { maxLines: 5, pseudocode: customPseudo }
        )).toThrowError(EngineError);

        try {
          validateCodeMapping(
            { line: 2, explanation: 'Contradictory config' },
            { maxLines: 5, pseudocode: customPseudo }
          );
        } catch (err) {
          expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
          expect(err.message).toMatch(/Conflicting custom pseudocode configuration/);
        }
      });

      it('should accept custom context when maxLines matches pseudocode array length', () => {
        const customPseudo = [{ line: 1, text: 'line 1' }, { line: 2, text: 'line 2' }];
        const valid = validateCodeMapping(
          { line: 2, explanation: 'Matching config' },
          { maxLines: 2, pseudocode: customPseudo }
        );
        expect(valid.line).toBe(2);
      });

      it('should reject invalid maxLines in context (non-positive, non-integer, non-finite)', () => {
        const invalidMaxLines = [0, -1, -5, 1.5, NaN, Infinity, '10'];
        for (const maxLines of invalidMaxLines) {
          expect(() => validateCodeMapping(
            { line: 1, explanation: 'Testing invalid maxLines' },
            { maxLines }
          )).toThrowError(EngineError);

          try {
            validateCodeMapping(
              { line: 1, explanation: 'Testing invalid maxLines' },
              { maxLines }
            );
          } catch (err) {
            expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
          }
        }
      });

      it('should reject invalid pseudocode array in context (empty array, non-array)', () => {
        const invalidPseudocode = [[], 'not-array', 123, {}];
        for (const pseudocode of invalidPseudocode) {
          expect(() => validateCodeMapping(
            { line: 1, explanation: 'Testing invalid pseudocode' },
            { pseudocode }
          )).toThrowError(EngineError);

          try {
            validateCodeMapping(
              { line: 1, explanation: 'Testing invalid pseudocode' },
              { pseudocode }
            );
          } catch (err) {
            expect(err.code).toBe(ErrorCode.INVALID_CODE_MAPPING);
          }
        }
      });

      it('should preserve legitimate generic custom-pseudocode use cases for unrecognized algorithm', () => {
        const customPseudo = [
          { line: 1, text: 'proc custom()' },
          { line: 2, text: '  step 1' },
          { line: 3, text: '  step 2' }
        ];

        // Valid within custom boundaries
        const valid = validateCodeMapping(
          { line: 3, explanation: 'Line 3 of custom algo' },
          { algorithm: 'customSort', pseudocode: customPseudo }
        );
        expect(valid.line).toBe(3);

        // Exceeds custom boundaries
        expect(() => validateCodeMapping(
          { line: 4, explanation: 'Line 4 exceeds custom algo' },
          { algorithm: 'customSort', pseudocode: customPseudo }
        )).toThrowError(EngineError);

        // Unrecognized algorithm with explicit maxLines
        const validMaxLines = validateCodeMapping(
          { line: 4, explanation: 'Line 4 of custom algo' },
          { algorithm: 'customSort', maxLines: 5 }
        );
        expect(validMaxLines.line).toBe(4);

        expect(() => validateCodeMapping(
          { line: 6, explanation: 'Line 6 exceeds custom maxLines' },
          { algorithm: 'customSort', maxLines: 5 }
        )).toThrowError(EngineError);
      });
    });

    describe('resolvePseudocodeBoundary helper function', () => {
      it('should return undefined maxLines for null, primitive, or array context', () => {
        expect(resolvePseudocodeBoundary(null)).toEqual({ maxLines: undefined, algorithm: undefined });
        expect(resolvePseudocodeBoundary(undefined)).toEqual({ maxLines: undefined, algorithm: undefined });
        expect(resolvePseudocodeBoundary('str')).toEqual({ maxLines: undefined, algorithm: undefined });
        expect(resolvePseudocodeBoundary([1, 2])).toEqual({ maxLines: undefined, algorithm: undefined });
      });

      it('should resolve bubbleSort boundary to 8 lines', () => {
        expect(resolvePseudocodeBoundary({ algorithm: 'bubbleSort' })).toEqual({
          maxLines: 8,
          algorithm: 'bubbleSort'
        });
        expect(resolvePseudocodeBoundary({ algorithm: 'BubbleSort' })).toEqual({
          maxLines: 8,
          algorithm: 'bubbleSort'
        });
      });

      it('should resolve selectionSort boundary to 11 lines', () => {
        expect(resolvePseudocodeBoundary({ algorithm: 'selectionSort' })).toEqual({
          maxLines: 11,
          algorithm: 'selectionSort'
        });
        expect(resolvePseudocodeBoundary({ algorithmName: 'SelectionSort' })).toEqual({
          maxLines: 11,
          algorithm: 'selectionSort'
        });
      });

      it('should throw EngineError if maxLines conflicts with recognized algorithm', () => {
        expect(() => resolvePseudocodeBoundary({ algorithm: 'selectionSort', maxLines: 999 }))
          .toThrowError(EngineError);
        expect(() => resolvePseudocodeBoundary({ algorithm: 'bubbleSort', maxLines: 10 }))
          .toThrowError(EngineError);
      });

      it('should resolve custom context with maxLines', () => {
        expect(resolvePseudocodeBoundary({ maxLines: 20 })).toEqual({
          maxLines: 20,
          algorithm: undefined
        });
      });
    });
  });
});

