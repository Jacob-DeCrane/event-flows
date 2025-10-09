import type { IEvent } from '../interfaces';

const VERSION = Symbol();
const EVENTS = Symbol();

/**
 * Base class for aggregate roots in event sourcing.
 *
 * Aggregates are the primary building blocks in event sourcing. They:
 * - Maintain consistency boundaries
 * - Emit domain events when state changes
 * - Rehydrate state by replaying events
 * - Use convention-based event handlers (on{EventType})
 *
 * @example
 * ```typescript
 * interface MoneyDepositedEvent extends IEvent<'MoneyDeposited', { amount: number }> {}
 *
 * class BankAccount extends AggregateRoot {
 *   balance = 0;
 *
 *   constructor(id: string) {
 *     super(id);
 *   }
 *
 *   deposit(amount: number) {
 *     this.applyEvent({
 *       type: 'MoneyDeposited',
 *       payload: { amount }
 *     });
 *   }
 *
 *   protected onMoneyDeposited(event: MoneyDepositedEvent) {
 *     this.balance += event.payload.amount;
 *   }
 * }
 * ```
 */
export abstract class AggregateRoot {
	/** Unique identifier for this aggregate */
	public readonly id: string;

	private [VERSION] = 0;
	private readonly [EVENTS]: IEvent[] = [];

	/**
	 * Creates a new aggregate root instance.
	 * @param id - Unique identifier for this aggregate
	 */
	protected constructor(id: string) {
		this.id = id;
	}

	/**
	 * Sets the aggregate version (used during rehydration)
	 */
	set version(version: number) {
		this[VERSION] = version;
	}

	/**
	 * Gets the current version of the aggregate
	 */
	get version(): number {
		return this[VERSION];
	}

	/**
	 * Applies an event to the aggregate.
	 * - For new events: increments version, tracks for commit, applies to state
	 * - For historical events: only applies to state (rehydration)
	 *
	 * @param event - The event to apply
	 * @param fromHistory - True if rehydrating from event history
	 */
	applyEvent<T extends IEvent = IEvent>(event: T, fromHistory = false) {
        this[VERSION]++;

		// If we're just hydrating the aggregate with events,
		// don't push the event to the internal event collection to be committed
		if (!fromHistory) {
			this[EVENTS].push(event);
		}

		// Apply event to update state using convention-based handlers
		this.applyEventInternal(event);
	}

	/**
	 * Returns all uncommitted events and clears the internal buffer.
	 * Call this after persisting events to clear the buffer.
	 *
	 * @returns Array of uncommitted events
	 */
	commit(): IEvent[] {
		const events = [...this[EVENTS]];
		this[EVENTS].length = 0;

		return events;
	}

	/**
	 * Loads events from history to rebuild aggregate state.
	 * Does not add events to uncommitted buffer.
	 *
	 * @param events - Historical events to replay
	 */
	loadFromHistory(events: IEvent[]) {
		for (const event of events) {
			this.applyEvent(event, true);
		}
	}

	/**
	 * Internal method to apply event to state
	 * Looks for handler method named `on{EventType}`
	 * Convention: For event { type: 'MoneyDeposited' }, looks for onMoneyDeposited() method
	 */
	private applyEventInternal(event: IEvent): void {
		const handler = this.getEventHandler(event.type);
		if (handler) {
			handler.call(this, event);
		}
	}

	/**
	 * Gets the event handler method for a given event type
	 * Convention: on{EventType} (e.g., onMoneyDeposited)
	 */
	private getEventHandler(eventType: string): ((event: IEvent) => void) | undefined {
		const handlerName = `on${eventType}` as keyof this;
		const handler = this[handlerName];

		if (typeof handler === 'function') {
			return handler as (event: IEvent) => void;
		}

		return undefined;
	}
}