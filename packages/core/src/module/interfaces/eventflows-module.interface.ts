import type { ModuleContext } from './module-context.interface';
import type { ModuleRegistration } from './module-registration.interface';

/**
 * Interface for defining an EventFlows module.
 *
 * Modules organize CQRS/ES applications into domain-driven bounded contexts.
 * Each module encapsulates command handlers, query handlers, projections,
 * and optional cross-context event handlers.
 *
 * @example
 * ```typescript
 * const userModule: EventFlowsModule = {
 *   name: 'users',
 *   boundedContext: 'identity',
 *   register: async (context) => {
 *     const repository = new UserRepository(context.eventStore);
 *     return {
 *       commandHandlers: [
 *         { commandName: 'CreateUser', handler: new CreateUserHandler(repository) }
 *       ],
 *       queryHandlers: [
 *         { queryName: 'GetUserById', handler: new GetUserByIdHandler(repository) }
 *       ],
 *       projections: [
 *         { name: 'UserList', handlers: { UserCreated: handleUserCreated } }
 *       ]
 *     };
 *   }
 * };
 * ```
 */
export interface EventFlowsModule {
	/**
	 * Unique module identifier.
	 * Should be lowercase and hyphen-separated (e.g., 'users', 'order-management').
	 */
	name: string;

	/**
	 * Optional parent bounded context name.
	 * Useful for organizing multiple modules under a larger domain area.
	 */
	boundedContext?: string;

	/**
	 * Factory function that initializes the module and returns handler registrations.
	 * Can be sync or async to support async initialization (e.g., database connections).
	 *
	 * @param context - Provides access to event store and event bus
	 * @returns Registration containing handlers, projections, and event handlers
	 */
	register: (context: ModuleContext) => Promise<ModuleRegistration> | ModuleRegistration;
}
