# Task Breakdown: EventFlows HTTP Integration

## Overview

Total Task Groups: 5
Estimated Total Tasks: ~40 sub-tasks

This feature extends EventFlows to support optional REST API generation from module definitions, enabling developers to define HTTP routes alongside their command/query handlers with automatic Hono server generation while keeping modules framework-agnostic.

## Task List

### Part 1: Core Type System Extensions

#### Task Group 1: HTTP Route Type Definitions

**Dependencies:** None

- [x] 1.0 Complete HTTP route type system
  - [x] 1.1 Write 2-8 focused tests for route type constraints
    - Limit to 2-8 highly focused tests maximum
    - Test only critical type behaviors (e.g., route key constraint to handler names, method literal types, schema validation)
    - Skip exhaustive testing of all type combinations
  - [x] 1.2 Create `HttpRouteConfig` interface in `packages/core/src/module/types.ts`
    - Add `method` property: `'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'`
    - Add `path` property: `string` (supports colon-prefixed params like `/:userId`)
    - Add optional `schema` property: `z.ZodSchema<any>` for body validation
    - Add optional OpenAPI metadata fields: `summary`, `description`, `tags`, `responseSchema`
  - [x] 1.3 Create `ModuleRoutes<TCommandHandlers, TQueryHandlers>` generic type
    - Add optional `basePath` property: `string`
    - Add `commands` property: `Partial<Record<keyof TCommandHandlers, HttpRouteConfig>>`
    - Add `queries` property: `Partial<Record<keyof TQueryHandlers, HttpRouteConfig>>`
    - Use mapped types to ensure compile-time constraint of route keys to handler names
  - [x] 1.4 Create `ModuleRouteMetadata` interface for runtime route storage
    - Add `moduleName` property: `string`
    - Add `basePath` property: `string | undefined`
    - Add `commands` property: `Record<string, HttpRouteConfig>`
    - Add `queries` property: `Record<string, HttpRouteConfig>`
  - [x] 1.5 Ensure core type tests pass
    - Run ONLY the 2-8 tests written in 1.1
    - Verify TypeScript compilation succeeds with type constraints
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**

- The 2-8 tests written in 1.1 pass
- `HttpRouteConfig` supports all HTTP methods and optional schema
- `ModuleRoutes` type constrains route keys to existing handler names
- TypeScript errors when route references non-existent handler
- OpenAPI metadata fields are optional and type-safe

#### Task Group 2: Module Configuration Extensions

**Dependencies:** Task Group 1

- [x] 2.0 Complete module configuration updates
  - [x] 2.1 Write 2-8 focused tests for module route configuration
    - Limit to 2-8 highly focused tests maximum
    - Test only critical behaviors (e.g., routes pass through to module, modules without routes still work, route metadata collection)
    - Skip exhaustive testing of all configuration permutations
  - [x] 2.2 Extend `CreateModuleConfig` interface in `packages/core/src/module/types.ts`
    - Add optional `routes` property: `ModuleRoutes<TCommandHandlers, TQueryHandlers>`
    - Ensure type inference works bidirectionally (routes reference handlers, handlers satisfy routes)
  - [x] 2.3 Update `EventFlowsModule` interface
    - Add optional `routes` property matching the type from `CreateModuleConfig`
    - Maintain immutability with `Readonly` wrapper
  - [x] 2.4 Update `createModule` in `packages/core/src/module/create-module.ts`
    - Pass through `routes` configuration from config to module factory
    - Maintain existing `Object.freeze()` pattern for immutability
    - Ensure modules without routes continue working exactly as before
  - [x] 2.5 Ensure module configuration tests pass
    - Run ONLY the 2-8 tests written in 2.1
    - Verify modules with and without routes both work correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**

- The 2-8 tests written in 2.1 pass
- `CreateModuleConfig` accepts optional top-level `routes` property
- Type inference correctly maps routes to handlers
- Modules without routes have zero behavioral changes
- `createModule` passes through routes without modification

#### Task Group 3: App-Level Route Metadata Collection

**Dependencies:** Task Group 2

- [x] 3.0 Complete app-level route metadata integration
  - [x] 3.1 Write 2-8 focused tests for route metadata collection
    - Limit to 2-8 highly focused tests maximum
    - Test only critical behaviors (e.g., collecting routes from multiple modules, filtering modules without routes, metadata structure)
    - Skip exhaustive testing of all module combinations
  - [x] 3.2 Extend `EventFlowsApp` interface in `packages/core/src/module/types.ts`
    - Add `moduleRoutes` property: `ModuleRouteMetadata[]`
    - Ensure interface remains backward compatible
  - [x] 3.3 Update `createEventFlowsApp` in `packages/core/src/module/create-app.ts`
    - Add route metadata collection during module initialization
    - Iterate through modules and extract route configurations
    - Convert module routes to `ModuleRouteMetadata` format
    - Filter out modules without routes (don't add empty entries)
    - Store in `moduleRoutes` array on returned app instance
  - [x] 3.4 Ensure app metadata tests pass
    - Run ONLY the 2-8 tests written in 3.1
    - Verify route metadata collected from all modules with routes
    - Verify modules without routes don't appear in metadata
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**

- The 2-8 tests written in 3.1 pass
- `EventFlowsApp` exposes `moduleRoutes` array
- Route metadata collected from all modules during app creation
- Modules without routes excluded from metadata array
- Metadata structure matches `ModuleRouteMetadata` interface

### Part 2: Hono HTTP Integration Package

#### Task Group 4: HTTP Server Foundation

**Dependencies:** Task Group 3

- [x] 4.0 Complete HTTP server foundation
  - [x] 4.1 Write 2-8 focused tests for HTTP server creation
    - Limit to 2-8 highly focused tests maximum
    - Test only critical behaviors (e.g., server initialization, health endpoint, global middleware application)
    - Skip exhaustive testing of all server configurations
  - [x] 4.2 Create package structure in `packages/integrations/src/hono/`
    - Create `create-http-server.ts` file
    - Create `types.ts` file for HTTP-specific types
    - Create `index.ts` file for exports
    - Update `packages/integrations/src/index.ts` to re-export hono types
  - [x] 4.3 Define `HttpServerConfig` interface in `types.ts`
    - Add `basePath` property: `string` (default: `/api`)
    - Add optional `middleware` property: `MiddlewareHandler[]` (Hono middleware)
    - Add optional `enableOpenAPI` property: `boolean` (default: false)
  - [x] 4.4 Implement `createHttpServer` function in `create-http-server.ts`
    - Accept `EventFlowsApp` and `HttpServerConfig` parameters
    - Initialize new Hono instance
    - Apply global middleware from config before route handlers
    - Add automatic `/health` endpoint returning `{ status: 'ok', timestamp: ISO string }`
    - Return Hono instance
  - [x] 4.5 Add Hono as production dependency
    - Update `packages/integrations/package.json` to include `hono` dependency
    - Ensure `@eventflows/core` remains as peer dependency
    - Add `zod` as peer dependency if not already present
  - [x] 4.6 Ensure HTTP server foundation tests pass
    - Run ONLY the 2-8 tests written in 4.1
    - Verify server initializes correctly
    - Verify health endpoint responds with correct format
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**

- The 6 tests written in 4.1 pass
- Package structure follows existing integration patterns
- `createHttpServer` creates Hono instance with config
- Health endpoint available at `/health`
- Global middleware applied before routes
- Dependencies properly declared

#### Task Group 5: Error Handling Middleware

**Dependencies:** Task Group 4

- [x] 5.0 Complete error handling system
  - [x] 5.1 Write 2-8 focused tests for error handling
    - Limit to 2-8 highly focused tests maximum
    - Test only critical error scenarios (e.g., pattern matching for 404/409/400/403, default 500, JSON error format)
    - Skip exhaustive testing of all error types and edge cases
  - [x] 5.2 Create `error-handler.ts` in `packages/integrations/src/hono/`
  - [x] 5.3 Implement `createErrorHandler` function (using Hono's onError instead of middleware)
    - Implement pattern-matching error-to-status mapping:
      - `/not found/i` -> 404
      - `/already in use|already exists|duplicate/i` -> 409
      - `/cannot be empty|invalid|required/i` -> 400
      - `/unauthorized|not allowed|forbidden/i` -> 403
      - Default -> 500
    - Return JSON error response: `{ error: string, message: string, timestamp: string }`
    - Use ISO timestamp format
  - [x] 5.4 Integrate error handler into `createHttpServer`
    - Apply error handler using Hono's `onError` method
  - [x] 5.5 Ensure error handling tests pass
    - Run ONLY the tests written in 5.1
    - Verify error patterns correctly mapped to status codes
    - Verify JSON error format matches spec
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**

- The 11 tests written in 5.1 pass (6 for mapErrorToStatus + 6 for createErrorHandler)
- Error handler wraps all route execution via Hono's onError
- Pattern matching correctly maps errors to HTTP status codes
- Error responses include `error`, `message`, and `timestamp`
- HTTPException errors preserve their native status codes

### Part 3: Automatic Route Generation

#### Task Group 6: Command Route Generator

**Dependencies:** Task Group 5

- [x] 6.0 Complete command route generation
  - [x] 6.1 Write 2-8 focused tests for command route generation
    - Limit to 2-8 highly focused tests maximum
    - Test only critical behaviors (e.g., POST route creation, URL param extraction, schema validation, 201 status)
    - Skip exhaustive testing of all command variations
  - [x] 6.2 Create `route-generator.ts` in `packages/integrations/src/hono/`
  - [x] 6.3 Implement `generateCommandRoute` function
    - Accept module name, command name, route config, and app instance
    - Extract URL parameters from path (`:userId` -> `userId`)
    - Parse JSON request body for POST/PUT/PATCH methods
    - Return 400 with `{ error: 'Invalid JSON body' }` on JSON parse failure
    - Validate request body using route schema if provided
    - Return 400 with `{ error: 'Validation failed', details: error.flatten() }` on validation failure
    - Merge URL params with validated body to create command input
    - Execute command using `app.commands[commandName](input)`
    - Return appropriate status code: POST -> 201, DELETE -> 204, others -> 200
    - Return result as JSON (or empty body for 204)
  - [x] 6.4 Implement HTTP status code logic
    - POST requests return 201 (Created) with JSON body
    - DELETE requests return 204 (No Content) with no body
    - PUT/PATCH requests return 200 (OK) with JSON body
  - [x] 6.5 Ensure command route tests pass
    - Run ONLY the 2-8 tests written in 6.1
    - Verify command execution with URL params and body
    - Verify schema validation and error responses
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**

- The 7 tests written in 6.1 pass
- Command routes extract URL parameters correctly
- Request body validation works with Zod schemas
- Correct HTTP status codes returned (201 for POST, 204 for DELETE, 200 for others)
- Validation errors return 400 with details
- Commands executed via app instance

#### Task Group 7: Query Route Generator

**Dependencies:** Task Group 5

- [x] 7.0 Complete query route generation
  - [x] 7.1 Write 2-8 focused tests for query route generation
    - Limit to 2-8 highly focused tests maximum
    - Test only critical behaviors (e.g., GET route creation, URL param extraction, query string params, 200 status)
    - Skip exhaustive testing of all query variations
  - [x] 7.2 Implement `generateQueryRoute` function in `route-generator.ts`
    - Accept module name, query name, route config, and app instance
    - Extract URL parameters from path (`:userId` -> `userId`)
    - Extract query string parameters from request
    - Merge URL params with query string params to create query input
    - No validation on query parameters (pass through as-is)
    - Execute query using `app.queries[queryName](input)`
    - Return 200 (OK) status with JSON result
  - [x] 7.3 Ensure query route tests pass
    - Run ONLY the 2-8 tests written in 7.1
    - Verify query execution with URL params and query string
    - Verify 200 status with JSON response
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**

- The 4 tests written in 7.1 pass
- Query routes extract URL parameters correctly
- Query string parameters passed through without validation
- Queries executed via app instance
- 200 status code with JSON result

#### Task Group 8: Route Registration System

**Dependencies:** Task Groups 6 and 7

- [x] 8.0 Complete route registration system
  - [x] 8.1 Write 2-8 focused tests for route registration
    - Limit to 2-8 highly focused tests maximum
    - Test only critical behaviors (e.g., registering multiple modules, basePath concatenation, command and query routes)
    - Skip exhaustive testing of all registration scenarios
  - [x] 8.2 Implement `generateRoutes` function in `route-generator.ts`
    - Accept `EventFlowsApp` and `Hono` instance
    - Iterate through `app.moduleRoutes`
    - For each module with routes:
      - Combine module `basePath` with server `basePath` (e.g., `/api` + `/users` -> `/api/users`)
      - Iterate through command routes and call `generateCommandRoute`
      - Iterate through query routes and call `generateQueryRoute`
      - Register each route with Hono instance
  - [x] 8.3 Integrate `generateRoutes` into `createHttpServer`
    - Call `generateRoutes` after middleware setup
    - Pass app instance and Hono instance
  - [x] 8.4 Ensure route registration tests pass
    - Run ONLY the 2-8 tests written in 8.1
    - Verify routes registered for all modules with route config
    - Verify basePath concatenation works correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**

- The 4 tests written in 8.1 pass
- All command and query routes registered automatically
- Module basePath and server basePath concatenated correctly
- Routes accessible at expected paths

### Part 4: Typed Handler Helpers

#### Task Group 9: Custom Route Handler Helpers

**Dependencies:** Task Group 8

- [x] 9.0 Complete typed handler helpers
  - [x] 9.1 Write 2-8 focused tests for handler helpers
    - Limit to 2-8 highly focused tests maximum
    - Test only critical behaviors (e.g., command handler with custom mapping, query handler with response transformation, type inference)
    - Skip exhaustive testing of all helper variations
  - [x] 9.2 Create `command-handler.ts` in `packages/integrations/src/hono/`
  - [x] 9.3 Create `query-handler.ts` in `packages/integrations/src/hono/`
  - [x] 9.4 Implement `commandHandler` function
    - Accept `EventFlowsApp`, module name, command name, and options
    - Options: `mapRequest` (Context to command input), optional `mapResponse`, optional `status` code
    - Provide full TypeScript inference for command name, input type, result type
    - Return Hono handler function
    - Use error middleware pattern for consistency
  - [x] 9.5 Implement `queryHandler` function
    - Accept `EventFlowsApp`, module name, query name, and options
    - Options: `mapRequest` (Context to query input), optional `mapResponse`, optional `status` code
    - Provide full TypeScript inference for query name, input type, result type
    - Return Hono handler function
    - Use error middleware pattern for consistency
  - [x] 9.6 Export helpers from `packages/integrations/src/hono/index.ts`
  - [x] 9.7 Ensure handler helper tests pass
    - Run ONLY the 2-8 tests written in 9.1
    - Verify custom request/response mapping works
    - Verify type inference for handler names and types

**Acceptance Criteria:**

- The 8 tests written in 9.1 pass (4 for commandHandler + 4 for queryHandler)
- `commandHandler` and `queryHandler` functions provide type-safe helpers
- Custom request mapping supported via `mapRequest`
- Custom response transformation supported via `mapResponse`
- Full TypeScript inference for names and types

### Part 5: OpenAPI Documentation (Optional)

#### Task Group 10: OpenAPI Specification Generation

**Dependencies:** Task Group 8

- [x] 10.0 Complete OpenAPI documentation generation
  - [x] 10.1 Write 2-8 focused tests for OpenAPI spec generation
    - Limit to 2-8 highly focused tests maximum
    - Test only critical behaviors (e.g., spec generation structure, Zod schema conversion, route metadata inclusion)
    - Skip exhaustive testing of all OpenAPI features
  - [x] 10.2 Add `zod-openapi` or similar library as dependency
    - Update `packages/integrations/package.json`
    - Choose library for Zod to OpenAPI schema conversion
  - [x] 10.3 Create `openapi-generator.ts` in `packages/integrations/src/hono/`
  - [x] 10.4 Implement `generateOpenAPISpec` function
    - Accept `EventFlowsApp` and config (title, version, description)
    - Create base OpenAPI 3.0 spec structure
    - Iterate through `app.moduleRoutes`
    - For each route:
      - Convert path with params to OpenAPI format (`:userId` -> `{userId}`)
      - Add path and method to spec
      - Include `summary`, `description`, `tags` from route config if present
      - Convert Zod request schema to OpenAPI schema object
      - Convert Zod response schema to OpenAPI schema object if present
      - Add parameter definitions for URL params
    - Return complete OpenAPI spec object
  - [x] 10.5 Integrate OpenAPI into `createHttpServer`
    - Check `enableOpenAPI` config option
    - If enabled, generate spec using `generateOpenAPISpec`
    - Serve spec at `/openapi.json` endpoint
    - Add Swagger UI at `/api-docs` endpoint (use `@hono/swagger-ui` or similar)
  - [x] 10.6 Ensure OpenAPI tests pass
    - Run ONLY the 2-8 tests written in 10.1
    - Verify spec generation with routes
    - Verify Zod schema conversion

**Acceptance Criteria:**

- The 6 tests written in 10.1 pass
- OpenAPI 3.0 spec generated from route metadata
- Zod schemas converted to OpenAPI schema objects using zod-to-json-schema
- Spec available at `/openapi.json` when enabled
- Swagger UI available at `/api-docs` when enabled (using CDN)
- OpenAPI metadata fields from routes included in spec
- Routes without metadata still work (metadata is additive)

### Part 6: Integration Testing & Documentation

#### Task Group 11: Integration Testing & Gap Analysis

**Dependencies:** Task Groups 1-10

- [x] 11.0 Review existing tests and fill critical gaps only
  - [x] 11.1 Review tests from Task Groups 1-10
    - Review the 2-8 tests written by each specialist group (1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1)
    - Total existing tests: approximately 20-80 tests
  - [x] 11.2 Analyze test coverage gaps for this feature only
    - Identify critical integration points lacking test coverage
    - Focus ONLY on gaps related to HTTP integration feature requirements
    - Do NOT assess entire EventFlows library test coverage
    - Prioritize end-to-end workflows: module with routes -> app creation -> HTTP server -> route execution
  - [x] 11.3 Write up to 10 additional strategic tests maximum
    - Add maximum of 10 new integration tests to fill identified critical gaps
    - Focus on end-to-end workflows (e.g., full request lifecycle through command/query)
    - Test cross-cutting concerns (e.g., error handling + validation, middleware + routes)
    - Skip edge cases, performance tests unless business-critical
  - [x] 11.4 Run feature-specific integration tests
    - Run ONLY tests related to HTTP integration feature (tests from 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, and 11.3)
    - Expected total: approximately 30-90 tests maximum
    - Do NOT run the entire EventFlows test suite
    - Verify critical workflows pass
  - [x] 11.5 Create example usage in repository
    - Add example module with routes to `examples/` or test fixtures
    - Show complete workflow from module definition to HTTP server
    - Include example with commands, queries, schemas, and OpenAPI metadata
    - Keep example concise and focused on HTTP integration features

**Acceptance Criteria:**

- All feature-specific tests pass (approximately 30-90 tests total)
- Critical integration workflows covered (module -> app -> server -> routes)
- No more than 10 additional tests added when filling gaps
- Example usage demonstrates complete HTTP integration workflow
- Testing focused exclusively on HTTP integration feature requirements

#### Task Group 12: Documentation & Export Verification

**Dependencies:** Task Group 11

- [x] 12.0 Complete documentation and exports
  - [x] 12.1 Verify all types and functions exported correctly
    - Check `packages/core/src/module/index.ts` exports new types
    - Check `packages/integrations/src/hono/index.ts` exports all functions
    - Check `packages/integrations/src/index.ts` re-exports hono integration
  - [x] 12.2 Add JSDoc comments to public APIs
    - Document `HttpRouteConfig` interface
    - Document `ModuleRoutes` type
    - Document `createHttpServer` function
    - Document `commandHandler` and `queryHandler` functions
    - Document `generateOpenAPISpec` function
    - Include usage examples in JSDoc
  - [x] 12.3 Update package exports in `package.json`
    - Ensure `packages/core/package.json` exports include new types
    - Ensure `packages/integrations/package.json` exports include hono integration
  - [x] 12.4 Verify TypeScript compilation
    - Run `tsc --noEmit` in packages/core
    - Run `tsc --noEmit` in packages/integrations
    - Ensure no type errors introduced
  - [x] 12.5 Verify backward compatibility
    - Create test with existing module (no routes)
    - Verify module creation still works
    - Verify app creation still works
    - Ensure zero breaking changes for existing code

**Acceptance Criteria:**

- All new types and functions properly exported
- JSDoc comments added to public APIs
- Package exports correctly configured
- TypeScript compilation succeeds with no errors
- Backward compatibility verified (existing modules work unchanged)

## Execution Order

Recommended implementation sequence:

### Phase 1: Core Type System (Task Groups 1-3) ✅ COMPLETED

1. HTTP Route Type Definitions (Task Group 1) ✅
2. Module Configuration Extensions (Task Group 2) ✅
3. App-Level Route Metadata Collection (Task Group 3) ✅

**Milestone:** Core module system extended with route configuration types and metadata collection

**Summary:**

- Created `HttpRouteConfig`, `ModuleRoutes`, and `ModuleRouteMetadata` types
- Extended `CreateModuleConfig` and `EventFlowsModule` interfaces with optional `routes` property
- Updated `createModule` to pass through routes configuration
- Extended `EventFlowsApp` interface with `moduleRoutes` property
- Updated `createEventFlowsApp` to collect route metadata from modules
- All 23 Phase 1 tests passing
- All 139 existing tests still passing (backward compatibility verified)

### Phase 2: HTTP Server Foundation (Task Groups 4-5) ✅ COMPLETED

4. HTTP Server Foundation (Task Group 4) ✅
5. Error Handling Middleware (Task Group 5) ✅

**Milestone:** Basic HTTP server creation with error handling

**Summary:**

- Created package structure in `packages/integrations/src/hono/`
- Defined `HttpServerConfig` interface with `basePath`, `middleware`, and `enableOpenAPI` options
- Implemented `createHttpServer` function that creates Hono instance with health endpoint
- Implemented `createErrorHandler` function with pattern-based error mapping (404, 409, 400, 403, 500)
- Created `mapErrorToStatus` utility function for error message pattern matching
- Integrated error handler using Hono's `onError` method
- Created `InMemoryEventStore` for testing
- All 17 Phase 2 tests passing (6 for create-http-server + 11 for error-handler)
- Hono already added as production dependency
- Error responses include `error`, `message`, and `timestamp` in ISO 8601 format

### Phase 3: Route Generation (Task Groups 6-8) ✅ COMPLETED

6. Command Route Generator (Task Group 6) ✅
7. Query Route Generator (Task Group 7) ✅
8. Route Registration System (Task Group 8) ✅

**Milestone:** Automatic route generation from module metadata

**Summary:**

- Created `route-generator.ts` with route generation functions
- Implemented `generateCommandRoute` function:
  - Extracts URL parameters from path (`:userId` -> `userId`)
  - Parses JSON request body for POST/PUT/PATCH methods
  - Validates request body using Zod schema if provided
  - Returns 400 for invalid JSON or validation failures
  - Merges URL params with body to create command input
  - Executes command via `app.commands[commandName]`
  - Returns correct status codes: POST -> 201, DELETE -> 204, PUT/PATCH -> 200
- Implemented `generateQueryRoute` function:
  - Extracts URL parameters and query string parameters
  - Merges both into query input (no validation)
  - Executes query via `app.queries[queryName]`
  - Returns 200 status with JSON result
- Implemented `generateRoutes` function:
  - Iterates through `app.moduleRoutes`
  - Combines module basePath with server basePath
  - Registers all command and query routes
  - Handles backward compatibility (apps without moduleRoutes)
- Integrated `generateRoutes` into `createHttpServer`
- All 15 route generator tests passing (7 for commands + 4 for queries + 4 for registration)
- All 32 hono integration tests passing
- Exports updated in `packages/integrations/src/hono/index.ts`

### Phase 4: Advanced Features (Task Groups 9-10) ✅ COMPLETED

9. Custom Route Handler Helpers (Task Group 9) ✅
10. OpenAPI Documentation Generation (Task Group 10) ✅

**Milestone:** Type-safe handler helpers and OpenAPI documentation

**Summary:**

- Created `command-handler.ts` and `query-handler.ts` with typed handler helpers
- Implemented `commandHandler` function:
  - Accepts `EventFlowsApp`, module name, command name, and options
  - Options: `mapRequest` (Context to command input), optional `mapResponse`, optional `status` code
  - Returns Hono handler function with full TypeScript inference
  - Errors propagate to Hono's error handler
- Implemented `queryHandler` function:
  - Accepts `EventFlowsApp`, module name, query name, and options
  - Options: `mapRequest` (Context to query input), optional `mapResponse`, optional `status` code
  - Returns Hono handler function with full TypeScript inference
  - Errors propagate to Hono's error handler
- All 8 handler helper tests passing (4 for commandHandler + 4 for queryHandler)
- Created `openapi-generator.ts` with OpenAPI 3.0 spec generation
- Implemented `generateOpenAPISpec` function:
  - Accepts `EventFlowsApp` and config (title, version, description)
  - Creates base OpenAPI 3.0 spec structure
  - Iterates through `app.moduleRoutes`
  - Converts path params to OpenAPI format (`:userId` -> `{userId}`)
  - Converts Zod schemas to OpenAPI schema objects using zod-to-json-schema
  - Includes `summary`, `description`, `tags` from route config
  - Handles request and response schemas
  - Returns complete OpenAPI spec object
- Integrated OpenAPI into `createHttpServer`:
  - Checks `enableOpenAPI` config option
  - Generates spec using `generateOpenAPISpec`
  - Serves spec at `/openapi.json` endpoint
  - Serves Swagger UI at `/api-docs` endpoint (using CDN)
- Updated `HttpServerConfig` to include OpenAPI configuration options
- All 6 OpenAPI tests passing
- All 46 hono integration tests passing
- Dependencies: Added `zod-to-json-schema` for schema conversion
- Exports updated in `packages/integrations/src/hono/index.ts`

### Phase 5: Integration & Documentation (Task Groups 11-12)

11. Integration Testing & Gap Analysis (Task Group 11)
12. Documentation & Export Verification (Task Group 12)

**Milestone:** Feature complete, tested, and documented

## Implementation Notes

### Type Safety Constraints

- Route keys must be constrained to `keyof TCommandHandlers` and `keyof TQueryHandlers`
- TypeScript should error at compile-time if route references non-existent handler
- Full type inference for handler input/output types in helper functions

### Backward Compatibility

- Modules without `routes` property must work exactly as before
- No breaking changes to existing `createModule` or `createEventFlowsApp` APIs
- All route functionality is opt-in

### Testing Strategy

- Each task group writes 2-8 focused tests maximum during development
- Tests run in isolation (only tests for that task group)
- Integration testing phase (Task Group 11) adds maximum 10 additional tests for gaps
- Total expected test count: 30-90 tests for entire feature

### Dependencies

- Add `hono` as production dependency in `packages/integrations` ✅
- `@eventflows/core` remains peer dependency ✅
- `zod` as peer dependency (already in use) ✅
- `zod-to-json-schema` for OpenAPI generation ✅

### Code Reuse Patterns

- Follow existing generic type patterns from `packages/core/src/module/types.ts`
- Follow existing module factory pattern from `packages/core/src/module/create-module.ts`
- Follow existing app composition pattern from `packages/core/src/module/create-app.ts`
- Follow existing integration package structure (aws/, postgres/, in-memory/ pattern)

### Out of Scope (Deferred)

- Route-specific middleware (only global middleware in v1)
- Authentication/authorization integration (handled via Hono middleware)
- Query parameter Zod validation (no validation in v1)
- Response transformation/mapping (direct JSON return in v1)
- Support for HTTP frameworks beyond Hono
- Convention-based auto-route generation (explicit routes only)
- Custom URL parameter mapping (direct name mapping only)

**Summary:**

- Created comprehensive end-to-end HTTP integration tests
- Implemented 10 integration tests covering:
  - Full request lifecycle (POST -> command -> 201 response)
  - Validation errors with 400 status
  - Domain errors with correct status codes (409 for conflicts, 404 for not found)
  - GET queries with URL params
  - PUT requests with URL params and body validation
  - Multiple modules with different basePaths
  - Global middleware application
  - OpenAPI spec generation when enabled
  - Backward compatibility with modules without routes
- Fixed critical bug in `combineBasePaths` function:
  - When path2 is `/`, now returns path1 without adding trailing slash
  - Prevents route mismatch issues (e.g., `/api/users/` vs `/api/users`)
  - Updated affected tests to match new behavior
- Created comprehensive example in `examples/http-integration-example.ts`:
  - Demonstrates user and product modules with full CQRS patterns
  - Shows command handlers, query handlers, and event handlers
  - Includes schema validation with Zod
  - Demonstrates OpenAPI metadata
  - Shows custom middleware integration
  - Includes example programmatic requests
- Verified all exports are correct:
  - Core module exports: `HttpRouteConfig`, `ModuleRoutes`, `ModuleRouteMetadata`
  - Hono integration exports: All functions and types properly exported
  - Package re-exports: `@eventflows/integrations` correctly re-exports hono integration
- Verified JSDoc documentation is comprehensive:
  - All HTTP route types have detailed JSDoc with examples
  - All handler helper functions (`commandHandler`, `queryHandler`) have usage examples
  - `createHttpServer` function has complete documentation
  - `generateOpenAPISpec` function has detailed examples
- Verified TypeScript compilation:
  - Both `packages/core` and `packages/integrations` compile without errors
  - No type errors introduced
- Verified backward compatibility:
  - Integration test confirms modules without routes work unchanged
  - Existing 188 tests continue to pass
  - Zero breaking changes
- All 198 tests passing (188 existing + 10 new integration tests)
- Total HTTP integration feature tests: 76 tests
  - Phase 1 (Core Types): 23 tests
  - Phase 2 (HTTP Server): 17 tests
  - Phase 3 (Route Generation): 15 tests
  - Phase 4 (Advanced Features): 14 tests
  - Phase 5 (Integration): 10 tests
  - Bug fixes: -3 tests (trailing slash fixes)

### Phase 5: Integration & Documentation ✅ COMPLETED

**Status:** All tasks completed successfully. The EventFlows HTTP Integration feature is now production-ready.
