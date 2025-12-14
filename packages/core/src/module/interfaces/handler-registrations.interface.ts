import type { ICommandHandler, IQueryHandler, EventHandler } from '../../interfaces';

/**
 * Registration for a command handler.
 *
 * @example
 * ```typescript
 * const registration: CommandHandlerRegistration = {
 *   commandName: 'CreateUser',
 *   handler: new CreateUserHandler(userRepository)
 * };
 * ```
 */
export interface CommandHandlerRegistration {
	/**
	 * The command name this handler processes.
	 * Must match the commandName property of the command.
	 */
	commandName: string;

	/**
	 * The handler that executes the command.
	 */
	handler: ICommandHandler;
}

/**
 * Registration for a query handler.
 *
 * @example
 * ```typescript
 * const registration: QueryHandlerRegistration = {
 *   queryName: 'GetUserById',
 *   handler: new GetUserByIdHandler(userReadModel)
 * };
 * ```
 */
export interface QueryHandlerRegistration {
	/**
	 * The query name this handler processes.
	 * Must match the queryName property of the query.
	 */
	queryName: string;

	/**
	 * The handler that executes the query.
	 */
	handler: IQueryHandler;
}

/**
 * Configuration for projection retry behavior.
 */
export interface ProjectionRetryConfig {
	/**
	 * Maximum number of retry attempts before giving up.
	 * @default 3
	 */
	maxAttempts?: number;
}

/**
 * Registration for a projection.
 *
 * Projections maintain read models by handling events.
 * They are subscribed to the event bus and automatically
 * wrapped with retry logic.
 *
 * @example
 * ```typescript
 * const registration: ProjectionRegistration = {
 *   name: 'UserListProjection',
 *   handlers: {
 *     UserCreated: async (envelope) => {
 *       await userReadModel.add({
 *         id: envelope.metadata.aggregateId,
 *         name: envelope.payload.name
 *       });
 *     },
 *     UserUpdated: async (envelope) => {
 *       await userReadModel.update(
 *         envelope.metadata.aggregateId,
 *         envelope.payload
 *       );
 *     }
 *   },
 *   retry: { maxAttempts: 5 }
 * };
 * ```
 */
export interface ProjectionRegistration {
	/**
	 * Name of the projection (used for logging and identification).
	 */
	name: string;

	/**
	 * Map of event types to their handlers.
	 * Key is the event type name, value is the handler function.
	 */
	handlers: Record<string, EventHandler>;

	/**
	 * Optional retry configuration for failed handler executions.
	 * If not provided, uses default retry settings.
	 */
	retry?: ProjectionRetryConfig;
}

/**
 * Registration for a cross-context event handler.
 *
 * Used to handle events from other bounded contexts,
 * enabling loose coupling between modules.
 *
 * @example
 * ```typescript
 * const registration: EventHandlerRegistration = {
 *   eventType: 'OrderPlaced',
 *   handler: async (envelope) => {
 *     // React to order placement from orders context
 *     await inventoryService.reserveItems(envelope.payload.items);
 *   },
 *   fromContext: 'orders'
 * };
 * ```
 */
export interface EventHandlerRegistration {
	/**
	 * The event type to handle.
	 */
	eventType: string;

	/**
	 * The handler function for the event.
	 */
	handler: EventHandler;

	/**
	 * Optional filter to only handle events from a specific bounded context.
	 * If not provided, handles events from any context.
	 */
	fromContext?: string;
}
