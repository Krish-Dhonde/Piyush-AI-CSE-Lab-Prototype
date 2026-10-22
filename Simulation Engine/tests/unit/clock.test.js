import { describe, it, expect, vi } from 'vitest';
import { VirtualClock, RealClock } from '../../src/playback/clock.js';

describe('Clock Schedulers (Unit)', () => {
  describe('VirtualClock', () => {
    it('should schedule, tick, and execute timers in precise chronological order', () => {
      const clock = new VirtualClock();
      const executionLog = [];

      clock.setTimeout(() => executionLog.push('B (30ms)'), 30);
      clock.setTimeout(() => executionLog.push('A (10ms)'), 10);
      clock.setTimeout(() => executionLog.push('C (50ms)'), 50);

      expect(clock.pendingCount()).toBe(3);
      expect(clock.hasPending()).toBe(true);

      // Advance by 20ms -> only A should execute
      const count1 = clock.tick(20);
      expect(count1).toBe(1);
      expect(executionLog).toEqual(['A (10ms)']);
      expect(clock.now()).toBe(20);

      // Advance by 15ms -> B should execute
      const count2 = clock.tick(15);
      expect(count2).toBe(1);
      expect(executionLog).toEqual(['A (10ms)', 'B (30ms)']);
      expect(clock.now()).toBe(35);

      // Advance by 50ms -> C should execute
      const count3 = clock.tick(50);
      expect(count3).toBe(1);
      expect(executionLog).toEqual(['A (10ms)', 'B (30ms)', 'C (50ms)']);
      expect(clock.hasPending()).toBe(false);
    });

    it('should cancel timers via clearTimeout', () => {
      const clock = new VirtualClock();
      let executed = false;

      const timerId = clock.setTimeout(() => {
        executed = true;
      }, 50);

      clock.clearTimeout(timerId);
      clock.tick(100);

      expect(executed).toBe(false);
      expect(clock.hasPending()).toBe(false);
    });

    it('should execute all scheduled timers via runAll', () => {
      const clock = new VirtualClock();
      let runCount = 0;

      clock.setTimeout(() => runCount++, 10);
      clock.setTimeout(() => runCount++, 20);
      clock.setTimeout(() => runCount++, 30);

      const totalExecuted = clock.runAll();
      expect(totalExecuted).toBe(3);
      expect(runCount).toBe(3);
      expect(clock.now()).toBe(30);
    });

    it('should reject negative time tick with RangeError', () => {
      const clock = new VirtualClock();
      expect(() => clock.tick(-10)).toThrow(/Cannot advance virtual clock backward/);
      expect(() => clock.tick(-1)).toThrowError(RangeError);
    });

    it('should reject non-integer, NaN, Infinity, and non-number tick arguments with TypeError', () => {
      const clock = new VirtualClock();
      const invalidTickArgs = [1.5, 0.1, NaN, Infinity, -Infinity, '10', null, undefined, {}];

      for (const bad of invalidTickArgs) {
        expect(() => clock.tick(bad)).toThrowError(TypeError);
      }
    });

    it('should allow tick(0) to execute zero-delay timers without advancing time', () => {
      const clock = new VirtualClock();
      let executed = false;
      clock.setTimeout(() => {
        executed = true;
      }, 0);

      expect(clock.now()).toBe(0);
      const count = clock.tick(0);
      expect(count).toBe(1);
      expect(executed).toBe(true);
      expect(clock.now()).toBe(0);
    });

    it('should reject invalid maxSteps in runAll', () => {
      const clock = new VirtualClock();
      expect(() => clock.runAll(0)).toThrowError(RangeError);
      expect(() => clock.runAll(-10)).toThrowError(RangeError);
      expect(() => clock.runAll(2.5)).toThrowError(TypeError);
      expect(() => clock.runAll(NaN)).toThrowError(TypeError);
      expect(() => clock.runAll(Infinity)).toThrowError(TypeError);
      expect(() => clock.runAll('100')).toThrowError(TypeError);
    });

    it('should reject non-function callback in VirtualClock.setTimeout', () => {
      const clock = new VirtualClock();
      const badCallbacks = [null, undefined, 123, 'callback', {}, [], Symbol()];

      for (const bad of badCallbacks) {
        expect(() => clock.setTimeout(bad, 100)).toThrowError(TypeError);
      }
    });

    it('should reject negative, non-finite, fractional, and non-number delayMs in VirtualClock.setTimeout', () => {
      const clock = new VirtualClock();
      const badDelays = [-1, -100, NaN, Infinity, -Infinity, 1.5, 0.5, '100', null, undefined, {}];

      for (const bad of badDelays) {
        expect(() => clock.setTimeout(() => {}, bad)).toThrowError(TypeError);
      }
      expect(clock.hasPending()).toBe(false); // No timers scheduled silently
    });

    it('should reset clock state and pending timers', () => {
      const clock = new VirtualClock();
      clock.setTimeout(() => {}, 100);
      clock.tick(50);

      clock.reset();
      expect(clock.now()).toBe(0);
      expect(clock.hasPending()).toBe(false);
    });
  });

  describe('RealClock', () => {
    it('should return current real timestamp', () => {
      const realClock = new RealClock();
      const now = realClock.now();
      expect(typeof now).toBe('number');
      expect(now).toBeGreaterThan(0);
    });

    it('should reject non-function callbacks in RealClock.setTimeout', () => {
      const realClock = new RealClock();
      const badCallbacks = [null, undefined, 123, 'func', {}];

      for (const bad of badCallbacks) {
        expect(() => realClock.setTimeout(bad, 100)).toThrowError(TypeError);
      }
    });

    it('should reject negative, non-finite, and fractional delays in RealClock.setTimeout', () => {
      const realClock = new RealClock();
      const badDelays = [-1, -50, NaN, Infinity, -Infinity, 1.5, '200', null, undefined];

      for (const bad of badDelays) {
        expect(() => realClock.setTimeout(() => {}, bad)).toThrowError(TypeError);
      }
    });

    it('should schedule and clear native timers', async () => {
      const realClock = new RealClock();
      let executed = false;

      const handle = realClock.setTimeout(() => {
        executed = true;
      }, 10);

      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(executed).toBe(true);

      let clearedExecuted = false;
      const cancelHandle = realClock.setTimeout(() => {
        clearedExecuted = true;
      }, 50);
      realClock.clearTimeout(cancelHandle);

      await new Promise((resolve) => setTimeout(resolve, 80));
      expect(clearedExecuted).toBe(false);
    });
  });
});
