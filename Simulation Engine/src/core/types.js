/**
 * Core type enumerations and constants for the simulation engine.
 */

/**
 * Standard event types emitted during algorithm simulation.
 */
export const EventType = Object.freeze({
  ALGORITHM_START: 'ALGORITHM_START',
  PASS_START: 'PASS_START',
  COMPARE: 'COMPARE',
  SWAP: 'SWAP',
  NO_SWAP: 'NO_SWAP',
  CANDIDATE_SELECT: 'CANDIDATE_SELECT',
  CANDIDATE_UPDATE: 'CANDIDATE_UPDATE',
  PASS_COMPLETE: 'PASS_COMPLETE',
  ALGORITHM_COMPLETE: 'ALGORITHM_COMPLETE'
});

/**
 * Playback controller finite-state machine states.
 */
export const PlaybackState = Object.freeze({
  IDLE: 'IDLE',
  READY: 'READY',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR'
});

/**
 * Standard error codes for structured error classification.
 */
export const ErrorCode = Object.freeze({
  INVALID_INPUT_TYPE: 'INVALID_INPUT_TYPE',
  INPUT_SIZE_EXCEEDED: 'INPUT_SIZE_EXCEEDED',
  INVALID_ELEMENT_VALUE: 'INVALID_ELEMENT_VALUE',
  EVENT_LIMIT_EXCEEDED: 'EVENT_LIMIT_EXCEEDED',
  INVALID_CONTROLLER_STATE: 'INVALID_CONTROLLER_STATE',
  INDEX_OUT_OF_BOUNDS: 'INDEX_OUT_OF_BOUNDS',
  TRACE_INTEGRITY_VIOLATION: 'TRACE_INTEGRITY_VIOLATION',
  INVALID_CODE_MAPPING: 'INVALID_CODE_MAPPING'
});

/**
 * Default configuration and boundary limits.
 */
export const DEFAULT_CONFIG = Object.freeze({
  MAX_ARRAY_SIZE: 100,
  MAX_EVENTS: 50000,
  DEFAULT_DELAY_MS: 300,
  MIN_SPEED_MULTIPLIER: 0.1,
  MAX_SPEED_MULTIPLIER: 10.0
});

/**
 * Absolute hard limits enforced regardless of caller configuration.
 * Callers cannot override these ceilings via options to disable resource protection.
 */
export const HARD_LIMITS = Object.freeze({
  MAX_ARRAY_SIZE: 100,
  MAX_EVENTS: 50000,
  MIN_DELAY_MS: 0,
  MAX_DELAY_MS: 10000,
  MIN_SPEED_MULTIPLIER: 0.05,
  MAX_SPEED_MULTIPLIER: 20.0
});

/**
 * Standard 1-based pseudocode reference for Bubble Sort.
 */
export const BUBBLE_SORT_PSEUDOCODE = Object.freeze([
  Object.freeze({ line: 1, text: 'procedure bubbleSort(A)' }),
  Object.freeze({ line: 2, text: '  for i = 0 to n - 2 do' }),
  Object.freeze({ line: 3, text: '    for j = 0 to n - 2 - i do' }),
  Object.freeze({ line: 4, text: '      if A[j] > A[j + 1] then' }),
  Object.freeze({ line: 5, text: '        swap(A[j], A[j + 1])' }),
  Object.freeze({ line: 6, text: '    mark A[n - 1 - i] as sorted' }),
  Object.freeze({ line: 7, text: '  mark A[0] as sorted' }),
  Object.freeze({ line: 8, text: '  return A' })
]);

/**
 * Standard 1-based pseudocode reference for Selection Sort.
 */
export const SELECTION_SORT_PSEUDOCODE = Object.freeze([
  Object.freeze({ line: 1, text: 'procedure selectionSort(A)' }),
  Object.freeze({ line: 2, text: '  for i = 0 to n - 2 do' }),
  Object.freeze({ line: 3, text: '    minIndex = i' }),
  Object.freeze({ line: 4, text: '    for j = i + 1 to n - 1 do' }),
  Object.freeze({ line: 5, text: '      if A[j] < A[minIndex] then' }),
  Object.freeze({ line: 6, text: '        minIndex = j' }),
  Object.freeze({ line: 7, text: '    if minIndex != i then' }),
  Object.freeze({ line: 8, text: '      swap(A[i], A[minIndex])' }),
  Object.freeze({ line: 9, text: '    mark A[i] as sorted' }),
  Object.freeze({ line: 10, text: '  mark A[n - 1] as sorted' }),
  Object.freeze({ line: 11, text: '  return A' })
]);
export const ALGORITHM_PSEUDOCODE = Object.freeze({
  bubbleSort: BUBBLE_SORT_PSEUDOCODE,
  selectionSort: SELECTION_SORT_PSEUDOCODE
});
