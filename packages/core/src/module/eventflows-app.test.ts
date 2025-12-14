import { describe, test, expect, beforeEach } from 'bun:test';
import { EventFlowsApp, type EventFlowsAppConfig } from './eventflows-app';
import { CommandBus } from '../command-bus';
import { QueryBus } from '../query-bus';
import { InMemoryEventBus } from '../integrations/in-memory-event-bus';
import { EventStore } from '../event-store';
import { EventEnvelope } from '../models/event-envelope';
import type { ICommand, IQuery, ICommandHandler, IQueryHandler, IEvent, IEventCollection } from '../interfaces';

// Test event store
class TestEventStore extends EventStore<{ debug?: boolean }> {
	public disconnectCalled = false;

	async connect(): Promise<void> {}

	async disconnect(): Promise<void> {
		this.disconnectCalled = true;
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

// Test commands
interface CreateUserCommand extends ICommand {
	commandName: 'CreateUser';
	userId: string;
	name: string;
}

interface DeleteUserCommand extends ICommand {
	commandName: 'DeleteUser';
	userId: string;
}

// Test queries
interface GetUserByIdQuery extends IQuery {
	queryName: 'GetUserById';
	userId: string;
}

interface ListUsersQuery extends IQuery {
	queryName: 'ListUsers';
	limit?: number;
}

// Test handlers
class CreateUserHandler implements ICommandHandler<CreateUserCommand, { id: string }> {
	async execute(command: CreateUserCommand): Promise<{ id: string }> {
		return { id: command.userId };
	}
}

class DeleteUserHandler implements ICommandHandler<DeleteUserCommand, void> {
	async execute(): Promise<void> {
		// Delete user
	}
}

class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery, { id: string; name: string } | null> {
	private users = new Map([['user-1', { id: 'user-1', name: 'Alice' }]]);

	async execute(query: GetUserByIdQuery): Promise<{ id: string; name: string } | null> {
		return this.users.get(query.userId) || null;
	}
}

class ListUsersHandler implements IQueryHandler<ListUsersQuery, Array<{ id: string; name: string }>> {
	async execute(query: ListUsersQuery): Promise<Array<{ id: string; name: string }>> {
		const users = [
			{ id: 'user-1', name: 'Alice' },
			{ id: 'user-2', name: 'Bob' }
		];
		return query.limit ? users.slice(0, query.limit) : users;
	}
}

describe('EventFlowsApp', () => {
	let eventStore: TestEventStore;
	let eventBus: InMemoryEventBus;
	let commandBus: CommandBus;
	let queryBus: QueryBus;
	let app: EventFlowsApp;

	beforeEach(() => {
		eventStore = new TestEventStore({ debug: false });
		eventBus = new InMemoryEventBus({ debug: false });
		commandBus = new CommandBus();
		queryBus = new QueryBus();

		// Register handlers
		commandBus.register('CreateUser', new CreateUserHandler());
		commandBus.register('DeleteUser', new DeleteUserHandler());
		queryBus.register('GetUserById', new GetUserByIdHandler());
		queryBus.register('ListUsers', new ListUsersHandler());

		const config: EventFlowsAppConfig = {
			eventStore,
			eventBus,
			commandBus,
			queryBus,
			modules: ['users', 'orders']
		};

		app = new EventFlowsApp(config);
	});

	describe('command()', () => {
		test('executes a command and returns the result', async () => {
			const command: CreateUserCommand = {
				commandName: 'CreateUser',
				userId: 'user-123',
				name: 'Alice'
			};

			const result = await app.command<{ id: string }>(command);

			expect(result.id).toBe('user-123');
		});

		test('executes a command with void result', async () => {
			const command: DeleteUserCommand = {
				commandName: 'DeleteUser',
				userId: 'user-123'
			};

			// Should not throw
			await app.command(command);
		});

		test('throws error for unregistered command', async () => {
			const command: ICommand = {
				commandName: 'UnknownCommand'
			};

			await expect(app.command(command)).rejects.toThrow('No handler registered for command: UnknownCommand');
		});
	});

	describe('query()', () => {
		test('executes a query and returns the result', async () => {
			const query: GetUserByIdQuery = {
				queryName: 'GetUserById',
				userId: 'user-1'
			};

			const result = await app.query<{ id: string; name: string } | null>(query);

			expect(result).not.toBeNull();
			expect(result?.id).toBe('user-1');
			expect(result?.name).toBe('Alice');
		});

		test('returns null for non-existent entity', async () => {
			const query: GetUserByIdQuery = {
				queryName: 'GetUserById',
				userId: 'non-existent'
			};

			const result = await app.query<{ id: string; name: string } | null>(query);

			expect(result).toBeNull();
		});

		test('executes a query with parameters', async () => {
			const query: ListUsersQuery = {
				queryName: 'ListUsers',
				limit: 1
			};

			const result = await app.query<Array<{ id: string; name: string }>>(query);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('user-1');
		});

		test('throws error for unregistered query', async () => {
			const query: IQuery = {
				queryName: 'UnknownQuery'
			};

			await expect(app.query(query)).rejects.toThrow('No handler registered for query: UnknownQuery');
		});
	});

	describe('Introspection', () => {
		describe('getModules()', () => {
			test('returns all registered module names', () => {
				const modules = app.getModules();

				expect(modules).toHaveLength(2);
				expect(modules).toContain('users');
				expect(modules).toContain('orders');
			});

			test('returns a copy of the modules array', () => {
				const modules1 = app.getModules();
				const modules2 = app.getModules();

				expect(modules1).not.toBe(modules2);
				expect(modules1).toEqual(modules2);
			});

			test('modifications to returned array do not affect app state', () => {
				const modules = app.getModules();
				modules.push('modified');

				expect(app.getModules()).toHaveLength(2);
			});
		});

		describe('getCommands()', () => {
			test('returns all registered command names', () => {
				const commands = app.getCommands();

				expect(commands).toHaveLength(2);
				expect(commands).toContain('CreateUser');
				expect(commands).toContain('DeleteUser');
			});
		});

		describe('getQueries()', () => {
			test('returns all registered query names', () => {
				const queries = app.getQueries();

				expect(queries).toHaveLength(2);
				expect(queries).toContain('GetUserById');
				expect(queries).toContain('ListUsers');
			});
		});
	});

	describe('shutdown()', () => {
		test('disconnects the event store', async () => {
			expect(eventStore.disconnectCalled).toBe(false);

			await app.shutdown();

			expect(eventStore.disconnectCalled).toBe(true);
		});

		test('can be called multiple times without error', async () => {
			await app.shutdown();
			await app.shutdown();

			expect(eventStore.disconnectCalled).toBe(true);
		});
	});

	describe('Readonly Properties', () => {
		test('eventStore property returns the configured event store', () => {
			expect(app.eventStore).toBe(eventStore);
		});

		test('eventBus property returns the configured event bus', () => {
			expect(app.eventBus).toBe(eventBus);
		});

		test('commandBus property returns the internal command bus', () => {
			expect(app.commandBus).toBe(commandBus);
		});

		test('queryBus property returns the internal query bus', () => {
			expect(app.queryBus).toBe(queryBus);
		});

		test('properties allow advanced usage patterns', async () => {
			// Direct command bus access for inspection
			expect(app.commandBus.hasHandler('CreateUser')).toBe(true);

			// Direct query bus access for inspection
			expect(app.queryBus.hasHandler('GetUserById')).toBe(true);

			// Direct event bus access for custom subscriptions
			let eventReceived = false;
			app.eventBus.subscribe('TestEvent', () => {
				eventReceived = true;
			});

			await app.eventBus.publish(
				EventEnvelope.create('TestEvent', { data: 'test' }, {
					aggregateId: 'test-1',
					version: 1
				})
			);

			expect(eventReceived).toBe(true);
		});
	});

	describe('Empty App', () => {
		test('works with no modules registered', () => {
			const emptyApp = new EventFlowsApp({
				eventStore,
				eventBus,
				commandBus: new CommandBus(),
				queryBus: new QueryBus(),
				modules: []
			});

			expect(emptyApp.getModules()).toEqual([]);
			expect(emptyApp.getCommands()).toEqual([]);
			expect(emptyApp.getQueries()).toEqual([]);
		});
	});
});
