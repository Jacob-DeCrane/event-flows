# Building Applications

EventFlows provides a **module system** for organizing and wiring CQRS/ES applications.

## Overview

The module system helps you:

- **Organize code** into domain-driven modules
- **Wire infrastructure** (event store, event bus) to handlers
- **Compose applications** from multiple modules
- **Execute commands and queries** through a unified interface

## Core Components

```
EventFlows.create()           → Builder for configuring apps
  .withEventStore(store)      → Configure persistence
  .withEventBus(bus)          → Configure pub/sub
  .withModule(userModule)     → Register domain modules
  .build()                    → Returns EventFlowsApp

EventFlowsApp                 → Runtime for executing commands/queries
```

## Quick Example

```typescript
import { EventFlows, InMemoryEventBus } from '@eventflows/core';
import { PostgresEventStore } from '@eventflows/postgres';

// Define a module
const userModule: EventFlowsModule = {
  name: 'users',
  register: (context) => ({
    commandHandlers: [
      { commandName: 'CreateUser', handler: new CreateUserHandler(context.eventStore) }
    ],
    queryHandlers: [
      { queryName: 'GetUserById', handler: new GetUserByIdHandler(userReadModel) }
    ],
    projections: [
      { name: 'UserList', handlers: { UserCreated: updateUserList } }
    ]
  })
};

// Build and run the application
const app = await EventFlows.create()
  .withEventStore(new PostgresEventStore(config))
  .withEventBus(new InMemoryEventBus())
  .withModule(userModule)
  .build();

// Execute commands and queries
await app.command({ commandName: 'CreateUser', userId: '123', name: 'Alice' });
const user = await app.query({ queryName: 'GetUserById', userId: '123' });

// Shutdown gracefully
await app.shutdown();
```

## What's Next

- [Modules](./modules) - Define domain modules
- [Builder](./builder) - Configure and build applications
- [Running](./running) - Execute commands and queries
