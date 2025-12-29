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

## Anti-Patterns to Avoid

- Anemic domain models (logic in services instead of models)
- Leaking persistence concerns into domain layer
- Large aggregates that span multiple bounded contexts
- Sharing domain models across bounded contexts
- Using domain entities as API responses
