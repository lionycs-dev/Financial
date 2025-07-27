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
import { saveRelationship, getRelationships, deleteRelationship } from '@/lib/actions/relationship-actions';

const nodeTypes = {
  stream: StreamNode,
  product: ProductNode,
  clientGroup: ClientGroupNode,
};

const edgeTypes = {
  relationship: RelationshipEdge,
};

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
      conn => conn.source === sourceType && conn.target === targetType
    );
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target && isValidConnection(params)) {
        const sourceType = params.source.split('-')[0] as 'stream' | 'product' | 'clientGroup';
        const targetType = params.target.split('-')[0] as 'stream' | 'product' | 'clientGroup';
        
        setConnectionData({
          source: params.source,
          target: params.target,
          sourceType: sourceType === 'clientgroup' ? 'clientGroup' : sourceType,
          targetType: targetType === 'clientgroup' ? 'clientGroup' : targetType,
        });
        setModalOpen(true);
      }
    },
    [isValidConnection],
  );


  const handleSaveRelationship = useCallback(
    async (relationshipData: { type: string; weight: string; probability?: string; afterMonths?: string }) => {
      if (connectionData) {
        try {
          // Auto-save to backend
          const result = await saveRelationship({
            type: relationshipData.type as 'product_to_stream' | 'clientgroup_to_product' | 'product_conversion',
            sourceId: connectionData.source,
            targetId: connectionData.target,
            weight: relationshipData.weight,
            probability: relationshipData.probability,
            afterMonths: relationshipData.afterMonths,
          });

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
              // Create new edge
              const newEdge: Edge = {
                id: `${connectionData.source}-${connectionData.target}`,
                source: connectionData.source,
                target: connectionData.target,
                type: 'relationship',
                data: {
                  relationship: relationshipData.type,
                  properties: relationshipData,
                  onEdit: (edgeId: string, edgeData: { relationship: string; properties: Record<string, string | number> }) => {
                    const [sourceId, targetId] = edgeId.split('-').reduce((acc, part, index, arr) => {
                      if (index < arr.length - 2) {
                        acc[0] += (acc[0] ? '-' : '') + part;
                      } else if (index === arr.length - 2) {
                        acc[1] = part;
                      } else {
                        acc[1] += '-' + part;
                      }
                      return acc;
                    }, ['', ''] as [string, string]);

                    const sourceType = sourceId.split('-')[0] as 'stream' | 'product' | 'clientGroup';
                    const targetType = targetId.split('-')[0] as 'stream' | 'product' | 'clientGroup';

                    setEditingRelationship({ id: edgeId, data: edgeData });
                    setConnectionData({
                      source: sourceId,
                      target: targetId,
                      sourceType: sourceType === 'clientgroup' ? 'clientGroup' : sourceType,
                      targetType: targetType === 'clientgroup' ? 'clientGroup' : targetType,
                    });
                    setModalOpen(true);
                  },
                  onDelete: async (edgeId: string) => {
                    const [sourceId, targetId] = edgeId.split('-').reduce((acc, part, index, arr) => {
                      if (index < arr.length - 2) {
                        acc[0] += (acc[0] ? '-' : '') + part;
                      } else if (index === arr.length - 2) {
                        acc[1] = part;
                      } else {
                        acc[1] += '-' + part;
                      }
                      return acc;
                    }, ['', ''] as [string, string]);

                    try {
                      const result = await deleteRelationship(sourceId, targetId);
                      if (result.success) {
                        setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
                      } else {
                        console.error('Failed to delete relationship:', result.error);
                      }
                    } catch (error) {
                      console.error('Error deleting relationship:', error);
                    }
                  },
                },
              };
              
              setEdges((eds) => addEdge(newEdge, eds));
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
    [connectionData, editingRelationship, setEdges],
  );

  // Load data and create nodes/edges
  useEffect(() => {
    async function loadData() {
      try {
        const [streams, products, clientGroups, savedRelationships] = await Promise.all([
          getRevenueStreams(),
          getProducts(),
          getClientGroups(),
          getRelationships(),
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

        // Column 2: Products (middle) - grouped by revenue stream
        const productsByStream = new Map<number, typeof products>();
        products.forEach(product => {
          const streamId = product.streamId;
          if (!productsByStream.has(streamId)) {
            productsByStream.set(streamId, []);
          }
          productsByStream.get(streamId)!.push(product);
        });

        let productYOffset = START_Y;
        streams.forEach((stream, streamIndex) => {
          const streamProducts = productsByStream.get(stream.id) || [];
          const streamY = START_Y + streamIndex * (NODE_HEIGHT + VERTICAL_SPACING);
          
          streamProducts.forEach((product, productIndex) => {
            const nodeId = `product-${product.id}`;
            // Position products slightly below their parent stream
            const y = streamY + productIndex * (NODE_HEIGHT + VERTICAL_SPACING / 2);
            
            newNodes.push({
              id: nodeId,
              type: 'product',
              position: { x: START_X + COLUMN_WIDTH, y },
              data: {
                id: product.id,
                name: product.name,
                unitCost: product.unitCost,
                entryWeight: product.entryWeight,
                cac: product.cac,
                streamId: product.streamId,
              },
            });

            // Add edge from stream to product
            if (product.revenueStream) {
              newEdges.push({
                id: `stream-${product.streamId}-product-${product.id}`,
                source: `stream-${product.streamId}`,
                target: nodeId,
                type: 'relationship',
                data: {
                  relationship: 'belongs_to',
                  properties: {
                    entryWeight: product.entryWeight,
                  },
                },
              });
            }
          });

          // Update offset for next stream's products
          if (streamProducts.length > 0) {
            productYOffset = Math.max(productYOffset, streamY + streamProducts.length * (NODE_HEIGHT + VERTICAL_SPACING / 2));
          }
        });

        // Column 3: Client Groups (rightmost) - distributed evenly
        const clientGroupSpacing = Math.max(NODE_HEIGHT + VERTICAL_SPACING, 
          productYOffset / Math.max(clientGroups.length, 1));
        
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
              acvGrowthRate: group.acvGrowthRate,
            },
          });
        });

        // Add saved custom relationships
        savedRelationships.forEach((relationship) => {
          newEdges.push({
            id: `${relationship.sourceId}-${relationship.targetId}`,
            source: relationship.sourceId,
            target: relationship.targetId,
            type: 'relationship',
            data: {
              relationship: relationship.type,
              properties: {
                weight: relationship.weight,
                probability: relationship.probability,
                afterMonths: relationship.afterMonths,
              },
              onEdit: (edgeId: string, edgeData: { relationship: string; properties: Record<string, string | number> }) => {
                const [sourceId, targetId] = edgeId.split('-').reduce((acc, part, index, arr) => {
                  if (index < arr.length - 2) {
                    acc[0] += (acc[0] ? '-' : '') + part;
                  } else if (index === arr.length - 2) {
                    acc[1] = part;
                  } else {
                    acc[1] += '-' + part;
                  }
                  return acc;
                }, ['', ''] as [string, string]);

                const sourceType = sourceId.split('-')[0] as 'stream' | 'product' | 'clientGroup';
                const targetType = targetId.split('-')[0] as 'stream' | 'product' | 'clientGroup';

                setEditingRelationship({ id: edgeId, data: edgeData });
                setConnectionData({
                  source: sourceId,
                  target: targetId,
                  sourceType: sourceType === 'clientgroup' ? 'clientGroup' : sourceType,
                  targetType: targetType === 'clientgroup' ? 'clientGroup' : targetType,
                });
                setModalOpen(true);
              },
              onDelete: async (edgeId: string) => {
                const [sourceId, targetId] = edgeId.split('-').reduce((acc, part, index, arr) => {
                  if (index < arr.length - 2) {
                    acc[0] += (acc[0] ? '-' : '') + part;
                  } else if (index === arr.length - 2) {
                    acc[1] = part;
                  } else {
                    acc[1] += '-' + part;
                  }
                  return acc;
                }, ['', ''] as [string, string]);

                try {
                  const result = await deleteRelationship(sourceId, targetId);
                  if (result.success) {
                    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
                  } else {
                    console.error('Failed to delete relationship:', result.error);
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
            const existingCustomEdges = edges.filter(e => e.data?.relationship !== 'belongs_to');

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

            // Column 2: Products - grouped by revenue stream
            const productsByStream = new Map<number, typeof products>();
            products.forEach(product => {
              const streamId = product.streamId;
              if (!productsByStream.has(streamId)) {
                productsByStream.set(streamId, []);
              }
              productsByStream.get(streamId)!.push(product);
            });

            let productYOffset = START_Y;
            streams.forEach((stream, streamIndex) => {
              const streamProducts = productsByStream.get(stream.id) || [];
              const streamY = START_Y + streamIndex * (NODE_HEIGHT + VERTICAL_SPACING);
              
              streamProducts.forEach((product, productIndex) => {
                const nodeId = `product-${product.id}`;
                const y = streamY + productIndex * (NODE_HEIGHT + VERTICAL_SPACING / 2);
                
                newNodes.push({
                  id: nodeId,
                  type: 'product',
                  position: { x: START_X + COLUMN_WIDTH, y },
                  data: {
                    id: product.id,
                    name: product.name,
                    unitCost: product.unitCost,
                    entryWeight: product.entryWeight,
                    cac: product.cac,
                    streamId: product.streamId,
                  },
                });
              });

              if (streamProducts.length > 0) {
                productYOffset = Math.max(productYOffset, streamY + streamProducts.length * (NODE_HEIGHT + VERTICAL_SPACING / 2));
              }
            });

            // Column 3: Client Groups
            const clientGroupSpacing = Math.max(NODE_HEIGHT + VERTICAL_SPACING, 
              productYOffset / Math.max(clientGroups.length, 1));
            
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
                  acvGrowthRate: group.acvGrowthRate,
                },
              });
            });

            setNodes(newNodes);
            // Preserve custom relationships but update default ones
            const defaultEdges = products
              .filter(p => p.revenueStream)
              .map(product => ({
                id: `stream-${product.streamId}-product-${product.id}`,
                source: `stream-${product.streamId}`,
                target: `product-${product.id}`,
                type: 'relationship',
                data: {
                  relationship: 'belongs_to',
                  properties: { entryWeight: product.entryWeight },
                },
              }));
            
            setEdges([...defaultEdges, ...existingCustomEdges]);
          } catch (error) {
            console.error('Failed to reload dependency graph data:', error);
          }
        }
        
        reloadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
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
          Visual representation of relationships between Revenue Streams, Products, and Client Groups
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
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
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
          editData={editingRelationship?.data?.properties || null}
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