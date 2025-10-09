# Aggregates

Aggregates are clusters of domain objects treated as a **single unit** for data changes.

## Purpose

- **Consistency Boundary**: Ensure business rules within aggregate
- **Transactional Scope**: Changes are atomic
- **Encapsulation**: Hide internal state and logic

## AggregateRoot in EventFlows

```typescript
class BankAccount extends AggregateRoot {
  private balance = 0;

  constructor(id: string) {
    super(id);
  }

  // Command method
  deposit(amount: number) {
    if (amount <= 0) throw new Error('Invalid amount');

    this.applyEvent({
      type: 'MoneyDeposited',
      payload: { amount }
    });
  }

  // Event handler (convention: on{EventType})
  protected onMoneyDeposited(event: { payload: { amount: number } }) {
    this.balance += event.payload.amount;
  }

  getBalance(): number {
    return this.balance;
  }
}
```

## Key Concepts

### Event Application
```typescript
// Apply event with side effects (new event)
aggregate.applyEvent(event); // Adds to uncommitted events

// Apply event from history (replay)
aggregate.loadFromHistory(events); // No side effects
```

### Commit Uncommitted Events
```typescript
const events = aggregate.commit(); // Get and clear uncommitted events
await eventStore.save(events);
```

### Version Tracking
```typescript
console.log(aggregate.version); // Current version for optimistic locking
```

See implementation in `packages/core/src/models/aggregate-root.ts`

Documentation will be expanded soon.
