'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
  NodeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { StreamNode } from './nodes/stream-node';
import { ProductNode } from './nodes/product-node';
import { ClientGroupNode } from './nodes/client-group-node';
import { ClientGroupTypeNode } from './nodes/client-group-type-node';
import { FirstPurchaseNode } from './nodes/first-purchase-node';
import { RelationshipEdge } from './edges/relationship-edge';
import { RelationshipModal } from './relationship-modal';
import { ConnectionLine } from './connection-line';
import { getRevenueStreams } from '@/lib/actions/revenue-stream-actions';
import { getProducts } from '@/lib/actions/product-actions';
import { getClientGroups } from '@/lib/actions/client-group-actions';
import {
  getAllUnifiedRelationships,
  createRelationship,
  updateRelationship,
  deleteRelationship,
} from '@/lib/actions/unified-relationship-actions';

// ============================================================================
// Constants
// ============================================================================

const NODE_TYPES = {
  stream: StreamNode,
  product: ProductNode,
  clientGroup: ClientGroupNode,
  clientGroupType: ClientGroupTypeNode,
  firstPurchaseNode: FirstPurchaseNode,
} as const;

const EDGE_TYPES = {
  relationship: RelationshipEdge,
} as const;

// Z-index hierarchy for layering (circles < edges < diamonds < first purchase nodes)
const Z_INDEX = {
  CIRCLE: 1, // Background layer for circle containers
  EDGE: 5, // Middle layer for relationship arrows
  DIAMOND: 10, // Foreground layer for diamond nodes
  FIRST_PURCHASE: 15, // Top layer for first purchase intermediate nodes
} as const;

// Layout configuration
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

// Timing configuration
const TIMING = {
  LAYOUT_SAVE_DEBOUNCE_MS: 300,
} as const;

// Storage keys
const STORAGE_KEYS = {
  LAYOUT: 'dependency-graph-layout',
} as const;

// Client Group Type ID mapping (UI uses strings, DB uses numbers)
const CLIENT_GROUP_TYPE_IDS = {
  B2B: 1,
  B2C: 2,
  DTC: 3,
} as const;

const CLIENT_GROUP_TYPE_ID_TO_STRING: Record<number, string> = {
  1: 'B2B',
  2: 'B2C',
  3: 'DTC',
};

// Hardcoded client group types
const CLIENT_GROUP_TYPES = [
  {
    id: 'B2B' as const,
    name: 'Business to Business',
    type: 'B2B' as const,
    description: 'Companies selling to other companies',
  },
  {
    id: 'B2C' as const,
    name: 'Business to Consumer',
    type: 'B2C' as const,
    description: 'Companies selling directly to consumers',
  },
  {
    id: 'DTC' as const,
    name: 'Direct to Consumer',
    type: 'DTC' as const,
    description: 'Brands selling directly to end customers',
  },
] as const;

// Valid connection patterns
const VALID_CONNECTIONS = [
  { source: 'product', target: 'clientgroup' },
  { source: 'clientgroup', target: 'product' }, // Creates FirstPurchaseNode
  { source: 'clientgroup', target: 'stream' }, // Creates FirstPurchaseNode
  { source: 'firstpurchasenode', target: 'product' }, // Upsell (only valid source for upselling)
  { source: 'product', target: 'clientgrouptype' },
  { source: 'clientgrouptype', target: 'product' },
] as const;

// ============================================================================
// Types
// ============================================================================

type NodeType =
  | 'stream'
  | 'product'
  | 'clientGroup'
  | 'clientGroupType'
  | 'firstPurchaseNode';

type ConnectionData = {
  source: string;
  target: string;
  sourceType: NodeType;
  targetType: NodeType;
};

type RelationshipData = {
  type: 'first_purchase' | 'existing_relationship' | 'upselling';
  weight?: string;
  probability?: string;
  afterMonths?: string;
};

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
  weight?: string | null;
};

type ClientGroupData = {
  id: number;
  name: string;
  type: 'B2B' | 'B2C' | 'DTC';
  startingCustomers: number;
  conversionRate: string;
  churnRate: string;
};

// ============================================================================
// Layout Utilities
// ============================================================================

/**
 * Calculates the optimal circle size based on the number of child nodes it contains.
 * Circles grow dynamically to accommodate more children with appropriate spacing.
 */
function calculateCircleSize(childCount: number): number {
  if (childCount === 0) return LAYOUT_CONFIG.DEFAULT_CIRCLE_SIZE;

  const cols = Math.ceil(Math.sqrt(childCount));
  const rows = Math.ceil(childCount / cols);

  // Use larger spacing for circles with many children
  const isLargeGrid = childCount >= LAYOUT_CONFIG.LARGE_CHILD_THRESHOLD;
  const cellSize = isLargeGrid
    ? LAYOUT_CONFIG.LARGE_CELL_SIZE
    : LAYOUT_CONFIG.SMALL_CELL_SIZE;
  const basePadding = isLargeGrid
    ? LAYOUT_CONFIG.LARGE_PADDING
    : LAYOUT_CONFIG.SMALL_PADDING;

  const gridWidth = cols * cellSize + basePadding;
  const gridHeight = rows * cellSize + basePadding;

  return Math.max(gridWidth, gridHeight, LAYOUT_CONFIG.DEFAULT_CIRCLE_SIZE);
}

/**
 * Creates a grid layout of positions for child nodes inside a circle.
 * Children are arranged in a square grid pattern, centered within the circle.
 */
function createGridLayout(
  childCount: number,
  circleSize: number
): { x: number; y: number }[] {
  if (childCount === 0) return [];

  const cols = Math.ceil(Math.sqrt(childCount));
  const rows = Math.ceil(childCount / cols);

  const isLargeGrid = childCount > LAYOUT_CONFIG.LARGE_CHILD_THRESHOLD;
  const cellWidth = isLargeGrid
    ? LAYOUT_CONFIG.LARGE_CELL_SIZE
    : LAYOUT_CONFIG.SMALL_CELL_SIZE;
  const cellHeight = isLargeGrid
    ? LAYOUT_CONFIG.LARGE_CELL_SIZE
    : LAYOUT_CONFIG.SMALL_CELL_SIZE;

  const gridWidth = cols * cellWidth;
  const gridHeight = rows * cellHeight;

  // Center the grid within the circle
  const startX = (circleSize - gridWidth) / 2;
  const startY = (circleSize - gridHeight) / 2;

  const positions: { x: number; y: number }[] = [];

  for (let i = 0; i < childCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    positions.push({
      x:
        startX +
        col * cellWidth +
        cellWidth / 2 -
        LAYOUT_CONFIG.DIAMOND_SIZE / 2,
      y:
        startY +
        row * cellHeight +
        cellHeight / 2 -
        LAYOUT_CONFIG.DIAMOND_SIZE / 2,
    });
  }

  return positions;
}

// ============================================================================
// Storage Utilities
// ============================================================================

/**
 * Saves node positions to localStorage for persistence across sessions.
 */
function saveLayoutToStorage(nodes: Node[]): void {
  try {
    const positions = nodes.reduce(
      (acc, node) => {
        acc[node.id] = node.position;
        return acc;
      },
      {} as Record<string, { x: number; y: number }>
    );

    localStorage.setItem(STORAGE_KEYS.LAYOUT, JSON.stringify(positions));
  } catch (error) {
    console.warn('Failed to save layout to localStorage:', error);
  }
}

/**
 * Loads saved node positions from localStorage.
 */
function loadLayoutFromStorage(): Record<
  string,
  { x: number; y: number }
> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAYOUT);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to load layout from localStorage:', error);
    return null;
  }
}

// ============================================================================
// Node Creation Helpers
// ============================================================================

/**
 * Creates stream (revenue stream) nodes from data.
 */
function createStreamNodes(streams: StreamData[]): Node[] {
  return streams.map((stream) => ({
    id: `stream-${stream.id}`,
    type: 'stream' as const,
    position: { x: 0, y: 0 },
    zIndex: Z_INDEX.CIRCLE,
    data: {
      id: stream.id,
      name: stream.name,
      type: stream.type,
      description: stream.description,
    },
  }));
}

/**
 * Creates product nodes from data.
 * Sets parentNode and extent to ensure proper parent-child relationship.
 */
function createProductNodes(products: ProductData[]): Node[] {
  return products.map((product) => ({
    id: `product-${product.id}`,
    type: 'product' as const,
    position: { x: 0, y: 0 },
    zIndex: Z_INDEX.DIAMOND,
    parentNode: `stream-${product.productStreamId}`,
    extent: 'parent' as const,
    data: {
      id: product.id,
      name: product.name,
      unitCost: product.unitCost,
      productStreamId: product.productStreamId,
      weight: product.weight,
    },
  }));
}

/**
 * Creates client group type nodes (B2B, B2C, DTC).
 */
function createClientGroupTypeNodes(): Node[] {
  return CLIENT_GROUP_TYPES.map((groupType) => ({
    id: `clientgrouptype-${groupType.id}`,
    type: 'clientGroupType' as const,
    position: { x: 0, y: 0 },
    zIndex: Z_INDEX.CIRCLE,
    data: {
      id: groupType.id,
      name: groupType.name,
      type: groupType.type,
      description: groupType.description,
    },
  }));
}

/**
 * Creates client group nodes from data.
 * Sets parentNode and extent to ensure proper parent-child relationship.
 */
function createClientGroupNodes(clientGroups: ClientGroupData[]): Node[] {
  return clientGroups.map((group) => ({
    id: `clientgroup-${group.id}`,
    type: 'clientGroup' as const,
    position: { x: 0, y: 0 },
    zIndex: Z_INDEX.DIAMOND,
    parentNode: `clientgrouptype-${group.type}`,
    extent: 'parent' as const,
    data: {
      id: group.id,
      name: group.name,
      type: group.type,
      startingCustomers: group.startingCustomers,
      conversionRate: group.conversionRate,
      churnRate: group.churnRate,
    },
  }));
}

// ============================================================================
// Type Conversion Utilities
// ============================================================================

/**
 * Converts database node type to node ID format (e.g., 'clientGroup' -> 'clientgroup').
 */
function normalizeNodeType(type: string): string {
  return type === 'clientGroup'
    ? 'clientgroup'
    : type === 'clientGroupType'
      ? 'clientgrouptype'
      : type === 'firstPurchaseNode'
        ? 'firstpurchasenode'
        : type;
}

/**
 * Converts node ID format to component type format (e.g., 'clientgroup' -> 'clientGroup').
 */
function denormalizeNodeType(type: string): NodeType {
  return type === 'clientgroup'
    ? 'clientGroup'
    : type === 'clientgrouptype'
      ? 'clientGroupType'
      : type === 'firstpurchasenode'
        ? 'firstPurchaseNode'
        : (type as NodeType);
}

/**
 * Converts database ID to node ID (handles client group type string IDs).
 */
function createNodeId(
  nodeType: string,
  id: number | string,
  isClientGroupType: boolean
): string {
  const normalizedType = normalizeNodeType(nodeType);

  if (isClientGroupType) {
    const stringId = CLIENT_GROUP_TYPE_ID_TO_STRING[id as number];
    return `${normalizedType}-${stringId}`;
  }

  return `${normalizedType}-${id}`;
}

// ============================================================================
// Layout Algorithm
// ============================================================================

/**
 * Applies layout to nodes and edges.
 * First tries to load saved layout from localStorage, otherwise applies default grid layout.
 */
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[]
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  // Filter out edges with missing nodes
  const nodeIds = new Set(nodes.map((node) => node.id));
  const validEdges = edges.filter((edge) => {
    const hasSource = nodeIds.has(edge.source);
    const hasTarget = nodeIds.has(edge.target);

    if (!hasSource || !hasTarget) {
      console.warn(
        `Filtering out edge ${edge.id}: source=${edge.source} (exists: ${hasSource}), target=${edge.target} (exists: ${hasTarget})`
      );
    }

    return hasSource && hasTarget;
  });

  // Try to load saved positions
  const savedPositions = loadLayoutFromStorage();

  if (savedPositions) {
    const layoutedNodes = nodes.map((node) => ({
      ...node,
      position: savedPositions[node.id] || node.position || { x: 0, y: 0 },
    }));

    // Calculate midpoint positions for FirstPurchaseNodes that don't have saved positions
    const finalNodes = layoutedNodes.map((node) => {
      if (
        node.type === 'firstPurchaseNode' &&
        (!savedPositions[node.id] ||
          (savedPositions[node.id].x === 0 && savedPositions[node.id].y === 0))
      ) {
        // Calculate midpoint between source and target
        const sourceNode = layoutedNodes.find(
          (n) => n.id === node.data.sourceId
        );
        const targetNode = layoutedNodes.find(
          (n) => n.id === node.data.targetId
        );

        if (sourceNode && targetNode) {
          const sourceCenterX = sourceNode.position.x + 50;
          const sourceCenterY = sourceNode.position.y + 50;
          const targetCenterX = targetNode.position.x + 50;
          const targetCenterY = targetNode.position.y + 50;

          return {
            ...node,
            position: {
              x: (sourceCenterX + targetCenterX) / 2 - 32,
              y: (sourceCenterY + targetCenterY) / 2 - 32,
            },
          };
        }
      }
      return node;
    });

    return Promise.resolve({
      nodes: finalNodes,
      edges: validEdges,
    });
  }

  // Apply default layout
  return applyDefaultLayout(nodes, validEdges);
}

/**
 * Applies the default grid layout to nodes.
 * Circles are positioned in columns, diamonds are positioned inside their parent circles.
 * FirstPurchaseNodes are not repositioned (they keep their calculated midpoint positions).
 */
function applyDefaultLayout(
  nodes: Node[],
  edges: Edge[]
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  // Separate nodes by type
  const parentStreamNodes = nodes.filter((node) => node.type === 'stream');
  const childProductNodes = nodes.filter((node) => node.type === 'product');
  const parentClientGroupTypeNodes = nodes.filter(
    (node) => node.type === 'clientGroupType'
  );
  const childClientGroupNodes = nodes.filter(
    (node) => node.type === 'clientGroup'
  );
  const firstPurchaseNodes = nodes.filter(
    (node) => node.type === 'firstPurchaseNode'
  );

  // Group children by their parents
  const clientGroupsByType = groupClientGroupsByType(childClientGroupNodes);
  const productsByStream = groupProductsByStream(childProductNodes);

  // Calculate maximum circle size for spacing
  const maxCircleSize = calculateMaxCircleSize(
    parentClientGroupTypeNodes,
    parentStreamNodes,
    clientGroupsByType,
    productsByStream
  );

  // Calculate spacing
  const horizontalSpacing = maxCircleSize + LAYOUT_CONFIG.CIRCLE_SPACING_BUFFER;
  const verticalSpacing = maxCircleSize + LAYOUT_CONFIG.CIRCLE_SPACING_BUFFER;

  const layoutedNodes: Node[] = [];

  // Position parent circles
  positionParentCircles(
    parentClientGroupTypeNodes,
    clientGroupsByType,
    layoutedNodes,
    LAYOUT_CONFIG.START_X,
    LAYOUT_CONFIG.START_Y,
    verticalSpacing
  );

  positionParentCircles(
    parentStreamNodes,
    productsByStream,
    layoutedNodes,
    LAYOUT_CONFIG.START_X +
      horizontalSpacing * LAYOUT_CONFIG.HORIZONTAL_COLUMN_MULTIPLIER,
    LAYOUT_CONFIG.START_Y,
    verticalSpacing
  );

  // Position children inside parents
  positionChildrenInParents(
    clientGroupsByType,
    layoutedNodes,
    'clientGroupType'
  );
  positionChildrenInParents(productsByStream, layoutedNodes, 'stream');

  // Calculate and add FirstPurchaseNodes with midpoint positions
  firstPurchaseNodes.forEach((fpNode) => {
    const sourceNode = layoutedNodes.find((n) => n.id === fpNode.data.sourceId);
    const targetNode = layoutedNodes.find((n) => n.id === fpNode.data.targetId);

    if (sourceNode && targetNode) {
      const sourceCenterX = sourceNode.position.x + 50;
      const sourceCenterY = sourceNode.position.y + 50;
      const targetCenterX = targetNode.position.x + 50;
      const targetCenterY = targetNode.position.y + 50;

      layoutedNodes.push({
        ...fpNode,
        position: {
          x: (sourceCenterX + targetCenterX) / 2 - 32,
          y: (sourceCenterY + targetCenterY) / 2 - 32,
        },
      });
    } else {
      // Fallback: add with default position if nodes not found
      layoutedNodes.push(fpNode);
    }
  });

  return Promise.resolve({
    nodes: layoutedNodes,
    edges,
  });
}

/**
 * Groups client group nodes by their type (B2B, B2C, DTC).
 */
function groupClientGroupsByType(clientGroups: Node[]): Record<string, Node[]> {
  const groups: Record<string, Node[]> = { B2B: [], B2C: [], DTC: [] };

  clientGroups.forEach((node) => {
    const type = node.data.type as 'B2B' | 'B2C' | 'DTC';
    if (groups[type]) {
      groups[type].push(node);
    }
  });

  return groups;
}

/**
 * Groups product nodes by their parent stream ID.
 */
function groupProductsByStream(products: Node[]): Record<number, Node[]> {
  const groups: Record<number, Node[]> = {};

  products.forEach((node) => {
    const streamId = node.data.productStreamId;
    if (!groups[streamId]) {
      groups[streamId] = [];
    }
    groups[streamId].push(node);
  });

  return groups;
}

/**
 * Calculates the maximum circle size needed for layout spacing.
 */
function calculateMaxCircleSize(
  parentClientGroupTypeNodes: Node[],
  parentStreamNodes: Node[],
  clientGroupsByType: Record<string, Node[]>,
  productsByStream: Record<number, Node[]>
): number {
  let maxSize: number = LAYOUT_CONFIG.DEFAULT_CIRCLE_SIZE;

  parentClientGroupTypeNodes.forEach((node) => {
    const type = node.data.type as string;
    const childCount = clientGroupsByType[type]?.length || 0;
    maxSize = Math.max(maxSize, calculateCircleSize(childCount));
  });

  parentStreamNodes.forEach((node) => {
    const streamId = node.data.id;
    const childCount = productsByStream[streamId]?.length || 0;
    maxSize = Math.max(maxSize, calculateCircleSize(childCount));
  });

  return maxSize;
}

/**
 * Positions parent circle nodes in a vertical column.
 */
function positionParentCircles(
  parentNodes: Node[],
  childrenMap: Record<string | number, Node[]>,
  layoutedNodes: Node[],
  startX: number,
  startY: number,
  verticalSpacing: number
): void {
  parentNodes.forEach((node, index) => {
    const key = node.type === 'stream' ? node.data.id : node.data.type;
    const childCount = childrenMap[key]?.length || 0;
    const circleSize = calculateCircleSize(childCount);

    layoutedNodes.push({
      ...node,
      position: {
        x: startX,
        y: startY + index * verticalSpacing,
      },
      data: {
        ...node.data,
        circleSize,
      },
    });
  });
}

/**
 * Positions child nodes inside their parent circles using a grid layout.
 */
function positionChildrenInParents(
  childrenMap: Record<string | number, Node[]>,
  layoutedNodes: Node[],
  parentType: 'clientGroupType' | 'stream'
): void {
  Object.entries(childrenMap).forEach(([key, children]) => {
    const parentNode = layoutedNodes.find((n) => {
      if (parentType === 'clientGroupType') {
        return n.type === 'clientGroupType' && n.data.type === key;
      } else {
        return n.type === 'stream' && n.data.id === parseInt(key);
      }
    });

    if (parentNode && children.length > 0) {
      const circleSize = parentNode.data.circleSize as number;
      const gridPositions = createGridLayout(children.length, circleSize);

      children.forEach((child, index) => {
        layoutedNodes.push({
          ...child,
          position: gridPositions[index],
          // parentNode and extent already set in node creation
        });
      });
    }
  });
}

// ============================================================================
// Main Component
// ============================================================================

function DependencyGraphInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [connectionData, setConnectionData] = useState<ConnectionData | null>(
    null
  );
  const [editingRelationship, setEditingRelationship] = useState<{
    id: string;
    data: {
      relationship: string;
      properties: Record<string, string | number>;
      relationshipId?: number;
    };
  } | null>(null);

  // ============================================================================
  // Layout Management
  // ============================================================================

  /**
   * Handles node changes and auto-saves layout when nodes are moved.
   */
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      const hasPositionChanges = changes.some(
        (change) => change.type === 'position'
      );

      if (hasPositionChanges) {
        setTimeout(() => {
          setNodes((currentNodes) => {
            saveLayoutToStorage(currentNodes);
            return currentNodes;
          });
        }, TIMING.LAYOUT_SAVE_DEBOUNCE_MS);
      }
    },
    [onNodesChange, setNodes]
  );

  /**
   * Resets layout to default and clears saved positions.
   */
  const resetLayout = useCallback(async () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.LAYOUT);

      const layouted = await getLayoutedElements(nodes, edges);
      if (layouted) {
        setNodes(layouted.nodes);
      }
    } catch (error) {
      console.error('Failed to reset layout:', error);
    }
  }, [nodes, edges, setNodes]);

  // ============================================================================
  // Connection Validation
  // ============================================================================

  /**
   * Validates whether a connection between two nodes is allowed.
   */
  const isValidConnection = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return false;

    const sourceType = connection.source.split('-')[0];
    const targetType = connection.target.split('-')[0];

    return VALID_CONNECTIONS.some(
      (conn) => conn.source === sourceType && conn.target === targetType
    );
  }, []);

  /**
   * Handles when a user creates a new connection.
   */
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target && isValidConnection(params)) {
        const rawSourceType = params.source.split('-')[0];
        const rawTargetType = params.target.split('-')[0];

        setConnectionData({
          source: params.source,
          target: params.target,
          sourceType: denormalizeNodeType(rawSourceType),
          targetType: denormalizeNodeType(rawTargetType),
        });
        setModalOpen(true);
      }
    },
    [isValidConnection]
  );

  // ============================================================================
  // Relationship Management
  // ============================================================================

  /**
   * Creates edge data object for a relationship.
   */
  const createRelationshipEdgeData = useCallback(
    (
      relationshipData: RelationshipData,
      relationshipId: number,
      sourceId: string,
      targetId: string,
      sourceType: NodeType,
      targetType: NodeType
    ) => ({
      relationship: relationshipData.type,
      properties: relationshipData,
      relationshipId,
      onEdit: (
        edgeId: string,
        edgeData: {
          relationship: string;
          properties: Record<string, string | number>;
        }
      ) => {
        setEditingRelationship({
          id: edgeId,
          data: { ...edgeData, relationshipId },
        });
        setConnectionData({
          source: sourceId,
          target: targetId,
          sourceType,
          targetType,
        });
        setModalOpen(true);
      },
      onDelete: async (edgeId: string) => {
        try {
          const id = parseInt(edgeId.split('-')[1]);

          if (isNaN(id)) {
            console.error('Invalid relationship ID in edge:', edgeId);
            return;
          }

          const result = await deleteRelationship(id);

          if (result.success) {
            // Remove the edge(s)
            setEdges((eds) => {
              // For first_purchase relationships, remove both edges (to-fp and from-fp)
              return eds.filter(
                (edge) =>
                  edge.id !== edgeId &&
                  edge.id !== `relationship-${id}-to-fp` &&
                  edge.id !== `relationship-${id}-from-fp`
              );
            });

            // Remove FirstPurchaseNode if it exists
            const fpNodeId = `firstpurchasenode-rel-${id}`;
            setNodes((nds) => nds.filter((node) => node.id !== fpNodeId));
          } else {
            console.error('Failed to delete relationship:', result.error);
          }
        } catch (error) {
          console.error('Error deleting relationship:', error);
        }
      },
    }),
    [setEdges, setNodes]
  );

  /**
   * Handles saving a relationship (create or update).
   */
  const handleSaveRelationship = useCallback(
    async (relationshipData: RelationshipData) => {
      if (!connectionData) return;

      try {
        const sourceIdParts = connectionData.source.split('-');
        const targetIdParts = connectionData.target.split('-');

        // Convert IDs (handle client group type string IDs and FirstPurchaseNode IDs)
        const finalSourceId =
          connectionData.sourceType === 'clientGroupType'
            ? CLIENT_GROUP_TYPE_IDS[
                sourceIdParts[1] as keyof typeof CLIENT_GROUP_TYPE_IDS
              ]
            : connectionData.sourceType === 'firstPurchaseNode'
              ? parseInt(sourceIdParts[2]) // FirstPurchaseNode ID format: firstpurchasenode-rel-{relationshipId}
              : parseInt(sourceIdParts[1]);

        const finalTargetId =
          connectionData.targetType === 'clientGroupType'
            ? CLIENT_GROUP_TYPE_IDS[
                targetIdParts[1] as keyof typeof CLIENT_GROUP_TYPE_IDS
              ]
            : parseInt(targetIdParts[1]);

        // Handle upselling from FirstPurchaseNode
        let actualSourceType = connectionData.sourceType;
        let actualSourceId = finalSourceId;

        if (connectionData.sourceType === 'firstPurchaseNode') {
          // For upselling, we need to find the original target product from the FirstPurchaseNode
          const fpNode = nodes.find((n) => n.id === connectionData.source);
          if (fpNode && fpNode.data.targetType === 'product') {
            actualSourceType = 'product';
            // Extract product ID from targetId (format: "product-123")
            const targetProductId = parseInt(
              fpNode.data.targetId.split('-')[1]
            );
            actualSourceId = targetProductId;
          } else {
            console.error('Could not find product from FirstPurchaseNode');
            return;
          }
        }

        // Create or update relationship
        const result = editingRelationship?.data?.relationshipId
          ? await updateRelationship(
              editingRelationship.data.relationshipId,
              relationshipData
            )
          : await createRelationship({
              sourceType: actualSourceType,
              sourceId: actualSourceId,
              targetType: connectionData.targetType,
              targetId: finalTargetId,
              relationshipType: relationshipData.type,
              properties: relationshipData,
            });

        if (!result.success) {
          console.error('Failed to save relationship:', result.error);
          return;
        }

        // Update UI
        if (editingRelationship) {
          setEdges((eds) =>
            eds.map((edge) =>
              edge.id === editingRelationship.id
                ? {
                    ...edge,
                    data: {
                      ...edge.data,
                      relationship: relationshipData.type,
                      properties: relationshipData,
                    },
                  }
                : edge
            )
          );
        } else if (result.data) {
          // Special handling for first_purchase relationships
          if (relationshipData.type === 'first_purchase') {
            // Create intermediate FirstPurchaseNode
            const fpNodeId = `firstpurchasenode-rel-${result.data.id}`;

            // Calculate midpoint position between source and target
            const sourceNode = nodes.find(
              (n) => n.id === connectionData.source
            );
            const targetNode = nodes.find(
              (n) => n.id === connectionData.target
            );

            let fpNodePosition = { x: 500, y: 300 }; // Default position

            if (sourceNode && targetNode) {
              const sourcePos = sourceNode.position;
              const targetPos = targetNode.position;

              // Calculate actual center positions considering node sizes
              const sourceCenterX = sourcePos.x + 50; // Approximate node center
              const sourceCenterY = sourcePos.y + 50;
              const targetCenterX = targetPos.x + 50;
              const targetCenterY = targetPos.y + 50;

              fpNodePosition = {
                x: (sourceCenterX + targetCenterX) / 2 - 32, // Center the 64px node
                y: (sourceCenterY + targetCenterY) / 2 - 32,
              };
            }

            // Create FirstPurchaseNode
            const fpNode: Node = {
              id: fpNodeId,
              type: 'firstPurchaseNode',
              position: fpNodePosition,
              zIndex: Z_INDEX.FIRST_PURCHASE,
              data: {
                relationshipId: result.data.id,
                sourceId: connectionData.source,
                targetId: connectionData.target,
                sourceType: connectionData.sourceType,
                targetType: connectionData.targetType,
                weight: relationshipData.weight,
              },
            };

            // Create two edges: source -> FPNode and FPNode -> target
            const edge1: Edge = {
              id: `relationship-${result.data.id}-to-fp`,
              source: connectionData.source,
              target: fpNodeId,
              type: 'relationship',
              zIndex: Z_INDEX.EDGE,
              data: createRelationshipEdgeData(
                relationshipData,
                result.data.id,
                connectionData.source,
                fpNodeId,
                connectionData.sourceType,
                'firstPurchaseNode'
              ),
            };

            const edge2: Edge = {
              id: `relationship-${result.data.id}-from-fp`,
              source: fpNodeId,
              target: connectionData.target,
              type: 'relationship',
              zIndex: Z_INDEX.EDGE,
              data: createRelationshipEdgeData(
                relationshipData,
                result.data.id,
                fpNodeId,
                connectionData.target,
                'firstPurchaseNode',
                connectionData.targetType
              ),
            };

            // Add node and edges to graph
            setNodes((nds) => [...nds, fpNode]);
            setEdges((eds) => [...eds, edge1, edge2]);
          } else if (relationshipData.type === 'upselling') {
            // Upselling from FirstPurchaseNode - create single edge
            const newEdge: Edge = {
              id: `relationship-${result.data.id}`,
              source: connectionData.source,
              target: connectionData.target,
              type: 'relationship',
              zIndex: Z_INDEX.EDGE,
              data: createRelationshipEdgeData(
                relationshipData,
                result.data.id,
                connectionData.source,
                connectionData.target,
                connectionData.sourceType,
                connectionData.targetType
              ),
            };

            setEdges((eds) => addEdge(newEdge, eds));
          } else {
            // Standard relationship (existing_relationship, etc.)
            const newEdge: Edge = {
              id: `relationship-${result.data.id}`,
              source: connectionData.source,
              target: connectionData.target,
              type: 'relationship',
              zIndex: Z_INDEX.EDGE,
              data: createRelationshipEdgeData(
                relationshipData,
                result.data.id,
                connectionData.source,
                connectionData.target,
                connectionData.sourceType,
                connectionData.targetType
              ),
            };

            setEdges((eds) => addEdge(newEdge, eds));
          }
        }

        setConnectionData(null);
        setEditingRelationship(null);

        // Small delay to allow modal updates to complete, then refresh edge weights
        setTimeout(async () => {
          try {
            const relationships = await getAllUnifiedRelationships();

            // Update all edges with latest weights from database
            setEdges((currentEdges) =>
              currentEdges.map((edge) => {
                const edgeRelId = parseInt(edge.id.split('-')[1]);
                const updatedRel = relationships.find(
                  (rel) => rel.id === edgeRelId
                );

                if (updatedRel && updatedRel.properties.weight) {
                  return {
                    ...edge,
                    data: {
                      ...edge.data,
                      properties: {
                        ...edge.data.properties,
                        weight: updatedRel.properties.weight,
                      },
                    },
                  };
                }

                return edge;
              })
            );
          } catch (error) {
            console.error('Failed to refresh edge weights:', error);
          }
        }, 500);
      } catch (error) {
        console.error('Error saving relationship:', error);
      }
    },
    [
      connectionData,
      editingRelationship,
      nodes,
      setNodes,
      setEdges,
      createRelationshipEdgeData,
    ]
  );

  // ============================================================================
  // Data Loading
  // ============================================================================

  /**
   * Loads initial data and creates nodes/edges.
   */
  useEffect(() => {
    async function loadData() {
      try {
        const [streams, products, clientGroups, relationships] =
          await Promise.all([
            getRevenueStreams(),
            getProducts(),
            getClientGroups(),
            getAllUnifiedRelationships(),
          ]);

        // Create all nodes
        const newNodes: Node[] = [
          ...createStreamNodes(streams),
          ...createProductNodes(products),
          ...createClientGroupTypeNodes(),
          ...createClientGroupNodes(clientGroups),
        ];

        // Create FirstPurchaseNodes and edges
        // First pass: create FirstPurchaseNodes from first_purchase relationships
        const firstPurchaseNodes: Node[] = [];
        const newEdges: Edge[] = [];
        const productToFPNodeMap = new Map<number, string>(); // Maps product ID to its FirstPurchaseNode ID

        // First pass: create FirstPurchaseNodes
        relationships.forEach((relationship) => {
          if (relationship.relationshipType === 'first_purchase') {
            const sourceId = createNodeId(
              relationship.sourceType,
              relationship.sourceId,
              relationship.sourceType === 'clientGroupType'
            );
            const targetId = createNodeId(
              relationship.targetType,
              relationship.targetId,
              relationship.targetType === 'clientGroupType'
            );

            const sourceType = denormalizeNodeType(
              normalizeNodeType(relationship.sourceType)
            );
            const targetType = denormalizeNodeType(
              normalizeNodeType(relationship.targetType)
            );

            const fpNodeId = `firstpurchasenode-rel-${relationship.id}`;

            // Create FirstPurchaseNode with placeholder position
            // The actual position will be calculated later based on layouted node positions
            const fpNode: Node = {
              id: fpNodeId,
              type: 'firstPurchaseNode',
              position: { x: 0, y: 0 }, // Placeholder - will be calculated in layout
              zIndex: Z_INDEX.FIRST_PURCHASE,
              data: {
                relationshipId: relationship.id,
                sourceId,
                targetId,
                sourceType,
                targetType,
                weight: relationship.properties.weight,
              },
            };

            firstPurchaseNodes.push(fpNode);

            // Map the target product to this FirstPurchaseNode
            if (targetType === 'product') {
              productToFPNodeMap.set(relationship.targetId, fpNodeId);
            }

            // Create two edges: source -> FPNode and FPNode -> target
            const edge1: Edge = {
              id: `relationship-${relationship.id}-to-fp`,
              source: sourceId,
              target: fpNodeId,
              type: 'relationship',
              zIndex: Z_INDEX.EDGE,
              data: createRelationshipEdgeData(
                relationship.properties as RelationshipData,
                relationship.id,
                sourceId,
                fpNodeId,
                sourceType,
                'firstPurchaseNode'
              ),
            };

            const edge2: Edge = {
              id: `relationship-${relationship.id}-from-fp`,
              source: fpNodeId,
              target: targetId,
              type: 'relationship',
              zIndex: Z_INDEX.EDGE,
              data: createRelationshipEdgeData(
                relationship.properties as RelationshipData,
                relationship.id,
                fpNodeId,
                targetId,
                'firstPurchaseNode',
                targetType
              ),
            };

            newEdges.push(edge1, edge2);
          }
        });

        // Second pass: create edges for other relationships (including upsells)
        relationships.forEach((relationship) => {
          if (relationship.relationshipType !== 'first_purchase') {
            let sourceId = createNodeId(
              relationship.sourceType,
              relationship.sourceId,
              relationship.sourceType === 'clientGroupType'
            );
            const targetId = createNodeId(
              relationship.targetType,
              relationship.targetId,
              relationship.targetType === 'clientGroupType'
            );

            let sourceType = denormalizeNodeType(
              normalizeNodeType(relationship.sourceType)
            );
            const targetType = denormalizeNodeType(
              normalizeNodeType(relationship.targetType)
            );

            // Check if this is an upsell from a product that has a FirstPurchaseNode
            if (
              relationship.relationshipType === 'upselling' &&
              relationship.sourceType === 'product'
            ) {
              const fpNodeId = productToFPNodeMap.get(relationship.sourceId);
              if (fpNodeId) {
                // Redirect the edge to come from the FirstPurchaseNode instead
                sourceId = fpNodeId;
                sourceType = 'firstPurchaseNode';
              }
            }

            // Create edge
            const edge: Edge = {
              id: `relationship-${relationship.id}`,
              source: sourceId,
              target: targetId,
              type: 'relationship',
              zIndex: Z_INDEX.EDGE,
              data: createRelationshipEdgeData(
                relationship.properties as RelationshipData,
                relationship.id,
                sourceId,
                targetId,
                sourceType,
                targetType
              ),
            };

            newEdges.push(edge);
          }
        });

        // Combine all nodes
        const allNodes = [...newNodes, ...firstPurchaseNodes];

        // Apply layout
        const layouted = await getLayoutedElements(allNodes, newEdges);
        if (layouted) {
          setNodes(layouted.nodes);
          setEdges(layouted.edges);
        }
      } catch (error) {
        console.error('Failed to load dependency graph data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [setNodes, setEdges, createRelationshipEdgeData]);

  /**
   * Auto-refreshes data when page becomes visible.
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden || loading) return;

      async function reloadData() {
        try {
          const [streams, products, clientGroups] = await Promise.all([
            getRevenueStreams(),
            getProducts(),
            getClientGroups(),
          ]);

          const baseNodes: Node[] = [
            ...createStreamNodes(streams),
            ...createProductNodes(products),
            ...createClientGroupTypeNodes(),
            ...createClientGroupNodes(clientGroups),
          ];

          // Preserve FirstPurchaseNodes from current state
          const currentFPNodes = nodes.filter(
            (n) => n.type === 'firstPurchaseNode'
          );

          const allNodes = [...baseNodes, ...currentFPNodes];

          const layouted = await getLayoutedElements(allNodes, edges);
          if (layouted) {
            setNodes(layouted.nodes);
            setEdges(layouted.edges);
          }
        } catch (error) {
          console.error('Failed to reload dependency graph data:', error);
        }
      }

      reloadData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [edges, loading, nodes, setNodes, setEdges]);

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-lg">Loading dependency graph...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <div className="p-4 border-b bg-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Dependency Graph</h1>
            <p className="text-muted-foreground">
              Visual representation of relationships between Revenue Streams,
              Products, and Client Groups
            </p>
          </div>
          <button
            onClick={resetLayout}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            title="Reset to default layout and clear saved positions"
          >
            Reset Layout
          </button>
        </div>
      </div>

      <div className="h-[calc(100%-80px)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          connectionLineComponent={ConnectionLine}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap />
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>

      {connectionData && (
        <RelationshipModal
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) {
              setEditingRelationship(null);
              setConnectionData(null);
            }
          }}
          sourceType={connectionData.sourceType}
          targetType={connectionData.targetType}
          sourceId={connectionData.source}
          targetId={connectionData.target}
          onSave={handleSaveRelationship}
          editData={
            editingRelationship?.data?.properties
              ? {
                  type: editingRelationship.data.relationship as
                    | 'first_purchase'
                    | 'existing_relationship'
                    | 'upselling',
                  weight:
                    editingRelationship.data.properties.weight?.toString() ||
                    '',
                  probability:
                    editingRelationship.data.properties.probability?.toString() ||
                    '',
                  afterMonths:
                    editingRelationship.data.properties.afterMonths?.toString() ||
                    '',
                }
              : null
          }
        />
      )}
    </div>
  );
}

export function DependencyGraph() {
  return (
    <ReactFlowProvider>
      <DependencyGraphInner />
    </ReactFlowProvider>
  );
}
