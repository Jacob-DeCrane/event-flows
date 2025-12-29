// @ts-nocheck
/**
 * Tests for createModule() function.
 *
 * These tests verify that the module factory:
 * - Creates modules with command, query, and event handlers via setup function
 * - Preserves type information for handler maps
 * - Returns frozen (immutable) module factories
 * - Validates module configuration at runtime
 * - Properly initializes handlers when setup is called with dependencies
 */

import { describe, test, expect } from 'bun:test';
import { createModule } from './create-module';
import type { ICommand, ICommandHandler, IQuery, IQueryHandler, EventHandler } from '../interfaces';
import type { EventEnvelope } from '../models';
import type { EventStore } from '../event-store';
import type { EventBus } from '../event-bus';
import type { Equal, Expect, ModuleDependencies } from './types';

// =============================================================================
// Test Fixtures: Commands, Queries, and Handlers
// =============================================================================

interface CreateAccountCommand extends ICommand {
	commandName: 'CreateAccount';
	accountId: string;
	initialBalance: number;
}

interface DepositMoneyCommand extends ICommand {
	commandName: 'DepositMoney';
	accountId: string;
	amount: number;
}

interface GetAccountBalanceQuery extends IQuery {
	queryName: 'GetAccountBalance';
	accountId: string;
}

interface GetAccountDetailsQuery extends IQuery {
	queryName: 'GetAccountDetails';
	accountId: string;
}

class CreateAccountHandler implements ICommandHandler<CreateAccountCommand, { id: string }> {
	async execute(command: CreateAccountCommand): Promise<{ id: string }> {
		return { id: command.accountId };
	}
}

class DepositMoneyHandler implements ICommandHandler<DepositMoneyCommand, void> {
	async execute(): Promise<void> {
		// No-op for testing
	}
}

class GetAccountBalanceHandler implements IQueryHandler<GetAccountBalanceQuery, number> {
	async execute(): Promise<number> {
		return 1000;
	}
}

class GetAccountDetailsHandler implements IQueryHandler<GetAccountDetailsQuery, { id: string; balance: number }> {
	async execute(query: GetAccountDetailsQuery): Promise<{ id: string; balance: number }> {
		return { id: query.accountId, balance: 1000 };
	}
}

// Mock dependencies for testing
const createMockDeps = (): ModuleDependencies => ({
	eventStore: {} as EventStore,
	eventBus: {} as EventBus,
});

// =============================================================================
// Test 1: Module factory creation with command handlers
// =============================================================================

describe('createModule()', () => {
	test('creates module factory with command handlers', () => {
		const module = createModule({
			name: 'accounts',
			setup: () => ({
				commandHandlers: {
					CreateAccount: new CreateAccountHandler(),
					DepositMoney: new DepositMoneyHandler(),
				},
			}),
		});

		expect(module.name).toBe('accounts');
		expect(typeof module.setup).toBe('function');

		// Test that setup() works when called with dependencies
		const mockDeps = createMockDeps();
		const initialized = module.setup(mockDeps);

		expect(initialized.name).toBe('accounts');
		expect(initialized.commandHandlers.CreateAccount).toBeInstanceOf(CreateAccountHandler);
		expect(initialized.commandHandlers.DepositMoney).toBeInstanceOf(DepositMoneyHandler);
		expect(initialized.queryHandlers).toEqual({});
		expect(initialized.eventHandlers).toEqual({});
	});

	// =============================================================================
	// Test 2: Module factory creation with query handlers
	// =============================================================================

	test('creates module factory with query handlers', () => {
		const module = createModule({
			name: 'accounts',
			setup: () => ({
				queryHandlers: {
					GetAccountBalance: new GetAccountBalanceHandler(),
					GetAccountDetails: new GetAccountDetailsHandler(),
				},
			}),
		});

		expect(module.name).toBe('accounts');
		expect(typeof module.setup).toBe('function');

		// Test that setup() works when called with dependencies
		const mockDeps = createMockDeps();
		const initialized = module.setup(mockDeps);

		expect(initialized.name).toBe('accounts');
		expect(initialized.queryHandlers.GetAccountBalance).toBeInstanceOf(GetAccountBalanceHandler);
		expect(initialized.queryHandlers.GetAccountDetails).toBeInstanceOf(GetAccountDetailsHandler);
		expect(initialized.commandHandlers).toEqual({});
		expect(initialized.eventHandlers).toEqual({});
	});

	// =============================================================================
	// Test 3: Module factory creation with event handlers
	// =============================================================================

	test('creates module factory with event handlers', () => {
		const accountCreatedHandler: EventHandler = (_envelope: EventEnvelope) => {
			// Log event for testing
		};
		const accountUpdatedHandler: EventHandler = async (_envelope: EventEnvelope) => {
			// Async handler for testing
		};

		const module = createModule({
			name: 'accounts',
			setup: () => ({
				eventHandlers: {
					AccountCreated: [accountCreatedHandler],
					AccountUpdated: [accountUpdatedHandler],
				},
			}),
		});

		expect(module.name).toBe('accounts');
		expect(typeof module.setup).toBe('function');

		// Test that setup() works when called with dependencies
		const mockDeps = createMockDeps();
		const initialized = module.setup(mockDeps);

		expect(initialized.name).toBe('accounts');
		expect(initialized.eventHandlers.AccountCreated).toContain(accountCreatedHandler);
		expect(initialized.eventHandlers.AccountUpdated).toContain(accountUpdatedHandler);
		expect(initialized.commandHandlers).toEqual({});
		expect(initialized.queryHandlers).toEqual({});
	});

	// =============================================================================
	// Test 4: Module factory creation with all handler types combined
	// =============================================================================

	test('creates module factory with all handler types combined', () => {
		const eventHandler: EventHandler = () => {};

		const module = createModule({
			name: 'full-module',
			setup: () => ({
				commandHandlers: {
					CreateAccount: new CreateAccountHandler(),
				},
				queryHandlers: {
					GetAccountBalance: new GetAccountBalanceHandler(),
				},
				eventHandlers: {
					AccountCreated: [eventHandler],
				},
			}),
		});

		expect(module.name).toBe('full-module');
		expect(typeof module.setup).toBe('function');

		// Test that setup() works when called with dependencies
		const mockDeps = createMockDeps();
		const initialized = module.setup(mockDeps);

		expect(initialized.name).toBe('full-module');
		expect(initialized.commandHandlers.CreateAccount).toBeInstanceOf(CreateAccountHandler);
		expect(initialized.queryHandlers.GetAccountBalance).toBeInstanceOf(GetAccountBalanceHandler);
		expect(initialized.eventHandlers.AccountCreated).toContain(eventHandler);
	});

	// =============================================================================
	// Test 5: Type preservation (name as literal type)
	// =============================================================================

	test('preserves module name as string literal type', () => {
		const module = createModule({
			name: 'typed-module' as const,
			setup: () => ({
				commandHandlers: {},
				queryHandlers: {},
				eventHandlers: {},
			}),
		});

		// Runtime check
		expect(module.name).toBe('typed-module');

		// Type-level assertion: name should be literal 'typed-module', not just 'string'
		type ModuleName = typeof module.name;
		type _Test = Expect<Equal<ModuleName, 'typed-module'>>;
	});

	// =============================================================================
	// Test 6: Module factory is frozen (immutable)
	// =============================================================================

	test('returns frozen module factory object', () => {
		const module = createModule({
			name: 'frozen-module',
			setup: () => ({
				commandHandlers: {},
			}),
		});

		expect(Object.isFrozen(module)).toBe(true);
	});

	// =============================================================================
	// Test 7: Module definition from setup() is frozen
	// =============================================================================

	test('returns frozen module definition from setup()', () => {
		const module = createModule({
			name: 'frozen-module',
			setup: () => ({
				commandHandlers: {},
			}),
		});

		const mockDeps = createMockDeps();
		const initialized = module.setup(mockDeps);

		expect(Object.isFrozen(initialized)).toBe(true);
	});

	// =============================================================================
	// Test 8: Validates module name is non-empty
	// =============================================================================

	test('throws error when module name is empty', () => {
		expect(() =>
			createModule({
				name: '',
				setup: () => ({
					commandHandlers: {},
				}),
			})
		).toThrow('Module name must be a non-empty string');
	});

	test('throws error when module name is whitespace only', () => {
		expect(() =>
			createModule({
				name: '   ',
				setup: () => ({
					commandHandlers: {},
				}),
			})
		).toThrow('Module name must be a non-empty string');
	});

	// =============================================================================
	// Test 9: Setup function receives dependencies
	// =============================================================================

	test('setup function receives eventStore and eventBus dependencies', () => {
		let receivedDeps: ModuleDependencies | null = null;

		const module = createModule({
			name: 'dependency-test',
			setup: (deps) => {
				receivedDeps = deps;
				return {
					commandHandlers: {},
				};
			},
		});

		const mockDeps = createMockDeps();
		module.setup(mockDeps);

		expect(receivedDeps).not.toBeNull();
		expect(receivedDeps!.eventStore).toBe(mockDeps.eventStore);
		expect(receivedDeps!.eventBus).toBe(mockDeps.eventBus);
	});

	// =============================================================================
	// Test 10: Setup can use dependencies to create handlers
	// =============================================================================

	test('setup can use dependencies to create handlers with injected dependencies', () => {
		// Handler that requires eventStore in its constructor
		class HandlerWithDependency implements ICommandHandler<CreateAccountCommand, { id: string }> {
			constructor(private readonly eventStore: EventStore) {}

			async execute(command: CreateAccountCommand): Promise<{ id: string }> {
				// In real usage, would use this.eventStore
				return { id: command.accountId };
			}

			getEventStore(): EventStore {
				return this.eventStore;
			}
		}

		const module = createModule({
			name: 'di-module',
			setup: ({ eventStore }) => ({
				commandHandlers: {
					CreateAccount: new HandlerWithDependency(eventStore),
				},
			}),
		});

		const mockDeps = createMockDeps();
		const initialized = module.setup(mockDeps);

		const handler = initialized.commandHandlers.CreateAccount as HandlerWithDependency;
		expect(handler.getEventStore()).toBe(mockDeps.eventStore);
	});
});
