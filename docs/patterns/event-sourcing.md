# Event Sourcing

Event Sourcing stores **state changes as events** rather than current state.

## Core Concept

Instead of storing the current state, store all the events that led to that state:

```typescript
// Traditional: Current state
{ id: 'acc-123', balance: 1000 }

// Event Sourcing: History of changes
[
  { type: 'AccountOpened', payload: { initialBalance: 0 } },
  { type: 'MoneyDeposited', payload: { amount: 500 } },
  { type: 'MoneyDeposited', payload: { amount: 500 } }
]
```

## Benefits

- **Complete Audit Trail**: Know exactly what happened and when
- **Temporal Queries**: Query state at any point in time
- **Event Replay**: Rebuild state from events
- **Debugging**: Reproduce issues by replaying events

## Event Immutability

Events **never change** once persisted:

```typescript
// ✅ Append new events
store.appendEvents(stream, version, [newEvent]);

// ❌ Never modify existing events
// Events are immutable facts about the past
```

## State Derivation

Current state is **derived by replaying events**:

```typescript
const account = new BankAccount('acc-123');
account.loadFromHistory(events);
console.log(account.getBalance()); // Calculated from events
```

Documentation will be expanded soon.
