# Virtual CSE Lab

Interactive educational platform for computer science students to understand algorithms through visual step-by-step simulations.

## Project Structure

```
Labs/
├── Frontend/           # React 19 + Vite visual simulation interface
├── Backend/            # Express.js REST API with health & documentation endpoints
├── Simulation Engine/  # Standalone headless ES module simulation engine
├── start.js            # Unified single-command launcher
├── test-all.js         # Unified test runner (runs all 272 tests)
└── package.json        # Root scripts configuration
```

---

## Run the Entire Project (Single Command)

From the project root directory, run:

```bash
npm start
```
*(or `npm run dev`)*

This single command concurrently spawns:
- **Frontend** at **http://localhost:5173** (Interactive algorithm visualizer)
- **Backend** at **http://127.0.0.1:5000** (API, Health checks: `/health/live`, Docs: `/docs`)

To stop both servers, press **Ctrl+C**.

---

## Run All Tests Across All Packages (Single Command)

```bash
npm test
```

Executes all 272 automated unit and integration tests:
- **Simulation Engine**: 206 tests (Bubble Sort, Selection Sort, validation, FSM, clocks, invariants)
- **Frontend**: 15 tests (End-to-end integration and student workflows)
- **Backend**: 51 tests (Health probes, security headers, rate limiting, error handling, MongoDB safety)
