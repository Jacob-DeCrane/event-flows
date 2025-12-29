# Introduction to EventFlows

## What is EventFlows?

EventFlows is a TypeScript library for building event-sourced applications using Domain-Driven Design principles. It provides the building blocks for CQRS and Event Sourcing without coupling to any specific web framework, allowing you to use it with Express, Fastify, AWS Lambda, Azure Functions, or plain Node.js.

## Why EventFlows?

Modern event-sourced applications combine powerful architectural patterns—Domain-Driven Design, CQRS, Event Sourcing, and Clean Architecture -- but
implementing them correctly is overwhelming. Each pattern has intricate details, and understanding how they fit together requires significant
mental overhead.

EventFlows cuts through this complexity. Instead of wrestling with how to wire up aggregates, event stores, command buses, and projections, you
get clear primitives that guide you toward the right architecture. The library handles the intricate mechanics so you can focus on modeling your
domain and writing clean, performant code.

### Key Features

EventFlows provides building blocks for the architectural patterns:

- **Domain-Driven Design (DDD)**: Build rich domain models with aggregates, entities, and value objects that encapsulate business logic and enforce invariants
- **CQRS (Command Query Responsibility Segregation)**: Separate write operations (commands) from read operations (queries) for optimized performance and scalability
- **Event Sourcing**: Store state as an immutable sequence of events, providing complete audit trails, temporal queries, and event replay capabilities
- **Clean Architecture**: Maintain strict dependency inversion and separation of concerns, keeping your domain logic independent of infrastructure details

## When to Use EventFlows

EventFlows is ideal when you need:

✅ **Complete audit trail** - Know exactly what changed, when, and why
✅ **Temporal queries** - Answer questions like "What was the state on January 1st?"
✅ **Event-driven architecture** - React to domain events across services
✅ **Complex domain logic** - Model rich business rules and invariants
✅ **Debugging & replay** - Reproduce bugs by replaying historical events

EventFlows may be overkill for:

❌ **Simple CRUD applications** - Basic create/read/update/delete with no history requirements
❌ **Prototypes or MVPs** - When speed to market matters more than architecture
❌ **Small-scale applications** - Very simple apps with minimal business logic

## Getting Started

Ready to build event-sourced applications? Start by exploring the foundational patterns:

- [Patterns](./patterns/clean-architecture) - Learn Clean Architecture, DDD, CQRS, and Event Sourcing as a very high-level
- [Domain Modeling](./domain/value-objects) - Build rich domain models with aggregates and value objects
- [Command Side](./command-side/commands) - Handle write operations
- [Query Side](./query-side/projections) - Build optimized read models
- [Modules](./modules/overview) - Organize your application into type-safe domain modules
