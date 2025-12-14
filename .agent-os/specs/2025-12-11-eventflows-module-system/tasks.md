# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-12-11-eventflows-module-system/spec.md

> Created: 2025-12-11
> Status: Ready for Implementation

## Tasks

- [x] 1. Implement Core Module Interfaces
  - [x] 1.1 Write tests for module interfaces (EventFlowsModule, ModuleContext, ModuleRegistration)
  - [x] 1.2 Create `module/interfaces/eventflows-module.interface.ts` with EventFlowsModule interface
  - [x] 1.3 Create `module/interfaces/module-context.interface.ts` with ModuleContext interface
  - [x] 1.4 Create `module/interfaces/module-registration.interface.ts` with ModuleRegistration interface
  - [x] 1.5 Create `module/interfaces/handler-registrations.interface.ts` with all handler registration types
  - [x] 1.6 Create `module/index.ts` to re-export all interfaces
  - [x] 1.7 Verify all tests pass

- [x] 2. Implement EventFlowsBuilder
  - [x] 2.1 Write tests for EventFlowsBuilder (configuration, validation, build process)
  - [x] 2.2 Create `module/eventflows-builder.ts` with fluent API implementation
  - [x] 2.3 Implement `withEventStore()`, `withEventBus()`, `withDebug()` methods
  - [x] 2.4 Implement `withModule()` and `withModules()` methods
  - [x] 2.5 Implement `withGlobalEventHandler()` method
  - [x] 2.6 Implement `build()` method with validation and initialization sequence
  - [x] 2.7 Add `EventFlows.create()` static factory method
  - [x] 2.8 Verify all tests pass

- [x] 3. Implement EventFlowsApp
  - [x] 3.1 Write tests for EventFlowsApp (command/query execution, introspection, shutdown)
  - [x] 3.2 Create `module/eventflows-app.ts` with app implementation
  - [x] 3.3 Implement `command()` and `query()` methods
  - [x] 3.4 Implement `getModules()`, `getCommands()`, `getQueries()` introspection methods
  - [x] 3.5 Implement `shutdown()` method with graceful cleanup
  - [x] 3.6 Expose readonly properties (commandBus, queryBus, eventBus, eventStore)
  - [x] 3.7 Verify all tests pass

- [ ] 4. ~~Implement Projection Utilities~~ (Deferred to dedicated spec)
  - Retry wrapper and projection rebuilding will be addressed in a separate specification

- [x] 5. Export and Integration
  - [x] 5.1 Write integration tests with InMemoryEventStore and InMemoryEventBus
  - [x] 5.2 Update `packages/core/src/index.ts` to export all module system types and functions
  - [x] 5.3 Example module implementations included in integration tests
  - [x] 5.4 Run full test suite and verify all tests pass (134 tests)
  - [x] 5.5 Run typecheck to ensure no type errors

- [x] 6. Documentation - Building Applications Section
  - [x] 6.1 Read existing docs for tone and structure
  - [x] 6.2 Create `docs/building-apps/index.md` - Overview of application wiring
  - [x] 6.3 Create `docs/building-apps/modules.md` - Creating EventFlows modules
  - [x] 6.4 Create `docs/building-apps/builder.md` - Using EventFlowsBuilder
  - [x] 6.5 Create `docs/building-apps/running.md` - Executing commands and queries
  - [x] 6.6 Update `docs/.vitepress/config.ts` to add "Building Applications" sidebar section
  - [x] 6.7 Update `docs/introduction.md` to reference new Building Applications section
  - Note: Cross-module communication covered in modules.md; projection rebuilds deferred with Task 4
