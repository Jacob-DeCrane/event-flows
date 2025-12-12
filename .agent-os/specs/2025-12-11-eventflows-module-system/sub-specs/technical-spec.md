# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-12-11-eventflows-module-system/spec.md

## Technical Requirements

### Core Interfaces

All interfaces must be TypeScript-first with full type safety and exported from `@eventflows/core`.

#### EventFlowsModule Interface
- `name: string` - Unique module identifier (lowercase, hyphen-separated)
- `boundedContext?: string` - Optional parent bounded context name
- `register: (context: ModuleContext) => Promise<ModuleRegistration> | ModuleRegistration` - Factory function supporting sync or async initialization

#### ModuleContext Interface
- `eventStore: IEventStore` - The configured event store instance
- `eventBus: IEventBus` - The configured event bus instance

#### ModuleRegistration Interface
- `commandHandlers: CommandHandlerRegistration[]` - Command handlers to register
- `queryHandlers: QueryHandlerRegistration[]` - Query handlers to register
- `projections: ProjectionRegistration[]` - Projections to subscribe
- `eventHandlers?: EventHandlerRegistration[]` - Optional cross-context event handlers

#### Handler Registration Types
- `CommandHandlerRegistration` - `{ commandName: string; handler: ICommandHandler<any, any> }`
- `QueryHandlerRegistration` - `{ queryName: string; handler: IQueryHandler<any, any> }`
- `ProjectionRegistration` - `{ name: string; handlers: Record<string, EventHandler>; retry?: { maxAttempts?: number } }`
- `EventHandlerRegistration` - `{ eventType: string; handler: EventHandler; fromContext?: string }`

### EventFlowsBuilder Implementation

#### Builder Pattern Requirements
- Static factory method: `EventFlows.create(): EventFlowsBuilder`
- Fluent API with method chaining (each method returns `this`)
- Immutable configuration accumulation
- Validation on `build()` call

#### Builder Methods
- `withEventStore(store: IEventStore): EventFlowsBuilder` - Required
- `withEventBus(bus: IEventBus): EventFlowsBuilder` - Required
- `withModule(module: EventFlowsModule): EventFlowsBuilder` - Registers single module
- `withModules(modules: EventFlowsModule[]): EventFlowsBuilder` - Registers multiple modules
- `withGlobalEventHandler(handler: EventHandler): EventFlowsBuilder` - Adds global handler
- `withDebug(enabled?: boolean): EventFlowsBuilder` - Enables debug logging
- `build(): Promise<EventFlowsApp>` - Validates, initializes, and returns app

#### Build Process (Sequence)
1. Validate event store and event bus are configured
2. Connect event store (`await eventStore.connect()`)
3. Link event store to event bus via `setPublisher()`
4. Initialize each module in registration order (await async `register()`)
5. Register command handlers on internal `CommandBus`
6. Register query handlers on internal `QueryBus`
7. Subscribe projection handlers to event bus (wrapped with retry)
8. Subscribe cross-context event handlers
9. Register global event handlers
10. Return configured `EventFlowsApp`

### EventFlowsApp Implementation

#### Public Methods
- `command<TResult = any>(command: ICommand): Promise<TResult>` - Execute command via command bus
- `query<TResult = any>(query: IQuery): Promise<TResult>` - Execute query via query bus
- `getModules(): string[]` - Return registered module names
- `getCommands(): string[]` - Return registered command names
- `getQueries(): string[]` - Return registered query names
- `shutdown(): Promise<void>` - Graceful shutdown (disconnect event store)

#### Readonly Properties
- `commandBus: CommandBus` - Direct access for advanced use cases
- `queryBus: QueryBus` - Direct access for advanced use cases
- `eventBus: IEventBus` - Direct access for advanced use cases
- `eventStore: IEventStore` - Direct access for advanced use cases

### Projection Retry Wrapper

#### Requirements
- Internal function: `wrapWithRetry(handler: EventHandler, config: { maxAttempts?: number }): EventHandler`
- Default `maxAttempts: 3`
- On each failure, log warning with attempt number
- After all retries exhausted, log error with envelope details and continue (don't throw)
- Accept temporary inconsistency - projections can be rebuilt later

#### Logging Format
- Warning: `[Projection] Attempt ${attempt}/${maxAttempts} failed`
- Error: `[Projection] All retries failed: { event, aggregateId, error }`

### Rebuild Projection Utility

#### Function Signature
```typescript
export function rebuildProjection(options: RebuildProjectionOptions): Promise<void>
```

#### RebuildProjectionOptions Interface
- `eventStore: IEventStore` - Event store to read from
- `projectionName: string` - Name for logging/identification
- `handlers: Record<string, EventHandler>` - Event type to handler mapping
- `beforeRebuild?: () => Promise<void>` - Optional cleanup (e.g., clear read model)
- `afterRebuild?: () => Promise<void>` - Optional post-processing
- `onProgress?: (processed: number, total?: number) => void` - Progress callback
- `aggregateTypes?: string[]` - Optional filter by aggregate type
- `fromPosition?: number` - Optional start position

#### Rebuild Process
1. Call `beforeRebuild()` if provided
2. Read all events from event store (optionally filtered)
3. For each event, call matching handler if exists
4. Report progress via `onProgress()` callback
5. Call `afterRebuild()` if provided

### File Structure

New files to create in `packages/core/src/`:
```
module/
├── index.ts                    # Re-exports all module types
├── interfaces/
│   ├── eventflows-module.interface.ts
│   ├── module-context.interface.ts
│   ├── module-registration.interface.ts
│   └── handler-registrations.interface.ts
├── eventflows-builder.ts       # Builder implementation
├── eventflows-app.ts           # App implementation
├── projection-retry.ts         # Retry wrapper utility
└── rebuild-projection.ts       # Rebuild utility
```

Update `packages/core/src/index.ts` to export all module system types and functions.

### Performance Considerations

- Module registration is done once at startup; optimize for clarity over speed
- Projection handlers should be idempotent for rebuild safety
- Event store `readAll()` or similar method needed for rebuild utility
- Consider batch processing in rebuild for large event stores

### Error Handling

- Builder throws if `build()` called without event store or event bus
- Builder throws if duplicate module names registered
- Builder throws if duplicate command/query handlers registered
- Projection failures are logged and swallowed (retry then continue)
- Rebuild failures should propagate (caller handles)
