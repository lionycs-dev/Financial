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
import ELK from 'elkjs/lib/elk.bundled.js';

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
  'B2B': 1,
  'B2C': 2,
  'DTC': 3,
} as const;

// ELK layout configuration
const elk = new ELK();

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'RIGHT') => {
  // Filter edges to only include those between existing nodes
  const nodeIds = new Set(nodes.map(node => node.id));
  const validEdges = edges.filter(edge => {
    const hasSource = nodeIds.has(edge.source);
    const hasTarget = nodeIds.has(edge.target);
    if (!hasSource || !hasTarget) {
      console.warn(`Filtering out edge ${edge.id}: source=${edge.source} (exists: ${hasSource}), target=${edge.target} (exists: ${hasTarget})`);
    }
    return hasSource && hasTarget;
  });

  console.log('ELK input nodes:', nodes.map(n => n.id));
  console.log('ELK input valid edges:', validEdges.map(e => ({ id: e.id, source: e.source, target: e.target })));

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': '50',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: 250,
      height: 120,
    })),
    edges: validEdges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  console.log('ELK graph:', JSON.stringify(graph, null, 2));

  return elk
    .layout(graph)
    .then((layoutedGraph) => {
      console.log('ELK layout result:', layoutedGraph);
      return {
        nodes: nodes.map((node) => {
          const layoutedNode = layoutedGraph.children?.find(
            (lgNode) => lgNode.id === node.id
          );
          return {
            ...node,
            position: {
              x: layoutedNode?.x ?? 0,
              y: layoutedNode?.y ?? 0,
            },
          };
        }),
        edges: validEdges,
      };
    })
    .catch((error) => {
      console.error('ELK layout error:', error);
      return null;
    });
};

function DependencyGraphInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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

        const sourceType: 'stream' | 'product' | 'clientGroup' | 'clientGroupType' =
          rawSourceType === 'clientgroup'
            ? 'clientGroup'
            : rawSourceType === 'clientgrouptype'
            ? 'clientGroupType'
            : (rawSourceType as 'stream' | 'product' | 'clientGroup' | 'clientGroupType');
        const targetType: 'stream' | 'product' | 'clientGroup' | 'clientGroupType' =
          rawTargetType === 'clientgroup'
            ? 'clientGroup'
            : rawTargetType === 'clientgrouptype'
            ? 'clientGroupType'
            : (rawTargetType as 'stream' | 'product' | 'clientGroup' | 'clientGroupType');

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
            finalSourceId: number | string,
            finalTargetType: string,
            finalTargetId: number | string;

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
          } else if (relationshipData.type === 'clientgroup_to_stream') {
            // For clientgroup_to_stream, clientgroup is ALWAYS source, stream is ALWAYS target
            if (connectionData.sourceType === 'clientGroup') {
              finalSourceType = 'clientGroup';
              finalSourceId = parseInt(connectionData.source.split('-')[1]);
              finalTargetType = 'stream';
              finalTargetId = parseInt(connectionData.target.split('-')[1]);
            } else {
              // User dragged from stream to clientgroup, reverse it
              finalSourceType = 'clientGroup';
              finalSourceId = parseInt(connectionData.target.split('-')[1]);
              finalTargetType = 'stream';
              finalTargetId = parseInt(connectionData.source.split('-')[1]);
            }
          } else if (relationshipData.type === 'product_to_clientgrouptype') {
            // Product to client group type - product is source, clientGroupType is target
            finalSourceType = 'product';
            finalSourceId = parseInt(connectionData.source.split('-')[1]);
            finalTargetType = 'clientGroupType';
            const targetStringId = connectionData.target.split('-')[1] as keyof typeof CLIENT_GROUP_TYPE_IDS;
            finalTargetId = CLIENT_GROUP_TYPE_IDS[targetStringId];
          } else if (relationshipData.type === 'stream_to_clientgrouptype') {
            // Stream to client group type - stream is source, clientGroupType is target
            finalSourceType = 'stream';
            finalSourceId = parseInt(connectionData.source.split('-')[1]);
            finalTargetType = 'clientGroupType';
            const targetStringId = connectionData.target.split('-')[1] as keyof typeof CLIENT_GROUP_TYPE_IDS;
            finalTargetId = CLIENT_GROUP_TYPE_IDS[targetStringId];
          } else if (relationshipData.type === 'clientgrouptype_to_product') {
            // Client group type to product - clientGroupType is source, product is target
            finalSourceType = 'clientGroupType';
            const sourceStringId = connectionData.source.split('-')[1] as keyof typeof CLIENT_GROUP_TYPE_IDS;
            finalSourceId = CLIENT_GROUP_TYPE_IDS[sourceStringId];
            finalTargetType = 'product';
            finalTargetId = parseInt(connectionData.target.split('-')[1]);
          } else if (relationshipData.type === 'clientgrouptype_to_stream') {
            // Client group type to stream - clientGroupType is source, stream is target
            finalSourceType = 'clientGroupType';
            const sourceStringId = connectionData.source.split('-')[1] as keyof typeof CLIENT_GROUP_TYPE_IDS;
            finalSourceId = CLIENT_GROUP_TYPE_IDS[sourceStringId];
            finalTargetType = 'stream';
            finalTargetId = parseInt(connectionData.target.split('-')[1]);
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
            position: { x: 0, y: 0 }, // ELK will set position
            data: {
              id: product.id,
              name: product.name,
              unitCost: product.unitCost,
              productStreamId: product.productStreamId,
              weight: product.weight,
            },
          });

          // Add automatic edge from revenue stream to product (showing the foreign key relationship)
          if (product.productStreamId) {
            newEdges.push({
              id: `auto-stream-product-${product.id}`,
              source: `stream-${product.productStreamId}`,
              target: `product-${product.id}`,
              type: 'relationship',
              style: { stroke: '#10b981', strokeDasharray: '5,5' }, // Green dashed line for automatic relationships
              data: {
                relationship: 'belongs_to',
                properties: { weight: product.weight },
                isAutomatic: true,
                onEdit: () => {}, // No edit for automatic relationships
                onDelete: () => {}, // No delete for automatic relationships
              },
            });
          }
        });

        // Client Group Types - hardcoded B2B, B2C, DTC
        const clientGroupTypes = [
          { id: 'B2B', name: 'Business to Business', type: 'B2B' as const, description: 'Companies selling to other companies' },
          { id: 'B2C', name: 'Business to Consumer', type: 'B2C' as const, description: 'Companies selling directly to consumers' },
          { id: 'DTC', name: 'Direct to Consumer', type: 'DTC' as const, description: 'Brands selling directly to end customers' },
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
            position: { x: 0, y: 0 }, // ELK will set position
            data: {
              id: group.id,
              name: group.name,
              type: group.type,
              startingCustomers: group.startingCustomers,
              churnRate: group.churnRate,
            },
          });

          // Add automatic edge from client group to its type
          newEdges.push({
            id: `auto-clientgroup-type-${group.id}`,
            source: `clientgrouptype-${group.type}`,
            target: `clientgroup-${group.id}`,
            type: 'relationship',
            style: { stroke: '#8b5cf6', strokeDasharray: '3,3' }, // Purple dashed line for type relationships
            data: {
              relationship: 'belongs_to_type',
              properties: { },
              isAutomatic: true,
              onEdit: () => {}, // No edit for automatic relationships
              onDelete: () => {}, // No delete for automatic relationships
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

        // Debug logging
        console.log('Total nodes created:', newNodes.length);
        console.log('Node IDs:', newNodes.map(n => n.id));
        console.log('Total edges created:', newEdges.length);
        console.log('Edge details:', newEdges.map(e => ({ id: e.id, source: e.source, target: e.target })));
        
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
              position: { x: (index % 4) * 300 + 50, y: Math.floor(index / 4) * 150 + 50 },
            }));
            setNodes(fallbackNodes);
            setEdges(newEdges);
          }
        } catch (error) {
          console.error('Error applying ELK layout:', error);
          // Fallback to manual layout
          const fallbackNodes = newNodes.map((node, index) => ({
            ...node,
            position: { x: (index % 4) * 300 + 50, y: Math.floor(index / 4) * 150 + 50 },
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
            const existingCustomEdges = edges.filter(
              (e) => e.data?.relationship !== 'belongs_to'
            );

            // Create nodes for auto-refresh (ELK will handle layout)
            
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
                position: { x: 0, y: 0 }, // ELK will set position
                data: {
                  id: product.id,
                  name: product.name,
                  unitCost: product.unitCost,
                  productStreamId: product.productStreamId,
                  weight: product.weight,
                },
              });

              // Add automatic edge from revenue stream to product (showing the foreign key relationship)
              if (product.productStreamId) {
                existingCustomEdges.push({
                  id: `auto-stream-product-${product.id}`,
                  source: `stream-${product.productStreamId}`,
                  target: `product-${product.id}`,
                  type: 'relationship',
                  style: { stroke: '#10b981', strokeDasharray: '5,5' }, // Green dashed line for automatic relationships
                  data: {
                    relationship: 'belongs_to',
                    properties: { weight: product.weight },
                    isAutomatic: true,
                    onEdit: () => {}, // No edit for automatic relationships
                    onDelete: () => {}, // No delete for automatic relationships
                  },
                });
              }
            });

            // Client Group Types - hardcoded B2B, B2C, DTC
            const clientGroupTypes = [
              { id: 'B2B', name: 'Business to Business', type: 'B2B' as const, description: 'Companies selling to other companies' },
              { id: 'B2C', name: 'Business to Consumer', type: 'B2C' as const, description: 'Companies selling directly to consumers' },
              { id: 'DTC', name: 'Direct to Consumer', type: 'DTC' as const, description: 'Brands selling directly to end customers' },
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
                position: { x: 0, y: 0 }, // ELK will set position
                data: {
                  id: group.id,
                  name: group.name,
                  type: group.type,
                  startingCustomers: group.startingCustomers,
                  churnRate: group.churnRate,
                },
              });

              // Add automatic edge from client group to its type
              existingCustomEdges.push({
                id: `auto-clientgroup-type-${group.id}`,
                source: `clientgrouptype-${group.type}`,
                target: `clientgroup-${group.id}`,
                type: 'relationship',
                style: { stroke: '#8b5cf6', strokeDasharray: '3,3' }, // Purple dashed line for type relationships
                data: {
                  relationship: 'belongs_to_type',
                  properties: { },
                  isAutomatic: true,
                  onEdit: () => {}, // No edit for automatic relationships
                  onDelete: () => {}, // No delete for automatic relationships
                },
              });
            });

            // Apply ELK layout for auto-refresh
            try {
              const layouted = await getLayoutedElements(newNodes, existingCustomEdges);
              if (layouted) {
                setNodes(layouted.nodes);
                setEdges(layouted.edges);
              } else {
                // Fallback to manual layout if ELK fails
                console.warn('ELK layout failed on auto-refresh, using fallback positioning');
                const fallbackNodes = newNodes.map((node, index) => ({
                  ...node,
                  position: { x: (index % 4) * 300 + 50, y: Math.floor(index / 4) * 150 + 50 },
                }));
                setNodes(fallbackNodes);
                setEdges(existingCustomEdges);
              }
            } catch (error) {
              console.error('Error applying ELK layout on auto-refresh:', error);
              // Fallback to manual layout
              const fallbackNodes = newNodes.map((node, index) => ({
                ...node,
                position: { x: (index % 4) * 300 + 50, y: Math.floor(index / 4) * 150 + 50 },
              }));
              setNodes(fallbackNodes);
              setEdges(existingCustomEdges);
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
                    | 'clientgroup_to_product'
                    | 'clientgroup_to_stream'
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
