# Day 3 — Clinic Appointment MongoDB Schemas

Patient and appointment persistence for a clinic appointment portal, implemented with Node.js and Mongoose. This project demonstrates models, validation, indexes, and a small service/example layer; it does not add HTTP routes.

## Schemas and relationship

**Patient** stores `fullName`, `email`, `phoneNumber`, optional `dateOfBirth`, and automatic `createdAt`/`updatedAt` timestamps. Email is trimmed, lowercased, format-checked, and unique. Phone number and name are required, trimmed, and length-validated.

**Appointment** stores a required `patientId` ObjectId referencing the `Patient` model, `doctorName`, `appointmentDate`, `reason`, `status`, and timestamps. Status defaults to `pending` and is limited to `pending`, `confirmed`, `cancelled`, or `completed`. Appointments validate their patient reference against MongoDB before saving.

This is a one-to-many relationship: each appointment stores one patient reference; a patient can have any number of appointments. Referencing is preferable to embedding because appointment history can grow over time, appointments can be queried and updated independently, and patient documents stay compact. Appointment reads use `populate('patientId', 'fullName')` to return the related patient's name without selecting other patient fields.

## Validation and privacy

- Patient name, email, phone number, appointment doctor, date, reason, and patient reference are required.
- Emails must be valid and are stored lowercase; duplicate email errors become a safe `DUPLICATE_PATIENT_EMAIL` error.
- Date of birth cannot be in the future. Appointment dates must be valid dates; past dates are allowed for appointment history.
- Appointment reason is capped at 500 characters. Do not put diagnoses or unnecessary medical details in this field.
- Patient IDs must be valid ObjectIds and must refer to an existing patient.
- Mongoose validation and cast failures are normalized to a generic validation message; sensitive submitted values are not included in error messages or logs.

## Indexes

Exactly two application indexes are declared in the schemas:

1. **Unique `{ email: 1 }` on Patient**: speeds patient lookup by email during login or booking and prevents duplicate accounts. The trade-off is index storage and additional maintenance on inserts and email updates.
2. **Compound `{ patientId: 1, appointmentDate: 1 }` on Appointment**: supports filtering appointments for one patient and sorting them chronologically. The trade-off is additional storage and index maintenance on appointment inserts or changes to either indexed field.

The service query in `src/services/appointmentService.js` filters by `patientId`, sorts by `appointmentDate`, and populates only the patient's `fullName`.

## Setup

Requirements: Node.js 18+ and either a running MongoDB server or network access for `mongodb-memory-server` to download its test binary.

```bash
npm install
```

Copy `.env.example` to `.env` and set your own connection URI:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/clinic_appointments
```

For hosted MongoDB, replace the example with your provider's URI locally. Never commit `.env` or credentials.

Create a sample patient and appointment, then retrieve the populated appointment list:

```bash
npm start
```

The script loads `.env`, connects to MongoDB, creates sample records using a generated test email, and prints appointment date/status plus the patient's name. The sample data is not automatically removed.

## Tests

Run the local schema/service validation tests (no running database required):

```bash
npm test
```

The database-backed integration suite uses `mongodb-memory-server`; its binary cache is directed to the ignored local `.cache/mongodb-binaries` folder. Run it separately:

```bash
npm run test:integration
```

The integration tests cover document creation, duplicate email enforcement, missing patient references, population, chronological queries, and compound-index usage. If your environment cannot download the memory-server binary or bind its local MongoDB port (as happened in the restricted execution sandbox), run the tests on a machine where MongoDB can run. Exact commands:

```bash
npm install
npm run test:integration
npm start
```

`npm run test:integration` uses an isolated in-memory database and does not require `MONGODB_URI`. Set `MONGODB_URI` for `npm start`. Do not claim database-backed tests passed unless that command completes successfully.

## Assumptions

- The project is a schema/service assignment, so no HTTP API or authentication flow is introduced.
- Email is the patient lookup key; email normalization is lowercase plus trim.
- Historical appointments may have dates in the past.
- A `reason` is required by the assignment but should contain only a brief, non-sensitive description.
