# Spec Requirements: EventFlows HTTP Integration

## Initial Description

Extend the EventFlows library to support optional REST API generation from module definitions. This enables consumers to define HTTP routes alongside their command/query handlers, with a thin composition layer that generates a fully-functional HTTP server using Hono.

Key aspects from the initial idea:

- Keep modules framework-agnostic (HTTP config is opt-in)
- Enable schema-first command/query definitions using Zod
- Provide automatic route generation from module metadata
- Offer typed handler helpers for custom route logic
- Support Hono as the initial HTTP framework (extensible to others)

## Requirements Discussion

### First Round Questions

**Q1:** I assume the HTTP route configuration should remain entirely opt-in, meaning modules without `routes` defined continue to work exactly as they do today with zero changes to existing code. Is that correct, or should there be some default route generation behavior?
**Answer:** Should work exactly as they do today with zero changes.

**Q2:** The draft spec proposes adding routes to `ModuleSetupResult` (the setup function return). I'm assuming this is preferred over having routes as a separate top-level config in `createModule()` because it keeps all handler-related configuration together. Is that correct?
**Answer:** User requested more information. After detailed comparison of Option A (routes inside setup return) vs Option B (routes as top-level config), user chose **Option B (top-level config)** because:

- Clear separation: `setup` creates handlers, `routes` configures HTTP
- Routes are immediately visible at the top level (not buried in setup)
- Matches mental model: routes are static configuration, not dynamic setup
- Easier to scan a module and understand its API surface

**Q3:** I see the existing `@eventflows/integrations` package has an `aws`, `postgres`, and `in-memory` folder structure. I assume you want to add a `hono/` subfolder here rather than creating a separate `@eventflows/http` package, to keep all integration code together. Is that correct, or should HTTP be its own package?
**Answer:** Yes, use the integrations module. Add `hono/` subfolder to existing `@eventflows/integrations` package.

**Q4:** The draft spec shows Zod schemas used for request body validation on commands. I assume query parameters should also support optional Zod validation for GET requests (e.g., pagination params, filters). Should we include schema validation for query parameters, or keep queries validation-free in the initial release?
**Answer:** Keep it simple for the first iteration - no Zod validation for query params.

**Q5:** For URL parameter extraction (`:userId` -> `userId`), I assume the convention is that URL params always map to handler input properties of the same name without any transformation. Is that correct, or should we support a custom mapping option?
**Answer:** Assume they map directly for now. No custom mapping in v1.

**Q6:** The draft spec shows error mapping based on regex patterns in error messages (e.g., `/not found/i` -> 404). I assume this is the preferred approach over requiring domain errors to extend a specific base class with an explicit status code. Is the pattern-matching approach correct, or should we require typed domain errors?
**Answer:** Pattern matching for now - keep it simple.

**Q7:** For successful responses, I assume the default behavior is to return the handler result directly as JSON. Should we also support response transformation at the route level (e.g., mapping internal IDs to public formats, adding HATEOAS links)?
**Answer:** Just return JSON directly for now. No response transformation in v1.

**Q8:** Regarding route-specific middleware: I assume middleware can be added globally via `createHttpServer` config, but we should defer route-level middleware to a future release to keep scope manageable. Is that correct, or is route-specific middleware essential for this release?
**Answer:** Defer to future release. Only global middleware in v1.

**Q9:** For authentication/authorization, I assume this should be handled via Hono middleware (global or route-specific) rather than baked into the route config, keeping the core library auth-agnostic. Is that correct?
**Answer:** Defer to future release. Auth handled via Hono middleware, not baked into route config.

**Q10:** Is there anything you explicitly want to exclude from this implementation, or any constraints I should be aware of?
**Answer:** None.

### Follow-up Discussion: Routes Location Trade-offs

User asked about type safety trade-offs for Option B (top-level routes).

**Analysis provided:**

1. **Type Safety:** Fully preserved. Routes use `keyof TCommandHandlers` and `keyof TQueryHandlers` to constrain keys at compile time. TypeScript will error if a route references a non-existent handler.

2. **Runtime Validation:** Low priority. TypeScript catches mismatches at compile time. Optional runtime checks could be added but are not essential.

3. **Generic Inference:** Works well. TypeScript unifies types bidirectionally - if routes reference a handler, TypeScript expects it in setup return.

**Conclusion:** Option B has no significant trade-offs. Type safety is fully preserved.

### Follow-up Discussion: Reducing Duplication

User raised concern about handler names being defined twice (in setup and in routes).

**Alternatives explored:**

1. **Convention-based auto-generation** - Generate routes from handler naming patterns (Create*, Update*, Get*, List*, Delete\*)
2. **Fluent builder pattern** - `withRoute(handler, config)` wrapper
3. **Decorator-style** - TypeScript decorators on class-based handlers
4. **Schema-driven** - Handlers embed their own route config

**User decision:** Prefers **explicit routes** over convention-based approach. Values visibility and explicitness over reducing duplication. The explicit approach makes the API surface immediately visible when reading the module definition.

### Existing Code to Reference

**Similar Features Identified:**

- Module system: `packages/core/src/module/` - types.ts, create-module.ts, create-app.ts
- Existing integrations package structure: `packages/integrations/src/` with aws/, postgres/, in-memory/ subfolders
- Type patterns: Generic inference patterns in `CreateModuleConfig`, `EventFlowsModule`, mapped types for handler extraction

No additional similar features provided by user.

## Visual Assets

### Files Provided:

No visual assets provided.

### Visual Insights:

N/A

## Requirements Summary

### Functional Requirements

**Part 1: Core Module Extensions**

- Add `HttpRouteConfig` type for route configuration (method, path, optional Zod schema)
- Add `ModuleRoutes` type that constrains route keys to existing handler names
- Extend `CreateModuleConfig` to accept optional top-level `routes` property
- Update `createModule` to pass through routes configuration
- Extend `EventFlowsApp` to expose `moduleRoutes` metadata from all modules

**Part 2: HTTP Integration Package**

- Add `hono/` subfolder to `packages/integrations/src/`
- Implement `createHttpServer(app, config)` that generates Hono server from EventFlows app
- Implement route generator that reads module route metadata and creates Hono routes
- Implement error middleware with pattern-matching error-to-status mapping
- Implement typed handler helpers (`commandHandler`, `queryHandler`) for custom route logic
- Include `/health` endpoint by default

**Route Configuration Behavior:**

- Routes are opt-in at the module level via top-level `routes` property
- Modules without `routes` work exactly as before (zero breaking changes)
- Route keys are type-constrained to existing handler names (compile-time safety)
- URL parameters map directly to handler input properties (`:userId` -> `userId`)
- Zod schemas validate request bodies for commands (POST/PUT/PATCH)
- Query parameters passed through without validation in v1

**HTTP Response Behavior:**

- Handler results returned directly as JSON
- POST returns 201, DELETE returns 204, others return 200
- Error messages pattern-matched to HTTP status codes:
  - `/not found/i` -> 404
  - `/already in use|already exists|duplicate/i` -> 409
  - `/cannot be empty|invalid|required/i` -> 400
  - `/unauthorized|not allowed|forbidden/i` -> 403
  - Default -> 500

### Reusability Opportunities

**From existing codebase:**

- Generic type patterns from `packages/core/src/module/types.ts`
- Module factory pattern from `packages/core/src/module/create-module.ts`
- App composition pattern from `packages/core/src/module/create-app.ts`
- Package structure from `packages/integrations/`

### Scope Boundaries

**In Scope:**

- Core type extensions for route configuration
- Top-level `routes` property in `createModule()`
- `moduleRoutes` metadata on `EventFlowsApp`
- Hono HTTP server generation from app metadata
- Route generator for commands and queries
- Error handling middleware with pattern matching
- Typed handler helpers for custom routes
- Zod validation for request bodies
- URL parameter extraction
- Global middleware support via config
- Health check endpoint

**Out of Scope (Deferred to Future Releases):**

- Route-specific middleware
- Authentication/authorization integration
- Query parameter Zod validation
- Response transformation/mapping
- Support for HTTP frameworks beyond Hono
- Convention-based auto-route generation
- Custom URL parameter mapping

### Technical Considerations

**Package Structure:**

```
packages/integrations/src/
├── hono/
│   ├── create-http-server.ts
│   ├── route-generator.ts
│   ├── error-handler.ts
│   ├── command-handler.ts
│   ├── query-handler.ts
│   └── index.ts
├── aws/
├── postgres/
├── in-memory/
└── index.ts
```

**Dependencies:**

- `hono` as production dependency in integrations package
- `@eventflows/core` as peer dependency
- `zod` as peer dependency (already used for schemas)

**Type Safety Requirements:**

- Routes constrained to `keyof TCommandHandlers` and `keyof TQueryHandlers`
- Full TypeScript inference for handler input/output types
- Compile-time errors for routes referencing non-existent handlers

**API Design (Final):**

```typescript
const userModule = createModule({
  name: "users",
  setup: ({ eventStore }) => ({
    commandHandlers: {
      CreateUser: new CreateUserHandler(eventStore),
      UpdateUser: new UpdateUserHandler(eventStore),
    },
    queryHandlers: {
      GetUser: new GetUserHandler(),
      ListUsers: new ListUsersHandler(),
    },
    eventHandlers: {},
  }),

  // Top-level routes - explicit, type-safe, opt-in
  routes: {
    basePath: "/users",
    commands: {
      CreateUser: { method: "POST", path: "/", schema: createUserSchema },
      UpdateUser: { method: "PUT", path: "/:userId", schema: updateUserSchema },
    },
    queries: {
      GetUser: { method: "GET", path: "/:userId" },
      ListUsers: { method: "GET", path: "/" },
    },
  },
});

// Server composition
const app = createEventFlowsApp({
  eventStore,
  eventBus,
  modules: [userModule] as const,
});

const server = createHttpServer(app, {
  basePath: "/api",
  middleware: [cors(), logger()],
});
```

**Reference Documents:**

- Draft spec: `/Users/jacob.decrane/repos/eap/event-sourcing/eventflows-http-integration-spec.md`
- Product mission: `/Users/jacob.decrane/repos/eap/event-sourcing/agent-os/product/mission.md`
- Tech stack: `/Users/jacob.decrane/repos/eap/event-sourcing/agent-os/product/tech-stack.md`
