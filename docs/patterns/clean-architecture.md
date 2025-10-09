# Clean Architecture

Clean Architecture is a software design philosophy that emphasizes **separation of concerns** and **dependency inversion**. In EventFlow, we apply Clean Architecture principles to create maintainable, testable, and framework-independent code.

## Core Principles

### 1. Dependency Rule

Dependencies point **inward** toward the domain:

```
┌─────────────────────────────────────────┐
│  Infrastructure (Adapters, DB, HTTP)   │  ← Outer Layer
├─────────────────────────────────────────┤
│  Application (Use Cases, Handlers)     │  ← Middle Layer
├─────────────────────────────────────────┤
│  Domain (Aggregates, Entities, VOs)    │  ← Inner Layer
└─────────────────────────────────────────┘
```

**Rule**: Inner layers **never depend** on outer layers.

```typescript
// ❌ BAD: Domain depends on infrastructure
class BankAccount extends AggregateRoot {
  constructor(private database: PostgresClient) {} // ❌ Wrong!
}

// ✅ GOOD: Domain is pure, infrastructure depends on domain
class BankAccount extends AggregateRoot {
  // No infrastructure dependencies
  deposit(amount: number) {
    this.applyEvent({ type: 'MoneyDeposited', payload: { amount } });
  }
}

// Infrastructure implements domain interfaces
class PostgresEventStore extends EventStore {
  // Infrastructure knows about domain
  async save(aggregate: BankAccount) { /* ... */ }
}
```

### 2. Independence from Frameworks

Your domain logic should work **without any framework**:

```typescript
// Domain layer - works anywhere
class BankAccount extends AggregateRoot {
  private balance = 0;

  deposit(amount: number) {
    if (amount <= 0) throw new Error('Invalid amount');
    this.applyEvent({ type: 'MoneyDeposited', payload: { amount } });
  }

  onMoneyDeposited(event: { payload: { amount: number } }) {
    this.balance += event.payload.amount;
  }
}

// Can be used in:
// - Express applications
// - Fastify services
// - AWS Lambda functions
// - Plain Node.js scripts
// - Bun runtime
```

### 3. Testability

Each layer can be tested independently:

```typescript
// Test domain without infrastructure
describe('BankAccount', () => {
  test('deposits money', () => {
    const account = new BankAccount('acc-123');
    account.deposit(100);
    expect(account.getBalance()).toBe(100);
  });
});

// Test application with mocks
describe('DepositMoneyHandler', () => {
  test('handles deposit command', async () => {
    const mockRepo = createMockRepository();
    const handler = new DepositMoneyHandler(mockRepo);

    await handler.execute({
      commandName: 'DepositMoney',
      accountId: 'acc-123',
      amount: 100
    });

    expect(mockRepo.save).toHaveBeenCalled();
  });
});
```

## Layers in EventFlow

### Domain Layer (Core Business Logic)

**Contains**:
- Aggregates
- Entities
- Value Objects
- Domain Events
- Domain Services

**Dependencies**: None (pure TypeScript)

```typescript
// domain/bank-account.ts
class BankAccount extends AggregateRoot {
  private balance = 0;

  deposit(amount: Money) { /* ... */ }
  withdraw(amount: Money) { /* ... */ }

  protected onMoneyDeposited(event: MoneyDeposited) {
    this.balance += event.payload.amount.value;
  }
}
```

### Application Layer (Use Cases)

**Contains**:
- Command Handlers
- Query Handlers
- Application Services
- Repository Interfaces

**Dependencies**: Domain Layer

```typescript
// application/deposit-money-handler.ts
class DepositMoneyHandler implements ICommandHandler<DepositMoneyCommand> {
  constructor(
    private readonly repository: IAccountRepository // Interface
  ) {}

  async execute(command: DepositMoneyCommand): Promise<void> {
    // Load aggregate
    const account = await this.repository.findById(command.accountId);

    // Execute domain logic
    account.deposit(Money.fromCents(command.amount));

    // Save aggregate
    await this.repository.save(account);
  }
}
```

### Infrastructure Layer (External Concerns)

**Contains**:
- Event Store Implementations
- Repository Implementations
- HTTP Controllers
- Message Queue Adapters

**Dependencies**: Application Layer, Domain Layer

```typescript
// infrastructure/postgres-account-repository.ts
class PostgresAccountRepository implements IAccountRepository {
  constructor(
    private readonly eventStore: PostgresEventStore
  ) {}

  async findById(id: string): Promise<BankAccount> {
    const stream = EventStream.for('BankAccount', id);
    const events = [];

    for await (const batch of this.eventStore.getEvents(stream)) {
      events.push(...batch);
    }

    const account = new BankAccount(id);
    account.loadFromHistory(events);
    return account;
  }

  async save(account: BankAccount): Promise<void> {
    const stream = EventStream.for('BankAccount', account.id);
    const events = account.commit();
    await this.eventStore.appendEvents(stream, account.version, events);
  }
}
```

## Benefits in EventFlow

### 1. Framework Independence

Switch frameworks without rewriting domain logic:

```typescript
// Same domain code works in Express:
app.post('/deposit', async (req, res) => {
  await commandBus.execute({
    commandName: 'DepositMoney',
    accountId: req.body.accountId,
    amount: req.body.amount
  });
});

// ...and in Fastify:
fastify.post('/deposit', async (request, reply) => {
  await commandBus.execute({
    commandName: 'DepositMoney',
    accountId: request.body.accountId,
    amount: request.body.amount
  });
});

// ...and in AWS Lambda:
export const handler = async (event) => {
  await commandBus.execute({
    commandName: 'DepositMoney',
    accountId: event.accountId,
    amount: event.amount
  });
};
```

### 2. Testable Business Logic

Test domain without external dependencies:

```typescript
// No database, no HTTP, no frameworks needed
test('cannot overdraw account', () => {
  const account = new BankAccount('acc-123');
  account.deposit(Money.fromCents(100));

  expect(() => {
    account.withdraw(Money.fromCents(200));
  }).toThrow('Insufficient funds');
});
```

### 3. Flexible Infrastructure

Swap implementations without changing domain:

```typescript
// Development: In-memory
const eventStore = new InMemoryEventStore({});

// Staging: PostgreSQL
const eventStore = new PostgresEventStore(pgConfig);

// Production: EventStoreDB
const eventStore = new EventStoreDBAdapter(esdbConfig);

// Domain code remains unchanged
```

## Anti-Patterns to Avoid

### ❌ Domain Depending on Infrastructure

```typescript
// BAD: Domain knows about HTTP
class BankAccount extends AggregateRoot {
  async deposit(amount: number, httpClient: AxiosInstance) {
    await httpClient.post('/notify', { amount }); // ❌ Wrong!
    this.applyEvent({ type: 'MoneyDeposited', payload: { amount } });
  }
}

// GOOD: Use domain events for side effects
class BankAccount extends AggregateRoot {
  deposit(amount: number) {
    this.applyEvent({ type: 'MoneyDeposited', payload: { amount } });
    // Infrastructure subscribes to this event
  }
}
```

### ❌ Skipping the Application Layer

```typescript
// BAD: Controller directly manipulates domain
app.post('/deposit', async (req, res) => {
  const account = await repository.findById(req.body.accountId);
  account.deposit(req.body.amount); // ❌ Business logic in controller
  await repository.save(account);
});

// GOOD: Use application layer (command handler)
app.post('/deposit', async (req, res) => {
  await commandBus.execute({
    commandName: 'DepositMoney',
    accountId: req.body.accountId,
    amount: req.body.amount
  });
});
```

### ❌ Anemic Domain Model

```typescript
// BAD: Domain objects are just data containers
class BankAccount {
  balance: number; // Public mutable state
}

class BankAccountService {
  deposit(account: BankAccount, amount: number) {
    account.balance += amount; // Logic outside domain
  }
}

// GOOD: Rich domain model with behavior
class BankAccount extends AggregateRoot {
  private balance = 0;

  deposit(amount: number) {
    if (amount <= 0) throw new Error('Invalid amount');
    this.applyEvent({ type: 'MoneyDeposited', payload: { amount } });
  }
}
```

## Summary

Clean Architecture in EventFlow means:

✅ **Domain is pure** - no external dependencies
✅ **Dependencies point inward** - infrastructure → application → domain
✅ **Framework independence** - works anywhere
✅ **Testability** - test each layer in isolation
✅ **Flexibility** - swap implementations easily

## Next Steps

- Learn about [Domain-Driven Design](./domain-driven-design) patterns
- Understand [CQRS](./cqrs) for separating reads and writes
- Explore [Event Sourcing](./event-sourcing) fundamentals
