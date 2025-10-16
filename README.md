# EventFlows

EventFlows is a framework-agnostic TypeScript library for building event-sourced applications using Domain-Driven Design, CQRS, and Event Sourcing patterns. It works with any TypeScript/Node.js environment without framework lock-in.

📚 **[View Documentation](https://jacob-decrane.github.io/event-flows/)**

## Packages

This monorepo contains multiple packages:

### [@eventflows/core](./packages/core)

Core abstractions and primitives for event sourcing, CQRS, and DDD patterns.

```bash
npm install @eventflows/core
```

### [@eventflows/integrations](./packages/integrations)

Production-ready integrations for AWS, PostgreSQL, and more.

```bash
npm install @eventflows/integrations @eventflows/core
```

Currently includes:
- ✅ `InMemoryEventBus` - In-memory event bus for testing and development
- 🚧 AWS integrations (EventBridge, DynamoDB, SNS/SQS) - Coming soon
- 🚧 PostgreSQL integrations (Event Store, Projections, Outbox) - Coming soon

## Quick Start

```bash
# Install core package
bun add @eventflows/core

# Or install with integrations
bun add @eventflows/core @eventflows/integrations
```
