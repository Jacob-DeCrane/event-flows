# createEventFlowsApp()

Creates a fully-configured EventFlows application from module factories.

## Basic Usage

```typescript
import { createModule, createEventFlowsApp, InMemoryEventBus } from '@eventflows/core';

const userModule = createModule({
  name: 'users',
  setup: ({ eventStore }) => ({
    commandHandlers: {
      CreateUser: new CreateUserHandler(new UserRepository(eventStore)),
    },
    queryHandlers: {
      GetUserById: new GetUserByIdHandler(),
    },
  }),
});

const app = createEventFlowsApp({
  eventStore: myEventStore,
  eventBus: new InMemoryEventBus({}),
  modules: [userModule] as const,
});
```

## Configuration

The `createEventFlowsApp()` function accepts:

| Property | Type | Description |
|----------|------|-------------|
| `eventStore` | `EventStore` | Event store for persisting events |
| `eventBus` | `EventBus` | Event bus for pub/sub |
| `modules` | `EventFlowsModule[]` | Array of modules (use `as const` for type inference) |

## Multi-Module Apps

Compose multiple domain modules into a single application:

```typescript
const userModule = createModule({
  name: 'users',
  setup: ({ eventStore }) => ({
    commandHandlers: {
      CreateUser: new CreateUserHandler(new UserRepository(eventStore)),
      UpdateUserProfile: new UpdateUserProfileHandler(new UserRepository(eventStore)),
    },
    queryHandlers: {
      GetUserById: new GetUserByIdHandler(),
    },
  }),
});

const orderModule = createModule({
  name: 'orders',
  setup: ({ eventStore }) => ({
    commandHandlers: {
      PlaceOrder: new PlaceOrderHandler(new OrderRepository(eventStore)),
      CancelOrder: new CancelOrderHandler(new OrderRepository(eventStore)),
    },
    queryHandlers: {
      GetOrderById: new GetOrderByIdHandler(),
      ListOrdersByCustomer: new ListOrdersByCustomerHandler(),
    },
    eventHandlers: {
      UserCreated: [(event) => console.log('New user:', event.payload.userId)],
    },
  }),
});

const app = createEventFlowsApp({
  eventStore,
  eventBus: new InMemoryEventBus({}),
  modules: [userModule, orderModule] as const,
});
```

## Namespaced API

The app exposes typed `commands` and `queries` objects with full intellisense:

```typescript
// Commands - typing 'app.commands.' shows all available commands
await app.commands.CreateUser({ userId: '123', name: 'John' });
await app.commands.PlaceOrder({ orderId: '456', items: [{ sku: 'ABC', qty: 2 }] });

// Queries - typing 'app.queries.' shows all available queries
const user = await app.queries.GetUserById({ userId: '123' });
const orders = await app.queries.ListOrdersByCustomer({ customerId: '123' });
```

The payload types and return types are fully inferred from the handlers:

```typescript
// TypeScript knows the exact payload shape
await app.commands.CreateUser({
  userId: '123',   // Required
  name: 'John',    // Required
  email: 'j@x.com' // If handler expects it
});

// TypeScript knows the return type
const user = await app.queries.GetUserById({ userId: '123' });
// user is typed as the handler's return type (e.g., User | null)
```

## Infrastructure Access

Access underlying infrastructure for advanced use cases:

```typescript
const app = createEventFlowsApp({
  eventStore,
  eventBus,
  modules: [userModule] as const,
});

// Direct access to buses
app.commandBus.onCommandExecuted((cmd, result) => {
  console.log(`Executed: ${cmd.commandName}`);
});

// Subscribe to additional events
app.eventBus.subscribe('CustomEvent', async (event) => {
  // Handle event
});

// Access event store for replays or debugging
const events = await app.eventStore.getEvents('user-123');
```

### Available Properties

| Property | Type | Description |
|----------|------|-------------|
| `commands` | Typed executors | Namespaced command execution |
| `queries` | Typed executors | Namespaced query execution |
| `commandBus` | `CommandBus` | Internal command bus |
| `queryBus` | `QueryBus` | Internal query bus |
| `eventBus` | `EventBus` | Provided event bus |
| `eventStore` | `EventStore` | Provided event store |

## Automatic Event Wiring

The app automatically wires the event store to the event bus:

```typescript
// When a command handler saves an aggregate...
class CreateUserHandler implements ICommandHandler<CreateUserCommand, void> {
  async execute(command: CreateUserCommand): Promise<void> {
    const user = User.create(command.userId, command.name);
    await this.repository.save(user);
    // Events are automatically published to the event bus!
  }
}

// Event handlers receive them automatically
const notificationModule = createModule({
  name: 'notifications',
  setup: () => ({
    eventHandlers: {
      UserCreated: [
        async (event) => {
          await sendWelcomeEmail(event.payload.userId);
        },
      ],
    },
  }),
});
```

## Error Handling

### Duplicate Handler Detection

The app throws `ModuleRegistrationError` if duplicate handlers are detected:

```typescript
const moduleA = createModule({
  name: 'moduleA',
  setup: () => ({
    commandHandlers: {
      CreateUser: new CreateUserHandlerA(), // First registration
    },
  }),
});

const moduleB = createModule({
  name: 'moduleB',
  setup: () => ({
    commandHandlers: {
      CreateUser: new CreateUserHandlerB(), // Duplicate!
    },
  }),
});

// Throws ModuleRegistrationError
const app = createEventFlowsApp({
  eventStore,
  eventBus,
  modules: [moduleA, moduleB] as const,
});
// Error: Duplicate command handler 'CreateUser' found.
// Already registered by module 'moduleA',
// attempted to register again in module 'moduleB'.
```

### Handler Execution Errors

Errors from handlers propagate normally:

```typescript
try {
  await app.commands.CreateUser({ userId: '123', name: 'John' });
} catch (error) {
  // Handle command execution error
}

try {
  const user = await app.queries.GetUserById({ userId: '123' });
} catch (error) {
  // Handle query execution error
}
```

### Event Handler Errors

Event handler errors follow the [EventBus](../command-side/event-store) error handling pattern:

```typescript
const eventBus = new InMemoryEventBus({});
eventBus.setErrorHandler((error, eventName) => {
  console.error(`Event handler error for ${eventName}:`, error);
});

const app = createEventFlowsApp({
  eventStore,
  eventBus,
  modules: [userModule] as const,
});
```

## Complete Example

```typescript
import {
  createModule,
  createEventFlowsApp,
  InMemoryEventBus,
} from '@eventflows/core';

// User Module
const userModule = createModule({
  name: 'users',
  setup: ({ eventStore }) => {
    const userRepository = new UserRepository(eventStore);
    const userReadRepository = new InMemoryUserReadRepository();
    const userProjection = new UserProjection(userReadRepository);

    return {
      commandHandlers: {
        CreateUser: new CreateUserHandler(userRepository),
        UpdateUserProfile: new UpdateUserProfileHandler(userRepository),
      },
      queryHandlers: {
        GetUserById: new GetUserByIdHandler(userReadRepository),
        SearchUsers: new SearchUsersHandler(userReadRepository),
      },
      eventHandlers: {
        UserCreated: [(event) => userProjection.onUserCreated(event)],
        UserProfileUpdated: [(event) => userProjection.onProfileUpdated(event)],
      },
    };
  },
});

// Order Module
const orderModule = createModule({
  name: 'orders',
  setup: ({ eventStore }) => {
    const orderRepository = new OrderRepository(eventStore);
    const orderReadRepository = new InMemoryOrderReadRepository();
    const orderProjection = new OrderProjection(orderReadRepository);

    return {
      commandHandlers: {
        PlaceOrder: new PlaceOrderHandler(orderRepository),
        ShipOrder: new ShipOrderHandler(orderRepository),
      },
      queryHandlers: {
        GetOrderById: new GetOrderByIdHandler(orderReadRepository),
      },
      eventHandlers: {
        OrderPlaced: [(event) => orderProjection.onOrderPlaced(event)],
        OrderShipped: [(event) => orderProjection.onOrderShipped(event)],
      },
    };
  },
});

// Create Application
const app = createEventFlowsApp({
  eventStore: new InMemoryEventStore(),
  eventBus: new InMemoryEventBus({}),
  modules: [userModule, orderModule] as const,
});

// Use the application
async function main() {
  // Create a user
  await app.commands.CreateUser({
    userId: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
  });

  // Query the user
  const user = await app.queries.GetUserById({ userId: 'user-123' });

  // Place an order
  await app.commands.PlaceOrder({
    orderId: 'order-456',
    customerId: 'user-123',
    items: [{ sku: 'WIDGET-1', quantity: 2 }],
  });
}
```

See implementation in `packages/core/src/module/create-app.ts`
