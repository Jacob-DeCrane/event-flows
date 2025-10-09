import { describe, test, expect, beforeEach } from 'bun:test';
import { EventStore } from './event-store';
import { EventStream } from './models/event-stream';
import { EventEnvelope } from './models/event-envelope';
import { AggregateRoot } from './models/aggregate-root';
import type { IEvent, IEventFilter, IAllEventsFilter, IEventCollection } from './interfaces';

// Simple in-memory implementation for testing
class InMemoryEventStore extends EventStore<{ debug?: boolean }> {
	private events = new Map<string, EventEnvelope[]>();

	async connect(): Promise<void> {
		this.log('Connected to in-memory store');
	}

	async disconnect(): Promise<void> {
		this.events.clear();
		this.log('Disconnected from in-memory store');
	}

	async ensureCollection(): Promise<IEventCollection> {
		return 'events';
	}

	async *listCollections(): AsyncGenerator<IEventCollection[]> {
		yield ['events'];
	}

	async getEvent(eventStream: EventStream, version: number): Promise<IEvent> {
		const envelopes = this.events.get(eventStream.streamId) || [];
		const envelope = envelopes.find(e => e.metadata.version === version);
		if (!envelope) {
			throw new Error(`Event not found: ${eventStream.streamId} v${version}`);
		}
		return { type: envelope.event, payload: envelope.payload };
	}

	async *getEvents(eventStream: EventStream, filter?: IEventFilter): AsyncGenerator<IEvent[]> {
		const envelopes = this.events.get(eventStream.streamId) || [];
		const filtered = envelopes
			.filter(e => !filter?.fromVersion || e.metadata.version >= filter.fromVersion)
			.slice(0, filter?.limit || envelopes.length);

		const events = filtered.map(e => ({ type: e.event, payload: e.payload }));
		yield events;
	}

	async appendEvents(
		eventStream: EventStream,
		version: number,
		events: IEvent[]
	): Promise<EventEnvelope[]> {
		const existing = this.events.get(eventStream.streamId) || [];
		const currentVersion = existing.length;

		// Optimistic concurrency check
		if (currentVersion !== version) {
			throw new Error(`Concurrency error: expected v${version}, got v${currentVersion}`);
		}

		// Create envelopes
		const envelopes = events.map((event, i) =>
			EventEnvelope.create(event.type, event.payload, {
				aggregateId: eventStream.aggregateId,
				version: version + i + 1
			})
		);

		// Store
		this.events.set(eventStream.streamId, [...existing, ...envelopes]);
		this.log(`Appended ${events.length} events to ${eventStream.streamId}`);

		return envelopes;
	}

	async *getEnvelopes(eventStream: EventStream, filter?: IEventFilter): AsyncGenerator<EventEnvelope[]> {
		const envelopes = this.events.get(eventStream.streamId) || [];
		const filtered = envelopes
			.filter(e => !filter?.fromVersion || e.metadata.version >= filter.fromVersion)
			.slice(0, filter?.limit || envelopes.length);

		yield filtered;
	}

	async getEnvelope(eventStream: EventStream, version: number): Promise<EventEnvelope> {
		const envelopes = this.events.get(eventStream.streamId) || [];
		const envelope = envelopes.find(e => e.metadata.version === version);
		if (!envelope) {
			throw new Error(`Envelope not found: ${eventStream.streamId} v${version}`);
		}
		return envelope;
	}

	async *getAllEnvelopes(filter: IAllEventsFilter): AsyncGenerator<EventEnvelope[]> {
		const periods = this.getYearMonthRange(filter.since, filter.until);
		this.log(`Getting all events for periods: ${periods.join(', ')}`);

		// For in-memory, just return all events
		const allEnvelopes: EventEnvelope[] = [];
		for (const envelopes of this.events.values()) {
			allEnvelopes.push(...envelopes);
		}
		yield allEnvelopes;
	}
}

// Test aggregate
class BankAccount extends AggregateRoot {
	balance = 0;

	constructor(id: string) {
		super(id);
	}

	deposit(amount: number) {
		this.applyEvent({
			type: 'MoneyDeposited',
			payload: { amount }
		});
	}

	protected onMoneyDeposited(event: IEvent<'MoneyDeposited', { amount: number }>) {
		this.balance += event.payload.amount;
	}
}

describe('EventStore (InMemory Implementation)', () => {
	let store: InMemoryEventStore;
	let publishedEvents: EventEnvelope[] = [];

	beforeEach(() => {
		store = new InMemoryEventStore({ debug: true });
		publishedEvents = [];

		// Set up publisher
		store.setPublisher(envelope => {
			publishedEvents.push(envelope);
		});

		// Set up logger
		store.setLogger(() => {
			// console.log(`[EventStore] ${msg}`, ctx);
		});
	});

	test('connects and disconnects', async () => {
		await store.connect();
		await store.disconnect();
	});

	test('appends events to stream', async () => {
		await store.connect();

		const stream = EventStream.for('BankAccount', 'acc-123');
		const events: IEvent[] = [
			{ type: 'MoneyDeposited', payload: { amount: 100 } },
			{ type: 'MoneyDeposited', payload: { amount: 50 } }
		];

		const envelopes = await store.appendEvents(stream, 0, events);

		expect(envelopes.length).toBe(2);
		expect(envelopes[0].event).toBe('MoneyDeposited');
		expect(envelopes[0].metadata.version).toBe(1);
		expect(envelopes[1].metadata.version).toBe(2);
	});

	test('automatically publishes events after append', async () => {
		await store.connect();

		const stream = EventStream.for('BankAccount', 'acc-123');
		const events: IEvent[] = [
			{ type: 'MoneyDeposited', payload: { amount: 100 } }
		];

		await store.appendEvents(stream, 0, events);

		// Publishing happens automatically via Proxy
		expect(publishedEvents.length).toBe(1);
		expect(publishedEvents[0].event).toBe('MoneyDeposited');
	});

	test('retrieves events from stream', async () => {
		await store.connect();

		const stream = EventStream.for('BankAccount', 'acc-123');
		await store.appendEvents(stream, 0, [
			{ type: 'MoneyDeposited', payload: { amount: 100 } },
			{ type: 'MoneyDeposited', payload: { amount: 50 } }
		]);

		const batches: IEvent[][] = [];
		for await (const batch of store.getEvents(stream)) {
			batches.push(batch);
		}

		expect(batches.length).toBe(1);
		expect(batches[0].length).toBe(2);
		expect(batches[0][0].type).toBe('MoneyDeposited');
		expect(batches[0][0].payload.amount).toBe(100);
	});

	test('filters events by version', async () => {
		await store.connect();

		const stream = EventStream.for('BankAccount', 'acc-123');
		await store.appendEvents(stream, 0, [
			{ type: 'MoneyDeposited', payload: { amount: 100 } },
			{ type: 'MoneyDeposited', payload: { amount: 50 } },
			{ type: 'MoneyDeposited', payload: { amount: 25 } }
		]);

		const batches: IEvent[][] = [];
		for await (const batch of store.getEvents(stream, { fromVersion: 2 })) {
			batches.push(batch);
		}

		expect(batches[0].length).toBe(2); // versions 2 and 3
		expect(batches[0][0].payload.amount).toBe(50);
	});

	test('enforces optimistic concurrency', async () => {
		await store.connect();

		const stream = EventStream.for('BankAccount', 'acc-123');
		await store.appendEvents(stream, 0, [
			{ type: 'MoneyDeposited', payload: { amount: 100 } }
		]);

		// Try to append with wrong version
		expect(
			store.appendEvents(stream, 0, [
				{ type: 'MoneyDeposited', payload: { amount: 50 } }
			])
		).rejects.toThrow('Concurrency error');
	});

	test('works with EventStream.fromAggregate', async () => {
		await store.connect();

		const account = new BankAccount('acc-456');
		account.deposit(100);

		const stream = EventStream.fromAggregate(account);
		const uncommittedEvents = account.commit();

		const envelopes = await store.appendEvents(
			stream,
			0,
			uncommittedEvents
		);

		expect(envelopes.length).toBe(1);
		expect(envelopes[0].metadata.aggregateId).toBe('acc-456');
	});

	test('retrieves single event by version', async () => {
		await store.connect();

		const stream = EventStream.for('BankAccount', 'acc-123');
		await store.appendEvents(stream, 0, [
			{ type: 'MoneyDeposited', payload: { amount: 100 } },
			{ type: 'MoneyDeposited', payload: { amount: 50 } }
		]);

		const event = await store.getEvent(stream, 2);
		expect(event.payload.amount).toBe(50);
	});

	test('getAllEnvelopes retrieves all events', async () => {
		await store.connect();

		const stream1 = EventStream.for('BankAccount', 'acc-1');
		const stream2 = EventStream.for('BankAccount', 'acc-2');

		await store.appendEvents(stream1, 0, [
			{ type: 'MoneyDeposited', payload: { amount: 100 } }
		]);
		await store.appendEvents(stream2, 0, [
			{ type: 'MoneyDeposited', payload: { amount: 200 } }
		]);

		const batches: EventEnvelope[][] = [];
		for await (const batch of store.getAllEnvelopes({
			since: { year: 2024, month: 1 }
		})) {
			batches.push(batch);
		}

		expect(batches[0].length).toBe(2);
	});
});
