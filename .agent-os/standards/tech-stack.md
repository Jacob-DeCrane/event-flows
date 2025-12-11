# Tech Stack

## Context

Global tech stack defaults for Agent OS projects, overridable in project-specific `.agent-os/product/tech-stack.md`.

## Project Architecture
- Repository Structure: Monorepo architecture
- Language: TypeScript 5+ for infrastructure, frontend, and backend
- Package Manager: bun
- Import Strategy: Node.js modules
- Node Version: 22 LTS

## Development & Code Quality
- Pre-commit Hooks: Husky
- Code Formatting: ESLint
- Linting: ESLint with TypeScript rules
- Build Tool: Vite

## Frontend
- JavaScript Framework: React latest stable
- CSS Framework: TailwindCSS 4.0+
- UI Components: shadcn/ui

## Backend
- App Framework: Hono
- Primary Database: PostgreSQL 17+ or DynamoDB
- Data Access Pattern: Repository Pattern with Domain Models
- ORM/Query Builder: Prisma or Drizzle (for type-safe data mapping)

## Infrastructure
- Infrastructure as Code: AWS CDK (TypeScript)
- Application Hosting: AWS
- Hosting Region: us-east-1
- Database Hosting: AWS Managed RDS PostgreSQL
- Asset Storage: Amazon S3
- CDN: CloudFront
- Asset Access: Private with signed URLs

## CI/CD & Deployment
- CI/CD Platform: GitHub Actions
- CI/CD Trigger: Push to main/staging branches
- Tests: Run before deployment
- Production Environment: main branch
- Staging Environment: staging branch
