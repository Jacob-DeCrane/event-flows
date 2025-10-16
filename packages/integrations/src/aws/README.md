# AWS Integrations

This directory will contain production-ready AWS integrations for EventFlows.

## Planned Integrations

### EventBridge Event Bus
- Publish domain events to AWS EventBridge
- Subscribe to events from multiple event buses
- Cross-account event routing
- Schema validation and versioning

### DynamoDB Event Store
- Store event streams in DynamoDB
- Optimistic concurrency control with version numbers
- Efficient querying by aggregate ID
- Point-in-time recovery support

### SNS/SQS Integration
- Publish events to SNS topics
- Subscribe to events via SQS queues
- Dead-letter queue support for failed handlers
- Message deduplication and ordering

## Coming Soon

These integrations are planned for a future release. In the meantime, you can implement your own AWS integrations by extending the abstract classes from `@eventflows/core`.

See the [documentation](https://jacob-decrane.github.io/event-flows/) for guidance on implementing custom integrations.
