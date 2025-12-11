# Spec Tasks

## Tasks

- [x] 1. Create Package Structure and Configuration Files
  - [x] 1.1 Create `packages/integrations/` directory structure with src/, aws/, postgres/, and in-memory/ subdirectories
  - [x] 1.2 Create `packages/integrations/package.json` with proper configuration (version 0.1.0, peer dependencies, scripts)
  - [x] 1.3 Create `packages/integrations/tsconfig.json` mirroring core package settings
  - [x] 1.4 Create `packages/integrations/.npmignore` to exclude source files and configs from npm package
  - [x] 1.5 Verify root `package.json` includes `packages/*` workspace configuration

- [x] 2. Implement Source Files and Re-exports
  - [x] 2.1 Create `src/index.ts` with InMemoryEventBus re-export and package documentation
  - [x] 2.2 Create `src/in-memory/index.ts` with InMemoryEventBus re-export
  - [x] 2.3 Create `src/aws/README.md` placeholder describing future AWS integrations
  - [x] 2.4 Create `src/postgres/README.md` placeholder describing future PostgreSQL integrations
  - [x] 2.5 Create `packages/integrations/README.md` with installation instructions and usage examples

- [x] 3. Implement Tests and Verify Build
  - [x] 3.1 Create `src/index.test.ts` with test verifying InMemoryEventBus re-export works correctly
  - [x] 3.2 Run `bun install` at monorepo root to link packages and install dependencies
  - [x] 3.3 Run `bun run build` in packages/integrations and verify dist/ output contains .js, .d.ts, and .d.ts.map files
  - [x] 3.4 Run `bun test` in packages/integrations and verify test passes
  - [x] 3.5 Verify TypeScript types resolve correctly by importing InMemoryEventBus in a test file

- [x] 4. Create GitHub Actions Workflow
  - [x] 4.1 Create `.github/workflows/release-integrations.yml` with workflow configuration
  - [x] 4.2 Configure workflow to run tests, build package, and publish to npm with `integrations-v*` tag prefix
  - [x] 4.3 Add version bumping logic (patch, minor, major, prerelease) specific to integrations package
  - [x] 4.4 Add changelog generation for commits affecting packages/integrations/
  - [x] 4.5 Configure GitHub release creation with appropriate tag and naming

- [x] 5. Final Verification and Documentation
  - [x] 5.1 Test importing `import { InMemoryEventBus } from '@eventflows/integrations'` works locally
  - [x] 5.2 Verify `bun run typecheck` passes in integrations package
  - [x] 5.3 Verify GitHub Actions workflow syntax with `gh workflow view release-integrations` (if gh CLI available)
  - [x] 5.4 Create .gitignore entry for packages/integrations/dist/ if not already covered by root .gitignore
  - [x] 5.5 Document the new package structure and workflow in project documentation or changelog
