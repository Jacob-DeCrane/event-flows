import type { EventEnvelope } from '../models';
import { EventBus, type EventHandler, type UnsubscribeFunction } from '../event-bus';

/**
 * In-memory implementation of EventBus using Map and Set data structures.
 *
 * This implementation stores all subscriptions in memory and is suitable for:
 * - Testing and development
 * - Single-instance applications (monoliths)
 * - Local event handling within a single process
 *
 * For distributed systems or multi-instance deployments, consider using
 * Redis, RabbitMQ, or Kafka-based implementations instead.
 *
 * @example
 * ```typescript
 * const eventBus = new InMemoryEventBus({ debug: true });
 *
 * // Set error handler
 * eventBus.setErrorHandler((error, envelope) => {
 *   console.error(`Error handling ${envelope.event}:`, error);
 * });
 *
 * // Subscribe to specific event
 * const unsubscribe = eventBus.subscribe('MoneyDeposited', async (envelope) => {
 *   console.log(`Money deposited: ${envelope.payload.amount}`);
 *   await updateReadModel(envelope);
 * });
 *
 * // Subscribe to all events
 * eventBus.subscribeAll(async (envelope) => {
 *   console.log(`Event published: ${envelope.event}`);
 * });
 *
 * // Publish event
 * await eventBus.publish(eventEnvelope);
 *
 * // Clean up
 * unsubscribe();
 * ```
 */
export class InMemoryEventBus extends EventBus<{ debug?: boolean }> {
	private subscribers = new Map<string, Set<EventHandler>>();
	private globalSubscribers = new Set<EventHandler>();

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
	subscribe(eventName: string, handler: EventHandler): UnsubscribeFunction {
		if (!this.subscribers.has(eventName)) {
			this.subscribers.set(eventName, new Set());
		}
		this.subscribers.get(eventName)!.add(handler);

		// Return unsubscribe function
		return () => {
			this.subscribers.get(eventName)?.delete(handler);
		};
	}

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
	subscribeAll(handler: EventHandler): UnsubscribeFunction {
		this.globalSubscribers.add(handler);

		// Return unsubscribe function
		return () => {
			this.globalSubscribers.delete(handler);
		};
	}

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
	subscribeToMany(eventNames: string[], handler: EventHandler): UnsubscribeFunction {
		const unsubscribers = eventNames.map(eventName =>
			this.subscribe(eventName, handler)
		);

		// Return function that calls all unsubscribers
		return () => {
			unsubscribers.forEach(unsub => unsub());
		};
	}

	/**
	 * Publishes an event to all registered subscribers and publishers.
	 *
	 * Subscribers are called in parallel. If a handler throws an error,
	 * the error handler (if set) is called, but other handlers continue executing.
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
	async publish(envelope: EventEnvelope): Promise<void> {
		const handlers: EventHandler[] = [];

		// Get handlers for specific event type
		const eventHandlers = this.subscribers.get(envelope.event);
		if (eventHandlers) {
			handlers.push(...eventHandlers);
		}

		// Add global subscribers
		handlers.push(...this.globalSubscribers);

		// Call all handlers in parallel
		const handlerPromises = handlers.map(handler =>
			this.callHandler(handler, envelope)
		);

		// Call all publishers in parallel
		const publisherPromises = this._publishers.map(publisher =>
			this.callPublisher(publisher, envelope)
		);

		await Promise.all([...handlerPromises, ...publisherPromises]);
	}

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
	getSubscriberCount(eventName: string): number {
		return this.subscribers.get(eventName)?.size ?? 0;
	}

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
	getRegisteredEvents(): string[] {
		return Array.from(this.subscribers.keys());
	}

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
	clear(): void {
		this.subscribers.clear();
		this.globalSubscribers.clear();
		this._publishers = [];
		this._errorHandler = undefined;
	}
}
