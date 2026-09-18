# Property Agent Assessment

## Overview

A REST API for managing property agents, with a Vue form for creating and editing
them. Use the API to list, view, or delete agents. Data is stored in memory.

## Stack

- Vue 3, Vite, TypeScript, Tailwind CSS, and shadcn-vue
- NestJS with Fastify and Swagger
- pnpm workspaces and Turborepo
- Vitest for tests; Biome, Husky, and lint-staged for code quality

## Running Locally

Requires Node.js 24 and pnpm 11. Run from the repository root:

```bash
pnpm install
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:3000
- Swagger: http://localhost:3000/docs

Optional environment variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | API port | `3000` |
| `WEB_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `VITE_API_URL` | API URL used by the web client | `http://localhost:3000` |

## Quality Commands

```bash
pnpm build
pnpm typecheck
pnpm lint            # Check lint and formatting
pnpm test
pnpm test:coverage
pnpm check           # Apply safe lint and formatting fixes
```

Use the root scripts so Turborepo builds shared dependencies in the right order.

## Repository Structure

```text
apps/api          NestJS API
apps/web          Vue client and UI components
packages/shared   Zod validation schema and API types
packages/config   Shared TypeScript configuration
packages/ui       Unused placeholder
docs/erd.md       Relational data model
```

## Architecture

```text
Vue client -> HTTP -> AgentsController -> AgentsService
                                              |
                                      AgentsRepository
                                              |
                                  InMemoryAgentsRepository
                                              |
                                      Map<string, Agent>
```

The controller handles HTTP, the service owns business rules, and the repository
handles storage. The service generates IDs and timestamps, checks email uniqueness,
and handles missing agents.

## API

Request and response bodies are JSON.

| Method | Path | Success | Errors |
| --- | --- | --- | --- |
| `POST` | `/agents` | `201` Agent | `400`, `409` |
| `GET` | `/agents` | `200` Agent array | |
| `GET` | `/agents/:id` | `200` Agent | `404` |
| `PUT` | `/agents/:id` | `200` Agent | `400`, `404`, `409` |
| `DELETE` | `/agents/:id` | `204` with no body | `404` |

`POST` and `PUT` require `firstName`, `lastName`, `email`, and `mobileNumber`.
`PUT` replaces those fields on an existing agent; it returns `404` if the ID is
unknown. Responses include a UUID `id` and ISO 8601 timestamps, `createdAt` and
`updatedAt`. Updates preserve `createdAt` and set `updatedAt` to the current time.
Client-supplied IDs and timestamps are ignored.

## curl Examples

With `pnpm dev` running, run these commands in Bash (for example, Git Bash or WSL).
The create command saves the generated ID for the remaining requests.

```bash
# Create
ID=$(curl -s http://localhost:3000/agents \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Ada","lastName":"Lovelace","email":"ada@example.com","mobileNumber":"+44 7700 900000"}' \
  | sed -E 's/.*"id":"([^"]+)".*/\1/')
echo "$ID"

# List
curl -s http://localhost:3000/agents

# View
curl -s "http://localhost:3000/agents/$ID"

# Update
curl -s -X PUT "http://localhost:3000/agents/$ID" \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Augusta","lastName":"King","email":"ada@example.com","mobileNumber":"+44 7700 900001"}'

# Delete (-i shows the status of the empty response)
curl -s -i -X DELETE "http://localhost:3000/agents/$ID"
```

## Data Model

The [ERD](docs/erd.md) covers agents, properties, families, tenants, tenancies, notes,
and reminders, including constraints and assumptions. Only Agent CRUD is implemented.

## Web Client and State Management

Open `/` to create an agent or `/?id=<uuid>` to edit one. Creating an agent adds its
ID to the URL so refreshing keeps it in edit mode. Updates are enabled when values
change; **Discard changes** restores the last saved values.

`useAgentForm` holds local form and request state. One screen needs neither a global
store nor a router, so it uses a query parameter and no Pinia or TanStack Query.
All HTTP requests go through the typed `api/agents.ts` module.

## Validation

Both apps use the Zod schema in `packages/shared`. Frontend validation gives quick
feedback; the API validates every write and enforces email uniqueness regardless
of casing.

All four fields are required and trimmed. Names allow up to 100 characters, email
must be valid and at most 254 characters, and mobile numbers allow up to 32
characters without enforcing a country-specific format.

## Error Handling

Structured API errors are the stretch goal. Stable codes let the client handle
errors without depending on message wording:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request body is invalid",
    "details": [{ "path": "email", "message": "Invalid email address" }]
  }
}
```

Validation failures return `400`, missing agents return `404 AGENT_NOT_FOUND`, and
duplicate emails return `409 AGENT_EMAIL_ALREADY_EXISTS`. Field details appear
only on validation errors. Unexpected errors are logged on the server and returned
as a generic `500 INTERNAL_ERROR`.

The form displays validation and duplicate-email errors beside the relevant field,
shows request failures, and disables submission while loading or saving.

## Scalability

The repository is process-local: restarting the API loses all data, and separate
instances have separate stores. The API cannot safely scale horizontally until
persistence is shared. A PostgreSQL repository would also need database constraints
and tests for concurrent writes.

## Engineering Trade-offs

| Decision | Choice | Why | Alternative |
| --- | --- | --- | --- |
| Monorepo | Turborepo | Task ordering and caching for two apps | Nx |
| Backend | NestJS | Modules and dependency injection | Express/Fastify directly |
| HTTP runtime | Fastify | Integrates through Nest's adapter | Express adapter |
| Persistence | Map behind a repository | Meets the in-memory requirement; isolates storage | Database |
| State | Local composable | Form state belongs to one screen | Pinia |
| Validation | Shared schema, enforced by API | Client checks can be bypassed | Frontend-only checks |
| Testing | Service, HTTP, and form behavior | Covers business rules and user flows | Tests aimed only at coverage |

## What I Would Add in Production

- PostgreSQL and migrations
- Authentication and authorization
- Pagination
- Structured logging, metrics, and tracing
- Rate limiting and CI checks
