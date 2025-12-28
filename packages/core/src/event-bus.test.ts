import { describe, test, expect, beforeEach } from 'bun:test';
import { InMemoryEventBus } from './integrations/in-memory-event-bus';
import { EventEnvelope } from './models/event-envelope';

describe('EventBus', () => {
	let eventBus: InMemoryEventBus;

	beforeEach(() => {
		eventBus = new InMemoryEventBus({});
	});

	test('subscribes and publishes to specific event type', async () => {
		const handledEvents: EventEnvelope[] = [];

		eventBus.subscribe('MoneyDeposited', (envelope) => {
			handledEvents.push(envelope);
		});

		const envelope = EventEnvelope.create('MoneyDeposited', { amount: 100 }, {
			aggregateId: 'account-123',
			version: 1
		});

		await eventBus.publish(envelope);

		expect(handledEvents).toHaveLength(1);
		expect(handledEvents[0].event).toBe('MoneyDeposited');
		expect(handledEvents[0].payload.amount).toBe(100);
	});

	test('only calls handlers for matching event type', async () => {
		const depositHandlerCalled: boolean[] = [];
		const withdrawHandlerCalled: boolean[] = [];

		eventBus.subscribe('MoneyDeposited', () => {
			depositHandlerCalled.push(true);
		});

		eventBus.subscribe('MoneyWithdrawn', () => {
			withdrawHandlerCalled.push(true);
		});

		const envelope = EventEnvelope.create('MoneyDeposited', { amount: 100 }, {
			aggregateId: 'account-123',
			version: 1
		});

		await eventBus.publish(envelope);

		expect(depositHandlerCalled).toHaveLength(1);
		expect(withdrawHandlerCalled).toHaveLength(0);
	});

	test('subscribeAll receives all events', async () => {
		const allEvents: EventEnvelope[] = [];

		eventBus.subscribeAll((envelope) => {
			allEvents.push(envelope);
		});

		const envelope1 = EventEnvelope.create('MoneyDeposited', { amount: 100 }, {
			aggregateId: 'account-123',
			version: 1
		});

		const envelope2 = EventEnvelope.create('MoneyWithdrawn', { amount: 50 }, {
			aggregateId: 'account-123',
			version: 2
		});

		await eventBus.publish(envelope1);
		await eventBus.publish(envelope2);

		expect(allEvents).toHaveLength(2);
		expect(allEvents[0].event).toBe('MoneyDeposited');
		expect(allEvents[1].event).toBe('MoneyWithdrawn');
	});

	test('multiple handlers for same event type', async () => {
		const handler1Called: boolean[] = [];
		const handler2Called: boolean[] = [];

		eventBus.subscribe('MoneyDeposited', () => {
			handler1Called.push(true);
		});

		eventBus.subscribe('MoneyDeposited', () => {
			handler2Called.push(true);
		});

		const envelope = EventEnvelope.create('MoneyDeposited', { amount: 100 }, {
			aggregateId: 'account-123',
			version: 1
		});

		await eventBus.publish(envelope);

		expect(handler1Called).toHaveLength(1);
		expect(handler2Called).toHaveLength(1);
	});

	test('unsubscribe removes handler', async () => {
		const handledEvents: EventEnvelope[] = [];

		const unsubscribe = eventBus.subscribe('MoneyDeposited', (envelope) => {
			handledEvents.push(envelope);
		});

		const envelope1 = EventEnvelope.create('MoneyDeposited', { amount: 100 }, {
			aggregateId: 'account-123',
			version: 1
		});

		await eventBus.publish(envelope1);
		expect(handledEvents).toHaveLength(1);

		// Unsubscribe
		unsubscribe();

		const envelope2 = EventEnvelope.create('MoneyDeposited', { amount: 200 }, {
			aggregateId: 'account-123',
			version: 2
		});

		await eventBus.publish(envelope2);
		expect(handledEvents).toHaveLength(1); // Still 1, not 2
	});

	test('subscribeToMany subscribes to multiple events', async () => {
		const handledEvents: EventEnvelope[] = [];

		eventBus.subscribeToMany(['MoneyDeposited', 'MoneyWithdrawn'], (envelope) => {
			handledEvents.push(envelope);
		});

		await eventBus.publish(EventEnvelope.create('MoneyDeposited', { amount: 100 }, {
			aggregateId: 'account-123',
			version: 1
		}));

		await eventBus.publish(EventEnvelope.create('MoneyWithdrawn', { amount: 50 }, {
			aggregateId: 'account-123',
			version: 2
		}));

		await eventBus.publish(EventEnvelope.create('OtherEvent', {}, {
			aggregateId: 'account-123',
			version: 3
		}));

		expect(handledEvents).toHaveLength(2);
		expect(handledEvents[0].event).toBe('MoneyDeposited');
		expect(handledEvents[1].event).toBe('MoneyWithdrawn');
	});

	test('subscribeToMany unsubscribe removes all subscriptions', async () => {
		const handledEvents: EventEnvelope[] = [];

		const unsubscribe = eventBus.subscribeToMany(['MoneyDeposited', 'MoneyWithdrawn'], (envelope) => {
			handledEvents.push(envelope);
		});

		await eventBus.publish(EventEnvelope.create('MoneyDeposited', { amount: 100 }, {
			aggregateId: 'account-123',
			version: 1
		}));

		expect(handledEvents).toHaveLength(1);

		unsubscribe();

		await eventBus.publish(EventEnvelope.create('MoneyDeposited', { amount: 200 }, {
			aggregateId: 'account-123',
			version: 2
		}));

		await eventBus.publish(EventEnvelope.create('MoneyWithdrawn', { amount: 50 }, {
			aggregateId: 'account-123',
			version: 3
		}));

		expect(handledEvents).toHaveLength(1); // No new events
	});

	test('supports async handlers', async () => {
		const results: number[] = [];

		eventBus.subscribe('MoneyDeposited', async (envelope) => {
			await new Promise(resolve => setTimeout(resolve, 10));
			results.push(envelope.payload.amount);
		});

		const envelope = EventEnvelope.create('MoneyDeposited', { amount: 100 }, {
			aggregateId: 'account-123',
			version: 1
		});

		await eventBus.publish(envelope);

		expect(results).toHaveLength(1);
		expect(results[0]).toBe(100);
	});

	test('addPublisher adds external publisher', async () => {
		const publishedEvents: EventEnvelope[] = [];

		eventBus.addPublisher(async (envelope) => {
			publishedEvents.push(envelope);
		});

		const envelope = EventEnvelope.create('MoneyDeposited', { amount: 100 }, {
			aggregateId: 'account-123',
			version: 1
		});

		await eventBus.publish(envelope);

		expect(publishedEvents).toHaveLength(1);
		expect(publishedEvents[0].event).toBe('MoneyDeposited');
	});

	test('multiple publishers receive events', async () => {
		const publisher1Events: EventEnvelope[] = [];
		const publisher2Events: EventEnvelope[] = [];

		eventBus.addPublisher((envelope) => {
			publisher1Events.push(envelope);
		});

		eventBus.addPublisher((envelope) => {
			publisher2Events.push(envelope);
		});

		const envelope = EventEnvelope.create('MoneyDeposited', { amount: 100 }, {
			aggregateId: 'account-123',
			version: 1
		});

		await eventBus.publish(envelope);

		expect(publisher1Events).toHaveLength(1);
		expect(publisher2Events).toHaveLength(1);
	});

	test('onError handles handler errors', async () => {
		const errors: Error[] = [];
		const errorEnvelopes: EventEnvelope[] = [];

		eventBus.setErrorHandler((error, envelope) => {
			errors.push(error);
			errorEnvelopes.push(envelope);
		});

		eventBus.subscribe('MoneyDeposited', () => {
			throw new Error('Handler failed');
		});

		const envelope = EventEnvelope.create('MoneyDeposited', { amount: 100 }, {
			aggregateId: 'account-123',
			version: 1
		});

		// Should not throw
		await eventBus.publish(envelope);

		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe('Handler failed');
		expect(errorEnvelopes[0]).toBe(envelope);
	});

	test('error in one handler does not prevent other handlers', async () => {
		const successfulHandlerCalled: boolean[] = [];

		eventBus.subscribe('MoneyDeposited', () => {
			throw new Error('Handler 1 failed');
		});

		eventBus.subscribe('MoneyDeposited', () => {
			successfulHandlerCalled.push(true);
		});

		const envelope = EventEnvelope.create('MoneyDeposited', { amount: 100 }, {
			aggregateId: 'account-123',
			version: 1
		});

		await eventBus.publish(envelope);

		expect(successfulHandlerCalled).toHaveLength(1);
	});

	test('getSubscriberCount returns correct count', () => {
		expect(eventBus.getSubscriberCount('MoneyDeposited')).toBe(0);

		eventBus.subscribe('MoneyDeposited', () => {});
		expect(eventBus.getSubscriberCount('MoneyDeposited')).toBe(1);

		eventBus.subscribe('MoneyDeposited', () => {});
		expect(eventBus.getSubscriberCount('MoneyDeposited')).toBe(2);
	});

	test('getRegisteredEvents returns all event types', () => {
		expect(eventBus.getRegisteredEvents()).toEqual([]);

		eventBus.subscribe('MoneyDeposited', () => {});
		eventBus.subscribe('MoneyWithdrawn', () => {});

		const events = eventBus.getRegisteredEvents();
		expect(events).toHaveLength(2);
		expect(events).toContain('MoneyDeposited');
		expect(events).toContain('MoneyWithdrawn');
	});

	test('clear removes all subscriptions and publishers', async () => {
		const handledEvents: EventEnvelope[] = [];
		const publishedEvents: EventEnvelope[] = [];

		eventBus.subscribe('MoneyDeposited', (envelope) => {
			handledEvents.push(envelope);
		});

		eventBus.addPublisher((envelope) => {
			publishedEvents.push(envelope);
		});

		eventBus.clear();

		const envelope = EventEnvelope.create('MoneyDeposited', { amount: 100 }, {
			aggregateId: 'account-123',
			version: 1
		});

		await eventBus.publish(envelope);

		expect(handledEvents).toHaveLength(0);
		expect(publishedEvents).toHaveLength(0);
		expect(eventBus.getRegisteredEvents()).toEqual([]);
	});

	test('global and specific subscribers both receive event', async () => {
		const specificHandlerCalled: boolean[] = [];
		const globalHandlerCalled: boolean[] = [];

		eventBus.subscribe('MoneyDeposited', () => {
			specificHandlerCalled.push(true);
		});

		eventBus.subscribeAll(() => {
			globalHandlerCalled.push(true);
		});

		const envelope = EventEnvelope.create('MoneyDeposited', { amount: 100 }, {
			aggregateId: 'account-123',
			version: 1
		});

		await eventBus.publish(envelope);

		expect(specificHandlerCalled).toHaveLength(1);
		expect(globalHandlerCalled).toHaveLength(1);
	});
});
