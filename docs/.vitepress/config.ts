import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

// https://vitepress.dev/reference/site-config
export default withMermaid(defineConfig({
  title: "EventFlows",
  description: "Framework-agnostic TypeScript event sourcing library",
  base: '/event-flows/', // GitHub Pages base path

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    // logo: '/logo.svg',
    siteTitle: 'EventFlows',

    // No top navigation - direct to docs

    sidebar: [
      {
        text: 'Introduction',
        link: '/introduction'
      },
      {
        text: 'Patterns',
        collapsed: false,
        items: [
          { text: 'Clean Architecture', link: '/patterns/clean-architecture' },
          { text: 'Domain-Driven Design', link: '/patterns/domain-driven-design' },
          { text: 'CQRS', link: '/patterns/cqrs' },
          { text: 'Event Sourcing', link: '/patterns/event-sourcing' }
        ]
      },
      {
        text: 'Domain Modeling',
        collapsed: false,
        items: [
          { text: 'Value Objects', link: '/domain/value-objects' },
          { text: 'Aggregates', link: '/domain/aggregates' }
        ]
      },
      {
        text: 'Command Side',
        collapsed: false,
        items: [
          { text: 'Event Store', link: '/command-side/event-store' },
          { text: 'Write Repository', link: '/command-side/write-repository' },
          { text: 'Commands & Handlers', link: '/command-side/commands' },
          { text: 'Command Bus', link: '/command-side/command-bus' }
        ]
      },
      {
        text: 'Query Side',
        collapsed: false,
        items: [
          { text: 'Projections', link: '/query-side/projections' },
          { text: 'Read Models', link: '/query-side/read-models' },
          { text: 'Read Repositories', link: '/query-side/read-repositories' },
          { text: 'Queries & Handlers', link: '/query-side/queries' },
          { text: 'Query Bus', link: '/query-side/query-bus' }
        ]
      },
      {
        text: 'Building Applications',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/building-apps/' },
          { text: 'Modules', link: '/building-apps/modules' },
          { text: 'Builder', link: '/building-apps/builder' },
          { text: 'Running', link: '/building-apps/running' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Jacob-DeCrane/event-flows' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/@eventflows/core' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present'
    },

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3]
    }
  },

  mermaid: {
    // Mermaid configuration
  }
}))
