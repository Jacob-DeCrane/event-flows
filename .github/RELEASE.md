# Release Process

This document describes how to create releases and publish packages to NPM.

## Prerequisites

Before you can publish packages, you need to configure the NPM authentication token:

1. **Create an NPM Access Token**:
   - Log in to [npmjs.com](https://www.npmjs.com)
   - Go to Account Settings → Access Tokens
   - Generate a new **Automation** token with **Publish** permissions
   - Copy the token

2. **Add Token to GitHub Secrets**:
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your NPM access token
   - Click "Add secret"

## Creating a Release

Releases are created using the GitHub Actions workflow:

1. Go to the **Actions** tab in your GitHub repository
2. Select **"Release & Publish"** workflow
3. Click **"Run workflow"**
4. Select the version bump type:
   - **patch**: Bug fixes (0.1.0 → 0.1.1)
   - **minor**: New features (0.1.0 → 0.2.0)
   - **major**: Breaking changes (0.1.0 → 1.0.0)
   - **prerelease**: Alpha/beta releases (0.1.0 → 0.1.0-alpha.2)
5. Click **"Run workflow"**

## What Happens During Release

The release workflow automatically:

1. ✅ Runs all tests to ensure quality
2. ✅ Bumps the version in `package.json` files
3. ✅ Builds all packages
4. ✅ Commits the version bump to the main branch
5. ✅ Creates a Git tag (e.g., `v0.1.1`)
6. ✅ Generates a changelog from recent commits
7. ✅ Creates a GitHub Release with the changelog
8. ✅ Publishes packages to NPM with provenance
9. ✅ Triggers documentation deployment (via tag push)

## Version Strategy

EventFlow follows [Semantic Versioning](https://semver.org/):

- **Major (X.0.0)**: Breaking changes to public API
- **Minor (0.X.0)**: New features, backward compatible
- **Patch (0.0.X)**: Bug fixes, backward compatible
- **Prerelease (0.0.0-alpha.X)**: Alpha/beta releases for testing

### Current Version

Check the current version in `packages/core/package.json`:

```json
{
  "name": "@eventflow/core",
  "version": "0.1.0"
}
```

## Manual Publishing (Not Recommended)

If you need to publish manually:

```bash
# Build the package
cd packages/core
bun run build

# Login to NPM (one-time setup)
npm login

# Publish
npm publish --access public
```

## Troubleshooting

### "npm publish failed: 403 Forbidden"
- Verify `NPM_TOKEN` secret is configured correctly
- Ensure token has **Publish** permissions
- Check that you have publish rights to `@eventflow` scope

### "Version already exists"
- The version must be unique
- Check [npmjs.com/package/@eventflow/core](https://www.npmjs.com/package/@eventflow/core) for published versions
- Bump to a new version number

### "Tests failed"
- The workflow stops if tests fail
- Fix failing tests before attempting release
- Run `bun test` locally to verify

## CI/CD Workflows

- **ci.yml**: Runs on every push/PR - tests, typecheck, builds
- **release.yml**: Manual trigger - creates releases and publishes to NPM
- **deploy-docs.yml**: Runs on docs changes and version tags - deploys documentation site
