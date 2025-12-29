/**
 * Error thrown when module registration fails due to configuration conflicts.
 *
 * Common causes:
 * - Duplicate command handler names across modules
 * - Duplicate query handler names across modules
 *
 * @example
 * ```typescript
 * throw new ModuleRegistrationError(
 *   'command',
 *   'CreateUser',
 *   'users',
 *   'admin'
 * );
 * // Error: Duplicate command handler 'CreateUser' found. Already registered by module 'users', attempted to register again in module 'admin'.
 * ```
 */
export class ModuleRegistrationError extends Error {
	/**
	 * The type of handler that caused the conflict.
	 */
	public readonly handlerType: 'command' | 'query';

	/**
	 * The name of the conflicting handler.
	 */
	public readonly handlerName: string;

	/**
	 * The name of the module that first registered the handler.
	 */
	public readonly existingModuleName: string;

	/**
	 * The name of the module attempting to register the duplicate handler.
	 */
	public readonly conflictingModuleName: string;

	constructor(
		handlerType: 'command' | 'query',
		handlerName: string,
		existingModuleName: string,
		conflictingModuleName: string
	) {
		const message =
			`Duplicate ${handlerType} handler '${handlerName}' found. ` +
			`Already registered by module '${existingModuleName}', ` +
			`attempted to register again in module '${conflictingModuleName}'.`;

		super(message);

		this.name = 'ModuleRegistrationError';
		this.handlerType = handlerType;
		this.handlerName = handlerName;
		this.existingModuleName = existingModuleName;
		this.conflictingModuleName = conflictingModuleName;

		// Maintain proper stack trace for V8 (Chrome/Node.js)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, ModuleRegistrationError);
		}
	}
}
