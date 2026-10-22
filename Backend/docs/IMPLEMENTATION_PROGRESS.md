# Engineering Handoff & Implementation Progress Report: Backend Foundation

## Document Overview
- **Project Name:** Virtual CSE Laboratory — Backend Platform
- **Document Path:** [Backend/docs/IMPLEMENTATION_PROGRESS.md](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/docs/IMPLEMENTATION_PROGRESS.md)
- **Current Milestone:** Milestone 1 — Backend Platform Foundation (Remediated & Hardened)
- **Milestone Status:** Completed, Remediated, and Fully Verified
- **Date:** October 18, 2026
- **Operating Environment:** Windows x64, Node.js v22.14.0, npm v11.11.0, MongoDB v8.0.9

---

## Workspace Structure & Boundary Verification

The project root structure was inspected prior to initiating work and verified after implementation:

```
[Project Root] (c:/Users/vansh/OneDrive/Desktop/Piyush AI/Labs)
├── Backend/              <- Exclusively modified for Milestone 1
├── Frontend/             <- Untouched (empty directory preserved)
└── Simulation Engine/    <- Untouched (empty directory preserved)
```

### Confirmation of Task Boundaries:
1. All changes, source code, tests, configuration, and documentation were created exclusively inside [Backend/](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend).
2. No nested `backend/` directory was created.
3. [Frontend/](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Frontend) was completely preserved; no files were modified, moved, renamed, or generated.
4. [Simulation Engine/](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Simulation%20Engine) was completely preserved; no files were modified, moved, renamed, or generated.
5. No simulation engine, algorithm execution system, WebAssembly bindings, or animation systems were scaffolded or integrated.

---

## A. Project Status

### 1. Current Milestone & Status
- **Milestone:** Backend Platform Foundation (Milestone 1).
- **Status:** **Completed and Fully Verified**.

### 2. Existing Files Discovered Before Implementation
- An inspection of the workspace root revealed three top-level directories: `Backend/`, `Frontend/`, and `Simulation Engine/`.
- The `Backend/` directory was completely empty upon initial inspection. No pre-existing legacy code, dependencies, or configuration existed.

### 3. Work Completed During This Milestone
- Initialized Node.js project using ES modules (`"type": "module"`).
- Configured dependencies adhering strictly to approved stack: Express, Mongoose, Zod, Helmet, CORS, express-rate-limit, Pino, Pino-HTTP, Dotenv, Vitest, and Supertest.
- Implemented environment schema validation with Zod in [src/config/env.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/env.js).
- Authored safe, placeholder-only configuration template in [Backend/.env.example](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/.env.example).
- Built MongoDB connection lifecycle manager with connection event logging, reconnect handling, state diagnostics, and clean shutdown in [src/config/database.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/database.js).
- Configured structured JSON logging with sensitive information redaction in [src/config/logger.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/logger.js).
- Implemented request ID generation and propagation middleware using `node:crypto` `randomUUID` in [src/middlewares/requestId.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/requestId.js).
- Configured HTTP access logging with latency and status tracking in [src/middlewares/httpLogger.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/httpLogger.js).
- Built configurable rate limiting with standard headers and standardized 429 response in [src/middlewares/rateLimiter.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/rateLimiter.js).
- Implemented declarative request validation middleware supporting body, query, and route params using Zod in [src/middlewares/validate.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/validate.js).
- Built standardized `AppError` operational error class in [src/utils/AppError.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/utils/AppError.js) and standard envelope response helpers in [src/utils/response.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/utils/response.js).
- Implemented centralized error handler and 404 handler with production error sanitization in [src/middlewares/errorHandler.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/errorHandler.js).
- Created separate liveness (`/health/live`) and readiness (`/health/ready`) probe routes in [src/routes/health.routes.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/routes/health.routes.js).
- Separated Express app configuration in [src/app.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/app.js) from server network binding and graceful shutdown in [src/server.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/server.js).
- Developed automated test suite comprising 29 automated tests across 7 test suites using Vitest and Supertest.

### 4. Work Not Implemented (Deferred by Design)
- Authentication & Authorization: JWT, session handling, user password hashing, and role checks (Milestone 2).
- Business models: User, Institution, Curriculum, Subject, Lab, Experiment, Progress (Milestone 2+).
- Simulation Engine: Execution sandboxes, WebAssembly, animation frames (separate project, explicitly out of scope).
- External infrastructure: Redis, Docker, RabbitMQ, Microservices (explicitly prohibited at this stage).

### 5. Incomplete or Blocked Items
- None. All requirements for the foundation milestone are complete and verified.

---

## B. Technology and Architecture

### 1. Runtime & Package Versions
- **Node.js Runtime:** `v22.14.0` (LTS)
- **Package Manager:** `npm 11.11.0`
- **Core Dependencies:**
  - `express`: `^4.21.2` — Minimalist HTTP web framework
  - `mongoose`: `^8.9.5` — MongoDB object modeling and connection management
  - `zod`: `^3.24.2` — Type-safe schema validation for env and HTTP payloads
  - `helmet`: `^8.0.0` — Secure HTTP response headers
  - `cors`: `^2.8.5` — Cross-Origin Resource Sharing control
  - `express-rate-limit`: `^7.5.0` — IP-based rate limiting
  - `pino`: `^9.6.0` — High-performance JSON structured logger
  - `pino-http`: `^10.4.0` — HTTP request/response logging middleware
  - `dotenv`: `^16.4.7` — Environment variable loader
- **Testing & Development:**
  - `vitest`: `^5.0.5` — Unit and integration test runner
  - `supertest`: `^7.0.0` — HTTP assertion library
  - `pino-pretty`: `^13.0.0` — Formatted console logs for development

### 2. Folder and File Structure
```
Backend/
├── .env                              <- Local environment configuration (git-ignored)
├── .env.example                      <- Clean configuration template with placeholders
├── .gitignore                        <- Git exclusion definitions
├── package.json                      <- NPM manifest with ES modules configuration
├── package-lock.json                 <- Locked dependency tree
├── vitest.config.js                  <- Vitest runner configuration
├── docs/
│   └── IMPLEMENTATION_PROGRESS.md    <- Engineering handoff and audit report
├── src/
│   ├── app.js                        <- Express application setup (separated from network listener)
│   ├── server.js                     <- Server entrypoint, listener, and graceful shutdown
│   ├── config/
│   │   ├── env.js                    <- Zod environment schema & validation
│   │   ├── database.js               <- Mongoose connection lifecycle & state diagnostics
│   │   └── logger.js                 <- Pino structured logger with sensitive data redaction
│   ├── middlewares/
│   │   ├── requestId.js              <- UUID request ID generator and X-Request-Id header propagation
│   │   ├── httpLogger.js             <- Pino HTTP access logger
│   │   ├── rateLimiter.js            <- Rate limiting factory and default middleware
│   │   ├── validate.js               <- Zod request payload validation middleware
│   │   └── errorHandler.js           <- Centralized operational error & 404 handler
│   ├── routes/
│   │   ├── index.js                  <- Main router mounting sub-routers
│   │   └── health.routes.js          <- Liveness (/health/live) & readiness (/health/ready)
│   └── utils/
│       ├── AppError.js               <- Operational error class with HTTP status mapping
│       └── response.js               <- Standard JSON success and error response formatters
└── tests/
    ├── setup.js                      <- Test suite environment bootstrap
    ├── unit/
    │   ├── env.test.js               <- Zod env validation unit tests
    │   ├── AppError.test.js          <- AppError factory & status code unit tests
    │   └── logger.test.js            <- Pino sensitive field redaction unit tests
    └── integration/
        ├── database.test.js          <- MongoDB connection lifecycle & idempotency integration tests
        ├── health.test.js            <- Liveness & Readiness probe integration tests
        ├── security.test.js          <- Helmet, CORS, Rate Limit, & Request ID integration tests
        └── errorHandling.test.js     <- 404, malformed JSON, and error sanitization integration tests
```

### 3. Application Startup and Shutdown Flow
```
[Process Start: node src/server.js]
               │
               ▼
   [Validate Environment (src/config/env.js)] ───► Invalid: Log diagnostics & process.exit(1)
               │ Valid
               ▼
   [Connect MongoDB (src/config/database.js)] ───► Failed: Log fatal error & process.exit(1)
               │ Connected
               ▼
   [Configure Express App (src/app.js)]
   (Helmet -> CORS -> RequestId -> PinoHTTP -> JSON Body -> RateLimiter -> Routes)
               │
               ▼
   [Start HTTP Server (src/server.js: server.listen)]
               │
               ▼
   [Register Signal Handlers (SIGTERM, SIGINT, uncaughtException, unhandledRejection)]
               │
   ┌───────────┴─────────────────────────────────────────────┐
   ▼                                                         ▼
[Traffic Processing]                                  [Shutdown Signal]
                                                             │
                                                             ▼
                                              [gracefulShutdown(signal)]
                                                             │
                                              [1. Stop accepting new HTTP requests]
                                                             │
                                              [2. Disconnect MongoDB cleanly]
                                                             │
                                              [3. Flush logs & process.exit(0)]
```

### 4. MongoDB Connection Lifecycle
- **Connect:** [connectDB()](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/database.js) verifies `mongoose.connection.readyState`. If already connected (state 1) or connecting (state 2), it returns the active instance to prevent connection leaks.
- **Listeners:** Connection events (`connected`, `error`, `disconnected`, `reconnected`) are registered once and logged with structured metadata.
- **Timeouts:** Configured with `serverSelectionTimeoutMS: 5000` and `connectTimeoutMS: 10000` to prevent indefinite blocking upon network partitioning.
- **Disconnect:** [disconnectDB()](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/database.js) cleanly terminates the socket connection during application shutdown or test teardown.
- **Diagnostics:** [isDatabaseReady()](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/database.js) and [getDatabaseState()](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/database.js) expose real-time connection status for readiness probes.

### 5. Request and Error-Handling Flow
1. **Client Request** arrives.
2. **Helmet Middleware** sets defense-in-depth HTTP headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-DNS-Prefetch-Control`, etc.).
3. **CORS Middleware** checks `Origin` header against configured whitelist from `CORS_ORIGIN`. Unlisted origins receive HTTP 403 `CORS_FORBIDDEN`.
4. **RequestId Middleware** checks for incoming `X-Request-Id` or generates a cryptographically secure UUID (`node:crypto` `randomUUID()`). Sets `req.id` and `X-Request-Id` response header.
5. **HTTP Logger (pino-http)** logs incoming request metadata.
6. **Body Parser** parses JSON and URL-encoded bodies with a 1MB limit. Malformed JSON immediately triggers 400 `INVALID_JSON`.
7. **Rate Limiter** verifies client IP request threshold within window. Exceeded requests receive 429 `RATE_LIMIT_EXCEEDED`.
8. **Routing & Controller execution**: Handled routes return standard `{ success: true, data: ... }` responses.
9. **404 Catch-All**: Routes not matched trigger [notFoundHandler](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/errorHandler.js) returning 404 `NOT_FOUND`.
10. **Centralized Error Handler**: Translates `AppError`, Zod validation errors, Mongoose schema errors, or unhandled exceptions into the standard JSON error schema. Sensitive database details and stack traces are suppressed in production.

### 6. Deviations from the Approved Architecture
- **None.** No deviations from the approved tech stack or architecture were made.

---

## C. File-by-File Implementation Summary

| File Path | Responsibility | Important Logic Implemented | Dependencies | Completion Status |
|---|---|---|---|---|
| [package.json](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/package.json) | Package manifest & scripts | ES module definition (`"type": "module"`), development, test, and production scripts | None | Complete |
| [.env.example](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/.env.example) | Configuration template | Safe configuration placeholders without secrets | None | Complete |
| [.gitignore](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/.gitignore) | Git exclusions | Excludes node_modules, .env, logs, and coverage | None | Complete |
| [vitest.config.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/vitest.config.js) | Test runner config | Configures Node environment, global assertions, 10s timeout, and coverage | vitest | Complete |
| [src/config/env.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/env.js) | Environment validation | Zod schema parsing, type coercion, protocol verification (`mongodb://`), detailed failure diagnostics | zod, dotenv | Complete |
| [src/config/logger.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/logger.js) | Structured logging | ISO timestamps, level categorization, deep sensitive field redaction (passwords, tokens, cookies, auth headers) | pino, pino-pretty | Complete |
| [src/config/database.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/database.js) | MongoDB lifecycle | Connection initialization with timeouts, idempotency check, event monitoring, state diagnostics, clean disconnect | mongoose, logger, env | Complete |
| [src/utils/AppError.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/utils/AppError.js) | Operational error abstraction | Operational flag (`isOperational`), HTTP status codes, error codes, and static factory constructors | None | Complete |
| [src/utils/response.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/utils/response.js) | Response standardization | Unified JSON envelopes for success and failure responses | None | Complete |
| [src/middlewares/requestId.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/requestId.js) | Distributed request tracing | Extraction of incoming `X-Request-Id` or generation of cryptographically secure UUID; header propagation | node:crypto | Complete |
| [src/middlewares/httpLogger.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/httpLogger.js) | HTTP traffic logging | Pino-http integration with request ID association, duration, and status code log levels | pino-http, logger | Complete |
| [src/middlewares/rateLimiter.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/rateLimiter.js) | Request rate limiting | IP-based rate limiting with configurable window/max, standard headers, and 429 response formatting | express-rate-limit | Complete |
| [src/middlewares/validate.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/validate.js) | Request schema validation | Validates body, query, and params against Zod schemas, returning detailed field-level validation errors | zod, AppError | Complete |
| [src/middlewares/errorHandler.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/errorHandler.js) | Centralized error handler & 404 | Formats AppErrors, JSON syntax errors, Mongoose validation/cast/duplicate key errors; sanitizes stack traces | AppError, response, logger | Complete |
| [src/routes/health.routes.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/routes/health.routes.js) | Health check routes | Liveness probe (`/health/live`) and readiness probe (`/health/ready` verifying MongoDB state) | express, database, response | Complete |
| [src/routes/index.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/routes/index.js) | Root & Docs router | Mounts health routes, serves root operational status (`/`), and serves Milestone 1 API documentation (`/docs`) | express, health.routes, response | Complete |
| [src/app.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/app.js) | Express configuration | Express middleware pipeline assembly; enforces CORS credential safety (rejects wildcard `*` with credentials) | express, helmet, cors, middlewares | Complete |
| [src/server.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/server.js) | Application entrypoint | Database connection, HTTP listener, graceful shutdown with idle connection draining, disconnect safety, and test hooks | app, database, logger, env | Complete |
| [tests/setup.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/setup.js) | Test environment setup | Configures isolated test database URI, silent logger, and test environment variables | None | Complete |
| [tests/unit/env.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/unit/env.test.js) | Env validation unit tests | Validates strict numeric parsing, production constraints, CORS origin formatting, and test isolation | vitest, env | Complete |
| [tests/unit/AppError.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/unit/AppError.test.js) | AppError unit tests | Validates operational error creation, status codes, and factory methods | vitest, AppError | Complete |
| [tests/unit/logger.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/unit/logger.test.js) | Logger redaction unit tests | Validates redaction of passwords, credentials, MongoDB URIs, connection strings, tokens, and API keys | vitest, pino, logger | Complete |
| [tests/unit/shutdown.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/unit/shutdown.test.js) | Shutdown lifecycle unit tests | Tests server close, idle connection close, duplicate signal deduplication, and disconnect/startup errors | vitest, server, database | Complete |
| [tests/integration/health.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/integration/health.test.js) | Health API tests | Tests `/health/live` (200) and `/health/ready` (503 when DB disconnected, 200 when connected) | supertest, app, database | Complete |
| [tests/integration/docs.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/integration/docs.test.js) | Root & Docs integration tests | Tests `GET /` operational status and `GET /docs` endpoint specs and milestone documentation | supertest, app | Complete |
| [tests/integration/security.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/integration/security.test.js) | Security integration tests | Tests Helmet headers, CORS credentials & wildcard rejection, Request ID validation/fallback, 429 Rate Limiting | supertest, app, rateLimiter | Complete |
| [tests/integration/errorHandling.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/integration/errorHandling.test.js) | Error handling integration tests | Tests 404 handler, malformed JSON (400), schema validation failure (400), CastError, credential scrubbing | supertest, app, validate | Complete |
| [tests/integration/database.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/integration/database.test.js) | DB lifecycle integration tests | Tests concurrent promise sharing, failure propagation, retry, test DB isolation guard, credential sanitization | vitest, database, env | Complete |

---

## D. API and Runtime Behaviour

### 1. Implemented Endpoints

#### `GET /health/live`
- **Purpose:** Liveness probe. Indicates whether the Node.js process is active and capable of processing event loop tasks.
- **Access:** Public.
- **Success Response (HTTP 200):**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "virtual-cse-lab-backend",
    "uptime": 103.8998828,
    "timestamp": "2026-10-17T14:49:58.777Z"
  }
}
```

#### `GET /health/ready`
- **Purpose:** Readiness probe. Indicates whether the backend and its upstream dependencies (MongoDB) are ready to accept traffic.
- **Access:** Public.
- **Success Response (HTTP 200) when MongoDB connected:**
```json
{
  "success": true,
  "data": {
    "status": "ready",
    "service": "virtual-cse-lab-backend",
    "checks": {
      "database": "connected"
    },
    "uptime": 355.7587835,
    "timestamp": "2026-10-17T14:54:10.636Z"
  }
}
```
- **Error Response (HTTP 503) when MongoDB disconnected:**
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service is not ready to accept traffic",
    "details": {
      "database": "disconnected"
    }
  },
  "requestId": "9ec09028-1b25-4c07-952b-beeeaa92a14b"
}
```

#### `GET /`
- **Purpose:** Root service discovery and status endpoint.
- **Access:** Public.
- **Success Response (HTTP 200):**
```json
{
  "success": true,
  "data": {
    "name": "Virtual CSE Lab Backend API",
    "version": "0.1.0",
    "documentation": "/docs",
    "status": "operational"
  }
}
```

#### Undefined Routes (e.g. `GET /api/v1/unknown`)
- **Error Response (HTTP 404):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Cannot GET /api/v1/unknown"
  },
  "requestId": "7cc3fb0a-e69b-4d7c-9267-82da0c932a38"
}
```

### 2. Standard Envelope Formats

#### Standard Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": { ... } // optional pagination / filter metadata
}
```

#### Standard Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable description",
    "details": [ ... ] // optional array or object for field-level validation errors
  },
  "requestId": "uuidv4-string"
}
```

### 3. Required Environment Variables
| Variable | Required | Default Value | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Target environment (`development`, `production`, `test`) |
| `PORT` | No | `5000` | HTTP port to listen on (1 - 65535) |
| `HOST` | No | `127.0.0.1` | Network interface to bind |
| `MONGODB_URI` | **Yes** | None (in test: `mongodb://127.0.0.1:27017/virtual_cse_lab_test`) | MongoDB connection string (must begin with `mongodb://` or `mongodb+srv://`) |
| `CORS_ORIGIN` | No | `http://localhost:3000,http://localhost:5173` | Comma-delimited list of permitted CORS origins or `*` |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limiting sliding window in milliseconds (default: 15 minutes) |
| `RATE_LIMIT_MAX` | No | `100` | Maximum requests allowed per IP within the window |
| `LOG_LEVEL` | No | `info` | Log verbosity (`fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`) |

### 4. Operational Commands
All commands must be executed from the `Backend/` directory:

```bash
# 1. Install dependencies
cd Backend
npm install

# 2. Run automated test suite
npm test

# 3. Run automated tests with coverage
npm run test:coverage

# 4. Start local development server with file watching
npm run dev

# 5. Start production server
npm start
```

### 5. Verification Instructions
To verify server and database health after starting:
```bash
# Verify process liveness
curl -i http://127.0.0.1:5000/health/live

# Verify database connection readiness
curl -i http://127.0.0.1:5000/health/ready
```

---

## E. Database Status

### 1. MongoDB Connection Implementation
- Managed through Mongoose ODM in [src/config/database.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/database.js).
- Configured with `serverSelectionTimeoutMS: 5000` and `connectTimeoutMS: 10000`.
- Connection lifecycle listeners track `connected`, `error`, `disconnected`, and `reconnected` events.
- Idempotent: Subsequent calls to `connectDB()` reuse existing active or in-flight connections.

### 2. Models and Collections Created
- **None.** In accordance with Milestone 1 scope boundaries, no domain models or business collections (e.g., users, institutions, labs, experiments) were created. They are deferred to their respective milestones (Milestone 2 for Auth, Milestone 3 for Curricula).

### 3. Indexes and Validation Rules
- No schema-level indexes or validation rules exist yet because domain models have not been created.
- In [src/config/database.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/database.js), `autoIndex: false` is configured for production environments to avoid production index build locks.

### 4. Test-Data Isolation Measures
- Automated test runs use a dedicated, isolated test database (`virtual_cse_lab_test`) configured in [tests/setup.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/setup.js).
- Tests never connect to or mutate the development (`virtual_cse_lab`) or production database.
- Integration tests cleanly disconnect from the database upon suite completion using `afterAll(disconnectDB)`.

---

## F. Security Review

| Security Control | Implementation Status | Implementation Details |
|---|---|---|
| **Environment & Secret Handling** | **Implemented** | Strict Zod validation on startup; `.env.example` contains placeholders only; real `.env` is git-ignored. |
| **HTTP Security Headers** | **Implemented** | Helmet middleware configured: sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-DNS-Prefetch-Control`, `Strict-Transport-Security`. |
| **CORS Policy** | **Implemented** | Origin whitelist validation via `CORS_ORIGIN`. Unrecognized origins receive HTTP 403 `CORS_FORBIDDEN`. Allowed origins receive explicit `Access-Control-Allow-Origin`. |
| **Rate Limiting** | **Implemented** | `express-rate-limit` enforces IP limits with `standardHeaders` enabled. Returns standardized HTTP 429 response on limit breach. |
| **Request Validation** | **Implemented** | Reusable `validate` middleware using Zod schemas for `body`, `query`, and `params`. Rejects invalid payloads with HTTP 400 before reaching handlers. |
| **Logging Redaction** | **Implemented** | Pino redaction configured for passwords, confirmPassword, tokens, secrets, API keys, cookies, and `Authorization` headers. Replaced with `[REDACTED]`. |
| **Error Sanitization** | **Implemented** | Centralized error handler masks stack traces and internal database errors in production. Standardized error envelope returned to clients. |
| **Database Safety** | **Implemented** | Mongoose connection timeouts prevent hanging sockets; no dynamic raw queries; autoIndex disabled in production. |
| **Authentication & Session** | **Not Implemented (Deferred)** | Scheduled for Milestone 2. No user accounts, tokens, or sessions exist in Milestone 1. |
| **Remaining Security Gaps** | **Documented** | CSRF protection, Content Security Policy fine-tuning, and JWT revocation will be implemented alongside authentication and frontend client integration in subsequent milestones. |

---

## G. Testing and Verification Evidence

All test results reported below were directly executed and observed in the environment:

| Check | Result | Evidence or Limitation |
|---|---|---|
| **Automated unit tests** | **PASS** | 21 tests passed across 4 test suites: [tests/unit/env.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/unit/env.test.js) (9 tests), [tests/unit/AppError.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/unit/AppError.test.js) (6 tests), [tests/unit/logger.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/unit/logger.test.js) (2 tests), [tests/unit/shutdown.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/unit/shutdown.test.js) (4 tests). |
| **API & Health tests** | **PASS** | 5 tests passed testing `/health/live`, `/health/ready` (connected & disconnected), and root & docs endpoints (`/` and `/docs`). |
| **MongoDB integration** | **PASS** | 9 tests passed in [tests/integration/database.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/integration/database.test.js) testing in-flight promise sharing, failure propagation, retry, test DB isolation guard, and credential sanitization. |
| **Security & Middleware** | **PASS** | 11 tests passed in [tests/integration/security.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/integration/security.test.js) testing Helmet headers, CORS credentials & wildcard rejection, Request ID validation/fallback, and 429 Rate Limiting. |
| **Error handling** | **PASS** | 5 tests passed in [tests/integration/errorHandling.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/integration/errorHandling.test.js) testing 404, malformed JSON (400), schema validation failure (400), CastError, and credential scrubbing from internal errors. |
| **Application startup** | **PASS** | Live process started via `startServer()`, successfully connected to MongoDB, bound to port 5000, logged structured diagnostics, and served live requests. |
| **Health endpoints** | **PASS** | Verified live HTTP requests: `GET /health/live` returned HTTP 200 `{ status: "ok" }`; `GET /health/ready` returned HTTP 200 `{ status: "ready", checks: { database: "connected" } }`. |
| **Documentation endpoint** | **PASS** | Verified live HTTP requests: `GET /docs` returned HTTP 200 with complete Milestone 1 endpoint documentation; `GET /` pointed to `/docs`. |

### Verification Execution Summary
```
$ npm test

 RUN  v5.0.5 C:/Users/vansh/OneDrive/Desktop/Piyush AI/Labs/Backend

 ✓ tests/unit/AppError.test.js (6 tests) 10ms
 ✓ tests/unit/env.test.js (9 tests) 25ms
 ✓ tests/unit/logger.test.js (2 tests) 17ms
 ✓ tests/unit/shutdown.test.js (4 tests) 43ms
 ✓ tests/integration/docs.test.js (2 tests) 54ms
 ✓ tests/integration/errorHandling.test.js (5 tests) 83ms
 ✓ tests/integration/health.test.js (3 tests) 104ms
 ✓ tests/integration/security.test.js (11 tests) 119ms
 ✓ tests/integration/database.test.js (9 tests) 1120ms

 Test Files  9 passed (9)
      Tests  51 passed (51)
   Duration  2.33s
```

```
$ npm run test:coverage

 % Coverage report from v8
-------------------|---------|----------|---------|---------|----------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s    
-------------------|---------|----------|---------|---------|----------------------
All files          |   84.68 |    76.41 |   84.61 |   86.95 |                      
 src               |   77.27 |       75 |   52.94 |   80.72 |                      
  app.js           |   96.15 |    85.71 |      75 |      96 | 29                   
  server.js        |   69.35 |    66.66 |   46.15 |   74.13 | 19,46-47,101-127,144 
 src/config        |   92.37 |    77.77 |   96.42 |   95.32 |                      
  database.js      |    87.5 |    73.52 |    92.3 |   93.22 | 85,165-170           
  env.js           |   97.95 |    82.92 |     100 |   97.67 | 15                   
  logger.js        |     100 |    66.66 |     100 |     100 | 40-52                
 src/middlewares   |   76.71 |    70.42 |   84.21 |   77.94 |                      
  errorHandler.js  |   70.96 |    66.66 |      75 |   75.86 | 50-61,89-96,108      
  httpLogger.js    |   85.71 |    78.57 |   71.42 |   83.33 | 10,41                
  rateLimiter.js   |     100 |      100 |     100 |     100 |                      
  requestId.js     |     100 |      100 |     100 |     100 |                      
  validate.js      |   57.14 |       25 |     100 |   53.84 | 18-24,33             
 src/routes        |     100 |      100 |     100 |     100 |                      
  health.routes.js |     100 |      100 |     100 |     100 |                      
  index.js         |     100 |      100 |     100 |     100 |                      
 src/utils         |   88.46 |    88.88 |     100 |   88.46 |                      
  AppError.js      |    87.5 |    81.81 |     100 |    87.5 | 39-43                
  response.js      |      90 |    93.75 |     100 |      90 | 16                   
-------------------|---------|----------|---------|---------|----------------------
```

```
$ npm audit
found 0 vulnerabilities
```

---

## H. Architecture Compliance Review

### 1. Requirements Satisfied
- Node.js runtime with ES modules (`"type": "module"`). No TypeScript.
- Express framework used without unnecessary frameworks or microservices.
- MongoDB and Mongoose integration with complete lifecycle control.
- Vitest and Supertest testing framework with 100% passing automated test suite.
- Zod schema validation for environment configuration and HTTP request validation.
- Helmet security headers and CORS whitelist protection.
- Structured logging with Pino and sensitive data redaction.
- Express configuration cleanly decoupled from server network binding.
- Liveness (`/health/live`) and database-backed readiness (`/health/ready`) probes.
- Graceful shutdown handling `SIGTERM`, `SIGINT`, `uncaughtException`, and `unhandledRejection`.
- Clean separation of workspace boundaries: `Frontend/` and `Simulation Engine/` left untouched.

### 2. Requirements Partially Satisfied
- None within Milestone 1 scope. All required foundation components are fully implemented and verified.

### 3. Requirements Not Implemented (Future Milestones)
- Domain entities (User, Institution, Curriculum, Experiment, Lab, Progress).
- User authentication, password hashing, and role-based access control.
- Cloud storage integration and experiment content publishing workflows.

### 4. Unnecessary Dependencies or Complexity
- None. Kept dependencies minimal: avoided Redis, message queues, Docker, and multi-service complexity.

### 5. Potential Reliability and Security Considerations
- In production deployment across multiple container replicas, IP-based rate limiting will require a shared store (such as Redis or MongoDB) or should be delegated to an ingress reverse proxy (NGINX/Cloud Armor/Cloudflare). For single-node foundation, in-memory rate limiting satisfies requirements.
- MongoDB connection string in production must enforce TLS (`tls=true`) and replica set authentication.

---

## I. Next Steps

The next three logical backend milestones in priority order are:

1. **Milestone 2 — Authentication & Authorization Architecture:**
   - User entity model (Student, Institution Admin, Platform Admin).
   - Password hashing with Argon2 or bcrypt.
   - JWT access & refresh token cycle or secure HTTP-only cookie sessions.
   - User registration, email verification token model, login, logout, and password recovery.
   - Role-Based Access Control (RBAC) middleware.
2. **Milestone 3 — Institution & Curriculum Management:**
   - Institution model, approval workflows, and multi-tenancy scoping.
   - Curriculum, Semester, Subject, and Laboratory hierarchies.
   - Experiment metadata management.
3. **Milestone 4 — Student Progress & Analytics:**
   - Student laboratory progress tracking, saved state, and submission records.
   - Audit logging and operational diagnostics.

### Files Requiring Immediate External Review Prior to Milestone 2:
1. [src/app.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/app.js) — Middleware pipeline ordering.
2. [src/config/env.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/env.js) — Environment variables and validation constraints.
3. [src/config/database.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/database.js) — Mongoose connection lifecycle and timeouts.
4. [src/middlewares/errorHandler.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/errorHandler.js) — Error sanitization and client response envelope.

---

## J. External Review Summary

### 1. What has been built so far?
A production-grade, secure, test-covered backend foundation for the Virtual CSE Laboratory platform using Node.js (ESM), Express, MongoDB, and Mongoose. It provides environment validation, structured logging with secret redaction, request ID tracking, security headers, CORS origin restrictions, rate limiting, centralized error handling with stack suppression, and independent liveness/readiness health probes.

### 2. What works and has been verified?
- All 51 unit and integration tests execute and pass via Vitest and Supertest across 9 test suites.
- Code coverage measured at 86.95% line coverage via Vitest v8 coverage provider.
- Real HTTP startup and query verification verified over network sockets on port 5000.
- Health probes accurately reflect service liveness (`/health/live`) and MongoDB connection readiness (`/health/ready`).
- Centralized error handler captures operational and unexpected errors, outputting standard JSON without leaking stack traces or database credentials.
- Zero npm audit vulnerabilities (`found 0 vulnerabilities`).

### 3. What remains incomplete?
Domain entities, user authentication, and business APIs are not yet implemented. They are intentionally deferred to Milestone 2.

### 4. Are there deviations from the approved plan?
No deviations. The implementation adheres strictly to the approved technology choices and scope limits.

### 5. What should the reviewer inspect first?
1. [src/app.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/app.js) & [src/server.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/server.js) — Architecture separation, CORS credential safety, and graceful shutdown.
2. [src/config/database.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/database.js) — In-flight promise sharing, credential scrubbing, and readiness probe integration.
3. [src/config/env.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/env.js) — Strict integer validation and production environment rules.
4. [src/middlewares/requestId.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/requestId.js) — Request ID format validation and server UUID fallback.
5. [tests/](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/) — Unit and integration test coverage (51 tests).

### 6. Is the backend ready for its next milestone? Why or why not?
**Yes.** The backend foundation is remediated, hardened, thoroughly tested, securely configured, and cleanly decoupled. It provides the architectural primitives (error handling, request tracing, logging, validation, database connection) necessary to implement authentication and authorization in Milestone 2.

---

## K. Milestone 1 Remediation Audit & Hardening Report (October 18, 2026)

### 1. Remediation Scope & Boundaries
In accordance with task directives, all remediation activities were conducted strictly inside [Backend/](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend). No files outside `Backend/` (`Frontend/`, `Simulation Engine/`) were altered. No domain models or Milestone 2 authentication components were created prematurely. Working code was preserved and refined with focused, targeted security and architectural fixes.

### 2. Issues Discovered and Remediations Implemented

#### Issue 1: CORS Wildcard Origin With Credentials & Missing Production Validation
- **Vulnerability / Defect:** [src/app.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/app.js) allowed wildcard origin (`*`) even when `credentials: true` was enabled. Under W3C CORS specifications, wildcard origins cannot be used with credentialed requests, and reflecting arbitrary origins while credentials are true undermines cross-origin request security. Furthermore, invalid origin configurations were not prevented in production.
- **Remediation:**
  - Enforced a hard guard in `createApp()`: throws an error immediately if `corsCredentials` is `true` and `allowedOrigins` contains `'*'`.
  - Configured wildcard origin string `'*'` only when credentials are explicitly disabled (`credentials: false`).
  - Added strict origin formatting regex in [src/config/env.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/env.js) requiring `https?://host[:port]` without trailing paths or slashes.
  - Added production constraint in `validateEnv()` prohibiting wildcard origins in production environments.
  - Added integration tests covering allowed origins with credentials, rejected unauthorized origins (403 `CORS_FORBIDDEN`), rejection of wildcard with credentials, and acceptance of wildcard without credentials.

#### Issue 2: Permissive Request ID Processing & Header Injection Vulnerability
- **Vulnerability / Defect:** [src/middlewares/requestId.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/requestId.js) blindly trusted incoming `X-Request-Id` headers as long as trimmed string length was greater than 0. Malformed values containing script tags, spaces, CRLF characters, or arbitrarily large payloads were echoed into logs and HTTP response headers.
- **Remediation:**
  - Implemented strict character set and length validation: `/^[a-zA-Z0-9_-]{1,128}$/`.
  - Added [isValidRequestId()](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/requestId.js) validator function.
  - Configured server-side UUID (`node:crypto` `randomUUID()`) generation fallback whenever an incoming ID is missing, contains illegal characters, or exceeds 128 characters.
  - Added integration tests for valid IDs, malformed/XSS inputs, oversized inputs (>128 chars), and whitespace-only strings.

#### Issue 3: Concurrency Race Condition in MongoDB Connection Lifecycle
- **Vulnerability / Defect:** [src/config/database.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/database.js) returned `mongoose` synchronously if `mongoose.connection.readyState === 2` ('connecting'). Consequently, concurrent callers received an unestablished connection object before connection resolution or failure, leading to race conditions and inconsistent caller states.
- **Remediation:**
  - Introduced module-scoped `inFlightPromise` tracking the active connection attempt.
  - Guaranteed that concurrent calls to `connectDB()` share the exact same promise.
  - Guaranteed that every concurrent caller observes identical resolution (success) or rejection (failure).
  - Cleared `inFlightPromise` in a `finally` block to allow clean retries after connection failure.
  - Added configurable `serverSelectionTimeoutMS` option (defaulting to 1000ms in test environment) for prompt failure detection.
  - Added integration tests verifying shared promise resolution, concurrent failure observation, and successful recovery after failed attempts.

#### Issue 4: Inaccurate Root Documentation URL / Missing `/docs` Endpoint
- **Vulnerability / Defect:** The root endpoint `GET /` promised API documentation at `documentation: '/docs'`, but requesting `/docs` returned HTTP 404 `NOT_FOUND`.
- **Remediation:**
  - Implemented `GET /docs` endpoint in [src/routes/index.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/routes/index.js).
  - Provided structured, lightweight JSON documentation detailing Milestone 1 endpoints (`/`, `/docs`, `/health/live`, `/health/ready`), service description, and active security mechanisms.
  - Added integration tests verifying `GET /` links to `/docs` and `GET /docs` returns complete specification metadata.

#### Issue 5: Silent Partial Value Acceptance in Environment Numeric Parsing
- **Vulnerability / Defect:** `PORT`, `RATE_LIMIT_WINDOW_MS`, and `RATE_LIMIT_MAX` in [src/config/env.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/env.js) utilized JavaScript `parseInt(val, 10)`, which silently parses leading digits from malformed inputs like `'5000abc'` or `'900000ms'`.
- **Remediation:**
  - Replaced `parseInt` with a strict integer preprocessor and validation schema enforcing `/^\d+$/`.
  - Inputs with non-digit characters, negative signs, decimals, or trailing units are immediately rejected with descriptive validation errors.
  - Added unit tests verifying rejection of malformed strings across all numeric configuration fields.

#### Issue 6: Credential Exposure Risk in Logs and Error Messages
- **Vulnerability / Defect:** Logger redaction paths omitted database URI properties (`MONGODB_URI`, `uri`, `connectionString`), allowing raw connection strings with embedded credentials to be logged. Mongoose `CastError` logged raw user-supplied input (`value: err.value`). Unhandled 500 error messages could leak database connection URIs to clients or logs.
- **Remediation:**
  - Added [sanitizeSensitiveText()](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/errorHandler.js) and [sanitizeMongoUri()](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/database.js) to redact credentials (`username:[REDACTED]@host`) from all error messages, stack traces, and logged objects.
  - Expanded Pino redaction paths in [src/config/logger.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/logger.js) to include `MONGODB_URI`, `mongodbUri`, `uri`, `connectionString`, `x-api-key`, and `confirmPassword`.
  - Removed raw input logging from Mongoose `CastError` handler in [src/middlewares/errorHandler.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/errorHandler.js).
  - Added unit and integration tests verifying credentials scrubbing and `CastError` safety.

#### Issue 7: Graceful Shutdown Robustness & Active Connection Draining
- **Vulnerability / Defect:** [src/server.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/server.js) did not drain idle HTTP keep-alive connections, potentially delaying shutdown until forceful exit. Database disconnection failures during shutdown were unhandled, and startup failures lacked explicit database cleanup. Lack of dependency injection or test hooks prevented direct automated testing.
- **Remediation:**
  - Added `server.closeIdleConnections()` invocation upon shutdown to drain idle keep-alive connections while permitting active in-flight requests to finish.
  - Added timeout cancellation (`clearTimeout(forceExitTimeout)`) upon clean shutdown completion.
  - Added error trapping for database disconnection during shutdown, ensuring exit code 1 is triggered.
  - Added cleanup logic to `startServer()` catching startup errors and releasing partial resources before exiting.
  - Added testable parameterization (`{ exit, exitFn }`) and `_resetShutdownState()` test helper.
  - Authored dedicated unit test suite [tests/unit/shutdown.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/unit/shutdown.test.js) (4 tests).

#### Issue 8: Test Database Isolation Guard & Package Auditing
- **Vulnerability / Defect:** While `tests/setup.js` configured `virtual_cse_lab_test`, no runtime assertions prevented test suites or misconfigured runners from connecting to development or production databases. Additionally, `@vitest/coverage-v8` was missing from dependencies, preventing coverage measurements.
- **Remediation:**
  - Added [assertTestDatabase()](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/database.js) guard in `connectDB()` that actively blocks connection if `NODE_ENV === 'test'` and URI does not contain `'test'`.
  - Added production guard in `validateEnv()` preventing test database URIs from being utilized in production.
  - Installed `@vitest/coverage-v8@5.0.5` in `devDependencies`.
  - Executed `npm audit` confirming 0 vulnerabilities across 192 audited packages.
  - Verified `.gitignore` prevents `.env` and sensitive files from being committed.

### 3. Files Modified and Summary of Changes

| File | Type | Reason for Modification |
|---|---|---|
| [package.json](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/package.json) | Dependency | Added `@vitest/coverage-v8` to `devDependencies` to enable automated coverage verification. |
| [src/config/env.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/env.js) | Source Code | Replaced `parseInt` with strict integer schema (`/^\d+$/`); added CORS origin format regex; added production checks (reject wildcard, reject test DB); added test DB guard. |
| [src/config/logger.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/logger.js) | Source Code | Added database URIs, connection strings, API keys, and confirmPassword to Pino `redactPaths`. |
| [src/config/database.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/config/database.js) | Source Code | Implemented `inFlightPromise` sharing; added `sanitizeMongoUri` and `sanitizeError`; added `assertTestDatabase`; configurable connection timeouts. |
| [src/middlewares/requestId.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/requestId.js) | Source Code | Validated `X-Request-Id` character set and 128-char limit; server-side UUID generation fallback; exported `isValidRequestId`. |
| [src/middlewares/errorHandler.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/middlewares/errorHandler.js) | Source Code | Added `sanitizeSensitiveText`; sanitized error messages, stacks, and validation details; removed raw value logging from CastError. |
| [src/app.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/app.js) | Source Code | Prohibited wildcard origin (`*`) when credentials are enabled; set wildcard origin string only when uncredentialed; supported options parameter in `createApp()`. |
| [src/routes/index.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/routes/index.js) | Source Code | Implemented `GET /docs` endpoint returning Milestone 1 endpoint specs and security features. |
| [src/server.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/src/server.js) | Source Code | Drained idle keep-alive connections on shutdown; sanitized startup/shutdown errors; provided test hooks (`_resetShutdownState`, `{ exit, exitFn }`). |
| [tests/unit/env.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/unit/env.test.js) | Test Suite | Expanded with tests for malformed numbers, production security rules, CORS formatting, and test DB isolation. |
| [tests/unit/logger.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/unit/logger.test.js) | Test Suite | Expanded to test redaction of MongoDB URIs, connection strings, and API keys. |
| [tests/unit/shutdown.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/unit/shutdown.test.js) | Test Suite (New) | Created unit tests for graceful shutdown, duplicate signal deduplication, database disconnect failure, and startup failure. |
| [tests/integration/security.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/integration/security.test.js) | Test Suite | Added tests for CORS credentials, wildcard origin rejection/acceptance, and malformed/oversized Request ID validation. |
| [tests/integration/database.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/integration/database.test.js) | Test Suite | Added tests for shared in-flight connection promise, failure propagation, retry, test DB isolation guard, and credential sanitization. |
| [tests/integration/errorHandling.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/integration/errorHandling.test.js) | Test Suite | Added assertions verifying database credentials cannot leak in error responses, and tested CastError handling without raw value leakage. |
| [tests/integration/docs.test.js](file:///c:/Users/vansh/OneDrive/Desktop/Piyush%20AI/Labs/Backend/tests/integration/docs.test.js) | Test Suite (New) | Created integration tests for `GET /` operational status and `GET /docs` specification response. |

### 4. Test Suite Execution & Actual Results
- **Command:** `npm test`
- **Result:** **PASS (100%)**
- **Test Count:** 51 passing tests across 9 test suites.
- **Execution Breakdown:**
  - `tests/unit/AppError.test.js` — 6 tests passed
  - `tests/unit/env.test.js` — 9 tests passed
  - `tests/unit/logger.test.js` — 2 tests passed
  - `tests/unit/shutdown.test.js` — 4 tests passed
  - `tests/integration/docs.test.js` — 2 tests passed
  - `tests/integration/errorHandling.test.js` — 5 tests passed
  - `tests/integration/health.test.js` — 3 tests passed
  - `tests/integration/security.test.js` — 11 tests passed
  - `tests/integration/database.test.js` — 9 tests passed

### 5. Automated Coverage Report
- **Command:** `npm run test:coverage`
- **Result:** **PASS**
- **Overall Line Coverage:** **86.95%**
- **Overall Statement Coverage:** **84.68%**
- **Key Modules Coverage:**
  - `src/routes/index.js` — **100%** lines
  - `src/routes/health.routes.js` — **100%** lines
  - `src/middlewares/requestId.js` — **100%** lines
  - `src/middlewares/rateLimiter.js` — **100%** lines
  - `src/config/logger.js` — **100%** lines
  - `src/config/env.js` — **97.67%** lines
  - `src/app.js` — **96.00%** lines
  - `src/config/database.js` — **93.22%** lines
  - `src/utils/response.js` — **90.00%** lines
  - `src/utils/AppError.js` — **87.50%** lines
  - `src/middlewares/httpLogger.js` — **83.33%** lines
  - `src/middlewares/errorHandler.js` — **75.86%** lines
  - `src/server.js` — **74.13%** lines

### 6. Dependency & Security Audit
- **Command:** `npm audit`
- **Result:** `found 0 vulnerabilities` across all 192 packages in the dependency tree.

### 7. Live Server & Endpoint Verification
Direct network execution of `startServer()` with live HTTP probe requests was executed:
- `GET /` — Returned HTTP 200 with `{ status: "operational", documentation: "/docs" }`.
- `GET /docs` — Returned HTTP 200 with milestone metadata and endpoint specifications.
- `GET /health/live` — Returned HTTP 200 with `{ status: "ok", uptime: ... }`.
- `GET /health/ready` — Returned HTTP 200 with `{ status: "ready", checks: { database: "connected" } }`.
- `gracefulShutdown('SIGTERM')` — Closed HTTP network listener, disconnected MongoDB cleanly, and exited gracefully with code 0. No credentials appeared in console or structured log streams.

### 8. Exact Commands for Reproducing Checks
All checks can be independently reproduced from the `Backend/` directory with the following commands:

```bash
# 1. Install dependencies
cd Backend
npm install

# 2. Run full automated test suite (51 tests)
npm test

# 3. Run test coverage report
npm run test:coverage

# 4. Check for known package vulnerabilities
npm audit

# 5. Start development server
npm run dev

# 6. Verify live health probes
curl -i http://127.0.0.1:5000/health/live
curl -i http://127.0.0.1:5000/health/ready
curl -i http://127.0.0.1:5000/docs
```

### 9. Remaining Risks and Unresolved Issues
1. **Multi-Instance Rate Limiting:** Single-node rate limiting uses in-memory tracking via `express-rate-limit`. When scaling horizontally behind a load balancer, rate limiting state should be backed by a shared store or handled by an ingress controller (NGINX/Cloud Armor).
2. **TLS in Production Database:** In production, `MONGODB_URI` should include TLS parameters (`tls=true`) and replica set configuration.
3. **Authentication Boundary:** No authentication or authorization has been implemented yet (intentionally deferred to Milestone 2).

### 10. Foundation Readiness Statement
**The Milestone 1 backend platform foundation has been thoroughly remediated, hardened, and verified.** All 8 required remediation areas (CORS security, Request ID validation, MongoDB connection lifecycle, documentation endpoint, environment validation, logging/error redaction, graceful shutdown, test isolation) are resolved and covered by automated tests. The foundation is stable, secure, and fully prepared for an independent review before commencing Milestone 2.

