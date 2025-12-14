# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-12-11-eventflows-module-system/spec.md

## Module System Public API

### EventFlows Static Entry Point

```typescript
import { EventFlows } from '@eventflows/core';

const app = await EventFlows.create()
  .withEventStore(eventStore)
  .withEventBus(eventBus)
  .withModule(MyModule)
  .build();
```

---

## Type Exports

All types exported from `@eventflows/core`:

```typescript
// Module Definition
export interface EventFlowsModule { ... }
export interface ModuleContext { ... }
export interface ModuleRegistration { ... }

// Handler Registrations
export interface CommandHandlerRegistration { ... }
export interface QueryHandlerRegistration { ... }
export interface ProjectionRegistration { ... }
export interface EventHandlerRegistration { ... }

// Builder & App
export interface EventFlowsBuilder { ... }
export interface EventFlowsApp { ... }

// Rebuild Utility
export interface RebuildProjectionOptions { ... }
export function rebuildProjection(options: RebuildProjectionOptions): Promise<void>;
```

---

## EventFlowsBuilder API

### withEventStore

**Purpose:** Configure the event store for the application.

**Signature:**
```typescript
withEventStore(store: IEventStore): EventFlowsBuilder
```

**Parameters:**
- `store` - An implementation of `IEventStore` interface

**Returns:** `EventFlowsBuilder` for method chaining

**Errors:** None (validation at `build()`)

---

### withEventBus

**Purpose:** Configure the event bus for the application.

**Signature:**
```typescript
withEventBus(bus: IEventBus): EventFlowsBuilder
```

**Parameters:**
- `bus` - An implementation of `IEventBus` interface

**Returns:** `EventFlowsBuilder` for method chaining

**Errors:** None (validation at `build()`)

---

### withModule

**Purpose:** Register a single module with the application.

**Signature:**
```typescript
withModule(module: EventFlowsModule): EventFlowsBuilder
```

**Parameters:**
- `module` - An `EventFlowsModule` implementation

**Returns:** `EventFlowsBuilder` for method chaining

**Errors:** None (duplicate detection at `build()`)

---

### withModules

**Purpose:** Register multiple modules at once.

**Signature:**
```typescript
withModules(modules: EventFlowsModule[]): EventFlowsBuilder
```

**Parameters:**
- `modules` - Array of `EventFlowsModule` implementations

**Returns:** `EventFlowsBuilder` for method chaining

**Errors:** None (duplicate detection at `build()`)

---

### withGlobalEventHandler

**Purpose:** Add a handler that receives all published events (for logging, metrics, etc.).

**Signature:**
```typescript
withGlobalEventHandler(handler: EventHandler): EventFlowsBuilder
```

**Parameters:**
- `handler` - `(envelope: EventEnvelope) => Promise<void> | void`

**Returns:** `EventFlowsBuilder` for method chaining

**Errors:** None

---

### withDebug

**Purpose:** Enable debug logging for the application.

**Signature:**
```typescript
withDebug(enabled?: boolean): EventFlowsBuilder
```

**Parameters:**
- `enabled` - Optional boolean, defaults to `true`

**Returns:** `EventFlowsBuilder` for method chaining

**Errors:** None

---

### build

**Purpose:** Validate configuration, initialize infrastructure, register all handlers, and return the application instance.

**Signature:**
```typescript
build(): Promise<EventFlowsApp>
```

**Parameters:** None

**Returns:** `Promise<EventFlowsApp>` - The initialized application

**Errors:**
- `Error: EventFlows requires an event store. Use .withEventStore() to configure.`
- `Error: EventFlows requires an event bus. Use .withEventBus() to configure.`
- `Error: Duplicate module name: "${name}"`
- `Error: Duplicate command handler for: "${commandName}"`
- `Error: Duplicate query handler for: "${queryName}"`

---

## EventFlowsApp API

### command

**Purpose:** Execute a command through the command bus.

**Signature:**
```typescript
command<TResult = any>(command: ICommand): Promise<TResult>
```

**Parameters:**
- `command` - Object with `commandName` property and command-specific data

**Returns:** `Promise<TResult>` - Result from command handler

**Errors:**
- `Error: No handler registered for command: "${commandName}"`

---

### query

**Purpose:** Execute a query through the query bus.

**Signature:**
```typescript
query<TResult = any>(query: IQuery): Promise<TResult>
```

**Parameters:**
- `query` - Object with `queryName` property and query-specific data

**Returns:** `Promise<TResult>` - Result from query handler

**Errors:**
- `Error: No handler registered for query: "${queryName}"`

---

### getModules

**Purpose:** Get list of registered module names.

**Signature:**
```typescript
getModules(): string[]
```

**Returns:** Array of module names in registration order

---

### getCommands

**Purpose:** Get list of registered command names.

**Signature:**
```typescript
getCommands(): string[]
```

**Returns:** Array of command names

---

### getQueries

**Purpose:** Get list of registered query names.

**Signature:**
```typescript
getQueries(): string[]
```

**Returns:** Array of query names

---

### shutdown

**Purpose:** Gracefully shutdown the application.

**Signature:**
```typescript
shutdown(): Promise<void>
```

**Returns:** `Promise<void>` - Resolves when shutdown complete

**Actions:**
- Disconnects event store
- Cleans up event bus subscriptions (if applicable)

---

## rebuildProjection API

### rebuildProjection

**Purpose:** Rebuild a projection by replaying events from the event store.

**Signature:**
```typescript
rebuildProjection(options: RebuildProjectionOptions): Promise<void>
```

**Parameters:**
```typescript
interface RebuildProjectionOptions {
  eventStore: IEventStore;
  projectionName: string;
  handlers: Record<string, EventHandler>;
  beforeRebuild?: () => Promise<void>;
  afterRebuild?: () => Promise<void>;
  onProgress?: (processed: number, total?: number) => void;
  aggregateTypes?: string[];
  fromPosition?: number;
}
```

**Returns:** `Promise<void>` - Resolves when rebuild complete

**Errors:** Propagates any errors from event store or handlers

---

## Usage Examples

### Basic Application Setup

```typescript
import { EventFlows, EventFlowsModule } from '@eventflows/core';
import { InMemoryEventStore, InMemoryEventBus } from '@eventflows/integrations';

const UserModule: EventFlowsModule = {
  name: 'user',
  register: async (ctx) => ({
    commandHandlers: [
      { commandName: 'CreateUser', handler: new CreateUserHandler(new UserRepo(ctx.eventStore)) }
    ],
    queryHandlers: [
      { queryName: 'GetUser', handler: new GetUserHandler(readRepo) }
    ],
    projections: [
      { name: 'UserProjection', handlers: { 'UserCreated': projection.onCreated } }
    ],
  }),
};

const app = await EventFlows.create()
  .withEventStore(new InMemoryEventStore())
  .withEventBus(new InMemoryEventBus())
  .withModule(UserModule)
  .build();

// Execute commands and queries
const result = await app.command({ commandName: 'CreateUser', name: 'Alice' });
const user = await app.query({ queryName: 'GetUser', userId: result.id });
```

### Rebuild Projection

```typescript
import { rebuildProjection } from '@eventflows/core';

await rebuildProjection({
  eventStore,
  projectionName: 'UserProjection',
  handlers: { 'UserCreated': projection.onCreated },
  beforeRebuild: () => readModelRepo.clear(),
  onProgress: (n, total) => console.log(`${n}/${total}`),
});
```
