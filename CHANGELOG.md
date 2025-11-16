# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **New package: @eventflows/integrations** (v0.1.0)
  - Production-ready integrations for EventFlows
  - Re-exports `InMemoryEventBus` from `@eventflows/core` for consistency
  - Directory structure for future AWS and PostgreSQL integrations
  - Independent build pipeline and npm publishing workflow
  - GitHub Actions workflow for automated releases with `integrations-v*` tag prefix
  - Comprehensive test suite for re-export functionality
  - Placeholder READMEs documenting planned integrations:
    - AWS: EventBridge, DynamoDB, SNS/SQS
    - PostgreSQL: Event Store, Projection Store, Outbox Pattern, Saga Store

### Changed

- Monorepo now supports multiple packages under `packages/` workspace
- Each package has independent versioning and release cycles

## [@eventflows/core@0.1.2] - Previous Releases

See individual package histories for earlier changes:
- [@eventflows/core](./packages/core/package.json)
- [@eventflows/integrations](./packages/integrations/package.json)
