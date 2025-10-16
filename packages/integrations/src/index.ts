/**
 * @eventflows/integrations
 *
 * Production-ready integrations for EventFlows including AWS, PostgreSQL, and in-memory implementations.
 *
 * This package provides concrete implementations of EventFlows abstract classes for various
 * infrastructure backends, allowing you to quickly integrate event sourcing into your applications.
 *
 * ## Available Integrations
 *
 * ### In-Memory
 * Suitable for testing, development, and single-instance applications.
 *
 * @example
 * ```typescript
 * import { InMemoryEventBus } from '@eventflows/integrations';
 *
 * const eventBus = new InMemoryEventBus();
 * ```
 *
 * ### AWS (Coming Soon)
 * Integration with AWS services including EventBridge, DynamoDB, and SNS/SQS.
 *
 * ### PostgreSQL (Coming Soon)
 * Integration with PostgreSQL for event storage and projections.
 */

// In-memory integrations
export * from './in-memory';
