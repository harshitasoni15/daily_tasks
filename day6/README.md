# Day 6 — Online Exam Authentication

A standalone Express/MongoDB API for an online exam platform. It implements student registration, JWT login, protected question delivery and exam attempts, admin-only exam management, and student-owned attempt access. Public question responses never include answer keys.

## Architecture and login flow

```mermaid
sequenceDiagram
    participant Client
    participant API as Express API
    participant DB as MongoDB
    Client->>API: POST /api/auth/login (email, password)
    API->>DB: Find user and password hash
    DB-->>API: User record (hash selected privately)
    API->>API: bcrypt compare; sign JWT (sub, role, expiry)
    API-->>Client: User summary + JWT (no password)
    Client->>API: Protected request + Bearer JWT
    API->>API: Verify signature/expiry; apply role and ownership checks
    API->>DB: Read/write exam or owned attempt
    API-->>Client: Authorized resource or safe error
```

Public registration only creates `student` accounts. A JWT contains the user's database ID in `sub` and their role, is signed using `JWT_SECRET`, and expires after `JWT_EXPIRES_IN` (default one hour). Password hashes are selected out of ordinary user queries and omitted from JSON.

## API endpoints

All protected routes require `Authorization: Bearer <token>`.

| Method and path | Access | Purpose |
|---|---|---|
| `POST /api/auth/register` | Public | Register a student; `role` and other unsupported fields are rejected |
| `POST /api/auth/login` | Public | Verify credentials and return an expiring JWT |
| `GET /api/exams/:examId/questions` | Student | Get published exam questions and options, never answer keys |
| `POST /api/exams/:examId/attempts` | Student | Submit answers; server derives student ID from the token and creates an audit record |
| `GET /api/attempts/:attemptId` | Student owner or admin | View an attempt; students are queried by both attempt ID and authenticated student ID |
| `GET /api/admin/exams` | Admin | List/manage exams, including answer keys |
| `POST /api/admin/exams` | Admin | Create an exam and its question keys |
| `PUT /api/admin/exams/:examId` | Admin | Update exam title, publication state, or questions |

Authentication failures return **401**. Authenticated users without the required role return **403**. A student requesting another student's attempt gets **404**, avoiding disclosure that the record exists.

### Register and login examples

Register:

```json
{
  "name": "Sam Student",
  "email": "sam@example.test",
  "password": "choose-a-long-password"
}
```

Registration returns **201** and a student summary only. `password` and `role` are not returned; role is assigned as `student`.

Login:

```json
{
  "email": "sam@example.test",
  "password": "choose-a-long-password"
}
```

Login returns `data.user` and `data.token`. Invalid credentials use the same **401** message for an unknown email and a wrong password.

### Admin exam creation

After authenticating as an admin, `POST /api/admin/exams` accepts:

```json
{
  "title": "HTTP Basics",
  "published": true,
  "questions": [
    {
      "prompt": "Which protocol is used for secure web traffic?",
      "options": [
        { "key": "A", "text": "HTTP" },
        { "key": "B", "text": "HTTPS" }
      ],
      "correctOption": "B"
    }
  ]
}
```

The admin API may see the answer key. `GET /api/exams/:examId/questions` projects only question IDs, prompts, and option keys/text. `POST /api/exams/:examId/attempts` accepts only `{ "answers": [{ "questionId": "<question ObjectId>", "selectedOption": "B" }] }`; score is computed server-side. The client cannot supply `studentId`, score, or exam ID in the body.

## Models and audit trail

- **User:** name, normalized unique email, bcrypt password hash, and `student`/`admin` role. Passwords require at least 12 characters and are limited to bcrypt's 72-byte input limit.
- **Exam:** title, published flag, questions/options and a `correctOption` key configured `select: false`. Admin endpoints explicitly select keys; student question delivery does not.
- **Attempt:** immutable student reference, exam reference, submission timestamp, selected answers, score, and total question count. Student identity comes only from the verified JWT. Attempts have no update route.

Question correctness keys are needed only to calculate a score at submission. They are never included in the question delivery response or attempt response.

## Install and configure

Requirements: Node.js 18+ and MongoDB local or hosted.

```powershell
Set-Location .\day6
npm install
Copy-Item .env.example .env
```

Set values in `.env` locally:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/online_exam_platform
JWT_SECRET=<random-secret-at-least-32-characters>
JWT_EXPIRES_IN=1h
ADMIN_NAME=Platform Admin
ADMIN_EMAIL=admin@example.test
ADMIN_PASSWORD=<unique-password-at-least-12-characters>
```

Generate a production secret with a password manager or a cryptographically secure random generator. Never commit `.env` or use the example placeholder in production.

Start the API:

```powershell
npm start
```

Create an initial admin using the environment variables above. This script creates an admin directly in MongoDB; there is no public admin-registration endpoint:

```powershell
npm run create-admin
```

## Tests and verification

Run the local unit tests:

```powershell
npm test
```

Run MongoDB-backed API integration tests:

```powershell
npm run test:integration
```

Integration tests use `mongodb-memory-server`, including user registration/hash verification, login, invalid credentials and tokens, student/admin authorization, answer-key exclusion, scoring, and attempt ownership. The in-memory MongoDB requires the environment to permit downloading/starting MongoDB and local socket connections. Do not treat integration tests as passed unless that command reports success.

Verification in the current restricted environment: `npm test` passed 15 unit tests across 3 suites; `npm audit` reported zero vulnerabilities. The integration command was attempted, but MongoDB could not connect to its local ephemeral socket (`EACCES 127.0.0.1:<port>`). The eight database-backed integration cases are therefore unverified here.

## Security notes and production limitations

- **Password storage:** bcrypt hashing limits damage if the user collection is exposed. Passwords are never returned by API responses.
- **JWT expiry:** short-lived tokens (one hour by default) limit the usefulness of stolen tokens. This stateless implementation does not revoke a token before expiry; production may add refresh-token rotation and revocation.
- **Transport:** use HTTPS end-to-end to protect bearer tokens in transit. Do not store tokens in insecure browser storage.
- **Authorization:** server-side role checks prevent students from using admin exam-management routes. Public registration cannot select a role.
- **IDOR:** the attempt lookup includes both the URL attempt ID and authenticated student ID for student requests; client-supplied user IDs are ignored.
- **Secret management:** JWT secret is configured via an ignored `.env` file locally or a managed secret store in deployment, never committed.
- **Answer keys:** hidden by default in normal exam queries and excluded from student-facing response mapping.

For production, also add rate limits for registration/login, email verification, password reset and breached-password checks, monitoring/alerting, key rotation, CORS policy, secure deployment secrets, backups, audit retention controls, and security review. HTTPS, safe token storage, account recovery, and JWT revocation are deployment/application responsibilities not implemented here.

## Assumptions

- This is a learning project, not a complete exam scheduling system.
- Admins are bootstrapped from trusted environment variables, not public registration.
- Students may submit a subset of questions; duplicate/unknown question IDs and invalid options are rejected.
- Scores are returned after submission; answer keys are never sent to students.
- A student cannot distinguish a nonexistent attempt from another student's attempt (both return 404).
