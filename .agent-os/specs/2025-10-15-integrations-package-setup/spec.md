# Spec Requirements Document

> Spec: Integrations Package Setup
> Created: 2025-10-15

## Overview

Create a new `@eventflows/integrations` package within the monorepo to house production-ready implementations of EventFlows abstract classes (EventStore, EventBus, etc.). This package will serve as the foundation for AWS, PostgreSQL, and other infrastructure integrations, keeping the core library framework-agnostic while providing opinionated, battle-tested implementations for common use cases.

## User Stories

### Library User Installing AWS Integration

As a developer building an event-sourced application on AWS, I want to install `@eventflows/integrations` to get production-ready DynamoDB and EventBridge implementations, so that I don't have to build these integrations from scratch.

The user runs `bun add @eventflows/integrations` and immediately has access to AWS-specific implementations while still using the core abstractions from `@eventflows/core`. They can also access the re-exported `InMemoryEventBus` for testing purposes without installing additional packages.

### Library Maintainer Publishing Integration Updates

As a maintainer of EventFlows, I want the integrations package to have its own build pipeline and npm publishing workflow, so that I can release integration updates independently from core library changes.

The maintainer makes changes to AWS integrations, runs tests, and publishes a new version of `@eventflows/integrations` without needing to bump the `@eventflows/core` version. GitHub Actions automatically handles building, testing, and publishing to npm.

### Developer Using InMemoryEventBus for Testing

As a developer using EventFlows, I want to continue using `InMemoryEventBus` from `@eventflows/core` for my tests, but also have it available from `@eventflows/integrations` for consistency, so that all implementations are discoverable in one place.

The developer can import `InMemoryEventBus` from either package, with the integrations package re-exporting it alongside production integrations, making it easy to find all available implementations in the integrations package documentation.

## Spec Scope

1. **Package Structure** - Create `packages/integrations/` directory with proper TypeScript project configuration mirroring the core package structure.

2. **Package Configuration** - Set up package.json with `@eventflows/integrations` as the package name, `@eventflows/core` as a peer dependency, and proper build/test scripts.

3. **TypeScript Configuration** - Configure tsconfig.json for strict type checking, ESNext target, and module resolution consistent with the core package.

4. **Build Pipeline** - Implement Bun-based build process that compiles TypeScript to JavaScript, generates type definitions (.d.ts files), and outputs to dist/ directory.

5. **GitHub Actions Workflow** - Create CI/CD pipeline for testing, building, and publishing the integrations package to npm, separate from the core package workflow.

6. **InMemoryEventBus Re-export** - Re-export `InMemoryEventBus` from `@eventflows/core` to maintain backward compatibility while providing a single entry point for all integrations.

7. **Placeholder Directory Structure** - Create organized directories for future integrations (aws/, postgres/, etc.) with README files explaining the planned structure.

## Out of Scope

- Implementation of any AWS integrations (DynamoDB, EventBridge) - covered in Phase 1 specs
- Implementation of PostgreSQL or other database integrations
- LocalStack testing configuration - will be added with first AWS integration implementation
- Documentation website updates - will be handled separately
- Migration of InMemoryEventBus source code from core to integrations (keeping in core, re-exporting only)

## Expected Deliverable

1. A functional `@eventflows/integrations` package that can be installed via `bun add @eventflows/integrations` and successfully imports/re-exports `InMemoryEventBus` from `@eventflows/core`.

2. GitHub Actions workflow that successfully builds, tests, and publishes the package to npm when triggered (can be tested with a dry-run or publish to a test scope initially).

3. Running `bun run build` in the integrations package produces compiled JavaScript, type definitions, and source maps in the dist/ directory, mirroring the output structure of the core package.
