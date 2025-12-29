# Task Breakdown: EventFlows Module System

## Overview
Total Tasks: 5 Task Groups with 35 Sub-tasks

This implementation adds a Module System to `@eventflows/core` that provides type-safe, domain-driven organization for CQRS/ES applications with full TypeScript intellisense support.

## Task List

### Type System Layer

#### Task Group 1: Type Definitions and Interfaces
**Dependencies:** None

- [x] 1.0 Complete type system foundation
  - [x] 1.1 Write 4-6 focused type tests for module type inference
    - Test command handler type extraction from module definition
    - Test query handler type extraction from module definition
    - Test multi-module union type aggregation
    - Test executor function input/output type inference
    - Use TypeScript `Expect` and `Equal` type-level assertions
  - [x] 1.2 Create `ModuleDefinition` interface
    - Define generic parameters: `TName extends string`, `TCommandHandlers`, `TQueryHandlers`, `TEventHandlers`
    - Properties: `name: TName`, `commandHandlers`, `queryHandlers`, `eventHandlers`
    - Command handlers: `Record<string, ICommandHandler>`
    - Query handlers: `Record<string, IQueryHandler>`
    - Event handlers: `Record<string, EventHandler[]>`
    - File: `/packages/core/src/module/types.ts`
  - [x] 1.3 Create utility types for handler extraction
    - `ExtractCommandName<T>`: Extract command name string literal from handler
    - `ExtractQueryName<T>`: Extract query name string literal from handler
    - `CommandPayload<T>`: Omit `commandName` from command interface
    - `QueryPayload<T>`: Omit `queryName` from query interface
    - `HandlerResult<T>`: Infer return type from handler `execute()` method
    - File: `/packages/core/src/module/types.ts`
  - [x] 1.4 Create mapped types for namespaced executor API
    - `CommandExecutors<TModules>`: Map command handlers to typed executor functions
    - `QueryExecutors<TModules>`: Map query handlers to typed executor functions
    - Support union of multiple modules into single interface
    - Executor function signature: `(payload: PayloadType) => Promise<ResultType>`
  - [x] 1.5 Create `EventFlowsAppConfig` interface
    - Properties: `eventStore: EventStore`, `eventBus: EventBus`, `modules: ModuleDefinition[]`
    - Ensure modules array preserves type information for intellisense
  - [x] 1.6 Create `EventFlowsApp` interface
    - Properties: `commands`, `queries`, `commandBus`, `queryBus`, `eventBus`, `eventStore`
    - Use mapped types from 1.4 for `commands` and `queries` properties
  - [x] 1.7 Ensure type system tests pass
    - Run ONLY the 4-6 type tests written in 1.1
    - Verify type inference works correctly at compile time

**Acceptance Criteria:**
- The 4-6 type tests written in 1.1 pass
- TypeScript intellisense shows command/query names when typing `app.commands.` or `app.queries.`
- Input and output types are correctly inferred for executor functions
- Multiple modules can be combined with all handlers appearing in union type

### Module Factory Layer

#### Task Group 2: createModule() Function
**Dependencies:** Task Group 1

- [x] 2.0 Complete createModule() implementation
  - [x] 2.1 Write 4-6 focused tests for createModule() behavior
    - Test module creation with command handlers
    - Test module creation with query handlers
    - Test module creation with event handlers
    - Test module creation with all handler types combined
    - Test type preservation (name as literal type)
  - [x] 2.2 Implement `createModule()` function signature
    - Generic function: `createModule<TName, TCommands, TQueries, TEvents>(config)`
    - Config object: `{ name, commandHandlers?, queryHandlers?, eventHandlers? }`
    - Return type: `ModuleDefinition<TName, TCommands, TQueries, TEvents>`
    - File: `/packages/core/src/module/create-module.ts`
  - [x] 2.3 Implement createModule() runtime logic
    - Validate module name is non-empty string
    - Default empty objects for optional handler maps
    - Return frozen module definition object
    - Preserve handler references without modification
  - [x] 2.4 Export createModule from module barrel file
    - Create `/packages/core/src/module/index.ts`
    - Export `createModule` function
    - Export all types from `types.ts`
  - [x] 2.5 Ensure createModule() tests pass
    - Run ONLY the 4-6 tests written in 2.1
    - Verify module definitions are created correctly

**Acceptance Criteria:**
- The 4-6 tests written in 2.1 pass
- `createModule()` returns properly typed module definition
- Module name is preserved as string literal type for intellisense
- Handler maps maintain their type information

### Application Factory Layer

#### Task Group 3: createEventFlowsApp() Function
**Dependencies:** Task Group 1, Task Group 2

- [x] 3.0 Complete createEventFlowsApp() implementation
  - [x] 3.1 Write 6-8 focused tests for createEventFlowsApp() behavior
    - Test app creation with single module
    - Test app creation with multiple modules
    - Test command execution via namespaced API
    - Test query execution via namespaced API
    - Test event handler subscription
    - Test event store publisher wiring
    - Test duplicate command name detection throws `ModuleRegistrationError`
    - Test duplicate query name detection throws `ModuleRegistrationError`
  - [x] 3.2 Create `ModuleRegistrationError` custom error class
    - Extend `Error` with descriptive message
    - Include context: conflicting handler name, module names involved
    - File: `/packages/core/src/module/errors.ts`
  - [x] 3.3 Implement `createEventFlowsApp()` function signature
    - Generic function preserving module types: `createEventFlowsApp<TModules>(config)`
    - Config type: `EventFlowsAppConfig<TModules>`
    - Return type: `EventFlowsApp<TModules>`
    - File: `/packages/core/src/module/create-app.ts`
  - [x] 3.4 Implement module registration loop
    - **IMPORTANT**: Call each module's `setup({ eventStore, eventBus })` to get the ModuleDefinition
    - Create internal `CommandBus` and `QueryBus` instances
    - Iterate through initialized modules
    - For each command handler: check for duplicates then register with `commandBus.register()`
    - For each query handler: check for duplicates then register with `queryBus.register()`
    - Throw `ModuleRegistrationError` on duplicate detection
  - [x] 3.5 Implement event handler subscription
    - Iterate through each initialized module's `eventHandlers` map
    - For each event name, iterate through handler array
    - Call `eventBus.subscribe(eventName, handler)` for each
  - [x] 3.6 Implement event store publisher wiring
    - Call `eventStore.setPublisher()` with function that calls `eventBus.publish()`
    - Ensure events flow from store to bus automatically
  - [x] 3.7 Implement namespaced commands API
    - Create `commands` object dynamically
    - For each registered command, create executor function
    - Executor wraps payload into command object and calls `commandBus.execute()`
    - Preserve types via mapped types from Task Group 1
  - [x] 3.8 Implement namespaced queries API
    - Create `queries` object dynamically
    - For each registered query, create executor function
    - Executor wraps payload into query object and calls `queryBus.execute()`
    - Preserve types via mapped types from Task Group 1
  - [x] 3.9 Expose infrastructure on app instance
    - Expose `app.commandBus` referencing internal CommandBus
    - Expose `app.queryBus` referencing internal QueryBus
    - Expose `app.eventBus` referencing provided EventBus
    - Expose `app.eventStore` referencing provided EventStore
  - [x] 3.10 Export from module barrel and package index
    - Export `createEventFlowsApp` from `/packages/core/src/module/index.ts`
    - Export `ModuleRegistrationError` from module barrel
    - Re-export module barrel from `/packages/core/src/index.ts`
  - [x] 3.11 Ensure createEventFlowsApp() tests pass
    - Run ONLY the 6-8 tests written in 3.1
    - Verify all app functionality works correctly

**Acceptance Criteria:**
- The 6-8 tests written in 3.1 pass
- `createEventFlowsApp()` calls each module's `setup()` with `{ eventStore, eventBus }`
- `createEventFlowsApp()` registers all handlers from all initialized modules
- Duplicate handler names throw `ModuleRegistrationError`
- Event store events flow to event bus automatically
- `app.commands.X()` and `app.queries.X()` execute correctly with full type inference
- Infrastructure is accessible via `app.commandBus`, `app.queryBus`, etc.

### Integration Testing Layer

#### Task Group 4: Test Review and Integration Tests
**Dependencies:** Task Groups 1-3

- [x] 4.0 Review existing tests and fill critical gaps
  - [x] 4.1 Review tests from Task Groups 1-3
    - Review the 27 type tests from types.test.ts
    - Review the 11 createModule() tests from create-module.test.ts
    - Review the 8 createEventFlowsApp() tests from create-app.test.ts
    - Total existing tests: 46 tests
  - [x] 4.2 Analyze test coverage gaps for this feature
    - Identify critical end-to-end workflows lacking coverage
    - Focus on module system integration scenarios
    - Prioritize full command/event flow testing
  - [x] 4.3 Write up to 8 additional integration tests if needed
    - End-to-end: command execution triggers event, event handler runs
    - End-to-end: multi-module app with cross-module event handling
    - Type safety: verify intellisense scenarios compile correctly
    - Error scenarios: handler execution errors propagate correctly
    - Edge cases: empty module registration, single handler modules
  - [x] 4.4 Run feature-specific tests only
    - Run ONLY tests related to the module system feature
    - Total tests: 54 tests (46 existing + 8 integration tests)
    - Verify all critical workflows pass

**Acceptance Criteria:**
- All feature-specific tests pass (54 tests total)
- End-to-end command-event flow works correctly
- Multi-module composition works with proper type inference
- No more than 8 additional tests added when filling gaps

### Documentation Layer

#### Task Group 5: Documentation Updates
**Dependencies:** Task Groups 1-4

- [x] 5.0 Update documentation site with module system docs
  - [x] 5.1 Create new `/docs/modules/` directory structure
    - Create `modules/` folder alongside existing `command-side/`, `query-side/`, etc.
    - Plan pages: `overview.md`, `create-module.md`, `create-app.md`
  - [x] 5.2 Write `modules/overview.md`
    - Brief intro to the module system concept
    - When/why to use modules
    - Link to detailed pages
    - Follow existing tone: concise prose, heavy code examples
  - [x] 5.3 Write `modules/create-module.md`
    - Sections: Basic Usage, Module Structure, With Event Handlers, Best Practices
    - Show command handler, query handler, and event handler registration
    - Include type inference examples
    - Reference implementation file path at end
  - [x] 5.4 Write `modules/create-app.md`
    - Sections: Basic Usage, Multi-Module Apps, Namespaced API, Infrastructure Access, Error Handling
    - Show `createEventFlowsApp()` configuration
    - Highlight `app.commands.*` and `app.queries.*` intellisense
    - Show accessing `app.eventBus`, `app.eventStore`, etc.
    - Reference implementation file path at end
  - [x] 5.5 Update `introduction.md` Getting Started section
    - Add Modules link to the getting started list
    - Position appropriately in the learning path
  - [x] 5.6 Update VitePress sidebar configuration
    - Add "Modules" section to navigation
    - Include all three new pages
    - Find config in `.vitepress/config.ts` or similar

**Acceptance Criteria:**
- Documentation matches existing tone: concise, code-heavy, minimal prose
- All code examples are accurate and follow established patterns
- Navigation includes new Modules section
- Cross-links to related pages (commands, queries, event bus) are included

## Execution Order

Recommended implementation sequence:

1. **Type System Layer (Task Group 1)**: Foundation for all type inference
2. **Module Factory Layer (Task Group 2)**: `createModule()` depends on types
3. **Application Factory Layer (Task Group 3)**: `createEventFlowsApp()` depends on modules
4. **Integration Testing Layer (Task Group 4)**: Validates complete system
5. **Documentation Layer (Task Group 5)**: Documents the completed feature

## File Structure

After implementation, the following files should exist:

```
/packages/core/src/
  module/
    index.ts           # Barrel exports
    types.ts           # Type definitions and utility types
    create-module.ts   # createModule() function
    create-app.ts      # createEventFlowsApp() function
    errors.ts          # ModuleRegistrationError
    types.test.ts      # Type-level tests (27 tests)
    create-module.test.ts  # createModule tests (11 tests)
    create-app.test.ts     # createEventFlowsApp tests (8 tests)
    integration.test.ts    # Integration tests (8 tests)
  index.ts             # Updated with module exports

/docs/
  modules/
    overview.md        # Module system introduction
    create-module.md   # createModule() documentation
    create-app.md      # createEventFlowsApp() documentation
  introduction.md      # Updated with Modules link
  .vitepress/
    config.ts          # Updated sidebar navigation
```

## Notes

- All handler types (`ICommandHandler`, `IQueryHandler`) are already defined in the codebase
- Existing `CommandBus`, `QueryBus`, `EventBus`, and `EventStore` classes are used internally
- No changes needed to existing bus/store implementations
- TypeScript 4.7+ features (template literal types, infer) may be used for advanced type inference
- Documentation style: concise prose, heavy code examples, sections like "Basic Usage", "Best Practices"
- Reference existing docs (`/docs/command-side/commands.md`, `/docs/command-side/command-bus.md`) for tone
