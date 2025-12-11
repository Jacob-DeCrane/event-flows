# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-10-15-integrations-package-setup/spec.md

## Directory Structure

Create the following directory structure within the monorepo:

```
packages/integrations/
├── src/
│   ├── index.ts                    # Main entry point with re-exports
│   ├── aws/
│   │   └── README.md               # Placeholder for AWS integrations
│   ├── postgres/
│   │   └── README.md               # Placeholder for PostgreSQL integrations
│   └── in-memory/
│       └── index.ts                # Re-export InMemoryEventBus from core
├── dist/                           # Build output (generated, not committed)
├── package.json                    # Package configuration
├── tsconfig.json                   # TypeScript configuration
├── README.md                       # Package documentation
└── .npmignore                      # NPM publish exclusions
```

## Package Configuration (package.json)

Create `packages/integrations/package.json` with the following structure:

```json
{
  "name": "@eventflows/integrations",
  "version": "0.1.0",
  "description": "Production-ready integrations for EventFlows event sourcing library",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "bun build src/index.ts --outdir dist --target node --format esm && tsc --emitDeclarationOnly --outDir dist",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [
    "event-sourcing",
    "cqrs",
    "ddd",
    "eventflows",
    "integrations",
    "aws",
    "dynamodb",
    "eventbridge",
    "postgresql",
    "typescript"
  ],
  "author": "",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/Jacob-DeCrane/event-flows.git",
    "directory": "packages/integrations"
  },
  "homepage": "https://jacob-decrane.github.io/event-flows/",
  "bugs": {
    "url": "https://github.com/Jacob-DeCrane/event-flows/issues"
  },
  "peerDependencies": {
    "@eventflows/core": "^0.1.0"
  },
  "devDependencies": {
    "@eventflows/core": "workspace:*",
    "@types/bun": "latest",
    "typescript": "^5.0.0"
  }
}
```

**Key Points:**
- Version starts at 0.1.0 (independent from core's 0.1.2)
- `@eventflows/core` is a peer dependency (users must install it)
- Uses `workspace:*` in devDependencies for local development within monorepo
- Mirrors core's build scripts and exports structure

## TypeScript Configuration (tsconfig.json)

Create `packages/integrations/tsconfig.json` mirroring the core package configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Key Points:**
- Identical configuration to core package for consistency
- Strict TypeScript checking enabled
- Generates declaration files and source maps

## Source Files

### Main Entry Point (src/index.ts)

```typescript
/**
 * @eventflows/integrations
 *
 * Production-ready integrations for EventFlows event sourcing library.
 *
 * This package provides concrete implementations of EventFlows abstractions
 * for popular infrastructure choices including AWS (DynamoDB, EventBridge),
 * PostgreSQL, and more.
 *
 * @packageDocumentation
 */

// Re-export InMemoryEventBus from core for convenience
export { InMemoryEventBus } from '@eventflows/core';

// Future exports will be added here:
// export * from './aws';
// export * from './postgres';
```

### In-Memory Re-export (src/in-memory/index.ts)

```typescript
/**
 * Re-export InMemoryEventBus from @eventflows/core
 *
 * This provides a single location to discover all EventBus implementations
 * while maintaining backward compatibility with the core package.
 */
export { InMemoryEventBus } from '@eventflows/core';
```

### AWS Placeholder (src/aws/README.md)

```markdown
# AWS Integrations

This directory will contain AWS-specific integrations:

- **DynamoDB Event Store** - Event persistence using DynamoDB single-table design
- **DynamoDB Snapshot Store** - Aggregate snapshot support
- **EventBridge Event Bus** - Event publishing to AWS EventBridge

These integrations will be implemented in Phase 1 of the roadmap.
```

### PostgreSQL Placeholder (src/postgres/README.md)

```markdown
# PostgreSQL Integrations

This directory will contain PostgreSQL-specific integrations:

- **PostgreSQL Event Store** - JSONB-based event persistence
- **PostgreSQL Snapshot Store** - Snapshot support using dedicated tables

These integrations will be implemented in Phase 3 of the roadmap.
```

## NPM Ignore Configuration (.npmignore)

Create `.npmignore` to exclude unnecessary files from npm package:

```
src/
*.test.ts
tsconfig.json
.gitignore
node_modules/
```

## Package README (README.md)

```markdown
# @eventflows/integrations

Production-ready integrations for the EventFlows event sourcing library.

## Installation

\`\`\`bash
bun add @eventflows/integrations @eventflows/core
\`\`\`

## Available Integrations

### In-Memory (Testing)

Re-exported from `@eventflows/core` for convenience:

\`\`\`typescript
import { InMemoryEventBus } from '@eventflows/integrations';

const eventBus = new InMemoryEventBus();
\`\`\`

### Coming Soon

- **AWS DynamoDB** - Event Store implementation
- **AWS EventBridge** - Event Bus implementation
- **PostgreSQL** - Event Store implementation

## Documentation

Full documentation available at [https://jacob-decrane.github.io/event-flows/](https://jacob-decrane.github.io/event-flows/)

## License

MIT
```

## GitHub Actions Workflow

Create a new workflow file `.github/workflows/release-integrations.yml` for publishing the integrations package independently from core:

```yaml
name: Release & Publish Integrations

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version bump type'
        required: true
        type: choice
        options:
          - patch
          - minor
          - major
          - prerelease

permissions:
  contents: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Setup Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Install dependencies
        run: bun install

      - name: Run tests
        run: |
          cd packages/integrations
          bun test

      - name: Bump version
        id: version
        run: |
          cd packages/integrations

          # Get current version
          CURRENT_VERSION=$(node -p "require('./package.json').version")
          echo "Current version: $CURRENT_VERSION"

          # Bump version based on input
          case "${{ github.event.inputs.version }}" in
            patch)
              NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g')
              ;;
            minor)
              NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$(NF-1) = $(NF-1) + 1; $NF = 0;} 1' | sed 's/ /./g')
              ;;
            major)
              NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$1 = $1 + 1; $(NF-1) = 0; $NF = 0;} 1' | sed 's/ /./g')
              ;;
            prerelease)
              # Strip any existing prerelease suffix and add -alpha.X
              BASE_VERSION=$(echo $CURRENT_VERSION | sed 's/-alpha\.[0-9]*//')
              ALPHA_NUM=$(echo $CURRENT_VERSION | grep -oP 'alpha\.\K[0-9]+' || echo "0")
              ALPHA_NUM=$((ALPHA_NUM + 1))
              NEW_VERSION="${BASE_VERSION}-alpha.${ALPHA_NUM}"
              ;;
          esac

          echo "New version: $NEW_VERSION"

          # Update package.json
          node -e "const fs=require('fs'); const pkg=require('./package.json'); pkg.version='$NEW_VERSION'; fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');"

          echo "version=$NEW_VERSION" >> $GITHUB_OUTPUT

      - name: Build package
        run: |
          cd packages/integrations
          bun run build

      - name: Commit version bump
        run: |
          git add packages/integrations/package.json
          git commit -m "chore(integrations): bump version to ${{ steps.version.outputs.version }}"
          git push

      - name: Create Git tag
        run: |
          git tag integrations-v${{ steps.version.outputs.version }}
          git push origin integrations-v${{ steps.version.outputs.version }}

      - name: Generate changelog
        id: changelog
        run: |
          # Get commits for integrations package since last tag
          LAST_TAG=$(git describe --tags --match "integrations-v*" --abbrev=0 HEAD^ 2>/dev/null || echo "")

          if [ -z "$LAST_TAG" ]; then
            COMMITS=$(git log --pretty=format:"- %s (%h)" --no-merges -- packages/integrations)
          else
            COMMITS=$(git log $LAST_TAG..HEAD --pretty=format:"- %s (%h)" --no-merges -- packages/integrations)
          fi

          echo "## What's Changed" > changelog.md
          echo "" >> changelog.md
          echo "$COMMITS" >> changelog.md

          cat changelog.md

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          tag_name: integrations-v${{ steps.version.outputs.version }}
          name: "@eventflows/integrations v${{ steps.version.outputs.version }}"
          body_path: changelog.md
          draft: false
          prerelease: ${{ contains(steps.version.outputs.version, 'alpha') || contains(steps.version.outputs.version, 'beta') || contains(steps.version.outputs.version, 'rc') }}

      - name: Setup .npmrc
        run: |
          echo "//registry.npmjs.org/:_authToken=${{ secrets.NPM_TOKEN }}" > ~/.npmrc

      - name: Publish to NPM
        run: |
          cd packages/integrations
          npm publish --access public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Key Differences from Core Workflow:**
- Targets `packages/integrations` directory
- Uses `integrations-v*` prefix for git tags to distinguish from core releases
- Only tests and builds the integrations package
- Independent versioning from core package

## Build Process

The build process should:

1. **Compile TypeScript** - Bun compiles `src/index.ts` to JavaScript in `dist/`
2. **Generate Type Definitions** - TypeScript compiler generates `.d.ts` files
3. **Generate Source Maps** - TypeScript compiler generates `.d.ts.map` files for debugging
4. **Include Only Dist** - npm publish only includes `dist/` directory (via `files` in package.json)

Output structure in `dist/`:
```
dist/
├── index.js              # Compiled JavaScript
├── index.d.ts            # Type definitions
├── index.d.ts.map        # Source map for types
└── in-memory/
    ├── index.js
    ├── index.d.ts
    └── index.d.ts.map
```

## Testing Strategy

For this initial setup:
- No tests required yet (only re-exports)
- Future AWS integrations will include tests with LocalStack
- Future PostgreSQL integrations will include tests with test containers

Create a placeholder test file `src/index.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test';
import { InMemoryEventBus } from './index';

describe('@eventflows/integrations', () => {
  test('should re-export InMemoryEventBus from core', () => {
    expect(InMemoryEventBus).toBeDefined();
    const eventBus = new InMemoryEventBus();
    expect(eventBus).toBeInstanceOf(InMemoryEventBus);
  });
});
```

## Monorepo Integration

Update root `package.json` to include the integrations workspace:

The workspace declaration should already exist in the root package.json. Verify it includes:

```json
{
  "workspaces": [
    "packages/*"
  ]
}
```

This allows:
- `bun install` at root to link local packages
- `@eventflows/core` to be referenced via `workspace:*` in integrations package
- Running build commands from root: `bun --filter @eventflows/integrations run build`

## Verification Checklist

After implementation, verify:

1. ✅ `bun install` at root successfully links packages
2. ✅ `cd packages/integrations && bun run build` compiles successfully
3. ✅ `dist/` directory contains `.js`, `.d.ts`, and `.d.ts.map` files
4. ✅ `bun test` passes in integrations package
5. ✅ Import works: `import { InMemoryEventBus } from '@eventflows/integrations'`
6. ✅ TypeScript types resolve correctly in IDE
7. ✅ GitHub Actions workflow validates successfully (dry-run)
