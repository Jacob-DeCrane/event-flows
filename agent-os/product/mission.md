# Product Mission

## Pitch

EventFlows is a framework-agnostic TypeScript library that helps developers adopt Clean Architecture, DDD, CQRS, and Event Sourcing patterns by providing simple, extensible primitives that lower the barrier to entry for building event-sourced applications.

## Users

### Primary Customers

- **TypeScript/JavaScript Developers**: Developers wanting to implement event sourcing and CQRS without the complexity of enterprise frameworks or being locked into specific infrastructure choices.
- **Learning-Focused Engineers**: Engineers who want to understand and apply DDD, Clean Architecture, and Event Sourcing principles in a clear, well-documented library.
- **Flexible Architecture Teams**: Teams that need event sourcing capabilities but want control over their persistence, messaging, and infrastructure choices.

### User Personas

**Backend TypeScript Developer** (25-40 years old)
- **Role:** Senior Software Engineer / Tech Lead
- **Context:** Building scalable applications that require audit trails, temporal queries, or complex business logic
- **Pain Points:** Existing event sourcing libraries are too opinionated, require specific databases, or have steep learning curves with poor documentation
- **Goals:** Implement event sourcing patterns quickly, maintain flexibility in infrastructure choices, understand the patterns deeply enough to extend them

**Learning Engineer** (22-35 years old)
- **Role:** Mid-level Developer / Self-taught Engineer
- **Context:** Wants to learn advanced architectural patterns through practical, well-documented examples
- **Pain Points:** Academic resources are too theoretical, existing libraries hide implementation details making it hard to learn
- **Goals:** Understand how DDD, CQRS, and Event Sourcing work in practice, see clear patterns they can apply to their own projects

## The Problem

### Complex Learning Curve for Event Sourcing

Event sourcing and CQRS have steep learning curves, and most libraries either over-abstract the patterns or tightly couple to specific infrastructure. This results in developers either avoiding these patterns entirely or getting locked into specific databases and message brokers.

**Our Solution:** Provide clear, well-documented abstractions that teach the patterns while remaining framework and infrastructure agnostic.

### Infrastructure Lock-In

Many event sourcing libraries require specific databases (EventStoreDB), message brokers (Kafka), or frameworks (NestJS, Spring). This forces architectural decisions before teams understand their requirements.

**Our Solution:** Define clear interfaces (EventStore, EventBus) that developers implement for their chosen infrastructure, while providing in-memory implementations for testing and learning.

### Poor Documentation and Examples

Most libraries either lack comprehensive documentation or provide examples that are too simplistic to be useful in production scenarios.

**Our Solution:** Extensive VitePress documentation with pattern explanations, architectural guides, and clear examples showing how concepts connect.

## Differentiators

### Framework-Agnostic Design

Unlike libraries like NestCQRS or Wolkenkit that require specific frameworks, EventFlows works with any JavaScript/TypeScript runtime and can be integrated into Express, Fastify, NestJS, or serverless functions. This gives teams complete flexibility in their application architecture.

### Learning-First Documentation

While EventStoreDB clients and similar tools focus on features, EventFlows provides comprehensive architectural pattern documentation explaining *why* and *how* to use DDD, CQRS, and Event Sourcing. This enables teams to make informed decisions rather than following recipes.

### Minimal Dependencies, Maximum Control

EventFlows has only one production dependency (ulidx for event IDs) and provides abstract base classes rather than concrete implementations. This results in smaller bundle sizes and complete control over infrastructure choices, unlike all-in-one frameworks that bring entire ecosystems.

## Key Features

### Core Event Sourcing Features

- **Aggregate Root Pattern:** Base class with convention-based event handling, versioning, and state rehydration from event history
- **Event Store Abstraction:** Async-generator based interface for efficient event streaming with optimistic concurrency control
- **Event Bus System:** Publisher/subscriber pattern with support for specific events, wildcards, and multiple subscription types
- **Event Envelope & Metadata:** Structured event packaging with ULID-based IDs, timestamps, aggregate tracking, and versioning

### CQRS Infrastructure

- **Command Bus:** Type-safe command routing with handler registration, execution callbacks, and introspection capabilities
- **Query Bus:** Separate query handling with publisher support for monitoring and execution hooks
- **Read/Write Separation:** Clear abstractions supporting different models for command (write) and query (read) operations

### Domain Modeling Tools

- **Value Object Base Class:** Immutable objects with equality comparison and frozen properties for domain modeling
- **Domain Identity Types:** ULID-based IDs with validation, temporal sorting, and type safety
- **Event Stream Management:** Named streams per aggregate instance with factory methods for easy creation

### Testing & Development

- **In-Memory Implementations:** Working EventBus implementation for testing without external dependencies
- **Convention Over Configuration:** Automatic event handler discovery via naming (on{EventType} methods)
- **Comprehensive Type Safety:** Full TypeScript generics for type-safe command, query, and event handling

### Developer Experience

- **Extensive Documentation:** VitePress site with architectural patterns, DDD concepts, CQRS guides, and practical examples
- **Clean Architecture Patterns:** Dependency inversion, abstract base classes, and clear separation of concerns
- **Minimal Setup:** Zero configuration needed to start, implements only what you need for your use case
