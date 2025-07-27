# Financial Dashboard - Next.js + Drizzle ORM + Supabase

## Project Structure

### Database Setup

- **Drizzle ORM** configured with PostgreSQL (Supabase)
- **Configuration**: `drizzle.config.ts`
- **Schema**: `lib/db/schema.ts`
- **Connection**: `lib/db/index.ts`

### Architecture

#### Repository Pattern

- **Location**: `lib/repositories/`
- **Purpose**: Encapsulates database access logic
- **Example**: `UserRepository` with CRUD operations

#### Server Actions

- **Location**: `lib/actions/`
- **Purpose**: Next.js server actions for data fetching/mutations
- **Features**: Error handling, type safety

#### Database Schema

```typescript
// lib/db/schema.ts
users table:
- id (serial, primary key)
- email (text, unique, not null)
- name (text, not null)
- createdAt (timestamp, default now)
- updatedAt (timestamp, default now)
```

### Key Files

#### Database Configuration

- `drizzle.config.ts` - Drizzle Kit configuration
- `lib/db/index.ts` - Database connection with postgres.js
- `lib/db/schema.ts` - Database schema definitions

#### Data Layer

- `lib/repositories/user-repository.ts` - User CRUD operations
- `lib/actions/user-actions.ts` - Server actions for user operations

#### Pages

- `app/page.tsx` - Homepage displaying users list

### Code Quality & Linting

#### ESLint Configuration

- **Config**: `.eslintrc.json`
- **Rules**: Next.js, TypeScript, Prettier integration
- **Enforcement**: Strict linting with error on unused vars

#### Prettier Configuration

- **Config**: `.prettierrc`
- **Style**: Single quotes, semicolons, 2-space indentation

### Commands

```bash
# Database
npx drizzle-kit generate    # Generate migrations
npx drizzle-kit migrate     # Run migrations

# Development
npm run dev                 # Start dev server

# Code Quality (ALWAYS RUN BEFORE COMMITTING)
npm run lint               # Check for lint errors
npm run lint:fix           # Fix auto-fixable lint errors
npm run format             # Format code with Prettier
npm run format:check       # Check formatting without fixing
npm run typecheck          # TypeScript type checking
```

### Environment Variables

```
DATABASE_URL=your_supabase_connection_string
```

### IMPORTANT: Claude Instructions

**ALWAYS run linting and type checking before completing any task:**

1. `npm run lint` - Must pass with no errors
2. `npm run typecheck` - Must pass with no type errors
3. `npm run format:check` - Code must be properly formatted

**Never leave code with lint errors or type errors.**

### Next.js Best Practices Implemented

- ✅ Server Components for data fetching
- ✅ Server Actions for mutations
- ✅ Repository pattern for data access
- ✅ TypeScript throughout
- ✅ Error boundaries in server actions
- ✅ Proper file organization
- ✅ ESLint + Prettier for code quality
- ✅ Strict type checking
