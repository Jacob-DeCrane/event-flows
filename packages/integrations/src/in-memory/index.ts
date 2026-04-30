/**
 * In-memory integrations for EventFlows
 *
 * Provides in-memory implementations for testing and development.
 * These implementations are not suitable for production use as all data
 * is lost when the process terminates.
 */

export { InMemoryEventBus } from '@eventflows/core';
export { InMemoryEventStore } from './event-store';
