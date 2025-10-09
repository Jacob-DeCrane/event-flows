# Event Store

The Event Store persists and retrieves events for aggregates.

## Abstract Base Class

```typescript
abstract class EventStore<TOptions = Record<string, any>> {
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract appendEvents(
    stream: EventStream,
    version: number,
    events: IEvent[]
  ): Promise<EventEnvelope[]>;
  abstract getEvents(stream: EventStream): AsyncGenerator<IEvent[]>;
}
```

## InMemoryEventStore

For testing and development:

```typescript
const store = new InMemoryEventStore({});
await store.connect();

const stream = EventStream.for('BankAccount', 'acc-123');
const events = [
  { type: 'MoneyDeposited', payload: { amount: 100 } }
];

await store.appendEvents(stream, 0, events);
```

## Event Streams

Events are organized by aggregate:

```typescript
const stream = EventStream.for('BankAccount', 'acc-123');
// Stream ID: "BankAccount-acc-123"
```

## Optimistic Concurrency

Version numbers prevent conflicts:

```typescript
// Process A: succeeds
await store.appendEvents(stream, 1, [event]); // ✅ version 1 → 2

// Process B: fails
await store.appendEvents(stream, 1, [event]); // ❌ ConcurrencyException
```

See implementation in `packages/core/src/event-store.ts`

Documentation will be expanded soon.
