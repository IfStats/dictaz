# Dictaz

Dictaz is a high-authority, multi-author editorial platform focused on Technology and Future Tech.

## Architecture

- `apps/web` - Public Dictaz website
- `apps/admin` - Editorial and administration interface
- `apps/api` - Core NestJS API
- `services/ai` - Python AI engine
- `packages/db` - Database layer
- `packages/auth` - Authentication and authorization
- `packages/content` - Content domain
- `packages/editorial` - Editorial workflow
- `packages/commerce` - Affiliate and commerce domain
- `packages/ui` - Shared UI
- `packages/types` - Shared types
- `packages/validation` - Validation schemas
- `packages/search` - Search infrastructure
- `packages/storage` - Media storage
- `packages/email` - Email infrastructure
- `packages/analytics` - Analytics
- `packages/config` - Shared configuration

## Deployment

Public web and edge infrastructure target Cloudflare.
Backend and Python AI workloads target Railway.
Media storage targets Cloudflare R2.

## Editorial Integrity

AI-generated content must never bypass human editorial review or publish automatically.
