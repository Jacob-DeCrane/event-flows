import type { EventId } from '../..';

/**
 * `EventEnvelope` metadata
 */
export interface EventEnvelopeMetadata {
	/**
	 * Unique event ID
	 */
	eventId: EventId;
	/**
	 * Aggregate id the message belongs to.
	 */
	aggregateId: string;
	/**
	 * Version of the aggregate.
	 */
	version: number;
	/**
	 * Time at which the event occurred.
	 */
	occurredOn: Date;
	/**
	 * ID if the initial event
	 */
	correlationId?: string;
	/**
	 * ID of the preceding event that triggered this event
	 */
	causationId?: string;
}