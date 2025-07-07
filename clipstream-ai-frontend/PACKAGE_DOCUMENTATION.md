# Package.json Documentation

## Project Overview

This is the main configuration file for the ClipStream AI frontend application. It defines the project metadata, dependencies, scripts, and build configuration.

### Key Features

- **Next.js 15** with App Router for modern React development
- **TypeScript** for type safety and better developer experience
- **Prisma** for type-safe database management
- **NextAuth.js** for authentication and session management
- **Tailwind CSS** for utility-first styling
- **Inngest** for background job processing
- **AWS SDK** for S3 file storage integration

## NPM Scripts

These scripts provide convenient commands for development, building, and maintenance:

### Development Scripts

- `dev`: Start development server with Turbo mode for faster builds
- `build`: Build the application for production
- `start`: Start the production server
- `preview`: Build and preview production build locally

### Database Management

- `db:studio`: Open Prisma Studio for database management
- `db:push`: Push schema changes to database without migrations
- `db:generate`: Generate and apply database migrations
- `db:migrate`: Deploy migrations to production database

### Code Quality

- `check`: Run linting and type checking
- `lint`: Run ESLint for code quality
- `lint:fix`: Fix auto-fixable linting issues
- `typecheck`: Run TypeScript type checking only

### Code Formatting

- `format:check`: Check code formatting with Prettier
- `format:write`: Format code automatically with Prettier

### Background Jobs

- `inngest-dev`: Start Inngest development server for background jobs

### Post-Install

- `postinstall`: Generate Prisma client after package installation

## Dependencies

### Production Dependencies

#### Authentication and Database

- `@auth/prisma-adapter`: NextAuth.js adapter for Prisma database integration
- `@prisma/client`: Prisma database client for type-safe database access

#### AWS Integration

- `@aws-sdk/client-s3`: AWS S3 client for file uploads and storage

#### Environment and Validation

- `@t3-oss/env-nextjs`: Type-safe environment variable handling with runtime validation
- `zod`: Schema validation library for runtime type checking

#### Background Job Processing

- `inngest`: Background job and workflow processing framework

#### Core Framework

- `next`: Next.js React framework with App Router
- `next-auth`: Authentication library for Next.js
- `react`: React library for UI components
- `react-dom`: React DOM rendering

### Development Dependencies

#### TypeScript and Type Definitions

- `typescript`: TypeScript compiler
- `@types/node`: Node.js type definitions
- `@types/react`: React type definitions
- `@types/react-dom`: React DOM type definitions

#### Linting and Code Quality

- `eslint`: JavaScript/TypeScript linter
- `eslint-config-next`: Next.js ESLint configuration
- `@eslint/eslintrc`: ESLint configuration utilities
- `typescript-eslint`: TypeScript ESLint rules

#### Code Formatting

- `prettier`: Code formatter for consistent code style
- `prettier-plugin-tailwindcss`: Tailwind CSS class sorting for Prettier

#### Styling and CSS

- `tailwindcss`: Utility-first CSS framework
- `@tailwindcss/postcss`: Tailwind CSS PostCSS plugin
- `postcss`: CSS processing tool

#### Database Development

- `prisma`: Prisma CLI and development tools

## Project Metadata

- `ct3aMetadata.initVersion`: Create T3 App version used for initialization (7.39.3)
- `packageManager`: Specified package manager version (npm@10.9.2)

## Usage Examples

### Development Workflow

```bash
# Start development server
npm run dev

# Run background job server
npm run inngest-dev

# Check code quality
npm run check

# Format code
npm run format:write
```

### Database Operations

```bash
# Open database management UI
npm run db:studio

# Apply schema changes
npm run db:push

# Create and apply migrations
npm run db:generate
```

### Production Deployment

```bash
# Build for production
npm run build

# Start production server
npm run start

# Preview production build
npm run preview
```

## Notes

- The project uses ES modules (`"type": "module"`)
- Prisma client is automatically generated after package installation
- All scripts are optimized for the T3 stack development workflow
- Environment variables are validated at runtime using Zod schemas
