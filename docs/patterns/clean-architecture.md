# Clean Architecture

Clean Architecture is a software design philosophy that emphasizes **separation of concerns** and **dependency inversion**. It creates maintainable, testable systems by organizing code into layers where dependencies flow inward toward your core business logic.

## The Core Idea

In Clean Architecture, your system is organized in concentric layers:

```
┌─────────────────────────────────────────┐
│  Infrastructure (Adapters, DB, HTTP)    │  ← Outer Layer
├─────────────────────────────────────────┤
│  Application (Use Cases, Handlers)      │  ← Middle Layer
├─────────────────────────────────────────┤
│  Domain (Aggregates, Entities, VOs)     │  ← Inner Layer
└─────────────────────────────────────────┘
```

**The Golden Rule**: Dependencies point inward. Inner layers never depend on outer layers.

This means:
- Your **domain logic** (business rules) has zero dependencies
- Your **application layer** depends only on the domain
- Your **infrastructure** depends on both, but they don't depend on it

## Why This Matters

**Framework Independence**: Your business logic isn't tied to Express, Fastify, or any framework. Switch frameworks without rewriting your core code.

**Testability**: Test domain logic without databases, HTTP servers, or external services. Fast, reliable tests that focus on business rules.

**Flexibility**: Swap implementations easily. Use in-memory storage for development, PostgreSQL for staging, and EventStoreDB for production—without touching domain code.

**Clarity**: Clear boundaries make it obvious where code belongs. Domain logic stays pure, infrastructure concerns stay isolated.

## How EventFlows Applies Clean Architecture

EventFlows is built on Clean Architecture principles:

### Domain Layer
Your aggregates, entities, and value objects contain business logic with no external dependencies. They only know about domain events and business rules.

### Application Layer
Command handlers and query handlers orchestrate domain operations. They depend on domain abstractions (interfaces) but not concrete implementations.

### Infrastructure Layer
Event stores, repositories, and adapters implement the abstractions. They know about databases, message queues, and external services—but the domain doesn't know about them.

## The Dependency Inversion Principle

Clean Architecture relies on **dependency inversion**: instead of depending on concrete implementations, depend on abstractions (interfaces).

**Traditional approach** (tight coupling):
```
Domain → PostgresEventStore → Postgres
```
Your domain directly depends on infrastructure.

**Clean Architecture approach** (loose coupling):
```
Domain → IEventStore ← PostgresEventStore → Postgres
```
Your domain depends on an interface. Infrastructure implements that interface.

This means you can:
- Test domain logic with mock implementations
- Swap infrastructure without changing domain code
- Deploy the same domain logic in different environments

## Key Benefits

**Independent Business Logic**: Your domain models work anywhere—Express apps, Lambda functions, or plain Node.js scripts.

**Maintainability**: Clear layers make it easy to find and change code. Business rules live in one place.

**Testability**: Test each layer in isolation. Domain tests run instantly without databases or APIs.

**Evolvability**: Change infrastructure without touching business logic. Upgrade frameworks without fear.

## Clean Architecture in Practice

When you use EventFlows, Clean Architecture guides your code organization:

1. **Domain**: Define aggregates that enforce business rules through domain events
2. **Application**: Create command/query handlers that orchestrate domain operations
3. **Infrastructure**: Implement event stores and repositories for persistence

EventFlows provides the primitives (EventBus, CommandBus, EventStore) that respect these boundaries, making it natural to build clean, layered systems.

## Next Steps

Learn how Clean Architecture works with other patterns:

- [Domain-Driven Design](./domain-driven-design) - Tactical patterns for modeling your domain
- [CQRS](./cqrs) - Separating reads and writes at the application layer
- [Event Sourcing](./event-sourcing) - Storing state as events in the domain layer

For implementation details, explore the [Domain Modeling](/domain/aggregates), [Command Side](/command-side/commands), and [Query Side](/query-side/projections) documentation.
