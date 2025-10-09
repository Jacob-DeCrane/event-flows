import type { EventEnvelope } from '../../models';
import type { IEvent } from './event.interface';

/**
 * Unsubscribe function type returned by subscription methods
 */
export type UnsubscribeFunction = () => void;

/**
 * Event handler function type
 */
export type EventHandler<TEvent extends IEvent = IEvent> = (
	envelope: EventEnvelope<TEvent>
) => void | Promise<void>;

/**
 * Event publisher function type for external publishers
 */
export type EventPublisher = (envelope: EventEnvelope) => void | Promise<void>;

/**
 * Interface for event bus implementations.
 *
 * The event bus provides pub/sub capabilities for domain events.
 * Different implementations can use different transport mechanisms
 * (in-memory, Redis, RabbitMQ, Kafka, etc.).
 */
export interface IEventBus {
	/**
	 * Subscribes a handler to a specific event type.
	 *
	 * @param eventName - The event type to subscribe to
	 * @param handler - Function to handle the event
	 * @returns Unsubscribe function
	 */
	subscribe(eventName: string, handler: EventHandler): UnsubscribeFunction;

	/**
	 * Subscribes a handler to ALL events (wildcard subscription).
	 *
	 * @param handler - Function to handle all events
	 * @returns Unsubscribe function
	 */
	subscribeAll(handler: EventHandler): UnsubscribeFunction;

	/**
	 * Subscribes a handler to multiple event types.
	 *
	 * @param eventNames - Array of event types to subscribe to
	 * @param handler - Function to handle the events
	 * @returns Unsubscribe function that removes all subscriptions
	 */
	subscribeToMany(eventNames: string[], handler: EventHandler): UnsubscribeFunction;

	/**
	 * Publishes an event to all registered subscribers and publishers.
	 *
	 * @param envelope - The event envelope to publish
	 */
	publish(envelope: EventEnvelope): void | Promise<void>;

	/**
	 * Adds an additional publisher to the event bus.
	 * Publishers are called whenever an event is published.
	 *
	 * @param publisher - Function to publish events (e.g., to external message broker)
	 */
	addPublisher(publisher: EventPublisher): void;

	/**
	 * Sets an error handler for failed event handlers.
	 *
	 * @param handler - Function to handle errors
	 */
	setErrorHandler(handler: (error: Error, envelope: EventEnvelope) => void): void;

	/**
	 * Gets the number of subscribers for a specific event type.
	 *
	 * @param eventName - The event type
	 * @returns Number of subscribers
	 */
	getSubscriberCount(eventName: string): number;

	/**
	 * Gets all registered event types.
	 *
	 * @returns Array of event type names
	 */
	getRegisteredEvents(): string[];

	/**
	 * Removes all subscribers and publishers.
	 */
	clear(): void;
}
