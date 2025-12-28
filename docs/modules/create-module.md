# createModule()

Creates a typed module factory for organizing domain handlers.

## Basic Usage

```typescript
import { createModule } from '@eventflows/core';

const accountModule = createModule({
  name: 'accounts',
  setup: ({ eventStore }) => {
    const accountRepository = new AccountRepository(eventStore);
    return {
      commandHandlers: {
        CreateAccount: new CreateAccountHandler(accountRepository),
        DepositMoney: new DepositMoneyHandler(accountRepository),
      },
    };
  },
});
```

## Module Structure

The `createModule()` function accepts a configuration object with:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Unique module identifier |
| `setup` | `function` | Factory function receiving dependencies |

The `setup` function receives `{ eventStore, eventBus }` and returns:

| Property | Type | Description |
|----------|------|-------------|
| `commandHandlers` | `Record<string, ICommandHandler>` | Command handlers keyed by command name |
| `queryHandlers` | `Record<string, IQueryHandler>` | Query handlers keyed by query name |
| `eventHandlers` | `Record<string, EventHandler[]>` | Event handlers keyed by event name |

## With Command Handlers

```typescript
interface CreateAccountCommand extends ICommand {
  commandName: 'CreateAccount';
  accountId: string;
  initialBalance: number;
}

class CreateAccountHandler implements ICommandHandler<CreateAccountCommand, void> {
  constructor(private readonly repository: AccountRepository) {}

  async execute(command: CreateAccountCommand): Promise<void> {
    const account = Account.create(command.accountId, command.initialBalance);
    await this.repository.save(account);
  }
}

const accountModule = createModule({
  name: 'accounts',
  setup: ({ eventStore }) => {
    const repository = new AccountRepository(eventStore);
    return {
      commandHandlers: {
        CreateAccount: new CreateAccountHandler(repository),
      },
    };
  },
});
```

## With Query Handlers

```typescript
interface GetAccountBalanceQuery extends IQuery {
  queryName: 'GetAccountBalance';
  accountId: string;
}

class GetAccountBalanceHandler implements IQueryHandler<GetAccountBalanceQuery, number> {
  constructor(private readonly readRepository: AccountBalanceReadRepository) {}

  async execute(query: GetAccountBalanceQuery): Promise<number> {
    return await this.readRepository.getBalance(query.accountId);
  }
}

const accountModule = createModule({
  name: 'accounts',
  setup: ({ eventStore }) => {
    const writeRepository = new AccountRepository(eventStore);
    const readRepository = new AccountBalanceReadRepository();
    return {
      commandHandlers: {
        CreateAccount: new CreateAccountHandler(writeRepository),
      },
      queryHandlers: {
        GetAccountBalance: new GetAccountBalanceHandler(readRepository),
      },
    };
  },
});
```

## With Event Handlers

Event handlers react to domain events. Multiple handlers can subscribe to the same event:

```typescript
class AccountBalanceProjection {
  constructor(private readonly readRepository: AccountBalanceReadRepository) {}

  async onMoneyDeposited(event: EventEnvelope<MoneyDeposited>): Promise<void> {
    await this.readRepository.updateBalance(
      event.metadata.aggregateId,
      event.payload.amount
    );
  }
}

const accountModule = createModule({
  name: 'accounts',
  setup: ({ eventStore, eventBus }) => {
    const writeRepository = new AccountRepository(eventStore);
    const readRepository = new AccountBalanceReadRepository();
    const projection = new AccountBalanceProjection(readRepository);

    return {
      commandHandlers: {
        CreateAccount: new CreateAccountHandler(writeRepository),
        DepositMoney: new DepositMoneyHandler(writeRepository),
      },
      queryHandlers: {
        GetAccountBalance: new GetAccountBalanceHandler(readRepository),
      },
      eventHandlers: {
        MoneyDeposited: [
          (event) => projection.onMoneyDeposited(event),
          (event) => console.log('Deposit:', event.payload.amount),
        ],
      },
    };
  },
});
```

## Type Inference

Handler names are preserved as string literal types, enabling intellisense:

```typescript
const module = createModule({
  name: 'users',
  setup: ({ eventStore }) => ({
    commandHandlers: {
      CreateUser: new CreateUserHandler(),  // Type: 'CreateUser'
      UpdateUser: new UpdateUserHandler(),  // Type: 'UpdateUser'
    },
  }),
});

// When used with createEventFlowsApp(), these become:
// app.commands.CreateUser({ ... })  - Full type inference
// app.commands.UpdateUser({ ... })  - Full type inference
```

## Full-Featured Module

```typescript
const orderModule = createModule({
  name: 'orders',
  setup: ({ eventStore, eventBus }) => {
    // Create repositories with injected dependencies
    const orderRepository = new OrderRepository(eventStore);
    const orderReadRepository = new InMemoryOrderReadRepository();
    const orderProjection = new OrderProjection(orderReadRepository);

    return {
      commandHandlers: {
        PlaceOrder: new PlaceOrderHandler(orderRepository),
        CancelOrder: new CancelOrderHandler(orderRepository),
        ShipOrder: new ShipOrderHandler(orderRepository),
      },
      queryHandlers: {
        GetOrderById: new GetOrderByIdHandler(orderReadRepository),
        ListOrdersByCustomer: new ListOrdersByCustomerHandler(orderReadRepository),
      },
      eventHandlers: {
        OrderPlaced: [
          (event) => orderProjection.onOrderPlaced(event),
          (event) => notifyWarehouse(event),
        ],
        OrderShipped: [
          (event) => orderProjection.onOrderShipped(event),
          (event) => notifyCustomer(event),
        ],
      },
    };
  },
});
```

## Best Practices

- **One Module Per Bounded Context**: Align modules with domain boundaries
- **Handler Naming**: Use clear, action-based names (`CreateUser`, not `User`)
- **Dependency Injection**: Create dependencies inside `setup()` using provided infrastructure
- **Immutability**: Modules are frozen after creation
- **Event Handlers for Side Effects**: Use event handlers for cross-cutting concerns

See implementation in `packages/core/src/module/create-module.ts`
