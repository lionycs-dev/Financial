# Financial Dashboard - Next.js + Drizzle ORM + Supabase

## Project Overview

This is a financial modeling application that allows users to model revenue streams, products, client groups, and their relationships through an interactive dependency graph visualization.

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
- **Pattern**: Repositories provide clean CRUD operations for each entity

#### Server Actions

- **Location**: `lib/actions/`
- **Purpose**: Next.js server actions for data fetching/mutations
- **Features**: Error handling, type safety
- **Key Actions**:
  - `revenue-stream-actions.ts` - Revenue stream operations
  - `product-actions.ts` - Product operations
  - `client-group-actions.ts` - Client group operations
  - `unified-relationship-actions.ts` - Relationship CRUD operations

#### Core Entities

1. **Revenue Streams**: Top-level revenue sources
2. **Products**: Products that belong to revenue streams
3. **Client Group Types**: Hardcoded types (B2B, B2C, DTC)
4. **Client Groups**: Specific customer segments with churn rates
5. **Relationships**: Connections between entities with properties (weight, probability, etc.)

#### Database Schema

Key tables:

- `users` - User accounts
- `revenue_streams` - Revenue sources
- `products` - Products linked to revenue streams
- `client_groups` - Customer segments with churn rates
- `unified_relationships` - Polymorphic relationships between entities

### Key Files

#### Database Configuration

- `drizzle.config.ts` - Drizzle Kit configuration
- `lib/db/index.ts` - Database connection with postgres.js
- `lib/db/schema.ts` - Database schema definitions

#### Data Layer

- `lib/repositories/*.ts` - Repository classes for each entity
- `lib/actions/*-actions.ts` - Server actions for each entity

#### Pages

- `app/page.tsx` - Homepage displaying users list
- `app/dependency-graph/page.tsx` - Dependency graph visualization

## Dependency Graph System

The dependency graph is the core feature of this application, providing an interactive visual representation of relationships between entities.

### Location

- **Main Component**: `components/dependency-graph/dependency-graph.tsx`
- **Node Components**: `components/dependency-graph/nodes/`
- **Edge Components**: `components/dependency-graph/edges/`
- **Supporting Components**: `components/dependency-graph/`

### Architecture

Built with **ReactFlow**, a powerful library for building node-based graphs.

### Node Types

#### 1. StreamNode (Revenue Stream)

- **File**: `nodes/stream-node.tsx`
- **Color**: Green (bg-green-200, border-green-600)
- **Icon**: TrendingUp
- **Handles**:
  - `belongs_to` (source, bottom, hidden) - For automatic product connections
  - `stream_target` (target, left) - For incoming client group/type connections
- **Data**: name, type, description

#### 2. ProductNode

- **File**: `nodes/product-node.tsx`
- **Color**: Light green (bg-green-50, border-green-200)
- **Icon**: Package
- **Handles**:
  - `belongs_to_{productId}` (target, top, hidden) - For revenue stream connections
  - `product_target` (target, left) - For incoming connections
  - `product_to_product` (source, right) - For product conversion connections
- **Data**: name, unitCost, productStreamId, weight

#### 3. ClientGroupNode

- **File**: `nodes/client-group-node.tsx`
- **Color**: Purple (bg-purple-50, border-purple-200)
- **Icon**: Users
- **Handles**:
  - `clientgrouptype_target` (target, top, hidden) - For client group type connections
  - `clientgroup_to_stream_product` (source, right) - For outgoing connections
- **Data**: name, type, startingCustomers, churnRate

#### 4. ClientGroupTypeNode

- **File**: `nodes/client-group-type-node.tsx`
- **Color**: Dark purple (bg-purple-200, border-purple-600)
- **Icon**: Tag
- **Types**: B2B, B2C, DTC (hardcoded)
- **Handles**:
  - `clientgrouptype_to_clientgroup` (source, bottom, hidden) - For client group connections
  - `clientgrouptype_to_stream_product` (source, right) - For stream/product connections
- **Data**: id (string), name, type, description

### Relationship Types

#### Automatic Relationships (Non-editable, Auto-generated)

1. **belongs_to**: Product → Revenue Stream
   - Style: Green dashed line (strokeDasharray: '8,4')
   - Source: Revenue Stream's `belongs_to` handle
   - Target: Product's `belongs_to_{productId}` handle
   - Generated from `product.productStreamId` foreign key

2. **belongs_to_type**: Client Group Type → Client Group
   - Style: Purple dashed line (strokeDasharray: '6,3')
   - Source: Client Group Type's `clientgrouptype_to_clientgroup` handle
   - Target: Client Group's `clientgrouptype_target` handle
   - Generated from `clientGroup.type` field

#### User-Created Relationships (Editable)

1. **clientgroup_to_product**: Client Group → Product
   - Properties: weight (purchase mix)
   - Can be created in either direction (auto-normalized)

2. **clientgroup_to_stream**: Client Group → Revenue Stream
   - Properties: weight (purchase mix)
   - Can be created in either direction (auto-normalized)

3. **product_conversion**: Product → Product
   - Properties: weight, probability, afterMonths
   - For modeling product upgrades/conversions

4. **clientgrouptype_to_product**: Client Group Type → Product
   - Properties: weight
   - For modeling type-level product relationships

5. **clientgrouptype_to_stream**: Client Group Type → Revenue Stream
   - Properties: weight
   - Can be created in either direction (auto-normalized)

### Edge Component

**File**: `edges/relationship-edge.tsx`

Features:

- **Dynamic styling** based on relationship type
- **Context menu** (right-click) for editing/deleting user-created relationships
- **Arrows** shown for structural relationships, hidden for purchase relationships
- **Labels** display relationship type
- **Animations** for certain relationship types (e.g., product conversions)

### Layout System

#### Auto-Layout

- Default structured layout with columns:
  - Left: Client Group Types & Client Groups
  - Center/Right: Products
  - Top: Revenue Streams
- Spacing: 280px horizontal, 180px vertical

#### Saved Layout

- Positions saved to `localStorage` as `dependency-graph-layout`
- Auto-saves on node drag (debounced 300ms)
- **Reset Layout** button clears saved positions and reapplies default layout
- Persists across page refreshes

#### Layout Functions

- `saveLayoutToStorage(nodes)` - Saves node positions to localStorage
- `loadLayoutFromStorage()` - Loads saved positions
- `getLayoutedElements(nodes, edges)` - Applies layout (saved or default)
- `resetLayout()` - Clears saved layout and reapplies default

### Client Group Type ID Mapping

Since the UI uses string IDs ('B2B', 'B2C', 'DTC') but the database uses numeric IDs:

```typescript
CLIENT_GROUP_TYPE_IDS = {
  B2B: 1,
  B2C: 2,
  DTC: 3,
};

CLIENT_GROUP_TYPE_ID_TO_STRING = {
  1: 'B2B',
  2: 'B2C',
  3: 'DTC',
};
```

### Connection Validation

Valid connection patterns (defined in `isValidConnection`):

- product ↔ clientgroup
- clientgroup → stream
- product → product
- product ↔ clientgrouptype
- stream ↔ clientgrouptype

### Modal System

**File**: `relationship-modal.tsx`

Features:

- **Form validation** with Zod schema
- **Dynamic fields** based on relationship type
- **Edit mode** for updating existing relationships
- **Weight validation** (0-1 range)
- **Conditional fields** (probability, afterMonths for product_conversion)

### Auto-Refresh

The graph automatically reloads data when:

- The page becomes visible (`visibilitychange` event)
- Preserves user-created relationships
- Regenerates automatic relationships from fresh data

### Key Features

1. **Drag-and-drop** node positioning with auto-save
2. **Interactive connections** with real-time validation
3. **Context menus** for relationship management
4. **Modal dialogs** for relationship creation/editing
5. **Persistent layout** across sessions
6. **MiniMap** for navigation
7. **Controls** for zoom/pan
8. **Background grid** for visual reference

### Working with the Dependency Graph

#### Adding a New Node Type

1. Create node component in `components/dependency-graph/nodes/`
2. Define handles with unique IDs
3. Add to `NODE_TYPES` in `dependency-graph.tsx`
4. Update `isValidConnection` for connection rules
5. Update `getLayoutedElements` for positioning

#### Adding a New Relationship Type

1. Add to `relationshipSchema` in `relationship-modal.tsx`
2. Update `getValidRelationshipTypes` in modal
3. Add edge styling in `relationship-edge.tsx`
4. Update handle connections in `handleSaveRelationship`
5. Update server action `createRelationship`

#### Debugging Tips

- Check browser console for edge filtering warnings
- Verify node IDs match edge source/target IDs
- Ensure handles have matching IDs on both nodes
- Check `CLIENT_GROUP_TYPE_IDS` mapping for type nodes

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
