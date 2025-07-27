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
} from 'reactflow';
import 'reactflow/dist/style.css';

import { StreamNode } from './nodes/stream-node';
import { ProductNode } from './nodes/product-node';
import { ClientGroupNode } from './nodes/client-group-node';
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
} as const;

const EDGE_TYPES = {
  relationship: RelationshipEdge,
} as const;

function DependencyGraphInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [connectionData, setConnectionData] = useState<{
    source: string;
    target: string;
    sourceType: 'stream' | 'product' | 'clientGroup';
    targetType: 'stream' | 'product' | 'clientGroup';
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
      { source: 'stream', target: 'product' }, // Stream can connect to Product
      { source: 'product', target: 'clientgroup' }, // Product can connect to ClientGroup
      { source: 'product', target: 'product' }, // Product can convert to Product
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

        const sourceType: 'stream' | 'product' | 'clientGroup' =
          rawSourceType === 'clientgroup'
            ? 'clientGroup'
            : (rawSourceType as 'stream' | 'product' | 'clientGroup');
        const targetType: 'stream' | 'product' | 'clientGroup' =
          rawTargetType === 'clientgroup'
            ? 'clientGroup'
            : (rawTargetType as 'stream' | 'product' | 'clientGroup');

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
      type: string;
      weight: string;
      probability?: string;
      afterMonths?: string;
    }) => {
      if (connectionData) {
        try {
          // Unified relationship handling
          let result: {
            success: boolean;
            error?: string;
            data?: { id: number };
          } = { success: false, error: 'Unknown error' };

          // Determine correct source/target based on relationship type
          let finalSourceType: string,
            finalSourceId: number,
            finalTargetType: string,
            finalTargetId: number;

          if (relationshipData.type === 'clientgroup_to_product') {
            // For clientgroup_to_product, clientgroup is ALWAYS source, product is ALWAYS target
            if (connectionData.sourceType === 'clientGroup') {
              finalSourceType = 'clientGroup';
              finalSourceId = parseInt(connectionData.source.split('-')[1]);
              finalTargetType = 'product';
              finalTargetId = parseInt(connectionData.target.split('-')[1]);
            } else {
              // User dragged from product to clientgroup, reverse it
              finalSourceType = 'clientGroup';
              finalSourceId = parseInt(connectionData.target.split('-')[1]);
              finalTargetType = 'product';
              finalTargetId = parseInt(connectionData.source.split('-')[1]);
            }
          } else {
            // For other relationship types, use the connection direction as-is
            finalSourceType =
              connectionData.sourceType === 'clientGroup'
                ? 'clientGroup'
                : connectionData.sourceType;
            finalTargetType =
              connectionData.targetType === 'clientGroup'
                ? 'clientGroup'
                : connectionData.targetType;
            finalSourceId = parseInt(connectionData.source.split('-')[1]);
            finalTargetId = parseInt(connectionData.target.split('-')[1]);
          }

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

        // Layout algorithm: Hierarchical left-to-right flow
        const COLUMN_WIDTH = 350;
        const NODE_HEIGHT = 120;
        const VERTICAL_SPACING = 40;
        const START_X = 50;
        const START_Y = 50;

        // Column 1: Revenue Streams (leftmost)
        streams.forEach((stream, index) => {
          const y = START_Y + index * (NODE_HEIGHT + VERTICAL_SPACING);
          newNodes.push({
            id: `stream-${stream.id}`,
            type: 'stream',
            position: { x: START_X, y },
            data: {
              id: stream.id,
              name: stream.name,
              type: stream.type,
              description: stream.description,
            },
          });
        });

        // Column 2: Products (middle) - simple grid layout
        products.forEach((product, index) => {
          const y = START_Y + index * (NODE_HEIGHT + VERTICAL_SPACING);

          newNodes.push({
            id: `product-${product.id}`,
            type: 'product',
            position: { x: START_X + COLUMN_WIDTH, y },
            data: {
              id: product.id,
              name: product.name,
              unitCost: product.unitCost,
            },
          });
        });

        const productYOffset =
          START_Y + products.length * (NODE_HEIGHT + VERTICAL_SPACING);

        // Column 3: Client Groups (rightmost) - distributed evenly
        const clientGroupSpacing = Math.max(
          NODE_HEIGHT + VERTICAL_SPACING,
          productYOffset / Math.max(clientGroups.length, 1)
        );

        clientGroups.forEach((group, index) => {
          const y = START_Y + index * clientGroupSpacing;
          newNodes.push({
            id: `clientgroup-${group.id}`,
            type: 'clientGroup',
            position: { x: START_X + 2 * COLUMN_WIDTH, y },
            data: {
              id: group.id,
              name: group.name,
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
              : relationship.sourceType;
          const targetNodeType =
            relationship.targetType === 'clientGroup'
              ? 'clientgroup'
              : relationship.targetType;

          const sourceId = `${sourceNodeType}-${relationship.sourceId}`;
          const targetId = `${targetNodeType}-${relationship.targetId}`;

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
                    : (relationship.sourceType as
                        | 'stream'
                        | 'product'
                        | 'clientGroup');
                const targetType =
                  relationship.targetType === 'clientGroup'
                    ? 'clientGroup'
                    : (relationship.targetType as
                        | 'stream'
                        | 'product'
                        | 'clientGroup');

                setEditingRelationship({ id: edgeId, data: edgeData });
                setConnectionData({
                  source: `${sourceNodeType}-${relationship.sourceId}`,
                  target: `${targetNodeType}-${relationship.targetId}`,
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

        setNodes(newNodes);
        setEdges(newEdges);
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
            const existingCustomEdges = edges.filter(
              (e) => e.data?.relationship !== 'belongs_to'
            );

            // Apply the same layout algorithm for auto-refresh
            const COLUMN_WIDTH = 350;
            const NODE_HEIGHT = 120;
            const VERTICAL_SPACING = 40;
            const START_X = 50;
            const START_Y = 50;

            // Column 1: Revenue Streams
            streams.forEach((stream, index) => {
              const y = START_Y + index * (NODE_HEIGHT + VERTICAL_SPACING);
              newNodes.push({
                id: `stream-${stream.id}`,
                type: 'stream',
                position: { x: START_X, y },
                data: {
                  id: stream.id,
                  name: stream.name,
                  type: stream.type,
                  description: stream.description,
                },
              });
            });

            // Column 2: Products - simple grid layout
            products.forEach((product, index) => {
              const y = START_Y + index * (NODE_HEIGHT + VERTICAL_SPACING);

              newNodes.push({
                id: `product-${product.id}`,
                type: 'product',
                position: { x: START_X + COLUMN_WIDTH, y },
                data: {
                  id: product.id,
                  name: product.name,
                  unitCost: product.unitCost,
                },
              });
            });

            const productYOffset =
              START_Y + products.length * (NODE_HEIGHT + VERTICAL_SPACING);

            // Column 3: Client Groups
            const clientGroupSpacing = Math.max(
              NODE_HEIGHT + VERTICAL_SPACING,
              productYOffset / Math.max(clientGroups.length, 1)
            );

            clientGroups.forEach((group, index) => {
              const y = START_Y + index * clientGroupSpacing;
              newNodes.push({
                id: `clientgroup-${group.id}`,
                type: 'clientGroup',
                position: { x: START_X + 2 * COLUMN_WIDTH, y },
                data: {
                  id: group.id,
                  name: group.name,
                  startingCustomers: group.startingCustomers,
                  churnRate: group.churnRate,
                },
              });
            });

            setNodes(newNodes);
            // Keep existing custom relationships as-is, since all relationships
            // are now managed through the unified relationships table
            setEdges(existingCustomEdges);
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
        <h1 className="text-2xl font-bold">Dependency Graph</h1>
        <p className="text-muted-foreground">
          Visual representation of relationships between Revenue Streams,
          Products, and Client Groups
        </p>
      </div>
      <div className="h-[calc(100%-80px)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
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
                    | 'product_to_stream'
                    | 'clientgroup_to_product'
                    | 'product_conversion',
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
