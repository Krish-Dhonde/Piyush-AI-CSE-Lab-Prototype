/**
 * Virtual CSE Lab — Simulation Engine Core Public API
 */

// Core types, errors, and validation
export {
  EventType,
  PlaybackState,
  ErrorCode,
  DEFAULT_CONFIG,
  HARD_LIMITS,
  BUBBLE_SORT_PSEUDOCODE,
  SELECTION_SORT_PSEUDOCODE,
  ALGORITHM_PSEUDOCODE
} from './core/types.js';

export { EngineError } from './core/errors.js';
export { validateInputArray, validateAlgorithmOptions, validateCodeMapping, resolvePseudocodeBoundary } from './core/validator.js';
export { ExecutionTrace, deepFreeze } from './core/trace.js';

// Algorithms
export { bubbleSort } from './algorithms/bubbleSort.js';
export { selectionSort } from './algorithms/selectionSort.js';

// Playback and schedulers
export { RealClock, VirtualClock } from './playback/clock.js';
export { PlaybackStateMachine } from './playback/stateMachine.js';
export { PlaybackController } from './playback/controller.js';

