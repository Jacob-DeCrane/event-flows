/**
 * Tests for createEventFlowsApp() function.
 *
 * These tests verify that the application factory:
 * - Creates apps with single and multiple modules
 * - Executes commands via namespaced API
 * - Executes queries via namespaced API
 * - Subscribes event handlers correctly
 * - Wires event store publisher to event bus
 * - Detects duplicate command handler names
 * - Detects duplicate query handler names
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { createEventFlowsApp } from './create-app';
import { createModule } from './create-module';
import { ModuleRegistrationError } from './errors';
import { InMemoryEventBus } from '../integrations/in-memory-event-bus';
import type { ICommand, ICommandHandler, IQuery, IQueryHandler, EventHandler } from '../interfaces';
import type { EventStore } from '../event-store';
import type { EventEnvelope } from '../models';

// =============================================================================
// Test Fixtures: Commands, Queries, and Handlers
// =============================================================================

interface CreateUserCommand extends ICommand {
	commandName: 'CreateUser';
	userId: string;
	name: string;
}

interface UpdateUserCommand extends ICommand {
	commandName: 'UpdateUser';
	userId: string;
	name: string;
}

interface GetUserQuery extends IQuery {
	queryName: 'GetUser';
	userId: string;
}

interface ListUsersQuery extends IQuery {
	queryName: 'ListUsers';
	limit: number;
}

interface CreateOrderCommand extends ICommand {
	commandName: 'CreateOrder';
	orderId: string;
	userId: string;
}

interface GetOrderQuery extends IQuery {
	queryName: 'GetOrder';
	orderId: string;
}

class CreateUserHandler implements ICommandHandler<CreateUserCommand, { id: string }> {
	async execute(command: CreateUserCommand): Promise<{ id: string }> {
		return { id: command.userId };
	}
}

class UpdateUserHandler implements ICommandHandler<UpdateUserCommand, void> {
	async execute(): Promise<void> {
		// No-op for testing
	}
}

class GetUserHandler implements IQueryHandler<GetUserQuery, { id: string; name: string }> {
	async execute(query: GetUserQuery): Promise<{ id: string; name: string }> {
		return { id: query.userId, name: 'Test User' };
	}
}

class ListUsersHandler implements IQueryHandler<ListUsersQuery, Array<{ id: string }>> {
	async execute(query: ListUsersQuery): Promise<Array<{ id: string }>> {
		return Array(query.limit).fill({ id: 'user-1' });
	}
}

class CreateOrderHandler implements ICommandHandler<CreateOrderCommand, { orderId: string }> {
	async execute(command: CreateOrderCommand): Promise<{ orderId: string }> {
		return { orderId: command.orderId };
	}
}

class GetOrderHandler implements IQueryHandler<GetOrderQuery, { orderId: string; status: string }> {
	async execute(query: GetOrderQuery): Promise<{ orderId: string; status: string }> {
		return { orderId: query.orderId, status: 'pending' };
	}
}

// =============================================================================
// Mock EventStore for Testing
// =============================================================================

type MockEventStore = EventStore & { _getPublisher: () => ((envelope: EventEnvelope) => void) | undefined };

function createMockEventStore(): MockEventStore {
	let publisherFn: ((envelope: EventEnvelope) => void) | undefined;

	return {
		setPublisher: (fn: (envelope: EventEnvelope) => void) => {
			publisherFn = fn;
		},
		// Expose for testing
		_getPublisher: () => publisherFn,
		// Minimal implementation for interface compliance
		connect: async () => {},
		disconnect: async () => {},
		ensureCollection: async () => 'test-collection',
		listCollections: async function* () {},
		getEvent: async () => ({ type: 'test', payload: {} }),
		getEvents: async function* () {},
		appendEvents: async () => [],
		getAllEnvelopes: async function* () {},
	} as unknown as MockEventStore;
}

// =============================================================================
// Test 1: App creation with single module
// =============================================================================

describe('createEventFlowsApp()', () => {
	let eventBus: InMemoryEventBus;
	let eventStore: MockEventStore;

	beforeEach(() => {
		eventBus = new InMemoryEventBus({});
		eventStore = createMockEventStore();
	});

	test('creates app with single module', () => {
		const userModule = createModule({
			name: 'users',
			setup: () => ({
				commandHandlers: {
					CreateUser: new CreateUserHandler(),
				},
				queryHandlers: {
					GetUser: new GetUserHandler(),
				},
			}),
		});

		const app = createEventFlowsApp({
			eventStore,
			eventBus,
			modules: [userModule] as const,
		});

		expect(app).toBeDefined();
		expect(app.commands).toBeDefined();
		expect(app.queries).toBeDefined();
		expect(app.commandBus).toBeDefined();
		expect(app.queryBus).toBeDefined();
		expect(app.eventBus).toBe(eventBus);
		expect(app.eventStore).toBe(eventStore);

		// Verify handlers are registered
		expect(app.commandBus.hasHandler('CreateUser')).toBe(true);
		expect(app.queryBus.hasHandler('GetUser')).toBe(true);
	});

	// =============================================================================
	// Test 2: App creation with multiple modules
	// =============================================================================

	test('creates app with multiple modules', () => {
		const userModule = createModule({
			name: 'users',
			setup: () => ({
				commandHandlers: {
					CreateUser: new CreateUserHandler(),
					UpdateUser: new UpdateUserHandler(),
				},
				queryHandlers: {
					GetUser: new GetUserHandler(),
				},
			}),
		});

		const orderModule = createModule({
			name: 'orders',
			setup: () => ({
				commandHandlers: {
					CreateOrder: new CreateOrderHandler(),
				},
				queryHandlers: {
					GetOrder: new GetOrderHandler(),
				},
			}),
		});

		const app = createEventFlowsApp({
			eventStore,
			eventBus,
			modules: [userModule, orderModule] as const,
		});

		// Verify all command handlers registered
		expect(app.commandBus.hasHandler('CreateUser')).toBe(true);
		expect(app.commandBus.hasHandler('UpdateUser')).toBe(true);
		expect(app.commandBus.hasHandler('CreateOrder')).toBe(true);

		// Verify all query handlers registered
		expect(app.queryBus.hasHandler('GetUser')).toBe(true);
		expect(app.queryBus.hasHandler('GetOrder')).toBe(true);
	});

	// =============================================================================
	// Test 3: Command execution via namespaced API
	// =============================================================================

	test('executes commands via namespaced API', async () => {
		const userModule = createModule({
			name: 'users',
			setup: () => ({
				commandHandlers: {
					CreateUser: new CreateUserHandler(),
				},
			}),
		});

		const app = createEventFlowsApp({
			eventStore,
			eventBus,
			modules: [userModule] as const,
		});
		
		const result = await app.commands.CreateUser({ userId: 'user-123', name: 'John Doe' });

		expect(result).toEqual({ id: 'user-123' });
	});

	// =============================================================================
	// Test 4: Query execution via namespaced API
	// =============================================================================

	test('executes queries via namespaced API', async () => {
		const userModule = createModule({
			name: 'users',
			setup: () => ({
				queryHandlers: {
					GetUser: new GetUserHandler(),
					ListUsers: new ListUsersHandler(),
				},
			}),
		});

		const app = createEventFlowsApp({
			eventStore,
			eventBus,
			modules: [userModule] as const,
		});
		const user = await app.queries.GetUser({ userId: 'user-456' });
		expect(user).toEqual({ id: 'user-456', name: 'Test User' });

		const users = await app.queries.ListUsers({ limit: 3 });
		expect(users).toHaveLength(3);
	});

	// =============================================================================
	// Test 5: Event handler subscription
	// =============================================================================

	test('subscribes event handlers from modules', async () => {
		const handlerCalled = mock((_envelope: EventEnvelope) => {});

		const eventHandler: EventHandler = (envelope) => {
			handlerCalled(envelope);
		};

		const userModule = createModule({
			name: 'users',
			setup: () => ({
				eventHandlers: {
					UserCreated: [eventHandler],
				},
			}),
		});

		createEventFlowsApp({
			eventStore,
			eventBus,
			modules: [userModule] as const,
		});

		// Verify event handler is subscribed
		expect(eventBus.getSubscriberCount('UserCreated')).toBe(1);

		// Simulate publishing an event
		const mockEnvelope = {
			event: 'UserCreated',
			payload: { userId: 'user-123' },
		} as EventEnvelope;

		await eventBus.publish(mockEnvelope);

		expect(handlerCalled).toHaveBeenCalledTimes(1);
		expect(handlerCalled).toHaveBeenCalledWith(mockEnvelope);
	});

	// =============================================================================
	// Test 6: Event store publisher wiring
	// =============================================================================

	test('wires event store publisher to event bus', async () => {
		const userModule = createModule({
			name: 'users',
			setup: () => ({
				commandHandlers: {},
			}),
		});

		createEventFlowsApp({
			eventStore,
			eventBus,
			modules: [userModule] as const,
		});

		// Verify publisher was set
		const publisher = eventStore._getPublisher();
		expect(publisher).toBeDefined();

		// Verify publisher forwards to event bus
		const eventBusPublishSpy = mock(() => Promise.resolve());
		eventBus.publish = eventBusPublishSpy;

		const mockEnvelope = {
			event: 'TestEvent',
			payload: { data: 'test' },
		} as EventEnvelope;

		await publisher!(mockEnvelope);

		expect(eventBusPublishSpy).toHaveBeenCalledTimes(1);
		expect(eventBusPublishSpy).toHaveBeenCalledWith(mockEnvelope);
	});

	// =============================================================================
	// Test 7: Duplicate command name detection
	// =============================================================================

	test('throws ModuleRegistrationError on duplicate command handler names', () => {
		const module1 = createModule({
			name: 'module-a',
			setup: () => ({
				commandHandlers: {
					CreateUser: new CreateUserHandler(),
				},
			}),
		});

		const module2 = createModule({
			name: 'module-b',
			setup: () => ({
				commandHandlers: {
					CreateUser: new CreateUserHandler(), // Duplicate!
				},
			}),
		});

		expect(() =>
			createEventFlowsApp({
				eventStore,
				eventBus,
				modules: [module1, module2] as const,
			})
		).toThrow(ModuleRegistrationError);

		try {
			createEventFlowsApp({
				eventStore: createMockEventStore(),
				eventBus: new InMemoryEventBus({}),
				modules: [module1, module2] as const,
			});
		} catch (error) {
			expect(error).toBeInstanceOf(ModuleRegistrationError);
			const regError = error as ModuleRegistrationError;
			expect(regError.handlerType).toBe('command');
			expect(regError.handlerName).toBe('CreateUser');
			expect(regError.existingModuleName).toBe('module-a');
			expect(regError.conflictingModuleName).toBe('module-b');
		}
	});

	// =============================================================================
	// Test 8: Duplicate query name detection
	// =============================================================================

	test('throws ModuleRegistrationError on duplicate query handler names', () => {
		const module1 = createModule({
			name: 'module-a',
			setup: () => ({
				queryHandlers: {
					GetUser: new GetUserHandler(),
				},
			}),
		});

		const module2 = createModule({
			name: 'module-b',
			setup: () => ({
				queryHandlers: {
					GetUser: new GetUserHandler(), // Duplicate!
				},
			}),
		});

		expect(() =>
			createEventFlowsApp({
				eventStore,
				eventBus,
				modules: [module1, module2] as const,
			})
		).toThrow(ModuleRegistrationError);

		try {
			createEventFlowsApp({
				eventStore: createMockEventStore(),
				eventBus: new InMemoryEventBus({}),
				modules: [module1, module2] as const,
			});
		} catch (error) {
			expect(error).toBeInstanceOf(ModuleRegistrationError);
			const regError = error as ModuleRegistrationError;
			expect(regError.handlerType).toBe('query');
			expect(regError.handlerName).toBe('GetUser');
			expect(regError.existingModuleName).toBe('module-a');
			expect(regError.conflictingModuleName).toBe('module-b');
		}
	});
});
