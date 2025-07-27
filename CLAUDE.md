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

### Commands
```bash
# Generate migrations
npx drizzle-kit generate

# Run migrations
npx drizzle-kit migrate

# Development
npm run dev
```

### Environment Variables
```
DATABASE_URL=your_supabase_connection_string
```

### Next.js Best Practices Implemented
- ✅ Server Components for data fetching
- ✅ Server Actions for mutations
- ✅ Repository pattern for data access
- ✅ TypeScript throughout
- ✅ Error boundaries in server actions
- ✅ Proper file organization