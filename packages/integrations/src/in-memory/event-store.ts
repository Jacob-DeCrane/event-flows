import {
  EventStore,
  EventStream,
  EventEnvelope,
  type IEvent,
  type IEventPool,
  type IEventCollection,
  type IEventFilter,
  type IEventCollectionFilter,
  type IAllEventsFilter,
} from '@eventflows/core';

/**
 * In-memory implementation of EventStore for testing and development.
 *
 * This implementation stores all events in memory using a Map structure.
 * Events are lost when the process terminates.
 *
 * @example
 * ```typescript
 * const eventStore = new InMemoryEventStore();
 * await eventStore.connect();
 *
 * const stream = EventStream.for('user', 'user-123');
 * await eventStore.appendEvents(stream, 0, [
 *   { type: 'UserCreated', payload: { name: 'John' } }
 * ]);
 * ```
 */
export class InMemoryEventStore extends EventStore<Record<string, never>> {
  private events = new Map<string, EventEnvelope[]>();
  private collections = new Set<IEventCollection>();

  constructor() {
    super({});
  }

  async connect(): Promise<void> {
    this.log('Connected to in-memory event store');
  }

  async disconnect(): Promise<void> {
    this.events.clear();
    this.collections.clear();
    this.log('Disconnected from in-memory event store');
  }

  async ensureCollection(pool?: IEventPool): Promise<IEventCollection> {
    const collectionName: IEventCollection = pool ? `${pool}-events` : 'events';
    this.collections.add(collectionName);
    return collectionName;
  }

  async *listCollections(
    _filter?: IEventCollectionFilter
  ): AsyncGenerator<IEventCollection[]> {
    yield Array.from(this.collections);
  }

  async getEvent(
    eventStream: EventStream,
    version: number,
    _pool?: IEventPool
  ): Promise<IEvent> {
    const envelopes = this.events.get(eventStream.streamId) || [];
    const envelope = envelopes.find((e) => e.metadata.version === version);

    if (!envelope) {
      throw new Error(`Event not found at version ${version}`);
    }

    return {
      type: envelope.event,
      payload: envelope.payload,
    };
  }

  async *getEvents(
    eventStream: EventStream,
    filter?: IEventFilter
  ): AsyncGenerator<IEvent[]> {
    const envelopes = this.events.get(eventStream.streamId) || [];

    let filtered = envelopes;
    if (filter?.fromVersion !== undefined) {
      filtered = filtered.filter((e) => e.metadata.version >= filter.fromVersion!);
    }
    if (filter?.limit !== undefined) {
      filtered = filtered.slice(0, filter.limit);
    }

    const events = filtered.map((e) => ({
      type: e.event,
      payload: e.payload,
    }));

    yield events;
  }

  async appendEvents(
    eventStream: EventStream,
    expectedVersion: number,
    events: IEvent[],
    _pool?: IEventPool
  ): Promise<EventEnvelope[]> {
    const existing = this.events.get(eventStream.streamId) || [];
    const currentVersion = existing.length;

    // Optimistic concurrency check
    if (currentVersion !== expectedVersion) {
      throw new Error(
        `Version conflict: expected ${expectedVersion}, got ${currentVersion}`
      );
    }

    // Create envelopes with metadata
    // EventEnvelope.create automatically sets occurredOn from eventId.date
    const envelopes = events.map((event, i) =>
      EventEnvelope.create(event.type, event.payload, {
        aggregateId: eventStream.aggregateId,
        version: expectedVersion + i + 1,
      })
    );

    // Store events
    this.events.set(eventStream.streamId, [...existing, ...envelopes]);

    return envelopes;
  }

  async *getEnvelopes(
    eventStream: EventStream,
    filter?: IEventFilter
  ): AsyncGenerator<EventEnvelope[]> {
    const envelopes = this.events.get(eventStream.streamId) || [];

    let filtered = envelopes;
    if (filter?.fromVersion !== undefined) {
      filtered = filtered.filter((e) => e.metadata.version >= filter.fromVersion!);
    }
    if (filter?.limit !== undefined) {
      filtered = filtered.slice(0, filter.limit);
    }

    yield filtered;
  }

  async getEnvelope(
    eventStream: EventStream,
    version: number,
    _pool?: IEventPool
  ): Promise<EventEnvelope> {
    const envelopes = this.events.get(eventStream.streamId) || [];
    const envelope = envelopes.find((e) => e.metadata.version === version);

    if (!envelope) {
      throw new Error(`Event not found at version ${version}`);
    }

    return envelope;
  }

  async *getAllEnvelopes(
    _filter: IAllEventsFilter
  ): AsyncGenerator<EventEnvelope[]> {
    const allEnvelopes: EventEnvelope[] = [];
    for (const envelopes of this.events.values()) {
      allEnvelopes.push(...envelopes);
    }
    yield allEnvelopes;
  }
}
