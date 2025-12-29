// Module factory functions
export { createModule, type CreateModuleConfig } from './create-module';
export { createEventFlowsApp } from './create-app';

// Errors
export { ModuleRegistrationError } from './errors';

// Type definitions and utility types
export type {
	// Module types
	ModuleDependencies,
	ModuleHandlers,
	EventFlowsModule,
	ModuleDefinition,
	// Utility types for extraction
	ExtractCommand,
	ExtractQuery,
	ExtractCommandName,
	ExtractQueryName,
	CommandPayload,
	QueryPayload,
	HandlerResult,
	// Merge types for modules
	MergeCommandHandlers,
	MergeQueryHandlers,
	MergeModuleCommandHandlers,
	MergeModuleQueryHandlers,
	// Executor function types
	CommandExecutorFn,
	QueryExecutorFn,
	CommandExecutors,
	QueryExecutors,
	ModuleCommandExecutors,
	ModuleQueryExecutors,
	// App configuration types
	EventFlowsAppConfig,
	EventFlowsApp,
	// Test utilities
	Equal,
	Expect,
} from './types';
