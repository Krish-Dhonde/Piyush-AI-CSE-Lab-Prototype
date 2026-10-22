# Engineering Progress & Implementation Report: Simulation Engine Core

## Document Overview
- **Project Name:** Virtual CSE Laboratory — Educational Simulation Engine
- **Document Path:** [Simulation Engine/docs/IMPLEMENTATION_PROGRESS.md](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/docs/IMPLEMENTATION_PROGRESS.md)
- **Current Milestone:** Milestone 2A — Event-to-Code Mapping + Selection Sort
- **Milestone Status:** Completed, Fully Verified, and Contract-Compliant
- **Verification Date:** October 22, 2026
- **Operating Environment:** Windows x64, Node.js v22.14.0, npm v11.11.0

---

## 1. Workspace Boundaries & Scope Verification

1. All implementation code, tests, documentation, and configuration were created exclusively inside [Simulation Engine/](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine).
2. No nested directory named `Simulation Engine` was created.
3. [Backend/](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend) and [Frontend/](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Frontend) were completely untouched.
4. Used pure JavaScript with ES modules (`"type": "module"`).
5. Zero external runtime dependencies: no C++, WebAssembly, React, browser animation frames, MongoDB, or backend network calls.
6. Dev dependencies restricted strictly to `vitest` and `@vitest/coverage-v8`.

---

## 2. Implemented Architecture & Public Contracts

The simulation engine is structured across three decoupled layers:
1. **Core Layer:** Strict defensive input validation, structured `EngineError` domain errors, deep immutability (`deepFreeze`), `validateCodeMapping` contract enforcement, and `ExecutionTrace` with bidirectional state reconstruction and multi-algorithm validation.
2. **Algorithm Layer:** Pure, deterministic algorithmic execution generating discrete educational events (`bubbleSort`, `selectionSort`) with 1-based pseudocode mappings, without timers or side-effects.
3. **Playback Layer:** Reusable, headless playback controller with finite-state machine transitions, scrub/seek, speed scaling, subscriber pub-sub, and clock abstraction (`RealClock` / `VirtualClock`).

### Public API Surface
Exported from [src/index.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/src/index.js):
```javascript
// Algorithms
import { bubbleSort, selectionSort } from 'virtual-cse-lab-simulation-engine';

// Core Models & Validation
import {
  ExecutionTrace,
  validateInputArray,
  validateAlgorithmOptions,
  validateCodeMapping,
  EngineError,
  deepFreeze,
  EventType,
  PlaybackState,
  ErrorCode,
  DEFAULT_CONFIG,
  HARD_LIMITS,
  BUBBLE_SORT_PSEUDOCODE,
  SELECTION_SORT_PSEUDOCODE
} from 'virtual-cse-lab-simulation-engine';

// Playback & Schedulers
import {
  PlaybackController,
  RealClock,
  VirtualClock,
  PlaybackStateMachine
} from 'virtual-cse-lab-simulation-engine';
```

---

## 3. File-by-File Summary

| File Path | Responsibility | Important Logic Implemented | Dependencies | Status |
|---|---|---|---|---|
| [package.json](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/package.json) | Manifest & Scripts | ESM definition, `test`, `test:watch`, `test:coverage` scripts | `vitest`, `@vitest/coverage-v8` | Complete |
| [.gitignore](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/.gitignore) | Git exclusions | Excludes `node_modules/`, `coverage/`, logs, and OS files | None | Complete |
| [vitest.config.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/vitest.config.js) | Test Runner Configuration | Configures Node test environment, globals, v8 coverage provider | vitest | Complete |
| [docs/ENGINE_CONTRACT.md](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/docs/ENGINE_CONTRACT.md) | Contract Specifications | Input contract, event schema, code mapping schema, Selection Sort semantics, resource limits, public API | None | Complete |
| [docs/ARCHITECTURE.md](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/docs/ARCHITECTURE.md) | Architecture Design | Layer decomposition, data flow diagrams, state machine diagram, pseudocode highlighting design | None | Complete |
| [src/core/types.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/src/core/types.js) | Constants & Enums | `EventType` (+ `CANDIDATE_SELECT`, `CANDIDATE_UPDATE`), `ErrorCode` (+ `INVALID_CODE_MAPPING`), `ALGORITHM_PSEUDOCODE` registry, pseudocodes | None | Complete |
| [src/core/errors.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/src/core/errors.js) | Error Hierarchy | `EngineError` with error codes, ISO timestamps, contextual details, and `toJSON()` | None | Complete |
| [src/core/freeze.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/src/core/freeze.js) | Shared Deep Immutability | Reusable `deepFreeze()` helper with WeakSet cycle protection, eliminating circular dependencies | None | Complete |
| [src/core/validator.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/src/core/validator.js) | Defensive Validation | Array validation, options validation, `resolvePseudocodeBoundary()` enforcing registered algorithm bounds and rejecting conflicting maxLines/pseudocode, and `validateCodeMapping()` enforcing 1-based integers and deep immutability (`deepFreeze`) | `types.js`, `errors.js`, `freeze.js` | Complete |
| [src/core/trace.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/src/core/trace.js) | Trace & State Container | `ExecutionTrace`, re-exports `deepFreeze`, code mapping validation with `this.algorithmName`, dual-algorithm (`bubbleSort`/`selectionSort`) independent validation | `types.js`, `errors.js`, `validator.js`, `freeze.js` | Complete |
| [src/algorithms/bubbleSort.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/src/algorithms/bubbleSort.js) | Bubble Sort Core | Pure Bubble Sort emitting structured events with backward-compatible 1-based `codeMapping` and explicit algorithm context | `types.js`, `errors.js`, `validator.js`, `trace.js` | Complete |
| [src/algorithms/selectionSort.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/src/algorithms/selectionSort.js) | Selection Sort Core | Pure Selection Sort with `CANDIDATE_SELECT`, `CANDIDATE_UPDATE`, `COMPARE`, `SWAP`/`NO_SWAP`, and `codeMapping` with explicit algorithm context | `types.js`, `errors.js`, `validator.js`, `trace.js` | Complete |
| [src/algorithms/index.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/src/algorithms/index.js) | Algorithms Barrel | Re-exports `bubbleSort` and `selectionSort` | Algorithms | Complete |
| [src/playback/clock.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/src/playback/clock.js) | Schedulers & Clock | `RealClock` (native timers) and `VirtualClock` (zero-latency, deterministic simulated time) | None | Complete |
| [src/playback/stateMachine.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/src/playback/stateMachine.js) | Finite State Machine | `PlaybackStateMachine` with strict state validation rejecting unknown states on construction and reset | `types.js`, `errors.js` | Complete |
| [src/playback/controller.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/src/playback/controller.js) | Reusable Controller | `PlaybackController` with transactional `loadTrace()`, re-entrancy safety, tick error resilience, and terminal disposal | `types.js`, `errors.js`, `clock.js`, `stateMachine.js` | Complete |
| [src/index.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/src/index.js) | Public Library Index | Re-exports all public models, algorithms, schedulers, controllers, options validators, code mapping validator, pseudocode boundary resolver, pseudocode registries, and hard limits | All modules | Complete |
| [tests/unit/validator.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/tests/unit/validator.test.js) | Validator Unit Tests | Tests array validation, max size, non-finite values, sparse arrays, hard ceilings, hostile options (13 tests) | `vitest`, `validator.js` | Complete |
| [tests/unit/codeMapping.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/tests/unit/codeMapping.test.js) | Code Mapping Tests | Tests schema validation, 1-based lines, non-positive rejection, deep immutability (nested objects, entries arrays, circular refs), line 999 boundary bypass rejection, algorithm boundaries for Bubble & Selection Sort, conflicting maxLines, custom pseudocode boundaries (52 tests) | `vitest`, `validator.js` | Complete |
| [tests/unit/trace.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/tests/unit/trace.test.js) | Trace Unit Tests | Tests independent snapshot reconstruction, deep immutability, index checks, strict payload validation, code mapping line 999 tampering (40 tests) | `vitest`, `trace.js` | Complete |
| [tests/unit/bubbleSort.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/tests/unit/bubbleSort.test.js) | Bubble Sort Unit Tests | Tests empty, single-element, sorted, reverse, duplicates, negatives, event ordering, hard ceilings (11 tests) | `vitest`, `bubbleSort.js` | Complete |
| [tests/unit/selectionSort.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/tests/unit/selectionSort.test.js) | Selection Sort Unit Tests | Tests base cases, sorted, reverse, duplicates, repeated minimums, candidate updates, ceilings, caller immutability (13 tests) | `vitest`, `selectionSort.js` | Complete |
| [tests/unit/index.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/tests/unit/index.test.js) | Public API Unit Tests | Tests all exports from engine entry point `src/index.js` including `ALGORITHM_PSEUDOCODE` and `resolvePseudocodeBoundary` (5 tests) | `vitest`, `index.js` | Complete |
| [tests/unit/clock.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/tests/unit/clock.test.js) | Scheduler Unit Tests | Tests `VirtualClock` and `RealClock` argument validation, chronological execution, cancellation, and disposal (14 tests) | `vitest`, `clock.js` | Complete |
| [tests/unit/stateMachine.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/tests/unit/stateMachine.test.js) | State Machine Tests | Tests valid transitions, illegal transitions, transition history, unknown state rejection on init/reset (6 tests) | `vitest`, `stateMachine.js` | Complete |
| [tests/integration/playbackController.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/tests/integration/playbackController.test.js) | Controller Integration | Tests play, pause, stepping, seek, transactional loadTrace trust boundary, speed/delay limits, disposal (33 tests) | `vitest`, `controller.js` | Complete |
| [tests/integration/selectionSortIntegration.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/tests/integration/selectionSortIntegration.test.js) | Selection Sort Integration | Tests 20 seeded pseudo-random arrays vs native sort, bidirectional playback, seek, line 999 tampering, boundary lines (14 tests) | `vitest`, `selectionSort.js` | Complete |
| [tests/integration/determinismAndInvariants.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine/tests/integration/determinismAndInvariants.test.js) | Mathematical Invariants | Verifies determinism, permutation equality, sorting, bidirectional symmetry, 20 seeded pseudo-random arrays (5 tests) | `vitest`, `bubbleSort.js` | Complete |



---

## 4. Bubble Sort Event Schema & Execution Walkthrough

### 4.1 Event Schema Structure
Each event emitted conforms to:
```typescript
interface SimulationEvent {
  id: number;                          // 0-indexed sequential ID (0, 1, 2...)
  step: number;                        // 1-indexed step number
  type: EventType;                     // Event classification
  description: string;                 // Educational narrative
  payload: Record<string, unknown>;    // Event data
  arraySnapshot: readonly number[];    // Exact array state after event
  activeIndices: readonly number[];    // Currently compared/swapped indices
  lockedIndices: readonly number[];    // Indices confirmed sorted
  metrics: {                           // Cumulative metrics
    comparisons: number;
    swaps: number;
    passes: number;
  };
}
```

### 4.2 Example Walkthrough for Input `[3, 1, 2]`

1. **Step 1 — `ALGORITHM_START`:**
   - `description`: *"Bubble Sort simulation started with 3 elements."*
   - `arraySnapshot`: `[3, 1, 2]`
   - `activeIndices`: `[]`, `lockedIndices`: `[]`
   - `metrics`: `{ comparisons: 0, swaps: 0, passes: 0 }`

2. **Step 2 — `PASS_START`:**
   - `description`: *"Pass 1 initiated. Comparing adjacent elements from index 0 to 2."*
   - `payload`: `{ pass: 0, unsortedBound: 2 }`
   - `arraySnapshot`: `[3, 1, 2]`

3. **Step 3 — `COMPARE`:**
   - `description`: *"Comparing index 0 (3) and index 1 (1). 3 > 1, so a swap is required."*
   - `payload`: `{ indices: [0, 1], values: [3, 1], shouldSwap: true }`
   - `activeIndices`: `[0, 1]`
   - `metrics`: `{ comparisons: 1, swaps: 0, passes: 1 }`

4. **Step 4 — `SWAP`:**
   - `description`: *"Swapped index 0 (3) with index 1 (1)."*
   - `payload`: `{ indices: [0, 1], valuesBefore: [3, 1], valuesAfter: [1, 3] }`
   - `arraySnapshot`: `[1, 3, 2]`
   - `activeIndices`: `[0, 1]`
   - `metrics`: `{ comparisons: 1, swaps: 1, passes: 1 }`

5. **Step 5 — `COMPARE`:**
   - `description`: *"Comparing index 1 (3) and index 2 (2). 3 > 2, so a swap is required."*
   - `payload`: `{ indices: [1, 2], values: [3, 2], shouldSwap: true }`
   - `activeIndices`: `[1, 2]`
   - `metrics`: `{ comparisons: 2, swaps: 1, passes: 1 }`

6. **Step 6 — `SWAP`:**
   - `description`: *"Swapped index 1 (3) with index 2 (2)."*
   - `payload`: `{ indices: [1, 2], valuesBefore: [3, 2], valuesAfter: [2, 3] }`
   - `arraySnapshot`: `[1, 2, 3]`
   - `activeIndices`: `[1, 2]`
   - `metrics`: `{ comparisons: 2, swaps: 2, passes: 1 }`

7. **Step 7 — `PASS_COMPLETE`:**
   - `description`: *"Pass 1 completed. Element at index 2 (3) is locked in place. 2 swaps performed in this pass."*
   - `payload`: `{ pass: 0, lockedIndex: 2, swapsInPass: 2 }`
   - `lockedIndices`: `[2]`

8. **Step 8 — `PASS_START`:**
   - `description`: *"Pass 2 initiated. Comparing adjacent elements from index 0 to 1."*
   - `payload`: `{ pass: 1, unsortedBound: 1 }`

9. **Step 9 — `COMPARE`:**
   - `description`: *"Comparing index 0 (1) and index 1 (2). 1 <= 2, order is correct."*
   - `payload`: `{ indices: [0, 1], values: [1, 2], shouldSwap: false }`
   - `metrics`: `{ comparisons: 3, swaps: 2, passes: 2 }`

10. **Step 10 — `NO_SWAP`:**
    - `description`: *"No swap needed for index 0 (1) and index 1 (2)."*
    - `arraySnapshot`: `[1, 2, 3]`

11. **Step 11 — `PASS_COMPLETE`:**
    - `description`: *"Pass 2 completed. Element at index 1 (2) is locked in place. 0 swaps performed in this pass."*
    - `lockedIndices`: `[1, 2]`

12. **Step 12 — `ALGORITHM_COMPLETE`:**
    - `description`: *"Sorting completed early in pass 2 because no swaps were required. Array is fully sorted."*
    - `payload`: `{ sortedArray: [1, 2, 3], totalComparisons: 3, totalSwaps: 2, totalPasses: 2, earlyExit: true }`
    - `lockedIndices`: `[0, 1, 2]`

---

## 5. Playback State Machine & Supported Commands

### State Transition Summary
- `loadTrace(trace)`: Transactional validation before updating internal state; transitions `IDLE` / `ERROR` $\to$ `READY`. Corrupted traces are rejected at the boundary with structured `EngineError` before updating controller state. If a valid trace was already loaded, it remains intact, and no scheduled timers, subscriber notifications, or index changes occur.
- `play()`: Transitions `READY` / `PAUSED` $\to$ `RUNNING`. Auto-advances using clock timer with safe restart if called at completion.
- `pause()`: Transitions `RUNNING` $\to$ `PAUSED`. Halts timer immediately; guarantees zero timer callback execution or step advancement while paused.
- `stepForward()`: Advances 1 event. Reaching final event transitions to `COMPLETED`.
- `stepBackward()`: Decrements 1 event. Stepping back from `COMPLETED` transitions to `PAUSED`. Stepping back to index `-1` transitions to `READY`.
- `seek(index)`: Direct random access jump to finite integer index `[-1, trace.length - 1]`.
- `reset()`: Resets index to `-1` and transitions to `READY`. Cancels any active timer and guarantees no subsequent advancement occurs.
- `setSpeed(multiplier)`: Scales playback rate within `[0.05, 20.0]` without altering algorithm logic.
- `setDelay(delayMs)`: Configures step interval in milliseconds within `[0, 10000]`.
- `subscribe(listener)`: Pub-sub subscription notifying on all position and state changes; re-entrancy safe.
- `dispose()`: Terminates timers, unregisters all subscribers, marks controller permanently disposed (`isDisposed = true`), transitions to `IDLE`, and disables all further commands.

### Uninitialized vs Disposed Controller Semantics
- **Uninitialized Controller (`state === PlaybackState.IDLE`, `trace === null`, `isDisposed === false`):**
  A freshly instantiated controller awaiting a trace. It cannot advance or step (`INVALID_STATE`), but it is fully operational and transitions to `READY` as soon as `loadTrace(validTrace)` is called.
- **Disposed Controller (`isDisposed === true`):**
  A controller that has completed its lifecycle via `dispose()`. Its internal state is set to `IDLE`, but unlike an uninitialized controller, it is permanently terminal: all scheduled timers and listeners are severed, and any subsequent command (including `loadTrace()`, `play()`, `stepForward()`, `reset()`) is rejected synchronously with `INVALID_CONTROLLER_STATE` ("Cannot execute '...': PlaybackController has been disposed.").

### Transactional Trust-Boundary Guarantees
- Corrupted traces passed to `loadTrace()` fail validation synchronously inside `ExecutionTrace.validate()`.
- The controller never adopts corrupted traces into internal state.
- When `loadTrace()` rejects a corrupted trace:
  1. The existing loaded valid trace is retained.
  2. The current playback index is unchanged.
  3. The current playback state is unchanged.
  4. Any active playback timers continue uncorrupted.
  5. Subscribers receive zero corrupt or erroneous notifications.

---

## 6. Actual Test Results & Verification Evidence

All 206 tests execute and pass via Vitest across 11 test suites:

```text
$ npm test

 RUN  v5.0.5 C:/Users/vansh/OneDrive/Desktop/Piyush AI/Labs/Simulation Engine

 ✓ tests/unit/stateMachine.test.js (6 tests)
 ✓ tests/unit/validator.test.js (13 tests)
 ✓ tests/unit/bubbleSort.test.js (11 tests)
 ✓ tests/unit/index.test.js (5 tests)
 ✓ tests/unit/selectionSort.test.js (13 tests)
 ✓ tests/unit/codeMapping.test.js (52 tests)
 ✓ tests/unit/clock.test.js (14 tests)
 ✓ tests/unit/trace.test.js (40 tests)
 ✓ tests/integration/playbackController.test.js (33 tests)
 ✓ tests/integration/selectionSortIntegration.test.js (14 tests)
 ✓ tests/integration/determinismAndInvariants.test.js (5 tests)

 Test Files  11 passed (11)
      Tests  206 passed (206)
   Duration  1.65s
```

### Coverage Report
```text
$ npm run test:coverage

 % Coverage report from v8
-------------------|---------|----------|---------|---------|--------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s  
-------------------|---------|----------|---------|---------|--------------------
All files          |   87.45 |    84.11 |   95.94 |   87.25 |                    
 src/algorithms    |     100 |    96.29 |     100 |     100 |                    
  bubbleSort.js    |     100 |    96.29 |     100 |     100 | 59                 
  selectionSort.js |     100 |    96.29 |     100 |     100 | 61                 
 src/core          |   83.00 |    81.86 |     100 |   82.70 |                    
  errors.js        |     100 |    66.66 |     100 |     100 | 17                 
  freeze.js        |     100 |    94.11 |     100 |     100 | 30                 
  trace.js         |   78.39 |    76.18 |     100 |   77.98 | ...1428,1436       
  types.js         |     100 |      100 |     100 |     100 |                    
  validator.js     |     100 |    98.64 |     100 |     100 | 21,344             
 src/playback      |   91.69 |    88.23 |   94.11 |   91.69 |                    
  clock.js         |   98.21 |    91.17 |   93.75 |   98.21 | 145                
  controller.js    |   89.20 |    87.85 |   92.85 |   89.20 | ...530,539-542,564 
  stateMachine.js  |     100 |    84.61 |     100 |     100 | 119-124            
-------------------|---------|----------|---------|---------|--------------------
```

> [!NOTE]
> `src/index.js` acts solely as a public barrel module for export re-exports; all exported types, validation helpers, algorithms, and controllers are verified directly across the test suite (206 tests passing).

### Security Audit
```text
$ npm audit
found 0 vulnerabilities
```

---

## 7. Resource Limits & Boundary Safeguards

1. **Hard Ceiling on Input Size:** `HARD_LIMITS.MAX_ARRAY_SIZE = 100` elements. Callers cannot increase this via options. Inputs exceeding this are synchronously rejected with `INPUT_SIZE_EXCEEDED`.
2. **Hard Ceiling on Event Count:** `HARD_LIMITS.MAX_EVENTS = 50,000` events. Callers cannot disable this. Breaches halt execution with `EVENT_LIMIT_EXCEEDED` without truncation.
3. **Speed & Delay Bounds:** Speed multipliers are strictly clamped and validated within `[0.05, 20.0]`; delay intervals within `[0, 10000]` ms.
4. **Memory Scaling Analysis:** For $N = 100$, worst-case Selection Sort generates $O(N^2)$ comparison and candidate events, comfortably within $\sim 8\text{ MB}$ raw snapshot array allocations.
5. **Code Mapping Contract Immutability & Boundary Enforcement:** Event-to-code mapping metadata is validated upon creation, deep frozen recursively (including nested `variables` objects and arrays) via `deepFreeze()`, and strictly bounded by registered algorithm pseudocode limits (1–8 for Bubble Sort, 1–11 for Selection Sort). Conflicting `maxLines` or pseudocode arrays are synchronously rejected, preventing boundary bypasses, while legitimate generic custom-pseudocode use cases remain supported.

---

## 8. Exact Commands to Reproduce Checks

From the project root:

```bash
# 1. Navigate to Simulation Engine directory
cd "Simulation Engine"

# 2. Install dependencies from committed lockfile
npm ci

# 3. Run automated tests (206 tests)
npm test

# 4. Run test coverage
npm run test:coverage

# 5. Check dependencies for vulnerabilities
npm audit
```

---

## 9. Items Deliberately Deferred (Scope Discipline)

The following components were intentionally excluded from Milestone 2A to preserve simplicity and contract focus:
- Additional sorting algorithms (Insertion Sort, Merge Sort, Quick Sort, Binary Search).
- DOM manipulation, SVG rendering, Canvas animations, CSS stylesheets, or React components.
- WebAssembly (Wasm) bindings or C++ compilation toolchains.
- Web Workers or multi-threaded background workers.
- Backend API endpoints or database storage.

---

---

## 10. Milestone 3 — Frontend Integration Readiness

### 10.1 Engine Export Configuration
To support standard Node/Vite ESM package resolution when consumed as a dependency by `Frontend/`, `Simulation Engine/package.json` was augmented with standard package exports:
```json
{
  "exports": {
    ".": "./src/index.js"
  }
}
```

### 10.2 Integration Verification Summary
- **Public API Surface**: 21 named exports from `src/index.js`, including trace generators (`bubbleSort`, `selectionSort`), controller (`PlaybackController`), clocks (`RealClock`, `VirtualClock`), enums (`EventType`, `PlaybackState`, `ErrorCode`), limits (`HARD_LIMITS`, `DEFAULT_CONFIG`), pseudocode references (`BUBBLE_SORT_PSEUDOCODE`, `SELECTION_SORT_PSEUDOCODE`), and errors (`EngineError`).
- **Framework Independence**: The Engine remains 100% headless and framework-independent with zero DOM, CSS, or React dependencies.
- **Frontend Consumption**: The Frontend prototype links via `"virtual-cse-lab-simulation-engine": "file:../Simulation Engine"` and consumes only public exports.
- **Test Validation**:
  - `Simulation Engine/`: 206 / 206 tests passing across 11 test suites.
  - `Frontend/`: 15 / 15 end-to-end integration tests passing across all required workflows.


