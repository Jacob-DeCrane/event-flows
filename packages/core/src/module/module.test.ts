import { describe, test, expect } from 'bun:test';
import type {
	EventFlowsModule,
	ModuleContext,
	ModuleRegistration,
	CommandHandlerRegistration,
	QueryHandlerRegistration,
	ProjectionRegistration,
	EventHandlerRegistration
} from './interfaces';
import type { IEventBus, ICommandHandler, IQueryHandler, EventHandler } from '../interfaces';
import type { EventStore } from '../event-store';

// Mock implementations for testing interface compatibility
const mockEventStore = {} as EventStore;
const mockEventBus = {} as IEventBus;

const mockCommandHandler: ICommandHandler = {
	execute: async () => ({ success: true })
};

const mockQueryHandler: IQueryHandler = {
	execute: async () => ({ data: 'test' })
};

const mockEventHandler: EventHandler = async () => {
	// Handle event
};

describe('Module Interfaces', () => {
	describe('ModuleContext', () => {
		test('provides event store and event bus', () => {
			const context: ModuleContext = {
				eventStore: mockEventStore,
				eventBus: mockEventBus
			};

			expect(context.eventStore).toBe(mockEventStore);
			expect(context.eventBus).toBe(mockEventBus);
		});
	});

	describe('CommandHandlerRegistration', () => {
		test('registers a command handler with command name', () => {
			const registration: CommandHandlerRegistration = {
				commandName: 'CreateUser',
				handler: mockCommandHandler
			};

			expect(registration.commandName).toBe('CreateUser');
			expect(registration.handler).toBe(mockCommandHandler);
		});
	});

	describe('QueryHandlerRegistration', () => {
		test('registers a query handler with query name', () => {
			const registration: QueryHandlerRegistration = {
				queryName: 'GetUserById',
				handler: mockQueryHandler
			};

			expect(registration.queryName).toBe('GetUserById');
			expect(registration.handler).toBe(mockQueryHandler);
		});
	});

	describe('ProjectionRegistration', () => {
		test('registers a projection with name and handlers', () => {
			const registration: ProjectionRegistration = {
				name: 'UserListProjection',
				handlers: {
					UserCreated: mockEventHandler,
					UserUpdated: mockEventHandler
				}
			};

			expect(registration.name).toBe('UserListProjection');
			expect(registration.handlers.UserCreated).toBe(mockEventHandler);
			expect(registration.handlers.UserUpdated).toBe(mockEventHandler);
		});

		test('supports optional retry configuration', () => {
			const registration: ProjectionRegistration = {
				name: 'UserListProjection',
				handlers: {
					UserCreated: mockEventHandler
				},
				retry: {
					maxAttempts: 5
				}
			};

			expect(registration.retry?.maxAttempts).toBe(5);
		});

		test('retry config is optional', () => {
			const registration: ProjectionRegistration = {
				name: 'UserListProjection',
				handlers: {}
			};

			expect(registration.retry).toBeUndefined();
		});
	});

	describe('EventHandlerRegistration', () => {
		test('registers an event handler for cross-context events', () => {
			const registration: EventHandlerRegistration = {
				eventType: 'OrderPlaced',
				handler: mockEventHandler
			};

			expect(registration.eventType).toBe('OrderPlaced');
			expect(registration.handler).toBe(mockEventHandler);
		});

		test('supports optional fromContext filter', () => {
			const registration: EventHandlerRegistration = {
				eventType: 'OrderPlaced',
				handler: mockEventHandler,
				fromContext: 'orders'
			};

			expect(registration.fromContext).toBe('orders');
		});
	});

	describe('ModuleRegistration', () => {
		test('contains all handler registrations', () => {
			const registration: ModuleRegistration = {
				commandHandlers: [
					{ commandName: 'CreateUser', handler: mockCommandHandler }
				],
				queryHandlers: [
					{ queryName: 'GetUserById', handler: mockQueryHandler }
				],
				projections: [
					{ name: 'UserListProjection', handlers: { UserCreated: mockEventHandler } }
				]
			};

			expect(registration.commandHandlers).toHaveLength(1);
			expect(registration.queryHandlers).toHaveLength(1);
			expect(registration.projections).toHaveLength(1);
		});

		test('event handlers are optional', () => {
			const registration: ModuleRegistration = {
				commandHandlers: [],
				queryHandlers: [],
				projections: []
			};

			expect(registration.eventHandlers).toBeUndefined();
		});

		test('supports optional event handlers for cross-context communication', () => {
			const registration: ModuleRegistration = {
				commandHandlers: [],
				queryHandlers: [],
				projections: [],
				eventHandlers: [
					{ eventType: 'OrderPlaced', handler: mockEventHandler }
				]
			};

			expect(registration.eventHandlers).toHaveLength(1);
		});
	});

	describe('EventFlowsModule', () => {
		test('defines a module with name and sync register function', async () => {
			const userModule: EventFlowsModule = {
				name: 'users',
				register: (context: ModuleContext): ModuleRegistration => {
					expect(context.eventStore).toBeDefined();
					expect(context.eventBus).toBeDefined();
					return {
						commandHandlers: [],
						queryHandlers: [],
						projections: []
					};
				}
			};

			expect(userModule.name).toBe('users');

			// await works for both sync and async register functions
			const result = await userModule.register({
				eventStore: mockEventStore,
				eventBus: mockEventBus
			});

			expect(result.commandHandlers).toEqual([]);
		});

		test('defines a module with async register function', async () => {
			const userModule: EventFlowsModule = {
				name: 'users',
				register: async (context: ModuleContext): Promise<ModuleRegistration> => {
					// Simulate async initialization
					await Promise.resolve();
					return {
						commandHandlers: [
							{ commandName: 'CreateUser', handler: mockCommandHandler }
						],
						queryHandlers: [],
						projections: []
					};
				}
			};

			const result = await userModule.register({
				eventStore: mockEventStore,
				eventBus: mockEventBus
			});

			expect(result.commandHandlers).toHaveLength(1);
		});

		test('supports optional bounded context', () => {
			const userModule: EventFlowsModule = {
				name: 'users',
				boundedContext: 'identity',
				register: (): ModuleRegistration => ({
					commandHandlers: [],
					queryHandlers: [],
					projections: []
				})
			};

			expect(userModule.boundedContext).toBe('identity');
		});

		test('bounded context is optional', () => {
			const userModule: EventFlowsModule = {
				name: 'users',
				register: (): ModuleRegistration => ({
					commandHandlers: [],
					queryHandlers: [],
					projections: []
				})
			};

			expect(userModule.boundedContext).toBeUndefined();
		});

		test('module name should be lowercase and hyphen-separated', () => {
			const validModules: EventFlowsModule[] = [
				{
					name: 'users',
					register: () => ({ commandHandlers: [], queryHandlers: [], projections: [] })
				},
				{
					name: 'user-management',
					register: () => ({ commandHandlers: [], queryHandlers: [], projections: [] })
				},
				{
					name: 'order-processing-v2',
					register: () => ({ commandHandlers: [], queryHandlers: [], projections: [] })
				}
			];

			validModules.forEach(module => {
				// Module names should follow the convention: lowercase, hyphen-separated
				expect(module.name).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
			});
		});
	});

	describe('Full Module Example', () => {
		test('creates a complete module with all registration types', async () => {
			const inventoryModule: EventFlowsModule = {
				name: 'inventory',
				boundedContext: 'warehouse',
				register: async (context: ModuleContext): Promise<ModuleRegistration> => {
					// In a real module, you would use context.eventStore and context.eventBus
					// to set up handlers with access to infrastructure
					expect(context.eventStore).toBeDefined();
					expect(context.eventBus).toBeDefined();

					return {
						commandHandlers: [
							{ commandName: 'AddProduct', handler: mockCommandHandler },
							{ commandName: 'RemoveProduct', handler: mockCommandHandler }
						],
						queryHandlers: [
							{ queryName: 'GetProductById', handler: mockQueryHandler },
							{ queryName: 'ListProducts', handler: mockQueryHandler }
						],
						projections: [
							{
								name: 'ProductCatalog',
								handlers: {
									ProductAdded: mockEventHandler,
									ProductRemoved: mockEventHandler,
									ProductUpdated: mockEventHandler
								},
								retry: { maxAttempts: 3 }
							}
						],
						eventHandlers: [
							{
								eventType: 'OrderShipped',
								handler: mockEventHandler,
								fromContext: 'orders'
							}
						]
					};
				}
			};

			const context: ModuleContext = {
				eventStore: mockEventStore,
				eventBus: mockEventBus
			};

			const registration = await inventoryModule.register(context);

			expect(inventoryModule.name).toBe('inventory');
			expect(inventoryModule.boundedContext).toBe('warehouse');
			expect(registration.commandHandlers).toHaveLength(2);
			expect(registration.queryHandlers).toHaveLength(2);
			expect(registration.projections).toHaveLength(1);
			expect(registration.eventHandlers).toHaveLength(1);
		});
	});
});
