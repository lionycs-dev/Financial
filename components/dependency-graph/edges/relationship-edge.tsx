'use client';

import { EdgeProps, EdgeLabelRenderer, getSmoothStepPath } from 'reactflow';

interface RelationshipEdgeData {
  relationship: string;
  properties?: Record<string, string | number>;
  isAutomatic?: boolean;
  onEdit?: (id: string, data: RelationshipEdgeData) => void;
  onDelete?: (id: string) => void;
}

export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<RelationshipEdgeData>) {
  // Get edge styling first to know if we need to adjust for arrow
  const getEdgeStyle = () => {
    const relationshipType = data?.relationship || '';
    const isAutomatic = data?.isAutomatic || false;

    // Automatic structural relationships
    if (isAutomatic) {
      if (relationshipType === 'belongs_to') {
        return {
          strokeWidth: 4,
          strokeDasharray: '8,4',
          stroke: '#10b981',
          showArrow: true,
        };
      }
      if (relationshipType === 'belongs_to_type') {
        return {
          strokeWidth: 4,
          strokeDasharray: '6,3',
          stroke: '#8b5cf6',
          showArrow: true,
        };
      }
    }

    // User-created relationships
    const clientGroupRelationships = [
      'clientgroup_to_product',
      'clientgroup_to_stream',
      'clientgrouptype_to_product',
      'clientgrouptype_to_stream',
    ];

    if (clientGroupRelationships.includes(relationshipType)) {
      return {
        strokeWidth: 2,
        strokeDasharray: '',
        // stroke: '#3b82f6',
        showArrow: false,
      };
    }

    if (relationshipType.includes('product')) {
      return {
        strokeWidth: 2,
        strokeDasharray: '10,5',
        stroke: '#f59e0b',
        showArrow: true,
        animation: 'dash 2s linear infinite',
      };
    }

    // Default style
    return {
      strokeWidth: 2,
      strokeDasharray: '',
      stroke: '#6b7280',
      showArrow: true,
    };
  };

  const edgeStyle = getEdgeStyle();

  // Adjust target position only if there's an arrow to prevent dash showing through
  let finalTargetX = targetX;
  let finalTargetY = targetY;

  if (edgeStyle.showArrow) {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const arrowLength = 12;

    if (distance > 0) {
      finalTargetX = targetX - (dx / distance) * arrowLength;
      finalTargetY = targetY - (dy / distance) * arrowLength;
    }
  }

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX: finalTargetX,
    targetY: finalTargetY,
    targetPosition,
  });

  return (
    <>
      <defs>
        <marker
          id={`arrowhead-${id}`}
          markerWidth="12"
          markerHeight="8"
          refX="0"
          refY="4"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <polygon points="0 0, 12 4, 0 8" fill={edgeStyle.stroke} />
        </marker>
        {edgeStyle.animation && (
          <style>
            {`
              @keyframes dash {
                to {
                  stroke-dashoffset: -15;
                }
              }
              .animated-${id} {
                animation: ${edgeStyle.animation};
              }
            `}
          </style>
        )}
      </defs>
      <path
        id={id}
        style={{
          stroke: edgeStyle.stroke,
          strokeWidth: edgeStyle.strokeWidth,
          strokeDasharray: edgeStyle.strokeDasharray,
        }}
        className={`react-flow__edge-path hover:opacity-80 ${edgeStyle.animation ? `animated-${id}` : ''}`}
        d={edgePath}
        markerEnd={edgeStyle.showArrow ? `url(#arrowhead-${id})` : undefined}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 10,
            pointerEvents: 'all',
          }}
          className="nodrag nopan bg-white px-2 py-1 rounded border text-xs text-gray-600 hover:bg-gray-50"
        >
          {data?.relationship || 'relationship'}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
