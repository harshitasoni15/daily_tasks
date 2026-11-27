# Day 4 — Express Middleware and Validation

A small Express API for accepting learning-platform quiz attempts. The example demonstrates strict request validation, request ID tracing, request logging, and centralized JSON errors. It uses no database; successful submissions are acknowledged in the response and are not persisted.

## Endpoint

`POST /api/quiz-attempts`

Example request:

```json
{
  "studentId": "STU101",
  "courseId": "COURSE101",
  "quizId": "QUIZ101",
  "answers": [
    { "questionId": "Q1", "selectedOption": "B" },
    { "questionId": "Q2", "selectedOption": "A" }
  ],
  "timeTaken": 300
}
```

On success, the API responds with **201 Created**, a generated attempt ID, the validated attempt fields, submission time, and request ID:

```json
{
  "success": true,
  "message": "Quiz attempt accepted",
  "data": {
    "attemptId": "generated-uuid",
    "studentId": "STU101",
    "courseId": "COURSE101",
    "quizId": "QUIZ101",
    "answers": [
      { "questionId": "Q1", "selectedOption": "B" },
      { "questionId": "Q2", "selectedOption": "A" }
    ],
    "timeTaken": 300,
    "submittedAt": "2026-01-01T00:00:00.000Z"
  },
  "requestId": "generated-uuid"
}
```

## Validation and errors

- `studentId`, `courseId`, and `quizId` must be non-empty strings.
- `answers` must be a non-empty array. Each answer must be an object with non-empty string `questionId` and `selectedOption`.
- `timeTaken` must be a positive integer.
- Unknown fields are rejected both at the request and answer-object level.
- **400 Bad Request** — invalid/missing fields or malformed JSON.
- **404 Not Found** — unknown routes.
- **413 Payload Too Large** — request JSON exceeds 16 KB.
- **500 Internal Server Error** — unexpected failures. The response is generic and contains no stack trace or internal error detail.

All error bodies have `success`, `message`, `errors`, and `requestId` fields. Each validation error identifies its field and a safe message. The matching request ID is also returned in the `X-Request-ID` response header.

## Request ID middleware and logging

Every request gets a new UUID from Node's built-in `crypto.randomUUID()`. Middleware attaches it to `req.requestId`, sets `X-Request-ID`, and logs request ID, method, path, status, and duration. It does not log request bodies or student answers. Centralized error logging uses that same ID for correlation.

## Setup and run

Requirements: Node.js 18+ and npm.

```bash
npm install
npm start
```

The server listens on port `3000`; set `PORT` to use another port.

## Tests

Run the unit tests (no network sockets or external services required):

```bash
npm test
```

These tests verify controller output, request-ID uniqueness/header/logging, field validation, malformed JSON and validation error formatting, and safe centralized 500 responses.

The HTTP integration suite uses Supertest and binds a local ephemeral port. Run it in an environment that permits local socket connections:

```bash
npm run test:integration
```

It exercises the actual Express route, HTTP statuses, headers, malformed JSON, and validation responses.
