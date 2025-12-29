# Spec Summary (Lite)

Create a new `@eventflows/integrations` package within the monorepo to house production-ready implementations of EventFlows abstract classes. This package will serve as the foundation for AWS, PostgreSQL, and other infrastructure integrations, with its own build pipeline and npm publishing workflow. The package will re-export `InMemoryEventBus` from `@eventflows/core` for consistency while maintaining backward compatibility.
