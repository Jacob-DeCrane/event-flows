# Technical Stack

## Language & Runtime

- **Language:** TypeScript 5.0+
- **Target:** ESNext/ES2020+
- **Module System:** ES Modules
- **Runtime:** Node.js / Bun compatible

## Package Management & Build

- **Package Manager:** Bun
- **Build Tool:** Bun (esbuild-based compilation)
- **Type Generation:** TypeScript Compiler (tsc --emitDeclarationOnly)
- **Workspace:** Bun workspaces (monorepo structure)

## Core Dependencies

- **ulidx** v2.4.1 - ULID generation for event IDs (only production dependency)

## Development Tools

- **Test Framework:** bun:test (native Bun test runner)
- **Linter:** ESLint
- **Formatter:** Prettier v3.0.0
- **Type Checker:** TypeScript strict mode

## Documentation

- **Documentation Framework:** VitePress v1.6.4+
- **Diagram Support:** Mermaid v11.12.0 with vitepress-plugin-mermaid v2.0.17
- **Hosting:** GitHub Pages (https://jacob-decrane.github.io/event-flows/)

## Version Control & Repository

- **Source Control:** Git
- **Repository:** https://github.com/Jacob-DeCrane/event-flows
- **Package Registry:** npm (published as @eventflows/core)
- **License:** MIT

## Project Structure

- **Monorepo Pattern:** packages/ directory with core package
- **Package Name:** @eventflows/core
- **Version:** 0.1.2
- **Build Output:** dist/ with JS, .d.ts, and source maps

## Infrastructure (Planned Integrations)

### Event Store Implementations
- **AWS DynamoDB** - First priority for event persistence
- **PostgreSQL** - Traditional RDBMS event store
- **Amazon S3** - Object storage for event archival

### Event Bus Implementations
- **AWS EventBridge** - First priority for distributed messaging
- **In-Memory** - Already implemented for testing

## Observability (Planned)

- **OpenTelemetry (OTEL)** - Instrumentation for distributed tracing, metrics, and logging across event stores and buses

## Development Environment

- **Primary IDE:** VS Code (assumed based on .vscode/ directory in gitignore)
- **OS Support:** Cross-platform (Node.js/Bun compatible)
- **CI/CD:** Not yet configured
