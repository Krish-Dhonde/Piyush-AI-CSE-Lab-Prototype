import { describe, it, expect } from 'vitest';
import { PlaybackStateMachine } from '../../src/playback/stateMachine.js';
import { PlaybackState, ErrorCode } from '../../src/core/types.js';
import { EngineError } from '../../src/core/errors.js';

describe('PlaybackStateMachine (Unit)', () => {
  it('should initialize in IDLE state by default', () => {
    const fsm = new PlaybackStateMachine();
    expect(fsm.state).toBe(PlaybackState.IDLE);
    expect(fsm.history).toEqual([PlaybackState.IDLE]);
  });

  it('should permit valid forward transitions', () => {
    const fsm = new PlaybackStateMachine(PlaybackState.IDLE);

    expect(fsm.canTransitionTo(PlaybackState.READY)).toBe(true);
    fsm.transition(PlaybackState.READY);
    expect(fsm.state).toBe(PlaybackState.READY);

    fsm.transition(PlaybackState.RUNNING);
    expect(fsm.state).toBe(PlaybackState.RUNNING);

    fsm.transition(PlaybackState.PAUSED);
    expect(fsm.state).toBe(PlaybackState.PAUSED);

    fsm.transition(PlaybackState.RUNNING);
    expect(fsm.state).toBe(PlaybackState.RUNNING);

    fsm.transition(PlaybackState.COMPLETED);
    expect(fsm.state).toBe(PlaybackState.COMPLETED);

    fsm.transition(PlaybackState.READY);
    expect(fsm.state).toBe(PlaybackState.READY);
  });

  it('should reject invalid transitions and throw INVALID_CONTROLLER_STATE', () => {
    const fsm = new PlaybackStateMachine(PlaybackState.IDLE);

    expect(fsm.canTransitionTo(PlaybackState.RUNNING)).toBe(false);
    expect(() => fsm.transition(PlaybackState.RUNNING)).toThrowError(EngineError);

    try {
      fsm.transition(PlaybackState.RUNNING);
    } catch (err) {
      expect(err.code).toBe(ErrorCode.INVALID_CONTROLLER_STATE);
      expect(err.message).toContain("Cannot transition playback controller from 'IDLE' to 'RUNNING'");
      expect(err.details.currentState).toBe(PlaybackState.IDLE);
      expect(err.details.targetState).toBe(PlaybackState.RUNNING);
    }
  });

  it('should record complete transition history', () => {
    const fsm = new PlaybackStateMachine();
    fsm.transition(PlaybackState.READY);
    fsm.transition(PlaybackState.RUNNING);
    fsm.transition(PlaybackState.PAUSED);

    expect(fsm.history).toEqual([
      PlaybackState.IDLE,
      PlaybackState.READY,
      PlaybackState.RUNNING,
      PlaybackState.PAUSED
    ]);
  });

  it('should reset state and history cleanly', () => {
    const fsm = new PlaybackStateMachine();
    fsm.transition(PlaybackState.READY);
    fsm.transition(PlaybackState.RUNNING);

    fsm.reset(PlaybackState.IDLE);
    expect(fsm.state).toBe(PlaybackState.IDLE);
    expect(fsm.history).toEqual([PlaybackState.IDLE]);
  });

  it('should reject unknown states in constructor and reset', () => {
    expect(() => new PlaybackStateMachine('UNKNOWN_STATE')).toThrowError(EngineError);
    try {
      new PlaybackStateMachine('UNKNOWN_STATE');
    } catch (err) {
      expect(err.code).toBe(ErrorCode.INVALID_CONTROLLER_STATE);
    }

    const fsm = new PlaybackStateMachine();
    expect(() => fsm.reset('BOGUS_STATE')).toThrowError(EngineError);
    try {
      fsm.reset('BOGUS_STATE');
    } catch (err) {
      expect(err.code).toBe(ErrorCode.INVALID_CONTROLLER_STATE);
    }
  });
});

