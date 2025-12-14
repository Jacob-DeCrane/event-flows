# Builder

`EventFlowsBuilder` provides a **fluent API** for configuring and building applications.

## Creating a Builder

```typescript
import { EventFlows } from '@eventflows/core';

const builder = EventFlows.create();
```

## Configuration Methods

### Event Store (Required)

```typescript
builder.withEventStore(eventStore)
```

The event store handles persistence. See [Event Store](../command-side/event-store) for implementations.

### Event Bus (Required)

```typescript
builder.withEventBus(eventBus)
```

The event bus handles pub/sub for projections and event handlers.

```typescript
import { InMemoryEventBus } from '@eventflows/core';

builder.withEventBus(new InMemoryEventBus())
```

### Modules

Register a single module:

```typescript
builder.withModule(userModule)
```

Register multiple modules:

```typescript
builder.withModules([userModule, orderModule, inventoryModule])
```

### Global Event Handlers

Handle all events (useful for logging, auditing):

```typescript
builder.withGlobalEventHandler(async (envelope) => {
  console.log(`Event: ${envelope.event}`, envelope.payload);
})
```

### Debug Mode

Enable debug logging:

```typescript
builder.withDebug(true)
// or
builder.withDebug() // defaults to true
```

## Building the Application

```typescript
const app = await builder.build();
```

## Build Process

When `build()` is called:

1. **Validate** - Checks event store and event bus are configured
2. **Connect** - Calls `eventStore.connect()`
3. **Link** - Connects event store to event bus via `setPublisher()`
4. **Initialize Modules** - Calls each module's `register()` in order
5. **Register Handlers** - Registers all command and query handlers
6. **Subscribe Projections** - Subscribes projection handlers to event bus
7. **Subscribe Event Handlers** - Subscribes cross-context handlers
8. **Register Global Handlers** - Subscribes global handlers to all events

## Validation Errors

Build will throw if:

```typescript
// Missing event store
await EventFlows.create()
  .withEventBus(eventBus)
  .build(); // Error: EventStore is required

// Missing event bus
await EventFlows.create()
  .withEventStore(eventStore)
  .build(); // Error: EventBus is required

// Duplicate module names
await EventFlows.create()
  .withEventStore(eventStore)
  .withEventBus(eventBus)
  .withModule({ name: 'users', ... })
  .withModule({ name: 'users', ... }) // Error: Duplicate module name: users
  .build();

// Duplicate command handlers
// Error: Duplicate command handler: CreateUser

// Duplicate query handlers
// Error: Duplicate query handler: GetUserById
```

## Complete Example

```typescript
import { EventFlows, InMemoryEventBus } from '@eventflows/core';
import { PostgresEventStore } from '@eventflows/postgres';

const app = await EventFlows.create()
  .withEventStore(new PostgresEventStore({
    connectionString: process.env.DATABASE_URL
  }))
  .withEventBus(new InMemoryEventBus({ debug: true }))
  .withModules([
    userModule,
    orderModule,
    inventoryModule
  ])
  .withGlobalEventHandler(async (envelope) => {
    await auditLog.record(envelope);
  })
  .withDebug(process.env.NODE_ENV === 'development')
  .build();
```

## Method Chaining

All configuration methods return the builder for chaining:

```typescript
const app = await EventFlows.create()
  .withEventStore(eventStore)
  .withEventBus(eventBus)
  .withModule(userModule)
  .withModule(orderModule)
  .withGlobalEventHandler(logger)
  .withDebug()
  .build();
```

See implementation in `packages/core/src/module/eventflows-builder.ts`
