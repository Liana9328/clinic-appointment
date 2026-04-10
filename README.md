# Clinic Appointment API

RESTful API for a clinic appointment system built with Node.js, Express, TypeScript, Prisma, and SQLite.

## Stack

- Node.js + Express
- TypeScript
- Prisma ORM + SQLite
- Zod validation
- Jest + Supertest
- OpenAPI 3.0 + Swagger UI
- Docker Compose

## Run Locally

### Option A: npm

1. Copy the example env file:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Apply migrations:

```bash
npx prisma migrate deploy
```

4. Start:

```bash
npm run dev
```

API base URL: `http://localhost:3000`

### Option B: Docker

Build and run:

```bash
docker compose up --build
```

API base URL: `http://localhost:3000`

## API Swagger

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON is generated from Zod schemas and written to `src/lib/swagger-output.json`.

## Endpoints

### 1) Create appointment

- **Method/Path:** `POST /appointments`
- **Allowed roles:** `patient`, `clinician`, `admin` (minimum required role: `patient`)
- **Body:** `clinicianId`, `patientId`, `start`, `end` (ISO datetime with offset)

### 2) Get clinician upcoming appointments

- **Method/Path:** `GET /clinicians/{id}/appointments`
- **Allowed roles:** `clinician`, `admin` (minimum required role: `clinician`)
- **Query (optional):** `from`, `to` (`YYYY-MM-DD` or ISO datetime with offset)

### 3) Admin: get all upcoming appointments

- **Method/Path:** `GET /appointments`
- **Allowed roles:** `admin`
- **Query (optional):** `from`, `to`, `limit`, `page`

## Testing with curl

For a full, copy-paste testing checklist (happy paths + validation + auth failures), see:

- `TESTING_CURLS.md`

Tip: install `jq` to pretty-print JSON responses (optional but recommended).
If you have it installed, you can append `| jq .` to curl commands to format output.

## Data Reset (local/dev)

Run tests:

```bash
npm test
```

For a full local reset (delete all data, re-apply migrations):

```bash
npx prisma migrate reset
```

This is destructive for the configured `DATABASE_URL`; use in dev/testing only.

## Design Decisions / Trade-offs

- **Architecture:** Controller -> Service -> Repository keeps transport, business logic, and persistence separated.
- **Validation:** Zod validates request body/query/params, including date range guard (`from <= to`) and strict appointment time rules.
- **Authorization model:** `X-Role` header with role hierarchy (`patient < clinician < admin`) for challenge scope.
- **OpenAPI bonus:** Documentation is generated from Zod schemas via `@asteasolutions/zod-to-openapi`, reducing doc drift and fixing request body visibility in Swagger UI.
- **Docker bonus:** Dockerfile and Compose support for local runs.
- **Concurrency safety:** Create appointment runs in a Prisma transaction, so overlap check + insert are atomic from app perspective; for very high write contention, DB-native constraints/locking in a production DB are stronger guarantees.
