# Property Agent Assessment

## Overview

A small full-stack application for managing **Property Agents**: a NestJS REST API with
CRUD over an in-memory store, and a Vue form that creates or updates a single agent.
Listing and deleting agents are exposed by the API and demonstrated with `curl` below,
as the brief allows.

The wider domain (properties, families, tenants, tenancies, notes, reminders) is
modelled in [`docs/erd.md`](docs/erd.md) but deliberately not implemented.

## Stack

| Layer      | Choice                                                     |
| ---------- | ---------------------------------------------------------- |
| Frontend   | Vue 3 + Vite + TypeScript, Tailwind CSS v4, shadcn-vue     |
| Backend    | NestJS 12 on the Fastify adapter, Swagger UI at `/docs`    |
| Shared     | `zod` schema shared by both apps (`packages/shared`)       |
| Monorepo   | pnpm workspaces + Turborepo                                |
| Testing    | Vitest (v8 coverage, thresholds enforced)                  |
| Quality    | Biome (lint + format), Husky + lint-staged                 |

## Repository Structure

```
apps/
  api/                 NestJS API
    src/agents/        Agent feature: controller, service, repository, entity, tests
    src/common/        ApiError, global exception filter, zod validation pipe
  web/                 Vue client
    src/api/           Typed fetch wrapper (the only place HTTP happens)
    src/composables/   useAgentForm: form state, validation, submit flow
    src/components/    AgentForm.vue + shadcn-vue primitives in components/ui
packages/
  shared/              agentInputSchema (zod) and API types used by api and web
  config/              Base tsconfig
  ui/                  Placeholder; shadcn-vue lives in apps/web for this exercise
docs/
  erd.md               Relational data model, constraints and assumptions
```

## Architecture

```
Vue Web Client  (AgentForm.vue → useAgentForm → api/agents.ts)
      |
      | HTTP (JSON)
      v
AgentsController          routes, ZodValidationPipe, Swagger metadata
      |
      v
AgentsService             ids, timestamps, email uniqueness, existence checks
      |
      v
AgentsRepository          abstract persistence contract (DI token)
      |
      v
InMemoryAgentsRepository  Map<string, Agent>
```

Business rules live in the service. The controller only translates HTTP; the
repository only stores and retrieves. `ApiExceptionFilter` wraps every error in
one response shape.

## Running Locally

```bash
pnpm install
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:3000
- Swagger UI: http://localhost:3000/docs (raw spec at `/docs-json`)

Environment (all optional):

| Variable       | Used by | Default                 |
| -------------- | ------- | ----------------------- |
| `PORT`         | api     | `3000`                  |
| `WEB_ORIGIN`   | api     | `http://localhost:5173` (CORS allow-list) |
| `VITE_API_URL` | web     | `http://localhost:3000` |

## Quality Commands

```bash
pnpm build           # all packages (shared is built first)
pnpm typecheck
pnpm lint            # Biome, read-only: lint + format check
pnpm test
pnpm test:coverage   # enforces 80/75/80/80 (statements/branches/functions/lines)
pnpm check           # Biome with safe auto-fixes
```

`pnpm typecheck`, `pnpm test` and `pnpm dev` depend on `packages/shared` being built;
running them through the root scripts lets Turborepo handle that order.

## API

Base URL `http://localhost:3000`. All bodies are JSON.

| Method   | Path          | Success          | Errors                                          |
| -------- | ------------- | ---------------- | ----------------------------------------------- |
| `POST`   | `/agents`     | `201` Agent      | `400 VALIDATION_FAILED`, `409 AGENT_EMAIL_ALREADY_EXISTS` |
| `GET`    | `/agents`     | `200` Agent[]    |                                                 |
| `GET`    | `/agents/:id` | `200` Agent      | `404 AGENT_NOT_FOUND`                           |
| `PUT`    | `/agents/:id` | `200` Agent      | `400`, `404`, `409` as above                    |
| `DELETE` | `/agents/:id` | `204` no body    | `404 AGENT_NOT_FOUND`                           |

Agent:

```json
{
  "id": "5c2b6f1e-2b8e-4b7a-9a2c-1e0c6d2f9a10",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "email": "ada@example.com",
  "mobileNumber": "+44 7700 900000",
  "createdAt": "2026-09-18T02:19:56.823Z",
  "updatedAt": "2026-09-18T02:19:56.823Z"
}
```

Request body for `POST` and `PUT` (`PUT` replaces the whole resource):

| Field          | Rules                                             |
| -------------- | ------------------------------------------------- |
| `firstName`    | required, trimmed, 1–100 chars                    |
| `lastName`     | required, trimmed, 1–100 chars                    |
| `email`        | required, trimmed, valid email, ≤254 chars, unique (case-insensitive) |
| `mobileNumber` | required, trimmed, 1–32 chars, no country format enforced |

`id`, `createdAt` and `updatedAt` are server-owned; values sent by a client are ignored.

Error shape (every non-2xx response):

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request body is invalid",
    "details": [{ "path": "email", "message": "Invalid email address" }]
  }
}
```

`details` is present only for validation failures.

## curl Examples

Start the API first (`pnpm dev` or `pnpm --filter api dev`). The commands are meant to
be run in order: the first one stores the generated id in `$ID` so the rest can be
pasted as-is.

```bash
# Create → 201 (captures the generated id)
ID=$(curl -s http://localhost:3000/agents \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Ada","lastName":"Lovelace","email":"ada@example.com","mobileNumber":"+44 7700 900000"}' \
  | sed -E 's/.*"id":"([^"]+)".*/\1/')
echo "$ID"

# List all → 200
curl -s http://localhost:3000/agents

# Get one → 200
curl -s "http://localhost:3000/agents/$ID"

# Update (full replace) → 200; createdAt unchanged, updatedAt advanced
curl -s -X PUT "http://localhost:3000/agents/$ID" \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Augusta","lastName":"King","email":"ada@example.com","mobileNumber":"+44 7700 900001"}'

# Duplicate email, any casing → 409 AGENT_EMAIL_ALREADY_EXISTS
curl -s http://localhost:3000/agents \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Ada","lastName":"Lovelace","email":"ADA@example.com","mobileNumber":"1"}'

# Invalid body → 400 VALIDATION_FAILED with per-field details
curl -s http://localhost:3000/agents \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"","email":"not-an-email"}'

# Delete → 204 with no body (-i shows the status line)
curl -s -i -X DELETE "http://localhost:3000/agents/$ID"

# Deleted agent → 404 AGENT_NOT_FOUND
curl -s "http://localhost:3000/agents/$ID"
```

## Data Model

See [`docs/erd.md`](docs/erd.md): an ER diagram of agents, properties, families,
tenants, tenancies, notes and reminders, with keys, constraints, deletion behaviour and
the assumptions behind them. Only `property_agents` is implemented.

## Web Client

One screen. `/` creates an agent; `/?id=<uuid>` loads it and updates it. After a
successful create the app rewrites the URL to include the id, so a refresh stays in
edit mode and the button switches from **Create Agent** to **Update Agent**. In edit
mode the form tracks the last saved values: **Update Agent** stays disabled until a
field actually differs, and **Discard changes** restores the saved values.

A query parameter was chosen over Vue Router because the scaffold ships without a
router and one form does not justify adding one. Moving to `/agent/:id` later is a
mechanical change confined to `App.vue`.

## State Management

Form state is local to the screen, held in the `useAgentForm` composable
(`form`, per-field errors, `status`, form-level error). There is no Pinia and no
TanStack Query because:

- there is one primary screen;
- form state is UI state, not shared application state;
- server state is fetched, submitted and forgotten — nothing is cached across
  components.

The composable keeps the SFC presentational and makes the state transitions testable
without a browser.

## Validation

`packages/shared` exports one `agentInputSchema` (zod). Both sides use it:

- **Frontend = UX.** `useAgentForm` runs the schema before submitting so users get
  immediate, field-level feedback and no request is sent for obviously invalid input.
- **Backend = authority.** `ZodValidationPipe` runs the same schema on every `POST`/`PUT`
  body and strips unknown keys (which is how client-supplied `id`/timestamps are
  ignored). The Swagger request schema is generated from the same object with
  `z.toJSONSchema`, so docs, UI and API cannot disagree about the rules.

Frontend validation can be bypassed; backend validation cannot.

## Error Handling

| Responsibility                                   | Backend | Frontend |
| ------------------------------------------------ | :-----: | :------: |
| Authoritative validation, uniqueness, existence  |    ✓    |          |
| HTTP status codes and stable error codes         |    ✓    |          |
| Hiding internal error details                    |    ✓    |          |
| UX validation before a request                   |         |    ✓     |
| Rendering messages next to the field they concern|         |    ✓     |
| Request state (loading, disabled submit, retry)  |         |    ✓     |

Backend: `ApiError(status, code, message, details?)` is thrown from the service or
pipe, and a single global `ApiExceptionFilter` renders it. Nest's own exceptions
(unknown route, malformed JSON) get a status-derived code such as `NOT_FOUND`; anything
unexpected is logged server-side and returned as `500 INTERNAL_ERROR` with a generic
message.

Frontend: `api/agents.ts` converts any non-2xx response into `ApiClientError`
(`status`, `code`, `details`) and a failed connection into `NETWORK_ERROR`.
`useAgentForm` maps `VALIDATION_FAILED` details onto fields, turns
`AGENT_EMAIL_ALREADY_EXISTS` into a message on the email field, shows a clear state
when the agent being edited returns `404`, and renders anything else as a form-level
message.

### Stretch goal: stable structured API errors

Chosen over Swagger (already wired by the scaffold) and correlation IDs.

- **Why predictable errors matter.** A client can branch on `error.code` instead of
  parsing human-readable text or guessing from the status alone; `409` means one
  thing (`AGENT_EMAIL_ALREADY_EXISTS`) today and can mean more things tomorrow without
  breaking anyone.
- **How the frontend benefits.** The form's error handling is a small lookup on `code`,
  and validation `details` land on the exact field. No string matching, no special
  cases per endpoint.
- **How it improves maintainability.** New domain errors are one factory in
  `agents.errors.ts`; the filter, the tests and the client already know what to do
  with them. The `500` path guarantees internals never leak, by construction rather
  than by discipline.

## Scalability

The real limitation is `InMemoryAgentsRepository`: its `Map` lives in the process.

```
Instance A → Map A
Instance B → Map B
```

Run two API instances behind a load balancer and each request sees a different
dataset — creates on A are `404` on B. The application therefore **cannot scale
horizontally as it stands**, and a restart loses all data.

The fix is the boundary that already exists: replace the repository binding in
`AgentsModule` with one backed by a shared datastore (PostgreSQL, using the schema
in `docs/erd.md`). The service, controller, validation and tests do not change. API
instances then hold no state and can be scaled out freely.

NestJS itself does not make the application scalable; it provides module boundaries
and dependency injection that keep the codebase maintainable as it grows. Runtime
scalability comes from stateless instances, shared persistence and infrastructure.

## Engineering Trade-offs

| Decision         | Choice                          | Why                                                                 | Alternative                    |
| ---------------- | ------------------------------- | ------------------------------------------------------------------- | ------------------------------ |
| Monorepo         | Turborepo                       | Task graph + caching with almost no config; enough for 2 apps       | Nx (more features, more setup) |
| Backend          | NestJS                          | Modules, DI and testing utilities give clear boundaries for free    | Express/Fastify directly        |
| HTTP runtime     | Fastify adapter                 | Lighter runtime under the same Nest architecture                    | Express adapter                |
| Persistence      | `Map` behind a repository       | Brief requires in-memory; the abstraction keeps the swap cheap      | Database now (out of scope)    |
| Validation       | zod, one schema in `shared`     | Already a dependency; reused by UI, API and Swagger                 | class-validator (+ transformer, +decorators) |
| Errors           | `ApiError` + one global filter  | One response shape, stable codes, no exception hierarchy            | Nest defaults per exception    |
| Update verb      | `PUT` (full replace, `404` if missing) | Small resource; "upsert" satisfied by the single-form UI, ids stay server-owned | `PATCH` / true upsert |
| Edit mode        | `?id=` query parameter          | No router in scaffold; one form                                     | Vue Router `/agent/:id`        |
| State management | Local state in a composable     | One screen; no shared client state                                  | Pinia / TanStack Query         |
| Lint/format      | Biome                           | One fast tool for both, minimal config                              | ESLint + Prettier              |
| Testing          | Behaviour-focused, HTTP-level   | Tests describe the contract; coverage thresholds catch regressions  | Coverage-driven unit tests     |

## What I Would Add in Production

Not required for this exercise; listed for completeness.

- PostgreSQL behind `AgentsRepository`, with migrations for the schema in `docs/erd.md`
- Authentication and authorization
- Pagination on `GET /agents`
- Structured logging and request correlation IDs
- Observability (metrics, tracing, health endpoint)
- Rate limiting
- CI running `pnpm build && pnpm typecheck && pnpm lint && pnpm test:coverage`
