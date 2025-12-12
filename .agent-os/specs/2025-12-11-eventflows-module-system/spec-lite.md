# Spec Summary (Lite)

Implement a Module System for `@eventflows/core` that organizes CQRS/ES applications into domain-driven modules. The system provides `EventFlowsModule` interface for defining subdomains, `EventFlowsBuilder` fluent API for composing applications with infrastructure, and `EventFlowsApp` runtime for executing commands and queries. Includes automatic projection retry handling and a `rebuildProjection()` utility for manual projection rebuilds from event history.
