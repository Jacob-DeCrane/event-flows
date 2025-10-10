# Domain-Driven Design (DDD)

Domain-Driven Design is an approach to software development that centers the design around the **business domain** and its logic. Instead of letting technical concerns drive your architecture, DDD puts business concepts and rules at the heart of your system.

## The Core Idea

DDD recognizes that **complex business logic is the real challenge** in most software. The goal is to create a model of the business domain that captures its rules, behaviors, and language in code.

**Key insight**: When your code reflects how the business actually works, it becomes easier to understand, maintain, and evolve alongside the business.

## Ubiquitous Language

Use the **same terminology** in code as in business discussions. If the business talks about "deposits" and "withdrawals," your code should too—not "add value" and "remove value."

This shared language:
- Reduces translation errors between business and code
- Makes code review easier (business experts can read it)
- Keeps the model aligned with business needs

## Bounded Contexts

Different parts of the business have different models. A "Customer" in the billing context might have different attributes and behaviors than a "Customer" in the support context.

Each **bounded context** has its own:
- Model (aggregates, entities, value objects)
- Language (terminology specific to that context)
- Events (business facts relevant to that context)

This prevents the mess of trying to create one unified model that serves all purposes.

## DDD Building Blocks

DDD provides tactical patterns for modeling your domain:

### Entities
Objects with **identity** that persists over time. A bank account with ID `acc-123` is the same account even as its balance changes.

### Value Objects
Objects defined by their **attributes**, not identity. Two `Money` objects with the same amount and currency are considered equal. Value objects are immutable.

### Aggregates
Clusters of entities and value objects treated as a **single unit** for data changes. The aggregate root enforces business rules and maintains consistency within the aggregate boundary.

### Repositories
Provide access to aggregates, hiding persistence details. You ask for an aggregate by ID, and the repository handles loading events and reconstructing state.

### Domain Events
Represent something that **happened** in the domain. Named in past tense (MoneyDeposited, AccountClosed) because they're facts that already occurred.

### Domain Services
Operations that don't naturally belong to a single entity, like transferring money between accounts.

## How EventFlows Uses DDD

EventFlows provides building blocks that make DDD natural:

**AggregateRoot**: Base class for your aggregates that handles event application and history tracking

**ValueObject**: Base class for immutable value objects with equality based on attributes

**Domain Events**: First-class concept—aggregates emit events that capture business facts

**Repositories**: Pattern for loading and saving aggregates through event streams

**Event Handlers**: Subscribe to domain events to coordinate between bounded contexts

## DDD + Event Sourcing

DDD and Event Sourcing work together naturally:

**Traditional DDD**: Aggregates update their state directly when business rules are satisfied

**DDD + Event Sourcing**: Aggregates emit events when business rules are satisfied, and those events become the state

This combination gives you:
- Complete audit trail of all business decisions
- Ability to replay history to understand how state was reached
- Natural way to publish domain events to other contexts

## Why DDD Matters

**Handles Complexity**: DDD gives you patterns for taming complex business logic instead of letting it become a tangled mess.

**Business Alignment**: Code organized around business concepts stays aligned with how the business actually works.

**Maintainability**: Clear boundaries (aggregates, bounded contexts) make it obvious where code belongs and how to change it safely.

**Shared Understanding**: Ubiquitous language means developers and business experts can discuss the model together.

## DDD in Practice with EventFlows

When you build with EventFlows:

1. **Model your domain** using aggregates that enforce business rules
2. **Use ubiquitous language** in your event names and aggregate methods
3. **Define bounded contexts** for different areas of your system
4. **Emit domain events** that represent business facts
5. **Coordinate between contexts** using event subscriptions

EventFlows handles the technical mechanics while you focus on modeling the business domain correctly.

## Next Steps

Learn how DDD works with other patterns:

- [CQRS](./cqrs) - Separating reads and writes around your domain model
- [Event Sourcing](./event-sourcing) - Storing domain events as the source of truth
- [Clean Architecture](./clean-architecture) - Keeping domain logic independent of infrastructure

For implementation details, explore:
- [Value Objects](/command-side/value-objects) - Building immutable domain values
- [Aggregates](/command-side/aggregates) - Enforcing business rules and consistency
- [Commands & Handlers](/command-side/commands) - Executing domain operations
