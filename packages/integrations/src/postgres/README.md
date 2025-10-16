# PostgreSQL Integrations

This directory will contain production-ready PostgreSQL integrations for EventFlows.

## Planned Integrations

### PostgreSQL Event Store
- Store event streams in PostgreSQL tables
- ACID guarantees for event persistence
- Optimistic concurrency with version columns
- Efficient queries with indexes on aggregate_id and version
- Support for JSONB payload storage

### PostgreSQL Projection Store
- Materialized views for read models
- Automatic updates via database triggers or polling
- Query optimization with proper indexing
- Support for multiple projection schemas

### PostgreSQL Outbox Pattern
- Reliable event publishing with transactional outbox
- At-least-once delivery guarantees
- Integration with message brokers (Kafka, RabbitMQ, etc.)
- Automatic cleanup of published events

### PostgreSQL Saga Store
- Persist saga state in PostgreSQL
- Track saga progress and compensating transactions
- Timeout handling for long-running sagas
- Support for saga versioning

## Coming Soon

These integrations are planned for a future release. In the meantime, you can implement your own PostgreSQL integrations by extending the abstract classes from `@eventflows/core`.

See the [documentation](https://jacob-decrane.github.io/event-flows/) for guidance on implementing custom integrations.
