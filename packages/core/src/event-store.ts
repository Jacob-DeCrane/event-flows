import type {
	EventStoreDriver,
	IAllEventsFilter,
	IEvent,
	IEventCollection,
	IEventCollectionFilter,
	IEventFilter,
	IEventPool,
} from './interfaces';
import type { EventEnvelope, EventStream } from './models';

/**
 * Abstract base class for event store implementations.
 *
 * The EventStore is responsible for persisting and retrieving events for aggregate streams.
 * It provides a framework-agnostic interface that can be implemented for different storage
 * backends (PostgreSQL, MongoDB, EventStoreDB, in-memory, etc.).
 *
 * Key features:
 * - Automatic event publishing after append (via Proxy)
 * - Support for event versioning and optimistic concurrency
 * - Streaming API for efficient event retrieval
 * - Collection/pool-based organization
 *
 * @template TOptions - Configuration options specific to the implementation
 *
 * @example
 * ```typescript
 * class InMemoryEventStore extends EventStore<{ debug: boolean }> {
 *   private events = new Map<string, EventEnvelope[]>();
 *
 *   async connect() {
 *     this.log('Connected to in-memory store');
 *   }
 *
 *   async disconnect() {
 *     this.events.clear();
 *   }
 *
 *   async appendEvents(stream: EventStream, version: number, events: IEvent[]) {
 *     // Create envelopes with metadata
 *     const envelopes = events.map((event, i) =>
 *       EventEnvelope.create(event.type, event.payload, {
 *         aggregateId: stream.aggregateId,
 *         version: version + i + 1
 *       })
 *     );
 *
 *     // Store events
 *     const existing = this.events.get(stream.streamId) || [];
 *     this.events.set(stream.streamId, [...existing, ...envelopes]);
 *
 *     return envelopes;
 *   }
 *
 *   async *getEvents(stream: EventStream) {
 *     const events = this.events.get(stream.streamId) || [];
 *     yield events.map(e => ({ type: e.event, payload: e.payload }));
 *   }
 * }
 *
 * // Usage
 * const store = new InMemoryEventStore({ debug: true });
 * store.setPublisher(envelope => console.log('Published:', envelope));
 * await store.connect();
 * ```
 */
export abstract class EventStore<TOptions = Record<string, any>>
	implements EventStoreDriver
{
	protected _publish?: (envelope: EventEnvelope<IEvent>) => any;
	protected _logger?: (message: string, context?: any) => void;

	constructor(protected readonly options: TOptions) {
		// Proxy intercepts appendEvents to automatically publish events after persistence
		return new Proxy(this, {
			get(target: EventStore<TOptions>, propKey: string | symbol) {
				if (propKey === 'appendEvents') {
					return async function (
						this: EventStore<TOptions>,
						eventStream: EventStream,
						version: number,
						events: IEvent[],
						pool?: IEventPool
					) {
						const envelopes = await target.appendEvents(eventStream, version, events, pool);
						if (target._publish) {
							for (const envelope of envelopes) {
								await target._publish(envelope);
							}
						}
						return envelopes;
					};
				}
				return (target as any)[propKey];
			},
		});
	}

	/**
	 * Sets the publisher function that will be called after events are appended.
	 * This is automatically invoked via Proxy after successful event persistence.
	 *
	 * @param fn - Function to handle published events (e.g., send to event bus)
	 *
	 * @example
	 * ```typescript
	 * const store = new MyEventStore(options);
	 * store.setPublisher(async (envelope) => {
	 *   await eventBus.publish(envelope);
	 *   console.log(`Published ${envelope.event}`);
	 * });
	 * ```
	 */
	setPublisher(fn: (envelope: EventEnvelope<IEvent>) => any): void {
		this._publish = fn;
	}

	/**
	 * Sets the logger function for internal logging.
	 *
	 * @param fn - Function to handle log messages
	 *
	 * @example
	 * ```typescript
	 * store.setLogger((msg, ctx) => console.log(`[EventStore] ${msg}`, ctx));
	 * ```
	 */
	setLogger(fn: (message: string, context?: any) => void): void {
		this._logger = fn;
	}

	/**
	 * Internal logging helper. Only logs if logger is set.
	 */
	protected log(message: string, context?: any): void {
		if (this._logger) {
			this._logger(message, context);
		}
	}

	/**
	 * Connects to the event store backend.
	 * Called during initialization to establish connections, create indexes, etc.
	 *
	 * @example
	 * ```typescript
	 * async connect() {
	 *   this.db = await MongoClient.connect(this.options.url);
	 *   this.log('Connected to MongoDB');
	 * }
	 * ```
	 */
	public abstract connect(): void | Promise<void>;

	/**
	 * Disconnects from the event store backend.
	 * Called during shutdown to close connections gracefully.
	 *
	 * @example
	 * ```typescript
	 * async disconnect() {
	 *   await this.db.close();
	 *   this.log('Disconnected from MongoDB');
	 * }
	 * ```
	 */
	public abstract disconnect(): void | Promise<void>;

	/**
	 * Ensures an event collection/table exists for storing events.
	 * Collections can be organized by pool (e.g., tenant, feature, date).
	 *
	 * @param pool - Optional pool identifier for collection organization
	 * @returns The collection identifier
	 *
	 * @example
	 * ```typescript
	 * async ensureCollection(pool?: string) {
	 *   const collectionName = pool ? `${pool}-events` : 'events';
	 *   await this.db.createCollection(collectionName);
	 *   return collectionName;
	 * }
	 * ```
	 */
	public abstract ensureCollection(pool?: IEventPool): IEventCollection | Promise<IEventCollection>;

	/**
	 * Lists all event collections in the store.
	 * Useful for administration, migrations, or multi-tenant scenarios.
	 *
	 * @param filter - Optional filter for batch size
	 * @returns AsyncGenerator yielding batches of collection names
	 *
	 * @example
	 * ```typescript
	 * async *listCollections(filter?: IEventCollectionFilter) {
	 *   const collections = await this.db.listCollections().toArray();
	 *   yield collections.map(c => c.name);
	 * }
	 * ```
	 */
	public abstract listCollections(filter?: IEventCollectionFilter): AsyncGenerator<IEventCollection[]>;

	/**
	 * Retrieves a single event from the stream by version number.
	 *
	 * @param eventStream - The event stream to read from
	 * @param version - The specific version number to retrieve
	 * @param pool - Optional pool identifier
	 * @returns The event at the specified version
	 *
	 * @example
	 * ```typescript
	 * async getEvent(stream: EventStream, version: number) {
	 *   const envelope = await this.events.findOne({
	 *     streamId: stream.streamId,
	 *     'metadata.version': version
	 *   });
	 *   return { type: envelope.event, payload: envelope.payload };
	 * }
	 * ```
	 */
	abstract getEvent(eventStream: EventStream, version: number, pool?: IEventPool): IEvent | Promise<IEvent>;

	/**
	 * Retrieves events from the stream as an async generator.
	 * Allows streaming large event histories without loading all into memory.
	 *
	 * @param eventStream - The event stream to read from
	 * @param filter - Optional filter for version range, direction, batch size
	 * @returns AsyncGenerator yielding batches of events
	 *
	 * @example
	 * ```typescript
	 * async *getEvents(stream: EventStream, filter?: IEventFilter) {
	 *   const cursor = this.events.find({ streamId: stream.streamId })
	 *     .skip(filter?.fromVersion || 0)
	 *     .limit(filter?.limit || 100);
	 *
	 *   for await (const envelope of cursor) {
	 *     yield [{ type: envelope.event, payload: envelope.payload }];
	 *   }
	 * }
	 * ```
	 */
	abstract getEvents(eventStream: EventStream, filter?: IEventFilter): AsyncGenerator<IEvent[]>;

	/**
	 * Appends new events to the stream with optimistic concurrency control.
	 *
	 * Implementation must:
	 * 1. Wrap events in EventEnvelope with metadata
	 * 2. Check expected version matches current version (optimistic locking)
	 * 3. Persist envelopes with incremented versions
	 * 4. Return created envelopes
	 *
	 * Note: Publishing happens automatically via Proxy after this returns.
	 *
	 * @param eventStream - The event stream to append to
	 * @param version - Expected current version (for optimistic locking)
	 * @param events - Events to append
	 * @param pool - Optional pool identifier
	 * @returns The created event envelopes with metadata
	 * @throws Should throw on version conflict (concurrency error)
	 *
	 * @example
	 * ```typescript
	 * async appendEvents(stream: EventStream, version: number, events: IEvent[]) {
	 *   // Check version
	 *   const current = await this.getCurrentVersion(stream);
	 *   if (current !== version) throw new ConcurrencyError();
	 *
	 *   // Create envelopes
	 *   const envelopes = events.map((e, i) =>
	 *     EventEnvelope.create(e.type, e.payload, {
	 *       aggregateId: stream.aggregateId,
	 *       version: version + i + 1
	 *     })
	 *   );
	 *
	 *   // Persist
	 *   await this.events.insertMany(envelopes);
	 *   return envelopes;
	 * }
	 * ```
	 */
	abstract appendEvents(
		eventStream: EventStream,
		version: number,
		events: IEvent[],
		pool?: IEventPool,
	): Promise<EventEnvelope[]>;

	/**
	 * Retrieves event envelopes (with full metadata) from the stream.
	 * Optional method - useful when you need correlation IDs, timestamps, etc.
	 *
	 * @param eventStream - The event stream to read from
	 * @param filter - Optional filter for version range, direction, batch size
	 * @returns AsyncGenerator yielding batches of envelopes
	 */
	abstract getEnvelopes?(eventStream: EventStream, filter?: IEventFilter): AsyncGenerator<EventEnvelope[]>;

	/**
	 * Retrieves a single envelope by version number.
	 * Optional method - useful when you need full metadata for specific event.
	 *
	 * @param eventStream - The event stream to read from
	 * @param version - The specific version number
	 * @param pool - Optional pool identifier
	 * @returns The envelope at the specified version
	 */
	abstract getEnvelope?(
		eventStream: EventStream,
		version: number,
		pool?: IEventPool,
	): EventEnvelope | Promise<EventEnvelope>;

	/**
	 * Retrieves all envelopes from the store within a date range.
	 * Useful for rebuilding projections, data migrations, or analytics.
	 *
	 * Creates a range of YYYY-MM periods and retrieves all events in that range.
	 * Use `getYearMonthRange()` helper to generate the periods.
	 *
	 * @param filter - Date range filter (since/until) and batch size
	 * @returns AsyncGenerator yielding batches of envelopes
	 *
	 * @example
	 * ```typescript
	 * async *getAllEnvelopes(filter: IAllEventsFilter) {
	 *   const periods = this.getYearMonthRange(filter.since, filter.until);
	 *
	 *   for (const period of periods) {
	 *     const envelopes = await this.events.find({
	 *       period: period // Assuming you partition by YYYY-MM
	 *     }).toArray();
	 *     yield envelopes;
	 *   }
	 * }
	 * ```
	 */
	abstract getAllEnvelopes(filter: IAllEventsFilter): AsyncGenerator<EventEnvelope[]>;

	/**
	 * Utility method to generate an array of YYYY-MM strings for a date range.
	 * Useful for implementations that partition events by month.
	 *
	 * @param sinceDate - Start date (year and month)
	 * @param untilDate - End date (year and month), defaults to current month
	 * @returns Array of strings in YYYY-MM format
	 *
	 * @example
	 * ```typescript
	 * const periods = this.getYearMonthRange(
	 *   { year: 2024, month: 1 },
	 *   { year: 2024, month: 3 }
	 * );
	 * // Returns: ['2024-01', '2024-02', '2024-03']
	 * ```
	 */
	protected getYearMonthRange(
		sinceDate: { year: number; month: number },
		untilDate?: { year: number; month: number },
	): string[] {
		const now = new Date();
		const [untilYear, untilMonth] = untilDate
			? [untilDate.year, untilDate.month]
			: [now.getFullYear(), now.getMonth() + 1];
		const since = Date.UTC(sinceDate.year, sinceDate.month - 1, 1, 0, 0, 0, 0);
		const until = Date.UTC(untilYear, untilMonth, 0, 23, 59, 59, 999);

		const yearMonthArray: string[] = [];
		const currentDate = new Date(since);

		// Continue looping until we pass the 'until' date
		while (currentDate.getTime() <= until) {
			const year = currentDate.getUTCFullYear();
			const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0'); // Convert month to 'MM' format
			yearMonthArray.push(`${year}-${month}`);

			// Move to the next month
			currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
		}

		return yearMonthArray;
	}
}