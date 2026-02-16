# Specification: EventFlows HTTP Integration

## Goal

Extend the EventFlows library to support optional REST API generation from module definitions, enabling consumers to define HTTP routes alongside their command/query handlers with automatic Hono server generation while keeping modules framework-agnostic.

## User Stories

- As a developer, I want to define HTTP routes directly in my module configuration so that I can expose my commands and queries as a REST API without writing boilerplate server code.
- As a developer, I want my existing modules without routes to continue working exactly as before so that I can adopt HTTP integration incrementally.

## Specific Requirements

**Top-level routes property in createModule**

- Add optional `routes` property to `CreateModuleConfig` interface at the top level (not inside setup return)
- Routes object contains `basePath` (optional string), `commands` (record of route configs), and `queries` (record of route configs)
- Route keys are type-constrained to `keyof TCommandHandlers` and `keyof TQueryHandlers` for compile-time safety
- TypeScript should error if a route references a non-existent handler

**HttpRouteConfig type definition**

- Define `HttpRouteConfig` interface with `method` (GET, POST, PUT, PATCH, DELETE), `path` (string with URL params), and optional `schema` (Zod schema)
- Method is constrained to HTTP method string literals for type safety
- Path supports colon-prefixed URL parameters (e.g., `/:userId`)
- Schema property is only applicable for mutation methods (POST, PUT, PATCH)

**ModuleRoutes type for type-safe route configuration**

- Create `ModuleRoutes<TCommandHandlers, TQueryHandlers>` generic type
- Use mapped types to constrain command routes to `[K in keyof TCommandHandlers]?: HttpRouteConfig`
- Use mapped types to constrain query routes to `[K in keyof TQueryHandlers]?: HttpRouteConfig`
- Include optional `basePath` string property for module-level path prefix

**Expose moduleRoutes metadata on EventFlowsApp**

- Extend `EventFlowsApp` interface to include `moduleRoutes: ModuleRouteMetadata[]`
- `ModuleRouteMetadata` contains `moduleName`, `basePath`, `commands` record, and `queries` record
- Update `createEventFlowsApp` to collect route metadata from all modules during initialization
- Modules without routes should not contribute entries to `moduleRoutes` array

**createHttpServer function in hono integration**

- Implement `createHttpServer(app, config)` that takes an `EventFlowsApp` and returns a Hono instance
- Config includes `basePath` (default: `/api`), `middleware` (array of Hono middleware), and optional `errorHandler`
- Apply global middleware before route handlers
- Include automatic `/health` endpoint returning `{ status: 'ok', timestamp: ISO string }`

**Route generator for automatic route creation**

- Implement `generateRoutes(app)` that reads `app.moduleRoutes` and creates Hono routes
- For each command route, create handler that extracts URL params, parses/validates body, executes command
- For each query route, create handler that extracts URL params and query string, executes query
- URL parameters map directly by convention: `:userId` in path maps to `userId` property in handler input

**Request body validation with Zod schemas**

- Parse JSON body for POST, PUT, PATCH requests
- If route has `schema` property, validate parsed body using `schema.safeParse()`
- Return 400 with `{ error: 'Validation failed', details: result.error.flatten() }` on validation failure
- Return 400 with `{ error: 'Invalid JSON body' }` if JSON parsing fails

**Error handling middleware with pattern matching**

- Create `createErrorMiddleware` that wraps route handlers in try/catch
- Map error messages to HTTP status codes using regex patterns:
  - `/not found/i` -> 404
  - `/already in use|already exists|duplicate/i` -> 409
  - `/cannot be empty|invalid|required/i` -> 400
  - `/unauthorized|not allowed|forbidden/i` -> 403
  - Default -> 500
- Return JSON error response with `error` (type), `message`, and `timestamp`

**HTTP status codes for successful responses**

- POST requests return 201 (Created) with JSON body
- DELETE requests return 204 (No Content) with no body
- All other methods return 200 (OK) with JSON body
- Handler results are returned directly as JSON without transformation

**Typed handler helpers for custom routes**

- Implement `commandHandler(app, commandName, options)` for custom command routes
- Implement `queryHandler(app, queryName, options)` for custom query routes
- Options include `mapRequest` (Context to input), `mapResponse` (optional result transformer), `status` (optional)
- Provide full TypeScript inference for command/query names, input types, and result types

**OpenAPI/Swagger documentation generation (optional)**

- Extend `HttpRouteConfig` with optional OpenAPI metadata fields: `summary`, `description`, `tags`, `responseSchema`
- Implement `generateOpenAPISpec(app, config)` that converts route metadata to OpenAPI 3.0 specification
- Use `zod-to-openapi` or similar library to automatically convert Zod schemas to OpenAPI schema objects
- Add `enableOpenAPI` option to `createHttpServer` config (default: false)
- When enabled, serve OpenAPI spec at `/openapi.json` and Swagger UI at `/api-docs`
- OpenAPI metadata is purely additive - routes without metadata work unchanged
- Zod schemas serve as single source of truth for both validation and documentation

## Visual Design

No visual assets provided.

## Existing Code to Leverage

**packages/core/src/module/types.ts - Generic type patterns**

- Reuse `EventFlowsModule` generic pattern with `TName`, `TCommandHandlers`, `TQueryHandlers`, `TEventHandlers` type parameters
- Follow existing mapped type patterns like `ModuleCommandExecutors` for constraining route keys to handler names
- Use `keyof` constraints to ensure type-safe route-to-handler mapping

**packages/core/src/module/create-module.ts - Module factory pattern**

- Follow existing `CreateModuleConfig` interface structure for adding top-level `routes` property
- Maintain pattern of passing through config properties without modification
- Keep `Object.freeze()` pattern for immutable module factories

**packages/core/src/module/create-app.ts - App composition pattern**

- Follow existing single-pass module iteration pattern for collecting route metadata
- Extend the `EventFlowsApp` return object with `moduleRoutes` property
- Use similar registry/collection pattern as `HandlerRegistry` for route metadata

**packages/integrations/src/ - Integration package structure**

- Follow existing subfolder pattern (aws/, postgres/, in-memory/) for new hono/ folder
- Use similar index.ts re-export pattern for clean package exports
- Match existing dependency patterns with peer dependencies for core package

## Out of Scope

- Route-specific middleware (only global middleware via `createHttpServer` config)
- Authentication/authorization integration (handled via Hono middleware, not baked in)
- Query parameter Zod validation (query params passed through without validation)
- Response transformation/mapping (handler results returned directly as JSON)
- Support for HTTP frameworks beyond Hono (Express, Fastify deferred)
- Convention-based auto-route generation (explicit routes only)
- Custom URL parameter mapping (direct name mapping only: `:userId` -> `userId`)
- Runtime validation of route-handler references (TypeScript provides compile-time safety)
- CORS, logging, or other built-in middleware (consumers add via config.middleware)
