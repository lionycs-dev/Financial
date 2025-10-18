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

- **Main Component**: `components/dependency-graph/dependency-graph.tsx` (1100+ lines, production-quality)
- **Node Components**: `components/dependency-graph/nodes/`
- **Edge Components**: `components/dependency-graph/edges/`
- **Supporting Components**: `components/dependency-graph/`

### Architecture

Built with **ReactFlow**, a powerful library for building node-based graphs.

**Visual Pattern**: The graph uses a **container/child architecture** where:

- **Circles** act as containers (StreamNode, ClientGroupTypeNode)
- **Diamonds** are child nodes positioned inside circles (ProductNode, ClientGroupNode)
- Circles dynamically resize based on the number of children they contain
- Moving a circle automatically moves all its children (parent-child relationship)

### Visual Hierarchy & Z-Index

The graph uses a carefully designed z-index system to ensure proper layering:

```typescript
const Z_INDEX = {
  CIRCLE: 1, // Background layer - container nodes
  EDGE: 5, // Middle layer - relationship edges
  DIAMOND: 10, // Foreground layer - child nodes
};
```

This ensures:

- Edges render above circles (not hidden behind containers)
- Diamond nodes always appear on top (interactive elements)
- Clear visual hierarchy for user interaction

### Node Types

#### 1. StreamNode (Revenue Stream) - **Circle Container**

- **File**: `nodes/stream-node.tsx`
- **Shape**: Large circle (350px+ diameter, dynamically sized)
- **Color**: Green (bg-green-100/50, border-4 border-green-400)
- **Icon**: TrendingUp
- **Role**: Container for ProductNode children
- **Handles**:
  - 4 target handles (top, right, bottom, left) - For incoming connections
- **Data**: `{ id: number, name: string, type: string, description?: string | null, circleSize?: number }`
- **Dynamic Sizing**: Automatically resizes to fit child products using grid layout

#### 2. ProductNode (Product) - **Diamond Child**

- **File**: `nodes/product-node.tsx`
- **Shape**: Diamond (100x100px, rotated 45°)
- **Color**: Green (bg-green-300, border-3 border-green-700)
- **Icon**: Package
- **Role**: Child node positioned inside parent StreamNode circle
- **Parent**: `parentNode: 'stream_{streamId}'`, `extent: 'parent'`
- **Handles**:
  - 4 handles total (2 source, 2 target) for connections
- **Data**: `{ id: number, name: string, unitCost: string, productStreamId: number }`
- **Positioning**: Grid layout within parent circle (relative coordinates)

#### 3. ClientGroupNode (Client Group) - **Diamond Child**

- **File**: `nodes/client-group-node.tsx`
- **Shape**: Diamond (100x100px, rotated 45°)
- **Color**: Purple (bg-purple-300, border-3 border-purple-700)
- **Icon**: Users
- **Role**: Child node positioned inside parent ClientGroupTypeNode circle
- **Parent**: `parentNode: 'clientgrouptype_{type}'`, `extent: 'parent'`
- **Handles**:
  - 4 handles total (2 source, 2 target) for connections
- **Data**: `{ id: number, name: string, startingCustomers: number, churnRate: string, type: 'B2B' | 'B2C' | 'DTC' }`
- **Positioning**: Grid layout within parent circle (relative coordinates)

#### 4. ClientGroupTypeNode (Client Group Type) - **Circle Container**

- **File**: `nodes/client-group-type-node.tsx`
- **Shape**: Large circle (350px+ diameter, dynamically sized)
- **Color**: Purple (bg-purple-100/50, border-4 border-purple-400)
- **Icon**: Tag
- **Types**: B2B, B2C, DTC (hardcoded)
- **Role**: Container for ClientGroupNode children
- **Handles**:
  - 4 source handles (top, right, bottom, left) - For outgoing connections
- **Data**: `{ id: string, name: string, type: 'B2B' | 'B2C' | 'DTC', description?: string, circleSize?: number }`
- **Dynamic Sizing**: Automatically resizes to fit child client groups using grid layout

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

The layout system intelligently positions nodes and manages dynamic sizing based on content.

#### Dynamic Circle Sizing

Circles automatically resize to fit their children using a grid-based algorithm:

```typescript
// Layout configuration constants
const LAYOUT_CONFIG = {
  DEFAULT_CIRCLE_SIZE: 350, // Minimum circle size
  SMALL_CELL_SIZE: 120, // Grid cell size for < 2 children
  LARGE_CELL_SIZE: 140, // Grid cell size for >= 2 children
  SMALL_PADDING: 100, // Padding for < 2 children
  LARGE_PADDING: 150, // Padding for >= 2 children
  LARGE_CHILD_THRESHOLD: 2, // Threshold for larger grid
  DIAMOND_SIZE: 100, // Size of diamond nodes
};
```

**Sizing Algorithm** (`calculateCircleSize()`):

1. If no children: return default size (350px)
2. Calculate grid dimensions: `cols = ceil(sqrt(childCount))`, `rows = ceil(childCount / cols)`
3. If childCount >= 2: use LARGE grid (140px cells, 150px padding)
4. If childCount < 2: use SMALL grid (120px cells, 100px padding)
5. Return max of (gridWidth, gridHeight, DEFAULT_CIRCLE_SIZE)

**Grid Layout** (`createGridLayout()`):

- Positions children in a centered grid within the parent circle
- Uses relative coordinates (parent-relative positioning)
- Evenly distributes children across rows and columns
- Centers the grid within the circle using calculated offsets

#### Positional Layout

**Default Layout**:

- Client Group Types positioned in left column
- Client Groups positioned inside their parent type circles (grid layout)
- Revenue Streams positioned in top-right area
- Products positioned inside their parent stream circles (grid layout)
- Horizontal spacing: 600-700px between columns
- Vertical spacing: Calculated based on circle sizes

**Key Layout Functions**:

- `getLayoutedElements(nodes, edges)` - Main layout orchestrator
- `calculateCircleSize(childCount)` - Dynamic circle sizing
- `createGridLayout(childCount, circleSize, diamondSize)` - Grid positioning for children
- `groupClientGroupsByType(clientGroups)` - Groups children by parent type
- `calculateMaxCircleSize(groups)` - Finds largest circle needed for spacing

#### Saved Layout

- **Storage**: Positions saved to `localStorage` as `dependency-graph-layout`
- **Auto-save**: Triggers on node drag (debounced 300ms)
- **Reset Layout**: Button clears saved positions and reapplies default algorithm
- **Persistence**: Maintains user-customized positions across page refreshes
- **Functions**:
  - `saveLayoutToStorage(nodes)` - Saves node positions to localStorage
  - `loadLayoutFromStorage()` - Loads saved positions, falls back to null if missing
  - `resetLayout()` - Clears storage and triggers full re-layout

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

### Code Architecture & Production Quality

The dependency graph codebase follows strict production standards with emphasis on maintainability and type safety.

#### Code Organization

The main component (`dependency-graph.tsx`) is organized into clear sections:

1. **Imports & Type Definitions** - All dependencies and TypeScript types
2. **Constants** - All magic numbers extracted into named constants
3. **Helper Functions** - Reusable utility functions
4. **Main Component** - React component logic
5. **Event Handlers** - User interaction handlers
6. **Effects & Lifecycle** - useEffect hooks and data loading

#### Constants (No Magic Numbers)

All configuration values are extracted into typed constant objects:

```typescript
const Z_INDEX = {
  CIRCLE: 1,
  EDGE: 5,
  DIAMOND: 10,
} as const;

const LAYOUT_CONFIG = {
  DEFAULT_CIRCLE_SIZE: 350,
  SMALL_CELL_SIZE: 120,
  LARGE_CELL_SIZE: 140,
  SMALL_PADDING: 100,
  LARGE_PADDING: 150,
  LARGE_CHILD_THRESHOLD: 2,
  DIAMOND_SIZE: 100,
  CIRCLE_SPACING_BUFFER: 150,
  START_X: 200,
  START_Y: 200,
  HORIZONTAL_COLUMN_MULTIPLIER: 2,
} as const;

const TIMING = {
  DEBOUNCE_MS: 300,
  REFRESH_DELAY_MS: 100,
} as const;

const STORAGE_KEYS = {
  LAYOUT: 'dependency-graph-layout',
} as const;
```

#### Helper Functions

Reusable functions with single responsibilities and comprehensive JSDoc documentation:

**Node Creation**:

- `createStreamNodes(streams)` - Creates stream circle nodes with data
- `createProductNodes(products)` - Creates product diamond nodes with parent relationships
- `createClientGroupNodes(clientGroups)` - Creates client group diamond nodes with parent relationships
- `createClientGroupTypeNodes(groupsByType)` - Creates type circle nodes

**Layout Utilities**:

- `calculateCircleSize(childCount)` - Calculates dynamic circle size based on children
- `createGridLayout(childCount, circleSize, diamondSize)` - Generates grid positions for children
- `groupClientGroupsByType(clientGroups)` - Groups client groups by type for layout
- `calculateMaxCircleSize(groups)` - Finds maximum circle size needed

**Type Conversion**:

- `normalizeNodeType(type)` - Converts node type to normalized format for edges
- `denormalizeNodeType(type)` - Converts normalized type back to NodeType
- `createNodeId(type, id)` - Generates consistent node IDs

#### Type Safety

- **No `any` types** - All functions use proper TypeScript types
- **Strict type definitions**:

  ```typescript
  type StreamData = {
    id: number;
    name: string;
    type: string;
    description?: string | null;
  };

  type ProductData = {
    id: number;
    name: string;
    unitCost: string;
    productStreamId: number;
  };

  type ClientGroupData = {
    id: number;
    name: string;
    type: 'B2B' | 'B2C' | 'DTC';
    startingCustomers: number;
    churnRate: string;
  };
  ```

- **Explicit type annotations** where inference is insufficient
- **Type guards** for runtime type checking

#### JSDoc Documentation

All major functions include comprehensive JSDoc comments:

```typescript
/**
 * Calculates the appropriate circle size based on the number of children.
 * Uses a grid layout algorithm with different spacing for different child counts.
 *
 * @param childCount - Number of child nodes to fit inside the circle
 * @returns The calculated circle diameter in pixels
 */
function calculateCircleSize(childCount: number): number {
  // Implementation...
}
```

#### Production Standards

✅ **Code Quality**:

- No magic numbers - all values are named constants
- Single Responsibility Principle - each function has one clear purpose
- DRY (Don't Repeat Yourself) - common logic extracted into helpers
- Clear naming conventions - descriptive variable and function names

✅ **Type Safety**:

- Strict TypeScript with no `any` types
- Proper type definitions for all data structures
- Type guards for runtime safety

✅ **Documentation**:

- JSDoc comments on all major functions
- Inline comments for complex algorithms
- README sections for architecture overview

✅ **Maintainability**:

- Clear code organization with section dividers
- Reusable helper functions
- Consistent patterns throughout

### Working with the Dependency Graph

#### Adding a New Node Type

1. Create node component in `components/dependency-graph/nodes/`
2. Define handles with unique IDs
3. Add TypeScript type definition for node data
4. Create helper function (e.g., `createMyNodeNodes()`)
5. Add to `NODE_TYPES` in `dependency-graph.tsx`
6. Update `isValidConnection` for connection rules
7. Update `getLayoutedElements` for positioning
8. Update `normalizeNodeType` and `denormalizeNodeType` utilities

#### Adding a New Relationship Type

1. Add to `relationshipSchema` in `relationship-modal.tsx`
2. Update `getValidRelationshipTypes` in modal
3. Add edge styling in `relationship-edge.tsx`
4. Update handle connections in `handleSaveRelationship`
5. Update server action `createRelationship`
6. Update `normalizeNodeType` if needed for new node types

#### Debugging Tips

- Check browser console for edge filtering warnings
- Verify node IDs match edge source/target IDs (use `createNodeId()` helper)
- Ensure handles have matching IDs on both nodes
- Check `CLIENT_GROUP_TYPE_IDS` mapping for type nodes
- Verify z-index is set correctly (use `Z_INDEX` constants)
- Check parent-child relationships for diamond nodes (`parentNode`, `extent`)
- Validate grid layout calculations with different child counts

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
