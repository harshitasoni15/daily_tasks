# Course Project Portfolio REST API

A beginner-friendly Express and MongoDB REST API for students to publish course projects and for visitors to browse projects and submit ratings and feedback.

## Technologies

- Node.js and Express.js
- MongoDB and Mongoose
- Jest and Supertest for integration testing
- `mongodb-memory-server` for isolated test data
- Postman collection for manual/API Runner testing

## Project structure

```text
day-2-rest-api/
├── src/
│   ├── config/db.js
│   ├── controllers/projectController.js
│   ├── middleware/errorHandler.js
│   ├── models/Feedback.js
│   ├── models/Project.js
│   ├── routes/projectRoutes.js
│   ├── app.js
│   └── server.js
├── screenshots/
├── tests/projects.test.js
├── postman/collection.json
├── .env.example
├── .gitignore
└── package.json
```

## Requirements and installation

- Node.js 18 or later
- npm
- MongoDB Community Server running locally, or a MongoDB Atlas connection string

From this directory, install dependencies:

```bash
npm install
```

Create a local `.env` file from the example. Do not commit `.env`:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

## Environment variables and MongoDB

Set `MONGODB_URI` in `.env` to the connection URI for your MongoDB server, for example:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/course_project_portfolio
```

For Atlas, use the connection string supplied by your cluster and keep credentials private. Ensure the database user and network access rules are configured in Atlas. The application connects before it starts listening; a failed connection is reported and the server does not start.

## Start the server

```bash
npm start
```

For development with automatic restarts:

```bash
npm run dev
```

The API base URL is `http://localhost:3000` unless `PORT` is changed.

## Data models and validation

**Project** stores `title`, `description`, `technologies`, `githubUrl`, `liveUrl`, `owner`, `published`, and `createdAt`. Projects default to published; set `published: false` to keep a project out of the public listing.

**Feedback** stores a MongoDB `project` reference, visitor `name`, `email`, `rating`, `comment`, and `createdAt`. Feedback is kept in its own collection and related to its project by ObjectId. Project detail responses include a `feedback` array populated from that relationship.

Validation rules:

- Project title, description, technologies, GitHub URL, and owner are required.
- Technologies must be a non-empty array of non-empty strings.
- GitHub URL is required; live demo URL is optional. Supplied URLs must use HTTP or HTTPS.
- Feedback name, valid email, integer rating, and comment are required.
- Rating must be an integer from 1 through 5.
- Comment must be at most 500 characters.
- IDs in project routes must be 24-character hexadecimal MongoDB ObjectIds.
- Invalid request data returns HTTP 400. Invalid data is rejected before creating a document.

## Endpoints

All successful responses use `{ "success": true, "data": ... }`. All errors use `{ "success": false, "message": "...", "error": { "code": "...", "details": "..." } }`.

### 1. Create a project

`POST /api/projects` — creates a published project and returns **201 Created**.

Request:

```json
{
  "title": "Portfolio API",
  "description": "A project portfolio API built for a course assignment.",
  "technologies": ["Node.js", "Express", "MongoDB"],
  "githubUrl": "https://github.com/example/portfolio-api",
  "liveUrl": "https://portfolio.example.com",
  "owner": "Student Developer"
}
```

Success response (generated values abbreviated):

```json
{
  "success": true,
  "data": {
    "_id": "MongoDB-generated ObjectId",
    "title": "Portfolio API",
    "description": "A project portfolio API built for a course assignment.",
    "technologies": ["Node.js", "Express", "MongoDB"],
    "githubUrl": "https://github.com/example/portfolio-api",
    "liveUrl": "https://portfolio.example.com",
    "owner": "Student Developer",
    "published": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### 2. Get all published projects

`GET /api/projects` — returns **200 OK** and an array. The array is empty when there are no published projects.

```json
{
  "success": true,
  "data": []
}
```

Unpublished projects are excluded.

### 3. Get project details

`GET /api/projects/:id` — returns **200 OK** with project details and its feedback array. A valid ID that does not exist returns **404 Not Found**; malformed IDs return **400 Bad Request**.

```json
{
  "success": true,
  "data": {
    "_id": "MongoDB-generated ObjectId",
    "title": "Portfolio API",
    "description": "A project portfolio API built for a course assignment.",
    "technologies": ["Node.js", "Express", "MongoDB"],
    "githubUrl": "https://github.com/example/portfolio-api",
    "liveUrl": "https://portfolio.example.com",
    "owner": "Student Developer",
    "published": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "feedback": []
  }
}
```

### 4. Submit feedback

`POST /api/projects/:id/feedback` — associates the submitted feedback with an existing project and returns **201 Created**.

Request:

```json
{
  "name": "Portfolio Visitor",
  "email": "visitor@example.com",
  "rating": 5,
  "comment": "Clear presentation and a useful project."
}
```

## Error statuses and documented failure case

- **400 Bad Request** — required fields missing, invalid email/rating/comment/URL, or malformed ObjectId.
- **404 Not Found** — a valid project ID does not match an existing project.
- **500 Internal Server Error** — unexpected server/database errors; internal details are not returned.

Submitting feedback for a valid but nonexistent project ID returns exactly:

```json
{
  "success": false,
  "message": "Project not found",
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "details": "No project exists with the supplied ID"
  }
}
```

The feedback lookup occurs before feedback creation, so this failure does not create a feedback document.

## Automated tests

Run the integration tests:

```bash
npm test
```

The tests start an isolated in-memory MongoDB instance, create projects with real database-generated ObjectIds, and cover project creation, published listing/empty listing, project detail, feedback creation, invalid input and ID handling, and the exact missing-project response including a no-feedback-saved assertion. No external MongoDB server or credentials are needed for this test command. Test results should be recorded only after running the command locally.

## Postman collection

Import [`postman/collection.json`](./postman/collection.json) into Postman. Start the server and run the collection in order. The create-project request stores its database-generated ID in the collection variable; subsequent requests reuse it. The collection includes the four API operations, project-not-found and feedback-not-found requests, invalid feedback, and malformed project ID checks. Pre-request scripts generate fresh, valid-looking IDs for the nonexistent-project checks.

## Screenshot evidence

No screenshots are fabricated or included as if tests had been run. Capture the actual Postman response after each request and save evidence in `screenshots/` using these suggested filenames:

1. `screenshots/01-create-project.png`
2. `screenshots/02-get-all-projects.png`
3. `screenshots/03-get-project-by-id.png`
4. `screenshots/04-submit-feedback.png`
5. `screenshots/05-project-not-found.png`

Each screenshot should show the request method/URL, response status, and response body. The folder is included in Git via `.gitkeep`; replace/add screenshots after capturing them in Postman.

## GitHub submission

From the repository root, stage and commit the assignment:

```bash
git add day-2-rest-api
git commit -m "Day 2: Design and implement REST APIs"
git push origin main
```

Confirm your intended branch and remote before pushing. `.env` is ignored; commit only `.env.example`, never real credentials.
