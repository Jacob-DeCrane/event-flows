# Modules

Modules organize your application into **domain-driven bounded contexts**.

## EventFlowsModule Interface

```typescript
interface EventFlowsModule {
  name: string;                    // Unique identifier (lowercase, hyphen-separated)
  boundedContext?: string;         // Optional parent context
  register: (context: ModuleContext) => ModuleRegistration | Promise<ModuleRegistration>;
}
```

## Basic Module

```typescript
const userModule: EventFlowsModule = {
  name: 'users',
  register: (context) => ({
    commandHandlers: [],
    queryHandlers: [],
    projections: []
  })
};
```

## Module Context

The `register` function receives infrastructure access:

```typescript
interface ModuleContext {
  eventStore: EventStore;  // For persistence
  eventBus: IEventBus;     // For pub/sub
}
```

Use context to create repositories and wire handlers:

```typescript
register: (context) => {
  const repository = new UserRepository(context.eventStore);

  return {
    commandHandlers: [
      { commandName: 'CreateUser', handler: new CreateUserHandler(repository) }
    ],
    // ...
  };
}
```

## Command Handler Registration

```typescript
interface CommandHandlerRegistration {
  commandName: string;
  handler: ICommandHandler;
}
```

Example:

```typescript
commandHandlers: [
  { commandName: 'CreateUser', handler: new CreateUserHandler(repository) },
  { commandName: 'UpdateUser', handler: new UpdateUserHandler(repository) }
]
```

## Query Handler Registration

```typescript
interface QueryHandlerRegistration {
  queryName: string;
  handler: IQueryHandler;
}
```

Example:

```typescript
queryHandlers: [
  { queryName: 'GetUserById', handler: new GetUserByIdHandler(readModel) },
  { queryName: 'ListUsers', handler: new ListUsersHandler(readModel) }
]
```

## Projection Registration

Projections maintain read models by subscribing to events:

```typescript
interface ProjectionRegistration {
  name: string;
  handlers: Record<string, EventHandler>;
  retry?: { maxAttempts?: number };
}
```

Example:

```typescript
projections: [
  {
    name: 'UserListProjection',
    handlers: {
      UserCreated: async (envelope) => {
        await userReadModel.add({
          id: envelope.metadata.aggregateId,
          name: envelope.payload.name
        });
      },
      UserUpdated: async (envelope) => {
        await userReadModel.update(
          envelope.metadata.aggregateId,
          envelope.payload
        );
      }
    }
  }
]
```

## Cross-Module Event Handlers

React to events from other modules:

```typescript
interface EventHandlerRegistration {
  eventType: string;
  handler: EventHandler;
  fromContext?: string;  // Filter by source context
}
```

Example:

```typescript
// In orders module, react to user events
eventHandlers: [
  {
    eventType: 'UserCreated',
    handler: async (envelope) => {
      // Update order records with new user info
    },
    fromContext: 'identity'
  }
]
```

## Async Registration

Modules can perform async initialization:

```typescript
const userModule: EventFlowsModule = {
  name: 'users',
  register: async (context) => {
    // Connect to database, load config, etc.
    await initializeReadModel();

    return {
      commandHandlers: [...],
      queryHandlers: [...],
      projections: [...]
    };
  }
};
```

## Complete Example

```typescript
const inventoryModule: EventFlowsModule = {
  name: 'inventory',
  boundedContext: 'warehouse',
  register: (context) => {
    const repository = new ProductRepository(context.eventStore);
    const readModel = new ProductCatalog();

    return {
      commandHandlers: [
        { commandName: 'AddProduct', handler: new AddProductHandler(repository) },
        { commandName: 'RemoveProduct', handler: new RemoveProductHandler(repository) }
      ],
      queryHandlers: [
        { queryName: 'GetProduct', handler: new GetProductHandler(readModel) },
        { queryName: 'ListProducts', handler: new ListProductsHandler(readModel) }
      ],
      projections: [
        {
          name: 'ProductCatalog',
          handlers: {
            ProductAdded: (e) => readModel.add(e.payload),
            ProductRemoved: (e) => readModel.remove(e.metadata.aggregateId)
          }
        }
      ],
      eventHandlers: [
        {
          eventType: 'OrderShipped',
          handler: (e) => readModel.decrementStock(e.payload.productId),
          fromContext: 'orders'
        }
      ]
    };
  }
};
```

See implementation in `packages/core/src/module/interfaces/`
