# Domain-Driven Design (DDD)

Domain-Driven Design is an approach to software development that centers the design around the **business domain** and its logic. EventFlow embraces DDD tactical patterns to model complex business rules.

## Core DDD Concepts

### Ubiquitous Language

Use the **same terminology** in code as in business discussions:

```typescript
// ✅ Use business terms
class BankAccount {
  deposit(amount: Money) { }
  withdraw(amount: Money) { }
}

// ❌ Generic technical terms
class DataEntity {
  addValue(x: number) { }
  removeValue(x: number) { }
}
```

### Bounded Contexts

Different parts of the system have different models:

```
┌──────────────────┐   ┌───────────────────┐   ┌──────────────────┐
│  Account Context │   │  Payment Context  │   │  Fraud Context   │
│                  │   │                   │   │                  │
│  - BankAccount   │   │  - Payment        │   │  - Transaction   │
│  - Transaction   │   │  - PaymentMethod  │   │  - RiskScore     │
└──────────────────┘   └───────────────────┘   └──────────────────┘
```

Each context has its own model, events, and aggregates.

## DDD Building Blocks in EventFlow

### Entities

Objects with **identity** that persists over time:

```typescript
class BankAccount extends AggregateRoot {
  // Identity
  public readonly id: string;

  // State
  private balance = 0;
  private status: AccountStatus;

  constructor(id: string) {
    super(id);
    this.id = id;
  }

  // Behavior
  deposit(amount: Money) { /* ... */ }
}

// Same identity, different state
const account1 = new BankAccount('acc-123');
account1.deposit(Money.fromCents(100));

// Loading from events recreates the same entity
const account2 = new BankAccount('acc-123');
account2.loadFromHistory(events);

// Same identity
console.log(account1.id === account2.id); // true
```

### Value Objects

Objects defined by their **attributes**, not identity:

```typescript
class Money extends ValueObject<{ amount: number; currency: string }> {
  static fromCents(cents: number, currency = 'USD'): Money {
    return new Money({ amount: cents, currency });
  }

  add(other: Money): Money {
    if (this.props.currency !== other.props.currency) {
      throw new Error('Cannot add different currencies');
    }
    return new Money({
      amount: this.props.amount + other.props.amount,
      currency: this.props.currency
    });
  }

  // Value objects are immutable
  get amount(): number {
    return this.props.amount;
  }
}

// No identity - compared by value
const money1 = Money.fromCents(100);
const money2 = Money.fromCents(100);
console.log(money1.equals(money2)); // true
```

### Aggregates

Cluster of entities and value objects treated as a **single unit**:

```typescript
// Aggregate Root
class Order extends AggregateRoot {
  private items: OrderItem[] = [];
  private status: OrderStatus;

  // Aggregate boundary
  addItem(productId: string, quantity: number, price: Money) {
    // Business rules enforced at aggregate boundary
    if (this.status !== 'Draft') {
      throw new Error('Cannot modify submitted order');
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    this.applyEvent({
      type: 'ItemAdded',
      payload: { productId, quantity, price: price.props }
    });
  }

  // Internal entity
  protected onItemAdded(event: ItemAddedEvent) {
    this.items.push(new OrderItem(
      event.payload.productId,
      event.payload.quantity,
      Money.from(event.payload.price)
    ));
  }
}

// Order Items are part of the Order aggregate
class OrderItem {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly price: Money
  ) {}
}
```

**Aggregate Rules**:
- External code only references the **root**
- Internal entities accessed **through the root**
- Each aggregate is a **consistency boundary**

### Repositories

Provide access to aggregates:

```typescript
interface IAccountRepository {
  findById(id: string): Promise<BankAccount>;
  save(account: BankAccount): Promise<void>;
}

// Repository hides event store details
class AccountRepository implements IAccountRepository {
  constructor(private readonly eventStore: EventStore) {}

  async findById(id: string): Promise<BankAccount> {
    const stream = EventStream.for('BankAccount', id);
    const events = await this.loadEvents(stream);

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

### Domain Events

Represent something that **happened** in the domain:

```typescript
// Past tense naming - something that happened
interface MoneyDepositedEvent extends IEvent {
  type: 'MoneyDeposited';
  payload: {
    accountId: string;
    amount: number;
    depositedAt: Date;
  };
}

interface AccountClosedEvent extends IEvent {
  type: 'AccountClosed';
  payload: {
    accountId: string;
    reason: string;
    closedAt: Date;
  };
}

// Events capture business facts
class BankAccount extends AggregateRoot {
  close(reason: string) {
    if (this.balance !== 0) {
      throw new Error('Cannot close account with non-zero balance');
    }

    this.applyEvent({
      type: 'AccountClosed',
      payload: {
        accountId: this.id,
        reason,
        closedAt: new Date()
      }
    });
  }
}
```

### Domain Services

Operations that don't naturally fit in an entity:

```typescript
// Domain service for complex business logic
class MoneyTransferService {
  constructor(
    private readonly accountRepository: IAccountRepository
  ) {}

  async transfer(
    fromAccountId: string,
    toAccountId: string,
    amount: Money
  ): Promise<void> {
    // Load both aggregates
    const fromAccount = await this.accountRepository.findById(fromAccountId);
    const toAccount = await this.accountRepository.findById(toAccountId);

    // Business rule: Cannot transfer between different currencies
    if (!fromAccount.supportsCurrency(amount.currency)) {
      throw new Error('Source account does not support currency');
    }

    // Coordinate the operation
    fromAccount.withdraw(amount);
    toAccount.deposit(amount);

    // Save both (in a transaction in real implementation)
    await this.accountRepository.save(fromAccount);
    await this.accountRepository.save(toAccount);
  }
}
```

## DDD Patterns in Event Sourcing

### Aggregates + Event Sourcing

Aggregates emit events instead of updating state directly:

```typescript
class BankAccount extends AggregateRoot {
  private balance = 0;

  deposit(amount: number) {
    // Validate business rules first
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Emit event (not update state directly)
    this.applyEvent({
      type: 'MoneyDeposited',
      payload: { amount, timestamp: new Date() }
    });
  }

  // Event handler updates state
  protected onMoneyDeposited(event: MoneyDepositedEvent) {
    this.balance += event.payload.amount;
  }
}
```

### Eventual Consistency Between Aggregates

Aggregates communicate via events:

```typescript
// Aggregate 1: Order
class Order extends AggregateRoot {
  submit() {
    this.applyEvent({
      type: 'OrderSubmitted',
      payload: { orderId: this.id, items: this.items }
    });
  }
}

// Aggregate 2: Inventory (different aggregate)
eventBus.subscribe('OrderSubmitted', async (envelope) => {
  // Eventually consistent - happens asynchronously
  const inventory = await inventoryRepo.load('warehouse-1');
  inventory.reserveStock(envelope.payload.items);
  await inventoryRepo.save(inventory);
});
```

## Summary

DDD in EventFlow provides:

✅ **Ubiquitous Language** - code matches business terminology
✅ **Bounded Contexts** - clear model boundaries
✅ **Entities** - objects with identity
✅ **Value Objects** - immutable, compared by value
✅ **Aggregates** - consistency boundaries
✅ **Repositories** - aggregate persistence
✅ **Domain Events** - business facts
✅ **Domain Services** - complex operations

## Next Steps

- Learn about [CQRS](./cqrs) for separating reads and writes
- Understand [Event Sourcing](./event-sourcing) fundamentals
- Explore [Value Objects](../command-side/value-objects) implementation
- See [Aggregates](../command-side/aggregates) in detail
