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
} as const;

const EDGE_TYPES = {
  relationship: RelationshipEdge,
} as const;

// Z-index hierarchy for layering (circles < edges < diamonds)
const Z_INDEX = {
  CIRCLE: 1, // Background layer for circle containers
  EDGE: 5, // Middle layer for relationship arrows
  DIAMOND: 10, // Foreground layer for diamond nodes
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
  { source: 'clientgroup', target: 'product' },
  { source: 'clientgroup', target: 'stream' },
  { source: 'product', target: 'product' },
  { source: 'product', target: 'clientgrouptype' },
  { source: 'clientgrouptype', target: 'product' },
] as const;

// ============================================================================
// Types
// ============================================================================

type NodeType = 'stream' | 'product' | 'clientGroup' | 'clientGroupType';

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
 */
function createProductNodes(products: ProductData[]): Node[] {
  return products.map((product) => ({
    id: `product-${product.id}`,
    type: 'product' as const,
    position: { x: 0, y: 0 },
    zIndex: Z_INDEX.DIAMOND,
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
 */
function createClientGroupNodes(clientGroups: ClientGroupData[]): Node[] {
  return clientGroups.map((group) => ({
    id: `clientgroup-${group.id}`,
    type: 'clientGroup' as const,
    position: { x: 0, y: 0 },
    zIndex: Z_INDEX.DIAMOND,
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

    return Promise.resolve({
      nodes: layoutedNodes,
      edges: validEdges,
    });
  }

  // Apply default layout
  return applyDefaultLayout(nodes, validEdges);
}

/**
 * Applies the default grid layout to nodes.
 * Circles are positioned in columns, diamonds are positioned inside their parent circles.
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
          parentNode: parentNode.id,
          extent: 'parent',
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
            setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
          } else {
            console.error('Failed to delete relationship:', result.error);
          }
        } catch (error) {
          console.error('Error deleting relationship:', error);
        }
      },
    }),
    [setEdges]
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

        // Convert IDs (handle client group type string IDs)
        const finalSourceId =
          connectionData.sourceType === 'clientGroupType'
            ? CLIENT_GROUP_TYPE_IDS[
                sourceIdParts[1] as keyof typeof CLIENT_GROUP_TYPE_IDS
              ]
            : parseInt(sourceIdParts[1]);

        const finalTargetId =
          connectionData.targetType === 'clientGroupType'
            ? CLIENT_GROUP_TYPE_IDS[
                targetIdParts[1] as keyof typeof CLIENT_GROUP_TYPE_IDS
              ]
            : parseInt(targetIdParts[1]);

        // Create or update relationship
        const result = editingRelationship?.data?.relationshipId
          ? await updateRelationship(
              editingRelationship.data.relationshipId,
              relationshipData
            )
          : await createRelationship({
              sourceType: connectionData.sourceType,
              sourceId: finalSourceId,
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

        setConnectionData(null);
        setEditingRelationship(null);
      } catch (error) {
        console.error('Error saving relationship:', error);
      }
    },
    [connectionData, editingRelationship, setEdges, createRelationshipEdgeData]
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

        // Create all edges
        const newEdges: Edge[] = relationships.map((relationship) => {
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

          return {
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
        });

        // Apply layout
        const layouted = await getLayoutedElements(newNodes, newEdges);
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

          const newNodes: Node[] = [
            ...createStreamNodes(streams),
            ...createProductNodes(products),
            ...createClientGroupTypeNodes(),
            ...createClientGroupNodes(clientGroups),
          ];

          const layouted = await getLayoutedElements(newNodes, edges);
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
  }, [edges, loading, setNodes, setEdges]);

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
