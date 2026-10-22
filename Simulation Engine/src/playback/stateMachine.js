import { PlaybackState, ErrorCode } from '../core/types.js';
import { EngineError } from '../core/errors.js';

/**
 * Valid state transition graph for playback controller.
 */
const VALID_TRANSITIONS = Object.freeze({
  [PlaybackState.IDLE]: Object.freeze([
    PlaybackState.READY,
    PlaybackState.ERROR
  ]),
  [PlaybackState.READY]: Object.freeze([
    PlaybackState.RUNNING,
    PlaybackState.PAUSED,
    PlaybackState.COMPLETED,
    PlaybackState.READY,
    PlaybackState.IDLE,
    PlaybackState.ERROR
  ]),
  [PlaybackState.RUNNING]: Object.freeze([
    PlaybackState.PAUSED,
    PlaybackState.COMPLETED,
    PlaybackState.READY,
    PlaybackState.IDLE,
    PlaybackState.ERROR
  ]),
  [PlaybackState.PAUSED]: Object.freeze([
    PlaybackState.RUNNING,
    PlaybackState.READY,
    PlaybackState.COMPLETED,
    PlaybackState.PAUSED,
    PlaybackState.IDLE,
    PlaybackState.ERROR
  ]),
  [PlaybackState.COMPLETED]: Object.freeze([
    PlaybackState.READY,
    PlaybackState.PAUSED,
    PlaybackState.IDLE,
    PlaybackState.ERROR
  ]),
  [PlaybackState.ERROR]: Object.freeze([
    PlaybackState.IDLE,
    PlaybackState.READY
  ])
});

/**
 * Asserts that a state is one of the valid PlaybackState enum values.
 *
 * @param {string} state
 * @param {string} context
 * @throws {EngineError}
 */
function assertValidState(state, context) {
  const validStates = Object.values(PlaybackState);
  if (!validStates.includes(state)) {
    throw new EngineError(
      ErrorCode.INVALID_CONTROLLER_STATE,
      `Invalid playback state '${state}' in ${context}. Valid states are: ${validStates.join(', ')}`,
      { state, validStates, context }
    );
  }
}

/**
 * Deterministic finite state machine managing playback lifecycle states.
 */
export class PlaybackStateMachine {
  /**
   * @param {string} [initialState=PlaybackState.IDLE]
   */
  constructor(initialState = PlaybackState.IDLE) {
    assertValidState(initialState, 'constructor');
    this._state = initialState;
    this._history = [initialState];
  }

  /**
   * Current active playback state.
   * @returns {string}
   */
  get state() {
    return this._state;
  }

  /**
   * History of states traversed.
   * @returns {readonly string[]}
   */
  get history() {
    return Object.freeze([...this._history]);
  }

  /**
   * Checks whether a transition to targetState is permitted from current state.
   *
   * @param {string} targetState
   * @returns {boolean}
   */
  canTransitionTo(targetState) {
    const allowed = VALID_TRANSITIONS[this._state];
    return Array.isArray(allowed) && allowed.includes(targetState);
  }

  /**
   * Attempts transition to targetState. Throws EngineError if transition is illegal.
   *
   * @param {string} targetState - One of PlaybackState values
   * @param {string} [reason=''] - Contextual reason for transition
   * @returns {string} The new state
   * @throws {EngineError} If transition is invalid
   */
  transition(targetState, reason = '') {
    assertValidState(targetState, 'transition');

    if (!this.canTransitionTo(targetState)) {
      throw new EngineError(
        ErrorCode.INVALID_CONTROLLER_STATE,
        `Cannot transition playback controller from '${this._state}' to '${targetState}'.${reason ? ` Reason: ${reason}` : ''}`,
        {
          currentState: this._state,
          targetState,
          reason,
          allowedTransitions: VALID_TRANSITIONS[this._state] || []
        }
      );
    }

    this._state = targetState;
    this._history.push(targetState);
    return this._state;
  }

  /**
   * Resets state machine to target state.
   *
   * @param {string} [state=PlaybackState.IDLE]
   */
  reset(state = PlaybackState.IDLE) {
    assertValidState(state, 'reset');
    this._state = state;
    this._history = [state];
  }
}

