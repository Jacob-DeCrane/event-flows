import type { IEventBus, EventHandler, EventPublisher, UnsubscribeFunction } from './interfaces';
import type { EventEnvelope } from './models';

// Re-export types from interface for convenience
export type { EventHandler, EventPublisher, UnsubscribeFunction };

/**
 * Abstract base class for event bus implementations.
 *
 * The EventBus provides pub/sub capabilities for domain events. Different implementations
 * can use different transport mechanisms (in-memory, Redis, RabbitMQ, Kafka, etc.).
 *
 * Key features:
 * - Subscribe to specific event types or all events
 * - Publish events to subscribers
 * - Support for external publishers (e.g., message brokers)
 * - Error handling for failed handlers
 * - Framework-agnostic
 *
 * @template TOptions - Configuration options specific to the implementation
 *
 * @example
 * ```typescript
 * class InMemoryEventBus extends EventBus<{ debug?: boolean }> {
 *   private subscribers = new Map<string, Set<EventHandler>>();
 *   private globalSubscribers = new Set<EventHandler>();
 *
 *   subscribe(eventName: string, handler: EventHandler): UnsubscribeFunction {
 *     if (!this.subscribers.has(eventName)) {
 *       this.subscribers.set(eventName, new Set());
 *     }
 *     this.subscribers.get(eventName)!.add(handler);
 *     return () => this.subscribers.get(eventName)?.delete(handler);
 *   }
 *
 *   async publish(envelope: EventEnvelope): Promise<void> {
 *     const handlers = this.subscribers.get(envelope.event) || [];
 *     await Promise.all([...handlers].map(h => h(envelope)));
 *   }
 *
 *   // ... implement other abstract methods
 * }
 *
 * // Usage
 * const eventBus = new InMemoryEventBus({ debug: true });
 * eventBus.setErrorHandler((error, envelope) => {
 *   console.error(`Error handling ${envelope.event}:`, error);
 * });
 *
 * eventBus.subscribe('MoneyDeposited', async (envelope) => {
 *   await updateReadModel(envelope);
 * });
 *
 * await eventBus.publish(eventEnvelope);
 * ```
 */
export abstract class EventBus<TOptions = Record<string, any>> implements IEventBus {
	protected _publishers: EventPublisher[] = [];
	protected _errorHandler?: (error: Error, envelope: EventEnvelope) => void;

	constructor(protected readonly options: TOptions) { }

	/**
	 * Subscribes a handler to a specific event type.
	 *
	 * @param eventName - The event type to subscribe to
	 * @param handler - Function to handle the event
	 * @returns Unsubscribe function
	 *
	 * @example
	 * ```typescript
	 * const unsubscribe = eventBus.subscribe('MoneyDeposited', async (envelope) => {
	 *   console.log('Deposited:', envelope.payload.amount);
	 * });
	 *
	 * // Later: stop listening
	 * unsubscribe();
	 * ```
	 */
	abstract subscribe(eventName: string, handler: EventHandler): UnsubscribeFunction;

	/**
	 * Subscribes a handler to ALL events (wildcard subscription).
	 *
	 * @param handler - Function to handle all events
	 * @returns Unsubscribe function
	 *
	 * @example
	 * ```typescript
	 * const unsubscribe = eventBus.subscribeAll(async (envelope) => {
	 *   await logEventToDatabase(envelope);
	 * });
	 * ```
	 */
	abstract subscribeAll(handler: EventHandler): UnsubscribeFunction;

	/**
	 * Subscribes a handler to multiple event types.
	 *
	 * @param eventNames - Array of event types to subscribe to
	 * @param handler - Function to handle the events
	 * @returns Unsubscribe function that removes all subscriptions
	 *
	 * @example
	 * ```typescript
	 * const unsubscribe = eventBus.subscribeToMany(
	 *   ['MoneyDeposited', 'MoneyWithdrawn'],
	 *   async (envelope) => {
	 *     await updateAccountBalance(envelope);
	 *   }
	 * );
	 * ```
	 */
	abstract subscribeToMany(eventNames: string[], handler: EventHandler): UnsubscribeFunction;

	/**
	 * Publishes an event to all registered subscribers and publishers.
	 *
	 * Implementations should call all handlers in parallel and handle errors gracefully.
	 * After notifying subscribers, should also call any registered publishers.
	 *
	 * @param envelope - The event envelope to publish
	 *
	 * @example
	 * ```typescript
	 * const envelope = EventEnvelope.create('MoneyDeposited', { amount: 100 }, {
	 *   aggregateId: 'account-123',
	 *   version: 1
	 * });
	 *
	 * await eventBus.publish(envelope);
	 * ```
	 */
	abstract publish(envelope: EventEnvelope): Promise<void>;

	/**
	 * Gets the number of subscribers for a specific event type.
	 *
	 * @param eventName - The event type
	 * @returns Number of subscribers
	 *
	 * @example
	 * ```typescript
	 * const count = eventBus.getSubscriberCount('MoneyDeposited');
	 * console.log(`${count} handlers for MoneyDeposited`);
	 * ```
	 */
	abstract getSubscriberCount(eventName: string): number;

	/**
	 * Gets all registered event types.
	 *
	 * @returns Array of event type names
	 *
	 * @example
	 * ```typescript
	 * const events = eventBus.getRegisteredEvents();
	 * console.log('Subscribed events:', events);
	 * ```
	 */
	abstract getRegisteredEvents(): string[];

	/**
	 * Removes all subscribers and publishers.
	 * Useful for cleanup in tests or when tearing down the application.
	 *
	 * @example
	 * ```typescript
	 * // In test teardown
	 * afterEach(() => {
	 *   eventBus.clear();
	 * });
	 * ```
	 */
	abstract clear(): void;

	/**
	 * Adds an additional publisher to the event bus.
	 * Publishers are called whenever an event is published.
	 *
	 * @param publisher - Function to publish events (e.g., to external message broker)
	 *
	 * @example
	 * ```typescript
	 * // Publish to external message broker
	 * eventBus.addPublisher(async (envelope) => {
	 *   await messageBroker.publish(envelope.event, envelope);
	 * });
	 * ```
	 */
	addPublisher(publisher: EventPublisher): void {
		this._publishers.push(publisher);
	}

	/**
	 * Sets an error handler for failed event handlers.
	 * By default, implementations should swallow errors to prevent one handler from breaking others.
	 *
	 * @param handler - Function to handle errors
	 *
	 * @example
	 * ```typescript
	 * eventBus.setErrorHandler((error, envelope) => {
	 *   console.error(`Error handling ${envelope.event}:`, error);
	 *   // Log to error tracking service
	 * });
	 * ```
	 */
	setErrorHandler(handler: (error: Error, envelope: EventEnvelope) => void): void {
		this._errorHandler = handler;
	}

	/**
	 * Helper method for implementations to safely call a handler.
	 * Catches errors and calls the error handler if set.
	 *
	 * @param handler - The handler to call
	 * @param envelope - The event envelope
	 */
	protected async callHandler(handler: EventHandler, envelope: EventEnvelope): Promise<void> {
		try {
			await handler(envelope);
		} catch (error) {
			if (this._errorHandler) {
				this._errorHandler(error as Error, envelope);
			}
			// Swallow error to prevent one handler from breaking others
		}
	}

	/**
	 * Helper method for implementations to safely call a publisher.
	 * Catches errors and calls the error handler if set.
	 *
	 * @param publisher - The publisher to call
	 * @param envelope - The event envelope
	 */
	protected async callPublisher(publisher: EventPublisher, envelope: EventEnvelope): Promise<void> {
		try {
			await publisher(envelope);
		} catch (error) {
			if (this._errorHandler) {
				this._errorHandler(error as Error, envelope);
			}
			// Swallow error to prevent one publisher from breaking others
		}
	}
}
