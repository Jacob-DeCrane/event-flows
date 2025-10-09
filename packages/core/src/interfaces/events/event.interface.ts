/**
 * Base interface for all domain events in event sourcing.
 *
 * Events represent state changes that have occurred in the system. They are:
 * - Immutable: Once created, they cannot be changed
 * - Past tense: Named to reflect something that happened (e.g., "MoneyDeposited")
 * - Complete: Contain all information needed to reconstruct state
 *
 * @template TType - The event type identifier (e.g., 'MoneyDeposited')
 * @template TPayload - The shape of the event's data payload
 *
 * @example
 * // Define a specific event type
 * interface MoneyDepositedEvent extends IEvent<'MoneyDeposited', { amount: number; currency: string }> {}
 *
 * const event: MoneyDepositedEvent = {
 *   type: 'MoneyDeposited',
 *   payload: { amount: 100, currency: 'USD' },
 *   version: 1,
 *   timestamp: new Date()
 * };
 *
 * @example
 * // Union of event types for an aggregate
 * interface OrderPlacedEvent extends IEvent<'OrderPlaced', { items: string[]; customerId: string }> {}
 * interface OrderShippedEvent extends IEvent<'OrderShipped', { trackingNumber: string }> {}
 *
 * type OrderEvent = OrderPlacedEvent | OrderShippedEvent;
 */
export interface IEvent<TType extends string = string, TPayload = any> {
	/**
	 * Event type identifier (should be unique within aggregate).
	 * Convention: Use PascalCase past-tense verbs (e.g., 'MoneyDeposited', 'UserRegistered')
	 */
	type: TType;

	/**
	 * The event's data payload containing all information about the state change.
	 * Should be JSON-serializable for persistence.
	 */
	payload: TPayload;

	/**
	 * The aggregate version after this event was applied.
	 * Used for optimistic concurrency control and ordering.
	 * Automatically set by AggregateRoot when applying events.
	 */
	version?: number;

	/**
	 * When this event occurred.
	 * Automatically set by AggregateRoot when applying events.
	 */
	timestamp?: Date;
}

/**
 * Utility type to extract the payload type from an event.
 *
 * @template E - The event type to extract payload from
 *
 * @example
 * interface MoneyDepositedEvent extends IEvent<'MoneyDeposited', { amount: number }> {}
 * type Payload = IEventPayload<MoneyDepositedEvent>; // { amount: number }
 */
export type IEventPayload<E extends IEvent> = E['payload'];