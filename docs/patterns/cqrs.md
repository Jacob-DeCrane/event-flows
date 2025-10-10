# CQRS (Command Query Responsibility Segregation)

CQRS separates **write operations** (commands) from **read operations** (queries), allowing each to be optimized independently. Instead of using the same model for both reading and writing data, CQRS uses different models tailored to each purpose.

## The Core Idea

Traditional applications use one model for everything:

```
Traditional Architecture:
┌──────────────────────┐
│   Single Model       │
│  (reads + writes)    │
└──────────────────────┘
```

CQRS splits this into two separate models:

```
CQRS Architecture:
┌─────────────┐    ┌─────────────┐
│ Write Model │    │ Read Model  │
│ (commands)  │    │  (queries)  │
└─────────────┘    └─────────────┘
```

**Why?** Because the concerns are fundamentally different:
- **Writes**: Enforce business rules, maintain consistency, capture intent
- **Reads**: Deliver data fast, in the exact shape the UI needs

## Commands (Write Side)

Commands express **intent to change state**. They're named in imperative form (DepositMoney, CloseAccount) and can be rejected if business rules aren't satisfied.

Key characteristics:
- **Imperative**: "Do this thing"
- **Task-based**: Represent user intent, not just CRUD operations
- **Can fail**: Business rules might reject the command
- **No return value**: Commands either succeed or throw an error

## Queries (Read Side)

Queries request **data without side effects**. They're optimized for fast reads and can return data in whatever shape is most convenient for the consumer.

Key characteristics:
- **Interrogative**: "What is the current state?"
- **Side-effect free**: Reading doesn't change state
- **Always succeed**: No business rules to violate (they might return empty results, but don't fail)
- **Return data**: Queries return exactly what was asked for

## Why CQRS Matters

**Different Optimization Goals**: Writes need to enforce complex business rules. Reads need to be fast and flexible. Trying to do both with one model creates unnecessary complexity.

**Independent Scaling**: In most systems, reads vastly outnumber writes. CQRS lets you scale them independently—add read replicas without impacting write performance.

**Simpler Code**: Each side has a single, clear responsibility. Write code focuses on business rules. Read code focuses on data delivery.

**Better Performance**: Optimize read models for specific query patterns without worrying about write complexity. Denormalize data freely.

## How EventFlows Implements CQRS

EventFlows provides separate buses for commands and queries:

**CommandBus**: Routes commands to handlers that validate business rules and modify aggregates

**QueryBus**: Routes queries to handlers that fetch data from optimized read models

**EventBus**: Connects the two sides—domain events from the write side update read models on the read side

This separation is enforced by the architecture:
- Commands go through aggregates (write model)
- Queries go through read repositories (read model)
- Events keep the two sides synchronized

## CQRS + Event Sourcing

CQRS and Event Sourcing are powerful together:

**Write Side**: Events from aggregates become the source of truth

**Read Side**: Subscribe to events and build optimized projections

This means:
- Write model stays focused on business logic and event emission
- Read models can be rebuilt from events whenever needed
- Multiple read models can exist for different query patterns
- Read models can be eventually consistent

## When to Use CQRS

**CQRS is valuable when:**
- Read and write patterns are significantly different
- You need to scale reads and writes independently
- Complex domain logic makes writes complicated
- Different parts of the UI need different data shapes

**CQRS might be overkill when:**
- Application is simple CRUD with no complex business rules
- Reads and writes have similar complexity
- Eventual consistency between read/write models would cause problems

## CQRS in Practice with EventFlows

When you build with EventFlows and CQRS:

1. **Model commands** that express user intent (not just "update this field")
2. **Use aggregates** to enforce business rules on the write side
3. **Build projections** that listen to events and update read models
4. **Create queries** that fetch from optimized read models
5. **Accept eventual consistency** between write and read models

EventFlows handles the command/query routing while you focus on modeling the right operations for each side.

## Next Steps

Learn how CQRS fits with other patterns:

- [Event Sourcing](./event-sourcing) - Using events as the source of truth for both sides
- [Domain-Driven Design](./domain-driven-design) - Modeling the write side with aggregates
- [Clean Architecture](./clean-architecture) - Keeping both sides independent of infrastructure

For implementation details, explore:
- [Commands & Handlers](/command-side/commands) - Building the write side
- [Queries & Handlers](/query-side/queries) - Building the read side
- [Projections](/query-side/projections) - Synchronizing read models with events
