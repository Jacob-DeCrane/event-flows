import { describe, test, expect, beforeEach } from 'bun:test';
import { EventFlows } from './eventflows-builder';
import { InMemoryEventBus } from '../integrations/in-memory-event-bus';
import { EventStore } from '../event-store';
import { EventEnvelope } from '../models/event-envelope';
import { EventStream } from '../models/event-stream';
import type {
	IEvent,
	IEventCollection,
	IAllEventsFilter,
	IEventFilter,
	ICommand,
	IQuery,
	ICommandHandler,
	IQueryHandler,
	EventHandler
} from '../interfaces';
import type { EventFlowsModule, ModuleContext, ModuleRegistration } from './interfaces';

// =============================================================================
// Test Infrastructure: In-Memory Event Store
// =============================================================================

class InMemoryEventStore extends EventStore<{ debug?: boolean }> {
	private events = new Map<string, EventEnvelope[]>();

	async connect(): Promise<void> {}

	async disconnect(): Promise<void> {
		this.events.clear();
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
		if (!envelope) throw new Error(`Event not found: v${version}`);
		return { type: envelope.event, payload: envelope.payload };
	}

	async *getEvents(eventStream: EventStream, filter?: IEventFilter): AsyncGenerator<IEvent[]> {
		const envelopes = this.events.get(eventStream.streamId) || [];
		const filtered = envelopes
			.filter(e => !filter?.fromVersion || e.metadata.version >= filter.fromVersion)
			.slice(0, filter?.limit || envelopes.length);
		yield filtered.map(e => ({ type: e.event, payload: e.payload }));
	}

	async appendEvents(
		eventStream: EventStream,
		version: number,
		events: IEvent[]
	): Promise<EventEnvelope[]> {
		const existing = this.events.get(eventStream.streamId) || [];
		const currentVersion = existing.length;

		if (currentVersion !== version) {
			throw new Error(`Concurrency error: expected v${version}, got v${currentVersion}`);
		}

		const envelopes = events.map((event, i) =>
			EventEnvelope.create(event.type, event.payload, {
				aggregateId: eventStream.aggregateId,
				version: version + i + 1
			})
		);

		this.events.set(eventStream.streamId, [...existing, ...envelopes]);
		return envelopes;
	}

	async *getAllEnvelopes(_filter: IAllEventsFilter): AsyncGenerator<EventEnvelope[]> {
		const allEnvelopes: EventEnvelope[] = [];
		for (const envelopes of this.events.values()) {
			allEnvelopes.push(...envelopes);
		}
		yield allEnvelopes;
	}

	async *getEnvelopes(eventStream: EventStream): AsyncGenerator<EventEnvelope[]> {
		yield this.events.get(eventStream.streamId) || [];
	}

	async getEnvelope(eventStream: EventStream, version: number): Promise<EventEnvelope> {
		const envelopes = this.events.get(eventStream.streamId) || [];
		const envelope = envelopes.find(e => e.metadata.version === version);
		if (!envelope) throw new Error(`Envelope not found: v${version}`);
		return envelope;
	}
}

// =============================================================================
// Test Domain: User Management Module
// =============================================================================

// Commands
interface CreateUserCommand extends ICommand {
	commandName: 'CreateUser';
	userId: string;
	name: string;
	email: string;
}

interface UpdateUserNameCommand extends ICommand {
	commandName: 'UpdateUserName';
	userId: string;
	newName: string;
}

// Queries
interface GetUserByIdQuery extends IQuery {
	queryName: 'GetUserById';
	userId: string;
}

interface ListUsersQuery extends IQuery {
	queryName: 'ListUsers';
}

// Read Model
interface UserReadModel {
	id: string;
	name: string;
	email: string;
}

// User Module Factory
function createUserModule(): EventFlowsModule {
	// In-memory read model (simulates a database)
	const users = new Map<string, UserReadModel>();

	return {
		name: 'users',
		boundedContext: 'identity',
		register: (context: ModuleContext): ModuleRegistration => {
			// Command Handlers
			const createUserHandler: ICommandHandler<CreateUserCommand, { userId: string }> = {
				execute: async (command) => {
					// In a real app, this would use an aggregate and event store
					const stream = EventStream.for('User', command.userId);
					await context.eventStore.appendEvents(stream, 0, [
						{ type: 'UserCreated', payload: { userId: command.userId, name: command.name, email: command.email } }
					]);
					return { userId: command.userId };
				}
			};

			const updateUserNameHandler: ICommandHandler<UpdateUserNameCommand, void> = {
				execute: async (command) => {
					const stream = EventStream.for('User', command.userId);
					// Get current version (simplified - real app would load aggregate)
					const envelopes: EventEnvelope[] = [];
					for await (const batch of context.eventStore.getEnvelopes!(stream)) {
						envelopes.push(...batch);
					}
					await context.eventStore.appendEvents(stream, envelopes.length, [
						{ type: 'UserNameUpdated', payload: { userId: command.userId, newName: command.newName } }
					]);
				}
			};

			// Query Handlers
			const getUserByIdHandler: IQueryHandler<GetUserByIdQuery, UserReadModel | null> = {
				execute: async (query) => {
					return users.get(query.userId) || null;
				}
			};

			const listUsersHandler: IQueryHandler<ListUsersQuery, UserReadModel[]> = {
				execute: async () => {
					return Array.from(users.values());
				}
			};

			// Projection Handlers
			const userCreatedHandler: EventHandler = async (envelope) => {
				const { userId, name, email } = envelope.payload as { userId: string; name: string; email: string };
				users.set(userId, { id: userId, name, email });
			};

			const userNameUpdatedHandler: EventHandler = async (envelope) => {
				const { userId, newName } = envelope.payload as { userId: string; newName: string };
				const user = users.get(userId);
				if (user) {
					user.name = newName;
				}
			};

			return {
				commandHandlers: [
					{ commandName: 'CreateUser', handler: createUserHandler },
					{ commandName: 'UpdateUserName', handler: updateUserNameHandler }
				],
				queryHandlers: [
					{ queryName: 'GetUserById', handler: getUserByIdHandler },
					{ queryName: 'ListUsers', handler: listUsersHandler }
				],
				projections: [
					{
						name: 'UserListProjection',
						handlers: {
							UserCreated: userCreatedHandler,
							UserNameUpdated: userNameUpdatedHandler
						}
					}
				]
			};
		}
	};
}

// =============================================================================
// Test Domain: Order Module (for cross-module communication)
// =============================================================================

interface PlaceOrderCommand extends ICommand {
	commandName: 'PlaceOrder';
	orderId: string;
	userId: string;
	items: string[];
}

function createOrderModule(): EventFlowsModule {
	const orders = new Map<string, { id: string; userId: string; items: string[]; userEmail?: string }>();

	return {
		name: 'orders',
		boundedContext: 'sales',
		register: (context: ModuleContext): ModuleRegistration => {
			const placeOrderHandler: ICommandHandler<PlaceOrderCommand, { orderId: string }> = {
				execute: async (command) => {
					const stream = EventStream.for('Order', command.orderId);
					await context.eventStore.appendEvents(stream, 0, [
						{ type: 'OrderPlaced', payload: { orderId: command.orderId, userId: command.userId, items: command.items } }
					]);
					return { orderId: command.orderId };
				}
			};

			// Projection for orders
			const orderPlacedHandler: EventHandler = async (envelope) => {
				const { orderId, userId, items } = envelope.payload as { orderId: string; userId: string; items: string[] };
				orders.set(orderId, { id: orderId, userId, items });
			};

			// Cross-context event handler: enrich order with user email when user is created
			const userCreatedHandler: EventHandler = async (envelope) => {
				const { userId, email } = envelope.payload as { userId: string; email: string };
				// Update any orders for this user with their email
				for (const order of orders.values()) {
					if (order.userId === userId) {
						order.userEmail = email;
					}
				}
			};

			return {
				commandHandlers: [
					{ commandName: 'PlaceOrder', handler: placeOrderHandler }
				],
				queryHandlers: [],
				projections: [
					{
						name: 'OrderProjection',
						handlers: {
							OrderPlaced: orderPlacedHandler
						}
					}
				],
				eventHandlers: [
					{
						eventType: 'UserCreated',
						handler: userCreatedHandler,
						fromContext: 'identity'
					}
				]
			};
		}
	};
}

// =============================================================================
// Integration Tests
// =============================================================================

describe('Module System Integration', () => {
	let eventStore: InMemoryEventStore;
	let eventBus: InMemoryEventBus;

	beforeEach(() => {
		eventStore = new InMemoryEventStore({ debug: false });
		eventBus = new InMemoryEventBus({ debug: false });
	});

	describe('Single Module', () => {
		test('builds app with single module', async () => {
			const app = await EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModule(createUserModule())
				.build();

			expect(app.getModules()).toEqual(['users']);
			expect(app.getCommands()).toContain('CreateUser');
			expect(app.getQueries()).toContain('GetUserById');

			await app.shutdown();
		});

		test('executes command and updates projection', async () => {
			const app = await EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModule(createUserModule())
				.build();

			// Execute command
			const result = await app.command<{ userId: string }>({
				commandName: 'CreateUser',
				userId: 'user-1',
				name: 'Alice',
				email: 'alice@example.com'
			} as CreateUserCommand);

			expect(result.userId).toBe('user-1');

			// Query the read model (projection should have updated)
			const user = await app.query<UserReadModel | null>({
				queryName: 'GetUserById',
				userId: 'user-1'
			} as GetUserByIdQuery);

			expect(user).not.toBeNull();
			expect(user?.name).toBe('Alice');
			expect(user?.email).toBe('alice@example.com');

			await app.shutdown();
		});

		test('handles multiple commands updating same projection', async () => {
			const app = await EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModule(createUserModule())
				.build();

			// Create user
			await app.command({
				commandName: 'CreateUser',
				userId: 'user-1',
				name: 'Alice',
				email: 'alice@example.com'
			} as CreateUserCommand);

			// Update name
			await app.command({
				commandName: 'UpdateUserName',
				userId: 'user-1',
				newName: 'Alice Smith'
			} as UpdateUserNameCommand);

			// Query should reflect updated name
			const user = await app.query<UserReadModel | null>({
				queryName: 'GetUserById',
				userId: 'user-1'
			} as GetUserByIdQuery);

			expect(user?.name).toBe('Alice Smith');

			await app.shutdown();
		});
	});

	describe('Multiple Modules', () => {
		test('builds app with multiple modules', async () => {
			const app = await EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModules([createUserModule(), createOrderModule()])
				.build();

			expect(app.getModules()).toHaveLength(2);
			expect(app.getModules()).toContain('users');
			expect(app.getModules()).toContain('orders');

			await app.shutdown();
		});

		test('modules can execute commands independently', async () => {
			const app = await EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModules([createUserModule(), createOrderModule()])
				.build();

			// Create user
			await app.command({
				commandName: 'CreateUser',
				userId: 'user-1',
				name: 'Alice',
				email: 'alice@example.com'
			} as CreateUserCommand);

			// Place order
			await app.command({
				commandName: 'PlaceOrder',
				orderId: 'order-1',
				userId: 'user-1',
				items: ['item-a', 'item-b']
			} as PlaceOrderCommand);

			// Both should work
			const user = await app.query<UserReadModel | null>({
				queryName: 'GetUserById',
				userId: 'user-1'
			} as GetUserByIdQuery);

			expect(user?.name).toBe('Alice');

			await app.shutdown();
		});
	});

	describe('Global Event Handlers', () => {
		test('global handler receives all events', async () => {
			const receivedEvents: string[] = [];

			const app = await EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModule(createUserModule())
				.withGlobalEventHandler(async (envelope) => {
					receivedEvents.push(envelope.event);
				})
				.build();

			await app.command({
				commandName: 'CreateUser',
				userId: 'user-1',
				name: 'Alice',
				email: 'alice@example.com'
			} as CreateUserCommand);

			await app.command({
				commandName: 'UpdateUserName',
				userId: 'user-1',
				newName: 'Alice Smith'
			} as UpdateUserNameCommand);

			expect(receivedEvents).toContain('UserCreated');
			expect(receivedEvents).toContain('UserNameUpdated');

			await app.shutdown();
		});
	});

	describe('Direct Infrastructure Access', () => {
		test('provides access to command bus for advanced usage', async () => {
			const app = await EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModule(createUserModule())
				.build();

			// Can check if handlers are registered
			expect(app.commandBus.hasHandler('CreateUser')).toBe(true);
			expect(app.commandBus.hasHandler('NonExistent')).toBe(false);

			await app.shutdown();
		});

		test('provides access to event bus for custom subscriptions', async () => {
			const app = await EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModule(createUserModule())
				.build();

			// Can add custom subscriptions after build
			let customHandlerCalled = false;
			app.eventBus.subscribe('UserCreated', async () => {
				customHandlerCalled = true;
			});

			await app.command({
				commandName: 'CreateUser',
				userId: 'user-1',
				name: 'Alice',
				email: 'alice@example.com'
			} as CreateUserCommand);

			expect(customHandlerCalled).toBe(true);

			await app.shutdown();
		});
	});

	describe('Error Handling', () => {
		test('command errors propagate to caller', async () => {
			const app = await EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModule(createUserModule())
				.build();

			await expect(
				app.command({ commandName: 'NonExistentCommand' })
			).rejects.toThrow('No handler registered for command');

			await app.shutdown();
		});

		test('query errors propagate to caller', async () => {
			const app = await EventFlows.create()
				.withEventStore(eventStore)
				.withEventBus(eventBus)
				.withModule(createUserModule())
				.build();

			await expect(
				app.query({ queryName: 'NonExistentQuery' })
			).rejects.toThrow('No handler registered for query');

			await app.shutdown();
		});
	});
});
