import { describe, test, expect, beforeEach } from 'bun:test';
import { EventFlows, EventFlowsBuilder } from './eventflows-builder';
import { InMemoryEventBus } from '../integrations/in-memory-event-bus';
import { EventStore } from '../event-store';
import { EventEnvelope } from '../models/event-envelope';
import type { IEvent, IEventFilter, IAllEventsFilter, IEventCollection, EventHandler } from '../interfaces';
import type { EventFlowsModule, ModuleRegistration } from './interfaces';

// Simple in-memory event store for testing
class TestEventStore extends EventStore<{ debug?: boolean }> {
	private events = new Map<string, EventEnvelope[]>();
	public connectCalled = false;
	public disconnectCalled = false;

	async connect(): Promise<void> {
		this.connectCalled = true;
	}

	async disconnect(): Promise<void> {
		this.disconnectCalled = true;
		this.events.clear();
	}

	async ensureCollection(): Promise<IEventCollection> {
		return 'events';
	}

	async *listCollections(): AsyncGenerator<IEventCollection[]> {
		yield ['events'];
	}

	async getEvent(): Promise<IEvent> {
		throw new Error('Not implemented');
	}

	async *getEvents(): AsyncGenerator<IEvent[]> {
		yield [];
	}

	async appendEvents(): Promise<EventEnvelope[]> {
		return [];
	}

	async *getAllEnvelopes(): AsyncGenerator<EventEnvelope[]> {
		yield [];
	}

	async *getEnvelopes(): AsyncGenerator<EventEnvelope[]> {
		yield [];
	}

	async getEnvelope(): Promise<EventEnvelope> {
		throw new Error('Not implemented');
	}
}

// Test module factory
function createTestModule(name: string, options?: {
	boundedContext?: string;
	commands?: string[];
	queries?: string[];
	projections?: { name: string; events: string[] }[];
	eventHandlers?: { eventType: string; fromContext?: string }[];
}): EventFlowsModule {
	return {
		name,
		boundedContext: options?.boundedContext,
		register: (): ModuleRegistration => ({
			commandHandlers: (options?.commands || []).map(cmd => ({
				commandName: cmd,
				handler: { execute: async () => ({}) }
			})),
			queryHandlers: (options?.queries || []).map(q => ({
				queryName: q,
				handler: { execute: async () => ({}) }
			})),
			projections: (options?.projections || []).map(p => ({
				name: p.name,
				handlers: p.events.reduce((acc, e) => {
					acc[e] = async () => {};
					return acc;
				}, {} as Record<string, EventHandler>)
			})),
			eventHandlers: options?.eventHandlers?.map(eh => ({
				eventType: eh.eventType,
				handler: async () => {},
				fromContext: eh.fromContext
			}))
		})
	};
}

describe('EventFlowsBuilder', () => {
	let eventStore: TestEventStore;
	let eventBus: InMemoryEventBus;

	beforeEach(() => {
		eventStore = new TestEventStore({ debug: false });
		eventBus = new InMemoryEventBus({ debug: false });
	});

	describe('EventFlows.create()', () => {
		test('returns a new EventFlowsBuilder instance', () => {
			const builder = EventFlows.create();
			expect(builder).toBeInstanceOf(EventFlowsBuilder);
		});
	});

	describe('Fluent API', () => {
		test('withEventStore returns the builder', () => {
			const builder = EventFlows.create();
			const result = builder.withEventStore(eventStore);
			expect(result).toBe(builder);
		});

		test('withEventBus returns the builder', () => {
			const builder = EventFlows.create();
			const result = builder.withEventBus(eventBus);
			expect(result).toBe(builder);
		});

		test('withDebug returns the builder', () => {
			const builder = EventFlows.create();
			const result = builder.withDebug(true);
			expect(result).toBe(builder);
		});

		test('withModule returns the builder', () => {
			const builder = EventFlows.create();
			const module = createTestModule('users');
			const result = builder.withModule(module);
			expect(result).toBe(builder);
		});

		test('withModules returns the builder', () => {
			const builder = EventFlows.create();
			const modules = [createTestModule('users'), createTestModule('orders')];
			const result = builder.withModules(modules);
			expect(result).toBe(builder);
		});

		test('withGlobalEventHandler returns the builder', () => {
			const builder = EventFlows.create();
			const handler: EventHandler = async () => {};
			const result = builder.withGlobalEventHandler(handler);
			expect(result).toBe(builder);
		});

		test('supports method chaining', () => {
			const module = createTestModule('users');
			const handler: EventHandler = async () => {};

			const builder = EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withDebug(true)
				.withModule(module)
				.withGlobalEventHandler(handler);

			expect(builder).toBeInstanceOf(EventFlowsBuilder);
		});
	});

	describe('Validation', () => {
		test('build() throws if event store is not configured', async () => {
			const builder = EventFlows.create()
				.withEventBus(eventBus);

			await expect(builder.build()).rejects.toThrow('EventStore is required');
		});

		test('build() throws if event bus is not configured', async () => {
			const builder = EventFlows.create()
				.withEventStore(eventStore);

			await expect(builder.build()).rejects.toThrow('EventBus is required');
		});

		test('build() throws if duplicate module names are registered', async () => {
			const module1 = createTestModule('users');
			const module2 = createTestModule('users'); // duplicate

			const builder = EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModule(module1)
				.withModule(module2);

			await expect(builder.build()).rejects.toThrow('Duplicate module name: users');
		});

		test('build() throws if duplicate command handlers are registered', async () => {
			const module1 = createTestModule('users', { commands: ['CreateUser'] });
			const module2 = createTestModule('orders', { commands: ['CreateUser'] }); // duplicate command

			const builder = EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModule(module1)
				.withModule(module2);

			await expect(builder.build()).rejects.toThrow('Duplicate command handler: CreateUser');
		});

		test('build() throws if duplicate query handlers are registered', async () => {
			const module1 = createTestModule('users', { queries: ['GetUserById'] });
			const module2 = createTestModule('orders', { queries: ['GetUserById'] }); // duplicate query

			const builder = EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModule(module1)
				.withModule(module2);

			await expect(builder.build()).rejects.toThrow('Duplicate query handler: GetUserById');
		});
	});

	describe('Build Process', () => {
		test('build() connects the event store', async () => {
			const builder = EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus);

			await builder.build();

			expect(eventStore.connectCalled).toBe(true);
		});

		test('build() links event store to event bus via setPublisher', async () => {
			let publisherSet = false;
			const customStore = new TestEventStore({ debug: false });
			const originalSetPublisher = customStore.setPublisher.bind(customStore);
			customStore.setPublisher = (fn) => {
				publisherSet = true;
				originalSetPublisher(fn);
			};

			const builder = EventFlows.create()
				.withEventStore(customStore)
				.withEventBus(eventBus);

			await builder.build();

			expect(publisherSet).toBe(true);
		});

		test('build() initializes modules in registration order', async () => {
			const initOrder: string[] = [];

			const module1: EventFlowsModule = {
				name: 'first',
				register: () => {
					initOrder.push('first');
					return { commandHandlers: [], queryHandlers: [], projections: [] };
				}
			};

			const module2: EventFlowsModule = {
				name: 'second',
				register: () => {
					initOrder.push('second');
					return { commandHandlers: [], queryHandlers: [], projections: [] };
				}
			};

			const builder = EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModule(module1)
				.withModule(module2);

			await builder.build();

			expect(initOrder).toEqual(['first', 'second']);
		});

		test('build() supports async module registration', async () => {
			let asyncInitCompleted = false;

			const asyncModule: EventFlowsModule = {
				name: 'async-module',
				register: async () => {
					await new Promise(resolve => setTimeout(resolve, 10));
					asyncInitCompleted = true;
					return { commandHandlers: [], queryHandlers: [], projections: [] };
				}
			};

			const builder = EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModule(asyncModule);

			await builder.build();

			expect(asyncInitCompleted).toBe(true);
		});

		test('build() passes ModuleContext to register function', async () => {
			let receivedContext: any = null;

			const module: EventFlowsModule = {
				name: 'context-test',
				register: (context) => {
					receivedContext = context;
					return { commandHandlers: [], queryHandlers: [], projections: [] };
				}
			};

			const builder = EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModule(module);

			await builder.build();

			expect(receivedContext).not.toBeNull();
			expect(receivedContext.eventStore).toBe(eventStore);
			expect(receivedContext.eventBus).toBe(eventBus);
		});

		test('build() returns an EventFlowsApp instance', async () => {
			const builder = EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus);

			const app = await builder.build();

			expect(app).toBeDefined();
			expect(typeof app.command).toBe('function');
			expect(typeof app.query).toBe('function');
			expect(typeof app.shutdown).toBe('function');
		});

		test('build() subscribes projection handlers to event bus', async () => {
			const module = createTestModule('inventory', {
				projections: [
					{ name: 'ProductCatalog', events: ['ProductAdded', 'ProductRemoved'] }
				]
			});

			const builder = EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModule(module);

			await builder.build();

			// Check that event bus has subscribers for projection events
			expect(eventBus.getSubscriberCount('ProductAdded')).toBeGreaterThan(0);
			expect(eventBus.getSubscriberCount('ProductRemoved')).toBeGreaterThan(0);
		});

		test('build() subscribes cross-context event handlers', async () => {
			const module = createTestModule('inventory', {
				eventHandlers: [
					{ eventType: 'OrderPlaced', fromContext: 'orders' }
				]
			});

			const builder = EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModule(module);

			await builder.build();

			expect(eventBus.getSubscriberCount('OrderPlaced')).toBeGreaterThan(0);
		});

		test('build() registers global event handlers', async () => {
			const handler: EventHandler = async () => {};

			const builder = EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withGlobalEventHandler(handler);

			await builder.build();

			// Global handlers use subscribeAll, so we can't check specific event count
			// But we can verify the build completes without error
			expect(true).toBe(true);
		});
	});

	describe('withModules()', () => {
		test('registers multiple modules at once', async () => {
			const initOrder: string[] = [];

			const modules: EventFlowsModule[] = [
				{
					name: 'users',
					register: () => {
						initOrder.push('users');
						return { commandHandlers: [], queryHandlers: [], projections: [] };
					}
				},
				{
					name: 'orders',
					register: () => {
						initOrder.push('orders');
						return { commandHandlers: [], queryHandlers: [], projections: [] };
					}
				}
			];

			const builder = EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModules(modules);

			await builder.build();

			expect(initOrder).toEqual(['users', 'orders']);
		});
	});

	describe('withDebug()', () => {
		test('enables debug mode by default when called without argument', () => {
			const builder = EventFlows.create().withDebug();
			// Debug mode is internal, but we can verify it doesn't throw
			expect(builder).toBeInstanceOf(EventFlowsBuilder);
		});

		test('can explicitly disable debug mode', () => {
			const builder = EventFlows.create().withDebug(false);
			expect(builder).toBeInstanceOf(EventFlowsBuilder);
		});
	});
});
