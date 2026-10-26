# CIT 9.0 - Secure Online Assessment Platform

A full-stack, proctored assessment system designed to conduct large-scale preliminary and final competitive tests. Built with a TypeScript monorepo architecture, the platform enforces strict assessment integrity, server-side validation, concurrent session tracking, and role-based administrative control.

---

## Architecture Overview

The codebase is organized as an npm workspaces monorepo:

```text
CIT/
├── apps/
│   ├── api/          # NestJS backend REST API (port 4000)
│   └── web/          # Next.js 15 frontend application (port 3000)
├── packages/
│   ├── database/     # Prisma ORM schema, migrations, and seed scripts
│   └── types/        # Shared TypeScript interfaces, DTOs, and enums
├── docker-compose.dev.yml  # Local PostgreSQL 16 and Redis 7 instances
├── docker-compose.yml      # Multi-stage production compose configuration
└── package.json            # Monorepo root scripts and dependencies
```

---

## Tech Stack

### Backend (`apps/api`)
- NestJS with TypeScript
- Prisma ORM with PostgreSQL 16
- Redis 7 for distributed caching, session tracking, and rate limiting
- Passport.js with Google OAuth 2.0 and mock authentication fallbacks
- Pino for structured JSON logging
- Swagger (OpenAPI) for API documentation
- Helmet, CSRF tokens, and strict CORS policies for security

### Frontend (`apps/web`)
- Next.js 15 (App Router) and React 19
- Tailwind CSS
- Lucide React icons
- Client-side proctoring (tab blur detection, fullscreen lock enforcement)

---

## Key Features

### 1. Assessment Lifecycle and Slot Scheduling
- Dynamic slot booking with capacity constraints and timing boundaries.
- Grace period support for submissions right at the slot cut-off time.
- Automated attempt status transitions (`NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `EXPIRED`, `DISQUALIFIED`).

### 2. Assessment Integrity and Security
- Zero client answer leakage: options do not expose `isCorrect` flags in API payloads; answers are evaluated server-side.
- Idempotent question submissions backed by unique database constraints to prevent double-scoring or race conditions.
- Strict session management: token hashing in Redis prevents concurrent logins from multiple devices.
- Fullscreen enforcement and focus loss logging during active attempts.

### 3. Role-Based Access Control
- **PARTICIPANT**: Profile registration, slot booking, live exam taking, and post-submission results.
- **ORGANIZER**: Test slot adjustments, question bank curation, and student attempt monitoring.
- **ADMIN**: Complete system access including role assignment, attempt resets/disqualifications, cutoff calculations, and immutable audit logs.

### 4. Admin Management Portal
- Visual slot scheduler with live capacity indicators.
- Question bank manager supporting rich markdown questions, options, and weightings.
- Student registry with real-time score inspection, status overrides, and role changes.
- Cutoff evaluation engine to rank and promote participants to subsequent rounds.
- Detailed audit trail tracking critical administrative actions with IP and timestamp metadata.

---

## Prerequisites

Before running the project locally, ensure you have the following installed:
- Node.js 20.x or 22.x
- npm 10.x or higher
- Docker and Docker Compose (for PostgreSQL and Redis)

---

## Environment Setup

Copy the environment template in the repository root:

```bash
cp .env.example .env
```

Configure the following key variables in `.env`:

```env
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_PORT=

# Redis
REDIS_URL=
REDIS_HOST=
REDIS_PORT=

# Application Secrets (generate using: openssl rand -hex 64)
SESSION_SECRET=
COOKIE_SECRET=
SESSION_TTL_HOURS=

# Google OAuth 2.0 (optional in development; mock login is available)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

# Public Frontend Variables
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_APP_URL=
```

---

## Installation and Quick Start

### 1. Install Dependencies

Install all root, app, and package dependencies from the monorepo root:

```bash
npm install
```

### 2. Start PostgreSQL and Redis

Start the development database and cache containers via Docker Compose:

```bash
npm run dev:services
```

To stop them later:

```bash
npm run dev:services:down
```

### 3. Initialize the Database

Generate the Prisma Client, push the schema to PostgreSQL, and seed the initial assessment data:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

The seed script creates default assessments, test slots, sample questions, and pre-configured accounts:
- **Admin**: `admin@cit.local`
- **Organizer**: `organizer@cit.local`
- **Participant**: `student@cit.local`

### 4. Run Development Servers

Start both the API and Web applications concurrently:

```bash
npm run dev
```

Alternatively, you can run them in separate terminals:

```bash
# Terminal 1: Backend API
npm run dev:api

# Terminal 2: Web Frontend
npm run dev:web
```

---

## Application URLs

Once running, access the following endpoints:

| Service | URL | Notes |
| :--- | :--- | :--- |
| Web Application | http://localhost:3000 | Participant landing and exam portal |
| Admin / Staff Portal | http://localhost:3000/admin | Slot, question, and student management |
| Authentication Page | http://localhost:3000/login | Mock login switcher and Google OAuth |
| Backend API Health | http://localhost:4000/api/v1/health | Database and Redis connectivity check |
| Swagger API Docs | http://localhost:4000/api/docs | Interactive OpenAPI documentation |

---

## Monorepo Scripts

The following scripts can be executed from the root directory:

```bash
# Development
npm run dev                  # Start both apps concurrently
npm run dev:api              # Start API in watch mode
npm run dev:web              # Start Next.js in dev mode
npm run dev:services         # Start Docker containers in background
npm run dev:services:down    # Stop Docker containers

# Database Operations
npm run db:generate          # Generate Prisma client
npm run db:push              # Sync schema with database without migrations
npm run db:migrate           # Apply Prisma migrations
npm run db:seed              # Seed sample assessments, slots, and users

# Build and Quality Checks
npm run build                # Build all apps and packages
npm run lint                 # Run ESLint across all workspaces
npm run typecheck            # Run TypeScript typechecks across workspaces
npm run test                 # Run test suites across workspaces
```

---

## Design and Security Decisions

1. **Answer Masking at the ORM Layer**: The question service specifically strips `isCorrect` fields from public question payloads. Only submission handlers load correct options to compute positive and negative marks.
2. **Idempotent Submission Processing**: Submissions enforce a unique compound index on `(attemptId, questionId)`. Repeated network requests cannot increment scores or create duplicate response rows.
3. **Session Invalidation**: When a participant logs in, previous session tokens for that user are invalidated in Redis, preventing two browsers from answering simultaneously on the same account.
4. **Resilient Next.js Rewrites**: The web frontend proxies `/api/v1/:path*` requests directly to `http://localhost:4000`, eliminating cross-origin cookie restrictions in local environments while maintaining standard HTTP-only cookie support.
