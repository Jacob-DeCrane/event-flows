# Domain-Driven Design Standards

## Context

DDD principles and patterns for building complex business applications with rich domain models.

## Architecture Patterns

### Hexagonal Architecture (Ports & Adapters)
- Domain layer at the center with no external dependencies
- Application layer orchestrates use cases
- Infrastructure layer contains all external integrations
- Dependency flow: Infrastructure → Application → Domain

### Clean Architecture Layers
- **Domain Layer**: Entities, Value Objects, Domain Events, Repository Interfaces
- **Application Layer**: Use Cases, Application Services, DTOs
- **Infrastructure Layer**: Repository Implementations, API Controllers, External Services
- **Presentation Layer**: UI Components, View Models

## Domain Modeling

### Core Building Blocks
- **Entities**: Objects with identity that persists over time
- **Value Objects**: Immutable objects defined by their attributes
- **Aggregates**: Clusters of entities and value objects with defined boundaries
- **Domain Services**: Stateless operations that don't belong to any entity
- **Domain Events**: Notifications about something that happened in the domain

### Design Principles
- Rich domain models encapsulate business logic
- Aggregates ensure transactional consistency
- Value Objects prevent primitive obsession
- Domain Events enable loose coupling between aggregates
- Ubiquitous Language shared between developers and domain experts

## Folder Structure (Monorepo)

```
packages/
  domain/                 # Pure business logic, no external dependencies
    shared/              # Shared kernel
      value-objects/     # Common value objects (Money, Email, etc.)
      types/            # Domain types and interfaces
    [bounded-context]/   # e.g., users, orders, inventory
      models/           # Entities and Aggregates
      value-objects/    # Context-specific value objects
      events/           # Domain events
      services/         # Domain services
      repositories/     # Repository interfaces (no implementations)
      errors/           # Domain-specific errors
  
  application/           # Use cases and application logic
    [bounded-context]/
      use-cases/        # Application services/use cases
      dto/              # Data Transfer Objects
      mappers/          # Domain ↔ DTO mappers
  
  infrastructure/        # All external concerns
    persistence/        # Repository implementations
      prisma/          # or drizzle
      repositories/    # Concrete implementations
    api/               # HTTP layer
      controllers/     # Route handlers
      middleware/      # Auth, validation, etc.
    messaging/         # Event bus, queues
    external/          # Third-party integrations
```

## Implementation Guidelines

### Repository Pattern
```typescript
// Domain layer - Interface only
interface IUserRepository {
  findById(id: UserId): Promise<User | null>;
  save(user: User): Promise<void>;
  exists(email: EmailAddress): Promise<boolean>;
}

// Infrastructure layer - Implementation
class PrismaUserRepository implements IUserRepository {
  // Concrete implementation using Prisma/Drizzle
}
```

### Aggregate Design
- Keep aggregates small and focused
- Reference other aggregates by ID only
- Enforce invariants within aggregate boundaries
- Use factories for complex creation logic

### Value Objects
```typescript
class EmailAddress {
  private constructor(private readonly value: string) {}
  
  static create(email: string): Result<EmailAddress> {
    // Validation logic here
  }
  
  toString(): string {
    return this.value;
  }
}
```

### Domain Events
```typescript
class UserRegistered implements DomainEvent {
  constructor(
    public readonly userId: UserId,
    public readonly email: EmailAddress,
    public readonly occurredAt: Date
  ) {}
}
```

## Testing Strategy

### Unit Tests
- Test domain models in isolation
- Test invariants and business rules
- Use in-memory implementations for repositories

### Integration Tests
- Test use cases with real infrastructure
- Test repository implementations
- Test API endpoints end-to-end

### Test Organization
```
tests/
  unit/
    domain/      # Domain model tests
    application/ # Use case tests
  integration/   # Infrastructure tests
  e2e/           # End-to-end tests
```

## Anti-Patterns to Avoid

- Anemic domain models (logic in services instead of models)
- Leaking persistence concerns into domain layer
- Large aggregates that span multiple bounded contexts
- Sharing domain models across bounded contexts
- Using domain entities as API responses

## References

- Follow Eric Evans' DDD principles
- Apply Vaughn Vernon's IDDD patterns
- Use tactical patterns appropriately
- Focus on strategic design and bounded contexts