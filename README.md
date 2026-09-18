# purehomeriver-assessment

Full-stack take-home assessment monorepo.

## Stack

- **Frontend** (`apps/web`) - Vue 3, TypeScript, Vite, Tailwind CSS v4, shadcn-vue
- **Backend** (`apps/api`) - NestJS with the Fastify adapter, OpenAPI via `@nestjs/swagger`
- **Monorepo** - pnpm workspaces + Turborepo
- **Testing** - Vitest (v8 coverage)
- **Tooling** - Biome (lint/format), Husky + lint-staged

## Project Structure

```
purehomeriver-assessment/
├── apps/
│   ├── web/         # Vue 3 frontend
│   └── api/         # NestJS (Fastify) backend
├── packages/
│   ├── shared/      # Shared types/utilities (placeholder)
│   ├── config/      # Shared TypeScript config
│   └── ui/          # Shared Vue UI components (placeholder)
└── docs/
```

## Getting Started

```bash
pnpm install
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:3000
- API docs (Swagger UI): http://localhost:3000/docs

## Available Scripts

- `pnpm dev`: Start all apps in development mode
- `pnpm build`: Build all apps and packages
- `pnpm lint`: Run Biome lint across the workspace
- `pnpm typecheck`: Run TypeScript checks across the workspace
- `pnpm test`: Run Vitest in every app
- `pnpm test:coverage`: Run Vitest with v8 coverage
- `pnpm check`: Run Biome formatting and linting with auto-fix
