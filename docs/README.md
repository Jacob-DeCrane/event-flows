# EventFlow Documentation

This directory contains the documentation site for EventFlow, built with [VitePress](https://vitepress.dev/).

## Development

```bash
# Start dev server
bun run docs:dev

# Build for production
bun run docs:build

# Preview production build
bun run docs:preview
```

## Deployment

Documentation is automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

The deployment workflow is configured in `.github/workflows/deploy-docs.yml`.
