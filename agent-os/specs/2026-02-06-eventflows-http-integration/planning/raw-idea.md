# EventFlows HTTP Integration

## Feature Description

Extend the EventFlows library to support optional REST API generation from module definitions. This enables consumers to define HTTP routes alongside their command/query handlers, with a thin composition layer that generates a fully-functional HTTP server using Hono.

## Key Aspects

- Keep modules framework-agnostic (HTTP config is opt-in)
- Enable schema-first command/query definitions using Zod
- Provide automatic route generation from module metadata
- Offer typed handler helpers for custom route logic
- Support Hono as the initial HTTP framework (extensible to others)

## Additional Notes

The user has an existing draft spec document at `/Users/jacob.decrane/repos/eap/event-sourcing/eventflows-http-integration-spec.md` that contains detailed implementation plans.
