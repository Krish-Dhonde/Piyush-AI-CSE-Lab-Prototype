# Virtual CSE Lab — Frontend Prototype (Milestone 3)

Interactive algorithm visualizer and simulation frontend for **Virtual CSE Lab**, an educational platform designed to help computer science students understand algorithms through step-by-step interactive visual simulations.

This prototype connects directly to the standalone **Simulation Engine** ES module package to simulate **Bubble Sort** and **Selection Sort**.

---

## 1. Architecture & Separation of Responsibilities

```
Labs/
├── Backend/                 [Untouched — future backend services]
├── Simulation Engine/       [Standalone ES module package: pure simulation, traces, FSM controller]
└── Frontend/                [React 19 + Vite: educational UI, visualizer, pseudocode, controls]
```

### Clean Architectural Boundaries
- **Simulation Engine (`Simulation Engine/`)**: Framework-independent ES module package. Owns algorithm computation, validation, immutable trace generation, intermediate state snapshots, code-line mappings, and deterministic playback FSM controller.
- **Frontend Prototype (`Frontend/`)**: Consumes the engine strictly via its public API (`virtual-cse-lab-simulation-engine`). Contains **zero duplicated sorting logic**, zero algorithmic animation math, and zero internal private imports.
- **Backend (`Backend/`)**: Unmodified.

---

## 2. Engine-to-Frontend Integration Contract

The Frontend links to the Simulation Engine as a clean local ESM package dependency defined in `Frontend/package.json`:

```json
{
  "dependencies": {
    "virtual-cse-lab-simulation-engine": "file:../Simulation Engine",
    "react": "^19.3.1",
    "react-dom": "^19.3.1",
    "lucide-react": "^1.16.0"
  }
}
```

### Public API Consumption

| Capability | Engine Public Export Used |
| :--- | :--- |
| **Trace Generation** | `bubbleSort(array, options)`, `selectionSort(array, options)` |
| **Playback Control** | `PlaybackController(trace, options)` (`play()`, `pause()`, `stepForward()`, `stepBackward()`, `seek()`, `reset()`, `setSpeed()`, `dispose()`, `subscribe()`) |
| **State & Enums** | `PlaybackState`, `EventType`, `ErrorCode`, `HARD_LIMITS` |
| **Pseudocode Reference** | `BUBBLE_SORT_PSEUDOCODE`, `SELECTION_SORT_PSEUDOCODE` |
| **Error Handling** | `EngineError` |

### Playback Lifecycle Contract
1. **Controller Lifecycle**: A `PlaybackController` instance is created per active simulation trace.
2. **Subscription**: Frontend subscribes via `controller.subscribe(state => setPlaybackState(state))`.
3. **Disposal**: When switching algorithms or loading new inputs, the previous controller is explicitly destroyed via `controller.dispose()`. This halts all internal scheduling timers, clears listeners, and prevents memory leaks or stale asynchronous updates.

---

## 3. Implemented Features

### A. Lab Header
- Virtual CSE Lab branding with Milestone 3 Prototype badge.
- Live algorithm indicator and engine state chip (`READY`, `SIMULATING`, `PAUSED`, `COMPLETED`, `IDLE`).

### B. Algorithm Selector
- Bubble Sort and Selection Sort cards with time complexity ($O(N^2)$ worst/avg, $O(N)$ best for Bubble) and space complexity ($O(1)$).
- Seamless switching with automatic disposal of previous playback instances.

### C. Input Panel
- Supports comma- and space-separated integers.
- Quick educational presets:
  - *Standard Unsorted* (`[29, 10, 14, 37, 13]`)
  - *Reverse Sorted* (`[50, 40, 30, 20, 10]`)
  - *Already Sorted* (`[5, 12, 18, 27, 33]`)
  - *With Duplicates* (`[8, 3, 8, 1, 3]`)
  - *Negative Values* (`[-4, 7, 0, -9, 2]`)
  - *Single Element* (`[42]`)
  - *Empty Array* (`[]`)
- Inline validation with student-friendly error messages matching `HARD_LIMITS.MAX_ARRAY_SIZE` (100 elements).

### D. Visualization Panel
- Dual display modes: **Bar Chart View** and **Value Cell Grid View** (or both simultaneously).
- Dynamic vertical bars with normalized zero-baseline supporting negative numbers and zeros.
- High-contrast numeric badges on all bars and cells so color is never the only data indicator.
- Semantic visual states derived strictly from Engine event payloads:
  - **Comparing**: Amber (`#f59e0b`)
  - **Swapping**: Rose (`#f43f5e`)
  - **Minimum Candidate**: Violet (`#8b5cf6`)
  - **Locked / Sorted**: Emerald (`#10b981`)
  - **Unsorted**: Slate (`#94a3b8`)
- Visual legend displaying active color mappings.

### E. Pseudocode Panel
- Displays standard 1-based pseudocode from `BUBBLE_SORT_PSEUDOCODE` or `SELECTION_SORT_PSEUDOCODE`.
- Synchronized line highlighting using `currentEvent.codeMapping.line`.
- Arrow indicator and inline logic explanation banner for the active line.
- Gracefully handles unmapped states or initial pre-execution state (-1) without highlighting arbitrary lines.

### F. Step Explanation & Diagnostics Panel
- Student-friendly event description from `currentEvent.description`.
- Detailed logic explanation from `currentEvent.codeMapping.explanation`.
- Active trace variables inspector chips (e.g., `pass`, `i`, `j`, `minIndex`, `isOutOfOrder`).
- Cumulative metrics counters: Comparisons, Swaps, Passes.

### G. Playback Controls & Timeline
- Controls: Play, Pause, Next Step, Previous Step, Reset.
- Interactive timeline scrubber slider (scrubs from initial `-1` to `totalEvents - 1`).
- Playback speed selector: `0.5x`, `1.0x`, `2.0x`, `4.0x`.
- Progress indicator: `Step X / Total (Y%)`.
- Keyboard shortcuts:
  - `Space`: Toggle Play / Pause
  - `ArrowRight`: Step forward
  - `ArrowLeft`: Step backward
  - `R`: Reset to beginning

---

## 4. Setup, Run & Build Instructions

### Prerequisites
- Node.js 18+ (tested on Node v22.14.0)
- npm 9+

### 1. Install Dependencies
```bash
# From workspace root:
cd "Simulation Engine"
npm install

cd ../Frontend
npm install
```

### 2. Run the Development Server
```bash
cd Frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Build for Production
```bash
cd Frontend
npm run build
```
Generates production build in `Frontend/dist/`.

### 4. Run Frontend Integration Tests
```bash
cd Frontend
npm test
```
Executes all 15 end-to-end integration test scenarios.

### 5. Run Engine Unit & Integration Tests
```bash
cd "Simulation Engine"
npm test
```
Executes all 206 unit and integration tests across 11 test suites.

### 6. Run Linter
```bash
cd Frontend
npm run lint
```

---

## 5. Scope & Deferred Features

- **Supported Algorithms**: Bubble Sort and Selection Sort (strictly limited for Milestone 3 prototype evaluation).
- **Deferred Algorithms**: Insertion Sort, Merge Sort, Quick Sort, and Heap Sort are deferred pending mentor approval.
- **Deferred Infrastructure**: Authentication, database persistence, and remote backend simulation services are intentionally deferred.
