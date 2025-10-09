import type { AggregateRoot } from './aggregate-root';
import type { Id } from './id';

/**
 * Represents an event stream for a specific aggregate instance.
 *
 * An event stream is identified by the aggregate type name and the aggregate instance ID.
 * All events for a specific aggregate instance belong to the same stream.
 *
 * @example
 * ```typescript
 * // Create stream with string identifiers
 * const stream = EventStream.for('BankAccount', 'account-123');
 * console.log(stream.streamId); // "BankAccount-account-123"
 *
 * // Create stream with Id value object
 * const accountId = Id.from('account-123');
 * const stream2 = EventStream.for('BankAccount', accountId);
 *
 * // Create stream from aggregate instance
 * const account = new BankAccount('account-123');
 * const stream3 = EventStream.fromAggregate(account);
 * ```
 */
export class EventStream {
	private constructor(
		private _aggregate: string,
		private _aggregateId: string,
	) {}

	/**
	 * Gets the aggregate ID for this stream
	 */
	get aggregateId(): string {
		return this._aggregateId;
	}

	/**
	 * Gets the unique stream identifier in format: {aggregateName}-{aggregateId}
	 */
	get streamId(): string {
		return `${this._aggregate}-${this._aggregateId}`;
	}

	/**
	 * Gets the aggregate type name for this stream
	 */
	get aggregateName(): string {
		return this._aggregate;
	}

	/**
	 * Creates an event stream for a specific aggregate and ID.
	 *
	 * @param aggregateName - The name of the aggregate type (e.g., 'BankAccount', 'Order')
	 * @param aggregateId - The aggregate instance ID (string or Id value object)
	 * @returns A new EventStream instance
	 *
	 * @example
	 * ```typescript
	 * const stream = EventStream.for('BankAccount', 'account-123');
	 * const stream2 = EventStream.for('BankAccount', Id.from('account-456'));
	 * ```
	 */
	static for(aggregateName: string, aggregateId: string | Id): EventStream {
		const id = typeof aggregateId === 'string' ? aggregateId : aggregateId.value;
		return new EventStream(aggregateName, id);
	}

	/**
	 * Creates an event stream from an aggregate instance.
	 * Uses the aggregate's constructor name as the stream name.
	 *
	 * @param aggregate - The aggregate root instance
	 * @returns A new EventStream instance
	 *
	 * @example
	 * ```typescript
	 * class BankAccount extends AggregateRoot {
	 *   constructor(id: string) { super(id); }
	 * }
	 *
	 * const account = new BankAccount('account-123');
	 * const stream = EventStream.fromAggregate(account);
	 * console.log(stream.streamId); // "BankAccount-account-123"
	 * ```
	 */
	static fromAggregate(aggregate: AggregateRoot): EventStream {
		const aggregateName = aggregate.constructor.name;
		return new EventStream(aggregateName, aggregate.id);
	}
}