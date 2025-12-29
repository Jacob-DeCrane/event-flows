# Product Roadmap

## Phase 0: Already Completed ✓

The following features have been implemented in the core library:

- [x] **Aggregate Root Pattern** - Base class with event application, versioning, state rehydration, and convention-based handlers `M`
- [x] **Event Store Abstraction** - Abstract base with proxy-based publishing, async generators, and optimistic concurrency `L`
- [x] **Event Bus System** - Abstract base with subscription patterns, error handling, and publisher support `M`
- [x] **In-Memory Event Bus** - Working implementation for testing and single-instance apps `S`
- [x] **Command Bus** - Type-safe command routing with handlers, callbacks, and introspection `M`
- [x] **Query Bus** - Separate query handling with publisher hooks and execution tracking `M`
- [x] **Value Object Pattern** - Immutable base class with equality comparison `S`
- [x] **Domain Identity Types** - ULID-based IDs with validation and temporal sorting `S`
- [x] **Event Envelope System** - Structured events with metadata, versioning, and automatic ID generation `M`
- [x] **Event Stream Management** - Named streams per aggregate with factory methods `S`
- [x] **TypeScript Type System** - Full generic types for commands, queries, events, and handlers `M`
- [x] **Test Suite** - Comprehensive tests using bun:test for all core features `L`
- [x] **VitePress Documentation** - Extensive docs covering patterns, DDD, CQRS, and Event Sourcing concepts `XL`
- [x] **Package Configuration** - Published to npm as @eventflows/core with proper exports `S`

## Phase 1: AWS Integrations

**Goal:** Provide production-ready AWS infrastructure implementations for serverless event-sourced applications

**Success Criteria:**
- DynamoDB event store handles >1000 events/sec with proper pagination
- EventBridge integration publishes events reliably with dead-letter queues
- All AWS integrations have comprehensive error handling and retry logic
- Integration tests run against LocalStack

### Features

- [ ] **DynamoDB Event Store** - Event persistence with single-table design, GSIs for queries, and optimistic locking `L`
- [ ] **DynamoDB Snapshot Store** - Aggregate snapshot support to optimize reconstruction of large event streams `M`
- [ ] **EventBridge Event Bus** - Event publishing to EventBridge with retry logic and error handling `M`
- [ ] **AWS Lambda Handlers** - Helper utilities for processing commands/queries in Lambda functions `S`
- [ ] **Integration Tests** - LocalStack-based tests for all AWS implementations `M`
- [ ] **AWS Deployment Examples** - CDK/Terraform examples showing production deployment patterns `M`

### Dependencies

- AWS SDK v3 (DynamoDB, EventBridge clients)
- LocalStack for local testing
- IAM permissions documentation

## Phase 2: Observability & Monitoring

**Goal:** Make EventFlows applications fully observable with distributed tracing, metrics, and structured logging

**Success Criteria:**
- OTEL spans automatically created for all command/query executions
- Event store operations emit traces with timing and metadata
- Metrics exported to CloudWatch/Prometheus
- Zero-config observability with opt-out ability

### Features

- [ ] **OpenTelemetry Integration** - Auto-instrumentation for CommandBus, QueryBus, EventStore, and EventBus `L`
- [ ] **Span Context Propagation** - Trace IDs flow through event metadata for distributed tracing `M`
- [ ] **Metrics Collection** - Command/query latency, event throughput, error rates `M`
- [ ] **Structured Logging** - JSON logging with correlation IDs and context `S`
- [ ] **Performance Monitoring** - Aggregate reconstruction time tracking and slow query detection `S`
- [ ] **Health Check Utilities** - Pre-built health check endpoints for event stores and buses `XS`

### Dependencies

- @opentelemetry/api and SDK packages
- OTEL exporters (OTLP, CloudWatch, Prometheus)
- Logger abstraction

## Phase 3: PostgreSQL & Traditional Database Support

**Goal:** Support traditional RDBMS deployments for teams preferring SQL databases

**Success Criteria:**
- PostgreSQL event store uses JSONB efficiently with proper indexing
- Transactions support atomic event appends
- Read model projections can use same database as event store
- Migration tooling for schema management

### Features

- [ ] **PostgreSQL Event Store** - JSONB-based event persistence with btree indexes `L`
- [ ] **Transaction Support** - Atomic multi-event appends within PostgreSQL transactions `M`
- [ ] **Read Model Projections** - Utilities for building SQL-based read models from events `L`
- [ ] **PostgreSQL Snapshot Store** - Snapshot support using dedicated table with compression `M`
- [ ] **Schema Migrations** - Database migration scripts and versioning `S`
- [ ] **Connection Pooling** - Efficient connection management for high-throughput scenarios `S`

### Dependencies

- node-postgres (pg) or similar PostgreSQL client
- Migration library (node-pg-migrate or similar)

## Phase 4: Snapshot System

**Goal:** Optimize aggregate reconstruction for long-lived aggregates with many events

**Success Criteria:**
- Snapshots reduce reconstruction time by >80% for large aggregates
- Configurable snapshot frequency (every N events or time-based)
- Snapshot storage works with any EventStore implementation
- Automatic snapshot cleanup for old versions

### Features

- [ ] **Snapshot Abstraction** - Abstract base class for snapshot stores `M`
- [ ] **Automatic Snapshotting** - Configurable triggers for when to create snapshots `M`
- [ ] **Snapshot-Aware Rehydration** - AggregateRoot loads from latest snapshot + subsequent events `M`
- [ ] **Snapshot Serialization** - Efficient aggregate state serialization/deserialization `S`
- [ ] **Snapshot Cleanup Policies** - Automatic deletion of old snapshots (keep last N) `S`
- [ ] **Snapshot Store Implementations** - Snapshot storage for DynamoDB and PostgreSQL `M`

### Dependencies

- Serialization library (built-in JSON or MessagePack)

## Phase 5: Saga & Process Manager Patterns

**Goal:** Support long-running business processes and complex workflows across aggregates

**Success Criteria:**
- Sagas coordinate multi-aggregate transactions reliably
- Process managers handle timeouts and compensations
- State persistence prevents duplicate processing
- Clear patterns for modeling business processes

### Features

- [ ] **Saga Base Class** - Abstract saga with event subscription and command dispatching `L`
- [ ] **Process Manager Pattern** - State machine-based process coordination `L`
- [ ] **Saga State Persistence** - Store saga state for recovery and deduplication `M`
- [ ] **Compensation Actions** - Rollback/undo capabilities for failed sagas `M`
- [ ] **Timeout Management** - Time-based saga triggers and expiration `M`
- [ ] **Saga Orchestration Examples** - Example implementations (order processing, payment flows) `L`

### Dependencies

- State machine library or custom implementation
- Timer/scheduler for timeouts

## Phase 6: Advanced Features & Polish

**Goal:** Enterprise-ready features and developer experience improvements

**Success Criteria:**
- Event upcasting handles schema evolution gracefully
- Projection rebuilding is safe and automated
- Code generation reduces boilerplate
- Performance benchmarks published

### Features

- [ ] **Event Upcasting** - Schema evolution and event version migration `L`
- [ ] **Projection Rebuild Tools** - Safe utilities for rebuilding read models from events `M`
- [ ] **CLI Tool** - Code generation for aggregates, commands, queries, and events `L`
- [ ] **Event Validation** - JSON Schema or Zod-based event validation `M`
- [ ] **Performance Benchmarks** - Published benchmarks for all event store implementations `M`
- [ ] **Example Applications** - Full production-ready example apps (e.g., e-commerce, task management) `XL`
- [ ] **Migration Guide** - Documentation for migrating from other event sourcing libraries `M`

### Dependencies

- Schema validation library
- CLI framework (Commander.js or similar)
- Benchmark tooling

## Future Considerations

- **Additional Event Store Integrations:** MongoDB, EventStoreDB native client, S3 for cold storage
- **Message Broker Integrations:** RabbitMQ, Apache Kafka, Google Pub/Sub, Azure Service Bus
- **Multi-Tenancy Patterns:** Guidance and utilities for SaaS applications
- **Event Replay Tools:** Admin UI for replaying events and debugging
- **GraphQL Integration:** Utilities for exposing queries via GraphQL
- **Real-time Subscriptions:** WebSocket-based event streaming to clients
