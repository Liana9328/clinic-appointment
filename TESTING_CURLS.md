# API Testing with curl

Use these commands after the service is running at `http://localhost:3000`.

Set a base variable once:

```bash
BASE=http://localhost:3000
```

## 1) Create appointments (`POST /appointments`)

Create appointment (happy path):

```bash
curl -sS -X POST "$BASE/appointments" \
  -H "Content-Type: application/json" \
  -H "X-Role: patient" \
  -d '{
    "clinicianId": "c1",
    "patientId": "p1",
    "start": "2030-06-01T10:00:00.000Z",
    "end": "2030-06-01T11:00:00.000Z"
  }'
```

Create touching appointment (allowed):

```bash
curl -sS -X POST "$BASE/appointments" \
  -H "Content-Type: application/json" \
  -H "X-Role: patient" \
  -d '{
    "clinicianId": "c1",
    "patientId": "p2",
    "start": "2030-06-01T11:00:00.000Z",
    "end": "2030-06-01T12:00:00.000Z"
  }'
```

Create overlapping appointment (expect `409`):

```bash
curl -sS -w "\nHTTP %{http_code}\n" -X POST "$BASE/appointments" \
  -H "Content-Type: application/json" \
  -H "X-Role: patient" \
  -d '{
    "clinicianId": "c1",
    "patientId": "p3",
    "start": "2030-06-01T10:30:00.000Z",
    "end": "2030-06-01T11:30:00.000Z"
  }'
```

Validation: start in the past (expect `400`):

```bash
curl -sS -w "\nHTTP %{http_code}\n" -X POST "$BASE/appointments" \
  -H "Content-Type: application/json" \
  -H "X-Role: patient" \
  -d '{
    "clinicianId": "c1",
    "patientId": "p1",
    "start": "2000-01-01T10:00:00.000Z",
    "end": "2000-01-01T11:00:00.000Z"
  }'
```

Validation: start equals end (expect `400`):

```bash
curl -sS -w "\nHTTP %{http_code}\n" -X POST "$BASE/appointments" \
  -H "Content-Type: application/json" \
  -H "X-Role: patient" \
  -d '{
    "clinicianId": "c1",
    "patientId": "p1",
    "start": "2030-07-01T10:00:00.000Z",
    "end": "2030-07-01T10:00:00.000Z"
  }'
```

Validation: start after end (expect `400`):

```bash
curl -sS -w "\nHTTP %{http_code}\n" -X POST "$BASE/appointments" \
  -H "Content-Type: application/json" \
  -H "X-Role: patient" \
  -d '{
    "clinicianId": "c1",
    "patientId": "p1",
    "start": "2030-07-01T12:00:00.000Z",
    "end": "2030-07-01T10:00:00.000Z"
  }'
```

Auth: missing `X-Role` header (expect `403`):

```bash
curl -sS -w "\nHTTP %{http_code}\n" -X POST "$BASE/appointments" \
  -H "Content-Type: application/json" \
  -d '{
    "clinicianId": "c1",
    "patientId": "p1",
    "start": "2030-08-01T10:00:00.000Z",
    "end": "2030-08-01T11:00:00.000Z"
  }'
```

## 2) Clinician endpoint (`GET /clinicians/{id}/appointments`)

List clinician upcoming appointments:

```bash
curl -sS "$BASE/clinicians/c1/appointments" \
  -H "X-Role: clinician"
```

List with date range (`YYYY-MM-DD`):

```bash
curl -sS "$BASE/clinicians/c1/appointments?from=2030-06-01&to=2030-06-30" \
  -H "X-Role: clinician"
```

List with datetime + offset:

```bash
curl -sS "$BASE/clinicians/c1/appointments?from=2030-06-01T00:00:00-05:00&to=2030-06-02T23:59:59-05:00" \
  -H "X-Role: clinician"
```

Validation: `from` greater than `to` (expect `400`):

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  "$BASE/clinicians/c1/appointments?from=2030-06-10&to=2030-06-01" \
  -H "X-Role: clinician"
```

Auth: patient role blocked (expect `403`):

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  "$BASE/clinicians/c1/appointments" \
  -H "X-Role: patient"
```

## 3) Admin endpoint (`GET /appointments`)

Get all upcoming appointments:

```bash
curl -sS "$BASE/appointments" \
  -H "X-Role: admin"
```

Get with filters and pagination:

```bash
curl -sS "$BASE/appointments?from=2030-06-01&to=2030-06-30&limit=10&page=1" \
  -H "X-Role: admin"
```

Validation: `from` greater than `to` (expect `400`):

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  "$BASE/appointments?from=2030-06-10&to=2030-06-01" \
  -H "X-Role: admin"
```

Auth: clinician role blocked (expect `403`):

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  "$BASE/appointments" \
  -H "X-Role: clinician"
```

## 4) Swagger

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "$BASE/docs"
```
