# @eventflows/integrations

Production-ready integrations for EventFlows including AWS, PostgreSQL, and in-memory implementations.

## Installation

```bash
npm install @eventflows/integrations @eventflows/core
```

or

```bash
yarn add @eventflows/integrations @eventflows/core
```

or

```bash
bun add @eventflows/integrations @eventflows/core
```

## Usage

### In-Memory Event Bus

The `InMemoryEventBus` is suitable for testing, development, and single-instance applications.

```typescript
import { InMemoryEventBus } from '@eventflows/integrations';

const eventBus = new InMemoryEventBus({ debug: true });

// Set error handler
eventBus.setErrorHandler((error, envelope) => {
  console.error(`Error handling ${envelope.event}:`, error);
});

// Subscribe to specific event
const unsubscribe = eventBus.subscribe('MoneyDeposited', async (envelope) => {
  console.log(`Money deposited: ${envelope.payload.amount}`);
  await updateReadModel(envelope);
});

// Subscribe to all events
eventBus.subscribeAll(async (envelope) => {
  console.log(`Event published: ${envelope.event}`);
});

// Publish event
await eventBus.publish(eventEnvelope);

// Clean up
unsubscribe();
```

## Available Integrations

### ✅ In-Memory
- **InMemoryEventBus**: Event bus implementation using Map and Set data structures
- Suitable for: Testing, development, single-instance applications

### 🚧 AWS (Coming Soon)
- EventBridge Event Bus
- DynamoDB Event Store
- SNS/SQS Integration

See [src/aws/README.md](./src/aws/README.md) for planned AWS integrations.

### 🚧 PostgreSQL (Coming Soon)
- PostgreSQL Event Store
- PostgreSQL Projection Store
- PostgreSQL Outbox Pattern
- PostgreSQL Saga Store

See [src/postgres/README.md](./src/postgres/README.md) for planned PostgreSQL integrations.

## Documentation

For comprehensive documentation and guides, visit the [EventFlows documentation](https://jacob-decrane.github.io/event-flows/).

## Custom Integrations

While we work on adding more integrations, you can implement your own by extending the abstract classes from `@eventflows/core`:

- `EventBus` - For custom event bus implementations
- `EventStore` - For custom event storage backends
- `CommandBus` - For custom command routing
- `QueryBus` - For custom query handling

See the [documentation](https://jacob-decrane.github.io/event-flows/) for implementation guides.

## License

MIT
