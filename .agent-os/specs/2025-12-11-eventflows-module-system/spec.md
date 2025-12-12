# Spec Requirements Document

> Spec: EventFlows Module System
> Created: 2025-12-11

## Overview

Implement a Module System for `@eventflows/core` that provides a structured way to wire CQRS/ES applications by abstracting the complexity of connecting event stores, event buses, command handlers, query handlers, and projections into a clean, domain-organized module pattern. This system will enable developers to encapsulate subdomains into self-contained modules with explicit wiring and clean architecture principles.

## User Stories

### Building a New CQRS Application

As a TypeScript developer, I want to organize my CQRS/ES application into domain modules, so that I can maintain clean boundaries between subdomains and scale my application without sprawling setup code.

When building a new application, I will:
1. Define modules for each subdomain (e.g., `CatalogModule`, `IdentityAccessModule`)
2. Use the `EventFlowsBuilder` to compose my application with chosen infrastructure
3. Execute commands and queries through a unified `EventFlowsApp` interface
4. Have projections automatically wired with retry handling

### Migrating from Manual Wiring

As a developer with existing EventFlows code, I want to migrate my manual wiring to the module system, so that I can benefit from better organization and reduced boilerplate while maintaining my existing domain logic.

Currently I have scattered wiring code that registers handlers individually. With the module system, I will encapsulate this wiring into module `register()` functions and compose everything through the builder.

### Cross-Module Communication

As a developer building a multi-bounded-context application, I want modules to communicate through events only, so that I maintain loose coupling and can evolve modules independently.

I will define `eventHandlers` in my module registration that react to events from other bounded contexts, keeping module dependencies explicit and avoiding direct repository access across boundaries.

## Spec Scope

1. **EventFlowsModule Interface** - Define the module contract with `name`, `boundedContext`, and `register()` function
2. **ModuleContext & ModuleRegistration** - Types for what modules receive and return during registration
3. **EventFlowsBuilder** - Fluent API for composing applications with event store, event bus, modules, and global handlers
4. **EventFlowsApp** - Runtime application interface with `command()`, `query()`, introspection methods, and `shutdown()`
5. **Projection Retry Wrapper** - Internal utility to wrap projection handlers with configurable retry logic
6. **Rebuild Projection Utility** - External function for manually rebuilding projections from event store

## Out of Scope

- Saga / Process Manager support
- Event versioning / upcasting
- Snapshotting for aggregate hydration
- Real-time subscriptions (WebSocket)
- Command/Query middleware (logging, validation, auth) - noted as future enhancement
- Decorator-based registration - noted as future enhancement
- Testing utilities (TestModuleBuilder, mocks) - noted as future enhancement

## Expected Deliverable

1. All module system interfaces exported from `@eventflows/core` (`EventFlowsModule`, `ModuleContext`, `ModuleRegistration`, handler registration types)
2. `EventFlows.create()` static method returning an `EventFlowsBuilder` instance
3. `EventFlowsApp` implementation with working `command()`, `query()`, introspection, and `shutdown()` methods
4. Projection handlers wrapped with retry logic (default 3 attempts)
5. `rebuildProjection()` utility function exported from `@eventflows/core`
6. Existing example code updated to use the module system pattern
