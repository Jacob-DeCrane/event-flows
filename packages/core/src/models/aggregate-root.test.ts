import { describe, test, expect } from 'bun:test';
import { AggregateRoot } from './aggregate-root.js';
import type { IEvent } from '../interfaces';

// Example events
interface MoneyDepositedEvent extends IEvent<'MoneyDeposited', { amount: number }> {}
interface MoneyWithdrawnEvent extends IEvent<'MoneyWithdrawn', { amount: number }> {}

type BankAccountEvent = MoneyDepositedEvent | MoneyWithdrawnEvent;

// Example aggregate
class BankAccount extends AggregateRoot {
	balance = 0;

	constructor(id: string) {
		super(id);
	}

	deposit(amount: number) {
		if (amount <= 0) {
			throw new Error('Amount must be positive');
		}

		this.applyEvent<MoneyDepositedEvent>({
			type: 'MoneyDeposited',
			payload: { amount }
		});
	}

	withdraw(amount: number) {
		if (amount <= 0) {
			throw new Error('Amount must be positive');
		}

		if (this.balance < amount) {
			throw new Error('Insufficient funds');
		}

		this.applyEvent<MoneyWithdrawnEvent>({
			type: 'MoneyWithdrawn',
			payload: { amount }
		});
	}

	protected onMoneyDeposited(event: MoneyDepositedEvent) {
		this.balance += event.payload.amount;
	}

	protected onMoneyWithdrawn(event: MoneyWithdrawnEvent) {
		this.balance -= event.payload.amount;
	}
}

describe('AggregateRoot', () => {
	test('creates aggregate with id', () => {
		const account = new BankAccount('acc-1');
		expect(account.id).toBe('acc-1');
		expect(account.version).toBe(0);
	});

	test('applies event and updates state', () => {
		const account = new BankAccount('acc-1');
		account.deposit(100);

		expect(account.balance).toBe(100);
		expect(account.version).toBe(1);
	});

	test('tracks uncommitted events', () => {
		const account = new BankAccount('acc-1');
		account.deposit(100);
		account.deposit(50);

		const events = account.commit();
		expect(events.length).toBe(2);
		expect(events[0].type).toBe('MoneyDeposited');
		expect(events[0].payload.amount).toBe(100);
		expect(events[1].payload.amount).toBe(50);
	});

	test('clears events after commit', () => {
		const account = new BankAccount('acc-1');
		account.deposit(100);

		const events1 = account.commit();
		expect(events1.length).toBe(1);

		const events2 = account.commit();
		expect(events2.length).toBe(0);
		expect(account.version).toBe(1);
	});

	test('loads from history and rebuilds state', () => {
		const events: BankAccountEvent[] = [
			{
				type: 'MoneyDeposited',
				payload: { amount: 100 },
				version: 1,
				timestamp: new Date()
			},
			{
				type: 'MoneyDeposited',
				payload: { amount: 50 },
				version: 2,
				timestamp: new Date()
			},
			{
				type: 'MoneyWithdrawn',
				payload: { amount: 30 },
				version: 3,
				timestamp: new Date()
			}
		];

		const account = new BankAccount('acc-1');
		account.loadFromHistory(events);

		expect(account.balance).toBe(120);
		expect(account.version).toBe(3);
		expect(account.commit().length).toBe(0); // No uncommitted events
	});

	test('handles multiple event types', () => {
		const account = new BankAccount('acc-1');
		account.deposit(100);
		account.withdraw(30);

		expect(account.balance).toBe(70);
		expect(account.version).toBe(2);

		const events = account.commit();
		expect(events[0].type).toBe('MoneyDeposited');
		expect(events[1].type).toBe('MoneyWithdrawn');
	});

	test('enforces business rules before emitting events', () => {
		const account = new BankAccount('acc-1');

		expect(() => account.deposit(-10)).toThrow('Amount must be positive');
		expect(() => account.withdraw(100)).toThrow('Insufficient funds');

		expect(account.balance).toBe(0);
		expect(account.commit().length).toBe(0);
	});

	test('increments version correctly', () => {
		const account = new BankAccount('acc-1');

		expect(account.version).toBe(0);
		account.deposit(50);
		expect(account.version).toBe(1);
		account.deposit(25);
		expect(account.version).toBe(2);
		account.withdraw(10);
		expect(account.version).toBe(3);
	});
});
