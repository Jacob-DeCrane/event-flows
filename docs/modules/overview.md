# Module System

The Module System provides a structured, type-safe way to organize CQRS/ES applications by domain.

## Why Modules?

Instead of manually wiring handlers with scattered `bus.register()` calls:

```typescript
// Before: Manual wiring
const commandBus = new CommandBus();
commandBus.register('CreateUser', new CreateUserHandler(userRepo));
commandBus.register('UpdateUser', new UpdateUserHandler(userRepo));
commandBus.register('PlaceOrder', new PlaceOrderHandler(orderRepo));
// ... dozens more registrations
```

Organize handlers into cohesive domain modules:

```typescript
// After: Module-based organization
const app = createEventFlowsApp({
  eventStore,
  eventBus,
  modules: [userModule, orderModule] as const,
});

// Full intellisense for all commands and queries
await app.commands.CreateUser({ userId: '123', name: 'John' });
```

## Key Benefits

- **Domain Organization**: Group related handlers by bounded context
- **Type-Safe Execution**: Full TypeScript intellisense for commands and queries
- **Dependency Injection**: Modules receive infrastructure via setup function
- **Automatic Wiring**: Event store publishes to event bus automatically
- **Cross-Module Events**: Modules communicate through domain events

## When to Use

Use modules when your application has:

- Multiple bounded contexts or domains
- Many command and query handlers to organize
- Need for type-safe command/query execution with intellisense
- Desire for cleaner dependency injection patterns

## Quick Example

```typescript
import { createModule, createEventFlowsApp } from '@eventflows/core';

// Define a module
const userModule = createModule({
  name: 'users',
  setup: ({ eventStore }) => {
    const userRepository = new UserRepository(eventStore);
    return {
      commandHandlers: {
        CreateUser: new CreateUserCommandHandler(userRepository),
      },
      queryHandlers: {
        GetUserById: new GetUserByIdQueryHandler(),
      },
    };
  },
});

// Create the application
const app = createEventFlowsApp({
  eventStore: myEventStore,
  eventBus: new InMemoryEventBus({}),
  modules: [userModule] as const,
});

// Execute with full type inference
await app.commands.CreateUser({ userId: '123', name: 'John' });
const user = await app.queries.GetUserById({ userId: '123' });
```

## Next Steps

- [createModule()](./create-module) - Define domain modules with handlers
- [createEventFlowsApp()](./create-app) - Compose modules into an application
