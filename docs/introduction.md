# Introduction to EventFlows

## What is EventFlows?

EventFlows is a framework-agnostic TypeScript library for building event-sourced applications using Domain-Driven Design principles. It provides the building blocks for CQRS and Event Sourcing without coupling to any specific web framework, allowing you to use it with Express, Fastify, AWS Lambda, Azure Functions, or plain Node.js.

## Why EventFlows?

EventFlows was designed to bring enterprise-grade event sourcing patterns to TypeScript applications without framework lock-in. Unlike other event sourcing libraries that require specific frameworks or decorators, EventFlows uses plain TypeScript interfaces and classes that work anywhere.

### Key Features

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
- [Command Side](./command-side/value-objects) - Model and handle write operations
- [Query Side](./query-side/projections) - Build optimized read models
