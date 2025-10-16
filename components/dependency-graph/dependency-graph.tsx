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

// Define nodeTypes and edgeTypes outside the component to prevent recreating them on every render
const NODE_TYPES = {
  stream: StreamNode,
  product: ProductNode,
  clientGroup: ClientGroupNode,
  clientGroupType: ClientGroupTypeNode,
} as const;

const EDGE_TYPES = {
  relationship: RelationshipEdge,
} as const;

// Client Group Type ID mapping (since we use string IDs like 'B2B' but DB expects numbers)
const CLIENT_GROUP_TYPE_IDS = {
  B2B: 1,
  B2C: 2,
  DTC: 3,
} as const;

// Reverse mapping from numeric ID to string ID
const CLIENT_GROUP_TYPE_ID_TO_STRING: Record<number, string> = {
  1: 'B2B',
  2: 'B2C',
  3: 'DTC',
};

// Diamond pattern positions for child nodes (relative to parent center)
const DIAMOND_POSITIONS = [
  { x: 0, y: -80 }, // top
  { x: 80, y: 0 }, // right
  { x: 0, y: 80 }, // bottom
  { x: -80, y: 0 }, // left
];

// Save node positions to localStorage
const saveLayoutToStorage = (nodes: Node[]) => {
  try {
    const positions = nodes.reduce(
      (acc, node) => {
        acc[node.id] = node.position;
        return acc;
      },
      {} as Record<string, { x: number; y: number }>
    );

    localStorage.setItem('dependency-graph-layout', JSON.stringify(positions));
  } catch (error) {
    console.warn('Failed to save layout to localStorage:', error);
  }
};

// Load node positions from localStorage
const loadLayoutFromStorage = (): Record<
  string,
  { x: number; y: number }
> | null => {
  try {
    const stored = localStorage.getItem('dependency-graph-layout');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to load layout from localStorage:', error);
    return null;
  }
};

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  // Filter edges to only include those between existing nodes
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

  // Try to load saved positions first
  const savedPositions = loadLayoutFromStorage();

  if (savedPositions) {
    // Use saved positions if available
    const layoutedNodes = nodes.map((node) => {
      const savedPosition = savedPositions[node.id];
      return {
        ...node,
        position: savedPosition || node.position || { x: 0, y: 0 },
      };
    });

    return Promise.resolve({
      nodes: layoutedNodes,
      edges: validEdges,
    });
  }

  // Default structured layout with parent-child relationships
  // Separate nodes by type
  const parentStreamNodes = nodes.filter((node) => node.type === 'stream');
  const childProductNodes = nodes.filter((node) => node.type === 'product');
  const parentClientGroupTypeNodes = nodes.filter(
    (node) => node.type === 'clientGroupType'
  );
  const childClientGroupNodes = nodes.filter(
    (node) => node.type === 'clientGroup'
  );

  const layoutedNodes: Node[] = [];

  // Layout parameters
  const horizontalSpacing = 450; // Increased spacing for larger circles
  const verticalSpacing = 450;
  const startX = 200;
  const startY = 200;

  // Position client group type parent circles on left
  parentClientGroupTypeNodes.forEach((node, index) => {
    layoutedNodes.push({
      ...node,
      position: {
        x: startX,
        y: startY + index * verticalSpacing,
      },
    });
  });

  // Position revenue stream parent circles on right
  parentStreamNodes.forEach((node, index) => {
    layoutedNodes.push({
      ...node,
      position: {
        x: startX + horizontalSpacing * 2,
        y: startY + index * verticalSpacing,
      },
    });
  });

  // Group child client groups by their parent type
  const clientGroupsByType: Record<string, typeof childClientGroupNodes> = {
    B2B: [],
    B2C: [],
    DTC: [],
  };

  childClientGroupNodes.forEach((node) => {
    const type = node.data.type as 'B2B' | 'B2C' | 'DTC';
    if (clientGroupsByType[type]) {
      clientGroupsByType[type].push(node);
    }
  });

  // Position child client groups within their parent circles
  Object.entries(clientGroupsByType).forEach(([type, children]) => {
    const parentNode = layoutedNodes.find(
      (n) => n.type === 'clientGroupType' && n.data.type === type
    );
    if (parentNode) {
      children.forEach((child, index) => {
        const position = DIAMOND_POSITIONS[index % DIAMOND_POSITIONS.length];
        layoutedNodes.push({
          ...child,
          parentNode: `clientgrouptype-${type}`,
          extent: 'parent' as const,
          position: position,
        });
      });
    }
  });

  // Group child products by their parent stream
  const productsByStream: Record<number, typeof childProductNodes> = {};

  childProductNodes.forEach((node) => {
    const streamId = node.data.productStreamId;
    if (!productsByStream[streamId]) {
      productsByStream[streamId] = [];
    }
    productsByStream[streamId].push(node);
  });

  // Position child products within their parent circles
  Object.entries(productsByStream).forEach(([streamId, children]) => {
    const parentNode = layoutedNodes.find(
      (n) => n.type === 'stream' && n.data.id === parseInt(streamId)
    );
    if (parentNode) {
      children.forEach((child, index) => {
        const position = DIAMOND_POSITIONS[index % DIAMOND_POSITIONS.length];
        layoutedNodes.push({
          ...child,
          parentNode: `stream-${streamId}`,
          extent: 'parent' as const,
          position: position,
        });
      });
    }
  });

  return Promise.resolve({
    nodes: layoutedNodes,
    edges: validEdges,
  });
};

function DependencyGraphInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Custom nodes change handler that auto-saves layout
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      // Check if any changes involve position updates
      const hasPositionChanges = changes.some(
        (change) => change.type === 'position'
      );

      if (hasPositionChanges) {
        // Save layout after a short delay to debounce saves during dragging
        setTimeout(() => {
          setNodes((currentNodes) => {
            saveLayoutToStorage(currentNodes);
            return currentNodes;
          });
        }, 300);
      }
    },
    [onNodesChange, setNodes]
  );

  // Reset layout to default and clear saved positions
  const resetLayout = useCallback(async () => {
    try {
      localStorage.removeItem('dependency-graph-layout');

      // Reapply default layout
      const layouted = await getLayoutedElements(nodes, edges);
      if (layouted) {
        setNodes(layouted.nodes);
      }
    } catch (error) {
      console.error('Failed to reset layout:', error);
    }
  }, [nodes, edges, setNodes]);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [connectionData, setConnectionData] = useState<{
    source: string;
    target: string;
    sourceType: 'stream' | 'product' | 'clientGroup' | 'clientGroupType';
    targetType: 'stream' | 'product' | 'clientGroup' | 'clientGroupType';
  } | null>(null);
  const [editingRelationship, setEditingRelationship] = useState<{
    id: string;
    data: {
      relationship: string;
      properties: Record<string, string | number>;
      relationshipId?: number;
    };
  } | null>(null);

  const isValidConnection = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return false;

    const sourceType = connection.source.split('-')[0];
    const targetType = connection.target.split('-')[0];

    // Define valid connection patterns
    const validConnections = [
      { source: 'product', target: 'clientgroup' }, // Product can connect to ClientGroup
      { source: 'clientgroup', target: 'product' }, // ClientGroup can connect to Product
      { source: 'clientgroup', target: 'stream' }, // ClientGroup can connect to Revenue Stream
      { source: 'product', target: 'product' }, // Product can convert to Product
      { source: 'product', target: 'clientgrouptype' }, // Product can connect to ClientGroupType
      { source: 'clientgrouptype', target: 'product' }, // ClientGroupType can connect to Product
      { source: 'stream', target: 'clientgrouptype' }, // Revenue Stream can connect to ClientGroupType
      { source: 'clientgrouptype', target: 'stream' }, // ClientGroupType can connect to Revenue Stream
    ];

    return validConnections.some(
      (conn) => conn.source === sourceType && conn.target === targetType
    );
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target && isValidConnection(params)) {
        const rawSourceType = params.source.split('-')[0];
        const rawTargetType = params.target.split('-')[0];

        const sourceType:
          | 'stream'
          | 'product'
          | 'clientGroup'
          | 'clientGroupType' =
          rawSourceType === 'clientgroup'
            ? 'clientGroup'
            : rawSourceType === 'clientgrouptype'
              ? 'clientGroupType'
              : (rawSourceType as
                  | 'stream'
                  | 'product'
                  | 'clientGroup'
                  | 'clientGroupType');
        const targetType:
          | 'stream'
          | 'product'
          | 'clientGroup'
          | 'clientGroupType' =
          rawTargetType === 'clientgroup'
            ? 'clientGroup'
            : rawTargetType === 'clientgrouptype'
              ? 'clientGroupType'
              : (rawTargetType as
                  | 'stream'
                  | 'product'
                  | 'clientGroup'
                  | 'clientGroupType');

        setConnectionData({
          source: params.source,
          target: params.target,
          sourceType,
          targetType,
        });
        setModalOpen(true);
      }
    },
    [isValidConnection]
  );

  const handleSaveRelationship = useCallback(
    async (relationshipData: {
      type: 'first_purchase' | 'existing_relationship' | 'upselling';
      weight: string;
      probability?: string;
      afterMonths?: string;
    }) => {
      if (connectionData) {
        try {
          // Parse source and target IDs
          const sourceIdParts = connectionData.source.split('-');
          const targetIdParts = connectionData.target.split('-');

          const finalSourceType = connectionData.sourceType;
          let finalSourceId: number | string;
          const finalTargetType = connectionData.targetType;
          let finalTargetId: number | string;

          // Handle clientGroupType ID mapping (string to number)
          if (connectionData.sourceType === 'clientGroupType') {
            const stringId = sourceIdParts[1] as keyof typeof CLIENT_GROUP_TYPE_IDS;
            finalSourceId = CLIENT_GROUP_TYPE_IDS[stringId];
          } else {
            finalSourceId = parseInt(sourceIdParts[1]);
          }

          if (connectionData.targetType === 'clientGroupType') {
            const stringId = targetIdParts[1] as keyof typeof CLIENT_GROUP_TYPE_IDS;
            finalTargetId = CLIENT_GROUP_TYPE_IDS[stringId];
          } else {
            finalTargetId = parseInt(targetIdParts[1]);
          }

          let result: {
            success: boolean;
            error?: string;
            data?: { id: number };
          };

          if (editingRelationship && editingRelationship.data?.relationshipId) {
            // Update existing relationship
            result = await updateRelationship(
              editingRelationship.data.relationshipId,
              relationshipData
            );
          } else {
            // Create new relationship
            result = await createRelationship({
              sourceType: finalSourceType,
              sourceId: finalSourceId,
              targetType: finalTargetType,
              targetId: finalTargetId,
              relationshipType: relationshipData.type,
              properties: relationshipData,
            });
          }

          if (result.success) {
            if (editingRelationship) {
              // Update existing edge
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
            } else {
              // Create new edge with the relationship ID from the server response
              if (result.data) {
                // No specific handles needed - connections use default handles

                const newEdge: Edge = {
                  id: `relationship-${result.data.id}`,
                  source: connectionData.source,
                  target: connectionData.target,
                  type: 'relationship',
                  data: {
                    relationship: relationshipData.type,
                    properties: relationshipData,
                    relationshipId: result.data.id,
                    onEdit: (
                      edgeId: string,
                      edgeData: {
                        relationship: string;
                        properties: Record<string, string | number>;
                      }
                    ) => {
                      setEditingRelationship({
                        id: edgeId,
                        data: { ...edgeData, relationshipId: result.data?.id },
                      });
                      setConnectionData({
                        source: connectionData.source,
                        target: connectionData.target,
                        sourceType: connectionData.sourceType,
                        targetType: connectionData.targetType,
                      });
                      setModalOpen(true);
                    },
                    onDelete: async (edgeId: string) => {
                      try {
                        const relationshipId = parseInt(edgeId.split('-')[1]);
                        const deleteResult =
                          await deleteRelationship(relationshipId);

                        if (deleteResult.success) {
                          setEdges((eds) =>
                            eds.filter((edge) => edge.id !== edgeId)
                          );
                        } else {
                          console.error(
                            'Failed to delete relationship:',
                            deleteResult.error
                          );
                        }
                      } catch (error) {
                        console.error('Error deleting relationship:', error);
                      }
                    },
                  },
                };

                setEdges((eds) => addEdge(newEdge, eds));
              }
            }
            setConnectionData(null);
            setEditingRelationship(null);
          } else {
            console.error('Failed to save relationship:', result.error);
          }
        } catch (error) {
          console.error('Error saving relationship:', error);
        }
      }
    },
    [connectionData, editingRelationship, setEdges]
  );

  // Load data and create nodes/edges
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

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        // Create nodes without positioning (ELK will handle layout)

        // Revenue Streams
        streams.forEach((stream) => {
          newNodes.push({
            id: `stream-${stream.id}`,
            type: 'stream',
            position: { x: 0, y: 0 }, // ELK will set position
            data: {
              id: stream.id,
              name: stream.name,
              type: stream.type,
              description: stream.description,
            },
          });
        });

        // Products
        products.forEach((product) => {
          newNodes.push({
            id: `product-${product.id}`,
            type: 'product',
            position: { x: 0, y: 0 },
            data: {
              id: product.id,
              name: product.name,
              unitCost: product.unitCost,
              productStreamId: product.productStreamId,
              weight: product.weight,
            },
          });
        });

        // Client Group Types - hardcoded B2B, B2C, DTC
        const clientGroupTypes = [
          {
            id: 'B2B',
            name: 'Business to Business',
            type: 'B2B' as const,
            description: 'Companies selling to other companies',
          },
          {
            id: 'B2C',
            name: 'Business to Consumer',
            type: 'B2C' as const,
            description: 'Companies selling directly to consumers',
          },
          {
            id: 'DTC',
            name: 'Direct to Consumer',
            type: 'DTC' as const,
            description: 'Brands selling directly to end customers',
          },
        ];

        clientGroupTypes.forEach((groupType) => {
          newNodes.push({
            id: `clientgrouptype-${groupType.id}`,
            type: 'clientGroupType',
            position: { x: 0, y: 0 }, // ELK will set position
            data: {
              id: groupType.id,
              name: groupType.name,
              type: groupType.type,
              description: groupType.description,
            },
          });
        });

        // Client Groups
        clientGroups.forEach((group) => {
          newNodes.push({
            id: `clientgroup-${group.id}`,
            type: 'clientGroup',
            position: { x: 0, y: 0 },
            data: {
              id: group.id,
              name: group.name,
              type: group.type,
              startingCustomers: group.startingCustomers,
              churnRate: group.churnRate,
            },
          });
        });

        // Add all relationships from database
        relationships.forEach((relationship) => {
          // Convert database sourceType/targetType to match node IDs
          const sourceNodeType =
            relationship.sourceType === 'clientGroup'
              ? 'clientgroup'
              : relationship.sourceType === 'clientGroupType'
                ? 'clientgrouptype'
                : relationship.sourceType;
          const targetNodeType =
            relationship.targetType === 'clientGroup'
              ? 'clientgroup'
              : relationship.targetType === 'clientGroupType'
                ? 'clientgrouptype'
                : relationship.targetType;

          // Handle client group type ID mapping
          let sourceId: string;
          let targetId: string;

          if (relationship.sourceType === 'clientGroupType') {
            const stringId =
              CLIENT_GROUP_TYPE_ID_TO_STRING[relationship.sourceId];
            sourceId = `${sourceNodeType}-${stringId}`;
          } else {
            sourceId = `${sourceNodeType}-${relationship.sourceId}`;
          }

          if (relationship.targetType === 'clientGroupType') {
            const stringId =
              CLIENT_GROUP_TYPE_ID_TO_STRING[relationship.targetId];
            targetId = `${targetNodeType}-${stringId}`;
          } else {
            targetId = `${targetNodeType}-${relationship.targetId}`;
          }

          // No specific handles needed
          newEdges.push({
            id: `relationship-${relationship.id}`,
            source: sourceId,
            target: targetId,
            type: 'relationship',
            data: {
              relationship: relationship.relationshipType,
              properties: relationship.properties,
              relationshipId: relationship.id,
              onEdit: (
                edgeId: string,
                edgeData: {
                  relationship: string;
                  properties: Record<string, string | number>;
                }
              ) => {
                // Convert database types to component types for modal
                const sourceType =
                  relationship.sourceType === 'clientGroup'
                    ? 'clientGroup'
                    : relationship.sourceType === 'clientGroupType'
                      ? 'clientGroupType'
                      : (relationship.sourceType as
                          | 'stream'
                          | 'product'
                          | 'clientGroup'
                          | 'clientGroupType');
                const targetType =
                  relationship.targetType === 'clientGroup'
                    ? 'clientGroup'
                    : relationship.targetType === 'clientGroupType'
                      ? 'clientGroupType'
                      : (relationship.targetType as
                          | 'stream'
                          | 'product'
                          | 'clientGroup'
                          | 'clientGroupType');

                setEditingRelationship({ id: edgeId, data: edgeData });
                setConnectionData({
                  source: sourceId,
                  target: targetId,
                  sourceType: sourceType,
                  targetType: targetType,
                });
                setModalOpen(true);
              },
              onDelete: async (edgeId: string) => {
                try {
                  // Extract relationship ID from edge ID (format: relationship-{id})
                  const relationshipId = parseInt(edgeId.split('-')[1]);

                  if (isNaN(relationshipId)) {
                    console.error('Invalid relationship ID in edge:', edgeId);
                    return;
                  }

                  const result = await deleteRelationship(relationshipId);

                  if (result.success) {
                    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
                  } else {
                    console.error(
                      'Failed to delete relationship:',
                      result.error
                    );
                  }
                } catch (error) {
                  console.error('Error deleting relationship:', error);
                }
              },
            },
          });
        });

        // Debug logging
        console.log('Total nodes created:', newNodes.length);
        console.log(
          'Node IDs:',
          newNodes.map((n) => n.id)
        );
        console.log('Total edges created:', newEdges.length);
        console.log(
          'Edge details:',
          newEdges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
          }))
        );

        // Apply ELK layout
        try {
          const layouted = await getLayoutedElements(newNodes, newEdges);
          if (layouted) {
            setNodes(layouted.nodes);
            setEdges(layouted.edges);
          } else {
            // Fallback to manual layout if ELK fails
            console.warn('ELK layout failed, using fallback positioning');
            const fallbackNodes = newNodes.map((node, index) => ({
              ...node,
              position: {
                x: (index % 4) * 300 + 50,
                y: Math.floor(index / 4) * 150 + 50,
              },
            }));
            setNodes(fallbackNodes);
            setEdges(newEdges);
          }
        } catch (error) {
          console.error('Error applying ELK layout:', error);
          // Fallback to manual layout
          const fallbackNodes = newNodes.map((node, index) => ({
            ...node,
            position: {
              x: (index % 4) * 300 + 50,
              y: Math.floor(index / 4) * 150 + 50,
            },
          }));
          setNodes(fallbackNodes);
          setEdges(newEdges);
        }
      } catch (error) {
        console.error('Failed to load dependency graph data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [setNodes, setEdges]);

  // Auto-refresh data when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !loading) {
        // Reload data when page becomes visible
        async function reloadData() {
          try {
            const [streams, products, clientGroups] = await Promise.all([
              getRevenueStreams(),
              getProducts(),
              getClientGroups(),
            ]);

            const newNodes: Node[] = [];
            const existingEdges = edges;

            // Create nodes for auto-refresh

            // Revenue Streams
            streams.forEach((stream) => {
              newNodes.push({
                id: `stream-${stream.id}`,
                type: 'stream',
                position: { x: 0, y: 0 },
                data: {
                  id: stream.id,
                  name: stream.name,
                  type: stream.type,
                  description: stream.description,
                },
              });
            });

            // Products
            products.forEach((product) => {
              newNodes.push({
                id: `product-${product.id}`,
                type: 'product',
                position: { x: 0, y: 0 },
                data: {
                  id: product.id,
                  name: product.name,
                  unitCost: product.unitCost,
                  productStreamId: product.productStreamId,
                  weight: product.weight,
                },
              });
            });

            // Client Group Types - hardcoded B2B, B2C, DTC
            const clientGroupTypes = [
              {
                id: 'B2B',
                name: 'Business to Business',
                type: 'B2B' as const,
                description: 'Companies selling to other companies',
              },
              {
                id: 'B2C',
                name: 'Business to Consumer',
                type: 'B2C' as const,
                description: 'Companies selling directly to consumers',
              },
              {
                id: 'DTC',
                name: 'Direct to Consumer',
                type: 'DTC' as const,
                description: 'Brands selling directly to end customers',
              },
            ];

            clientGroupTypes.forEach((groupType) => {
              newNodes.push({
                id: `clientgrouptype-${groupType.id}`,
                type: 'clientGroupType',
                position: { x: 0, y: 0 }, // ELK will set position
                data: {
                  id: groupType.id,
                  name: groupType.name,
                  type: groupType.type,
                  description: groupType.description,
                },
              });
            });

            // Client Groups
            clientGroups.forEach((group) => {
              newNodes.push({
                id: `clientgroup-${group.id}`,
                type: 'clientGroup',
                position: { x: 0, y: 0 },
                data: {
                  id: group.id,
                  name: group.name,
                  type: group.type,
                  startingCustomers: group.startingCustomers,
                  churnRate: group.churnRate,
                },
              });
            });

            // Apply layout for auto-refresh
            try {
              const layouted = await getLayoutedElements(
                newNodes,
                existingEdges
              );
              if (layouted) {
                setNodes(layouted.nodes);
                setEdges(layouted.edges);
              } else {
                // Fallback to manual layout if ELK fails
                console.warn(
                  'ELK layout failed on auto-refresh, using fallback positioning'
                );
                const fallbackNodes = newNodes.map((node, index) => ({
                  ...node,
                  position: {
                    x: (index % 4) * 300 + 50,
                    y: Math.floor(index / 4) * 150 + 50,
                  },
                }));
                setNodes(fallbackNodes);
                setEdges(existingEdges);
              }
            } catch (error) {
              console.error(
                'Error applying ELK layout on auto-refresh:',
                error
              );
              // Fallback to manual layout
              const fallbackNodes = newNodes.map((node, index) => ({
                ...node,
                position: {
                  x: (index % 4) * 300 + 50,
                  y: Math.floor(index / 4) * 150 + 50,
                },
              }));
              setNodes(fallbackNodes);
              setEdges(existingEdges);
            }
          } catch (error) {
            console.error('Failed to reload dependency graph data:', error);
          }
        }

        reloadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [edges, loading, setNodes, setEdges]);

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
