# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-12-11-eventflows-module-system/spec.md

> Created: 2025-12-11
> Status: Ready for Implementation

## Tasks

- [ ] 1. Implement Core Module Interfaces
  - [ ] 1.1 Write tests for module interfaces (EventFlowsModule, ModuleContext, ModuleRegistration)
  - [ ] 1.2 Create `module/interfaces/eventflows-module.interface.ts` with EventFlowsModule interface
  - [ ] 1.3 Create `module/interfaces/module-context.interface.ts` with ModuleContext interface
  - [ ] 1.4 Create `module/interfaces/module-registration.interface.ts` with ModuleRegistration interface
  - [ ] 1.5 Create `module/interfaces/handler-registrations.interface.ts` with all handler registration types
  - [ ] 1.6 Create `module/index.ts` to re-export all interfaces
  - [ ] 1.7 Verify all tests pass

- [ ] 2. Implement EventFlowsBuilder
  - [ ] 2.1 Write tests for EventFlowsBuilder (configuration, validation, build process)
  - [ ] 2.2 Create `module/eventflows-builder.ts` with fluent API implementation
  - [ ] 2.3 Implement `withEventStore()`, `withEventBus()`, `withDebug()` methods
  - [ ] 2.4 Implement `withModule()` and `withModules()` methods
  - [ ] 2.5 Implement `withGlobalEventHandler()` method
  - [ ] 2.6 Implement `build()` method with validation and initialization sequence
  - [ ] 2.7 Add `EventFlows.create()` static factory method
  - [ ] 2.8 Verify all tests pass

- [ ] 3. Implement EventFlowsApp
  - [ ] 3.1 Write tests for EventFlowsApp (command/query execution, introspection, shutdown)
  - [ ] 3.2 Create `module/eventflows-app.ts` with app implementation
  - [ ] 3.3 Implement `command()` and `query()` methods
  - [ ] 3.4 Implement `getModules()`, `getCommands()`, `getQueries()` introspection methods
  - [ ] 3.5 Implement `shutdown()` method with graceful cleanup
  - [ ] 3.6 Expose readonly properties (commandBus, queryBus, eventBus, eventStore)
  - [ ] 3.7 Verify all tests pass

- [ ] 4. Implement Projection Utilities
  - [ ] 4.1 Write tests for projection retry wrapper and rebuild utility
  - [ ] 4.2 Create `module/projection-retry.ts` with wrapWithRetry function
  - [ ] 4.3 Integrate retry wrapper into builder's projection subscription logic
  - [ ] 4.4 Create `module/rebuild-projection.ts` with rebuildProjection function
  - [ ] 4.5 Implement RebuildProjectionOptions interface
  - [ ] 4.6 Verify all tests pass

- [ ] 5. Export and Integration
  - [ ] 5.1 Write integration tests with InMemoryEventStore and InMemoryEventBus
  - [ ] 5.2 Update `packages/core/src/index.ts` to export all module system types and functions
  - [ ] 5.3 Create example module implementation for documentation
  - [ ] 5.4 Run full test suite and verify all tests pass
  - [ ] 5.5 Run typecheck to ensure no type errors

- [ ] 6. Documentation - Building Applications Section
  - [ ] 6.1 Plan documentation structure and user journey flow
  - [ ] 6.2 Create `docs/building-apps/index.md` - Overview of application wiring
  - [ ] 6.3 Create `docs/building-apps/modules.md` - Creating EventFlows modules
  - [ ] 6.4 Create `docs/building-apps/builder.md` - Using EventFlowsBuilder
  - [ ] 6.5 Create `docs/building-apps/running.md` - Executing commands and queries
  - [ ] 6.6 Create `docs/building-apps/cross-module.md` - Cross-module communication via events
  - [ ] 6.7 Create `docs/building-apps/projection-rebuilds.md` - Rebuilding projections
  - [ ] 6.8 Update `docs/.vitepress/config.ts` to add "Building Applications" sidebar section
  - [ ] 6.9 Update `docs/introduction.md` to reference new Building Applications section
  - [ ] 6.10 Review documentation flow and ensure clear user journey
