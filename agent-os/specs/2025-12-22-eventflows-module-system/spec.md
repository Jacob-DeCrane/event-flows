# Specification: EventFlows Module System

## Goal

Implement a Module System for `@eventflows/core` that provides a structured, type-safe way to wire CQRS/ES applications by organizing them into domain-driven modules with full TypeScript intellisense support.

## User Stories

- As a developer building a new CQRS application, I want to organize my handlers into domain modules and compose them with infrastructure through a unified typed interface so that I get autocomplete for all available commands and queries.
- As a developer migrating from manual wiring, I want to consolidate scattered `bus.register()` calls into cohesive module definitions so that my codebase is better organized by domain.
- As a developer building multi-module applications, I want modules to communicate through events only so that domain boundaries remain clean and loosely coupled.

## Specific Requirements

**createModule() Function**
- Export a `createModule<TName, TCommands, TQueries, TEvents>()` function that returns a typed module definition
- Module definition includes `name`, `commandHandlers`, `queryHandlers`, and `eventHandlers` properties
- Handlers are class instances with constructor injection for DI-friendly design
- Command handlers map command names to `ICommandHandler` instances
- Query handlers map query names to `IQueryHandler` instances
- Event handlers map event names to arrays of handler functions

**createEventFlowsApp() Function**
- Export a `createEventFlowsApp(config)` function (not builder pattern) that accepts a configuration object
- Config includes `eventStore`, `eventBus`, and `modules` array
- Returns a fully typed `EventFlowsApp` instance with namespaced command/query access
- Automatically registers all handlers from all modules with the internal buses
- Wires event store publisher to event bus for automatic event propagation

**Namespaced App API for Intellisense**
- Expose `app.commands` object where each key is a command name and value is a typed executor function
- Expose `app.queries` object where each key is a query name and value is a typed executor function
- Typing `app.commands.` triggers autocomplete showing all registered command names
- Typing `app.queries.` triggers autocomplete showing all registered query names
- Full type inference for input parameters (command/query payload) and return types

**Type System Design**
- Use mapped types to transform module handler registrations into typed executor functions
- Extract command/query names as string literal types for the namespaced API
- Infer input types from command/query interfaces (excluding `commandName`/`queryName` properties)
- Infer return types from handler `execute()` method return type
- Support union of multiple modules to aggregate all commands/queries into single typed interface

**Runtime Infrastructure Access**
- Expose `app.commandBus` for direct access to the internal `CommandBus` instance
- Expose `app.queryBus` for direct access to the internal `QueryBus` instance
- Expose `app.eventBus` for direct access to the provided `EventBus` instance
- Expose `app.eventStore` for direct access to the provided `EventStore` instance
- These are provided for advanced use cases like testing or manual bus operations

**Cross-Module Communication**
- Modules communicate through domain events only, not direct queries or commands
- Event handlers in a module can subscribe to events from any module
- Application layer code outside modules can freely compose queries from any module
- No cross-module query access allowed within module handler code

**Module Registration Flow**
- On app creation, iterate through each module in the `modules` array
- For each command handler, call `commandBus.register(commandName, handler)`
- For each query handler, call `queryBus.register(queryName, handler)`
- For each event handler, call `eventBus.subscribe(eventName, handler)` for each handler in the array
- Wire `eventStore.setPublisher()` to forward events to `eventBus.publish()`

**Error Handling Approach**
- Throw `ModuleRegistrationError` if duplicate command or query names detected across modules
- Throw `HandlerNotFoundError` (from existing CommandBus/QueryBus) if executing unregistered command/query
- Event handler errors follow existing `EventBus` error handling (swallowed, reported via `setErrorHandler`)
- Validate module structure at registration time, not at runtime execution

## Visual Design

No visual mockups provided for this backend/API feature.

## Existing Code to Leverage

**CommandBus class (`/packages/core/src/command-bus.ts`)**
- Use `register(commandName, handler)` method to register command handlers from modules
- Use `execute(command)` method internally when `app.commands.X()` is called
- Leverage existing error handling for missing handlers
- Reuse `hasHandler()` for duplicate detection during module registration

**QueryBus class (`/packages/core/src/query-bus.ts`)**
- Use `register(queryName, handler)` method to register query handlers from modules
- Use `execute(query)` method internally when `app.queries.X()` is called
- Leverage existing error handling for missing handlers
- Reuse `hasHandler()` for duplicate detection during module registration

**EventBus abstract class (`/packages/core/src/event-bus.ts`)**
- Use `subscribe(eventName, handler)` method to register event handlers from modules
- Leverage existing error handling that swallows handler errors
- Use `setErrorHandler()` pattern for user-defined error handling

**EventStore abstract class (`/packages/core/src/event-store.ts`)**
- Use `setPublisher()` method to wire event store to event bus
- Events are automatically published after `appendEvents()` via Proxy pattern
- No changes needed to EventStore, just wire publisher to event bus

**ICommand and ICommandHandler interfaces (`/packages/core/src/interfaces/commands/`)**
- Follow existing pattern: interface with `commandName: string` property
- Handler classes implement `ICommandHandler<TCommand, TResult>` with `execute()` method
- Support constructor injection for dependencies (repositories, services)

## Out of Scope

- Projection retry handling with automatic retry logic
- `rebuildProjection()` utility for replaying events
- Multi-tenancy support with per-tenant event stores or buses
- Distributed module deployment across multiple services
- Hot module reloading for development
- Built-in dependency injection container (use external DI library)
- Built-in logging or tracing (use external observability tools)
- Per-module infrastructure overrides (single shared EventStore/EventBus in v1)
- Module lifecycle hooks (onInit, onDestroy)
- Lazy module loading or dynamic module registration after app creation
