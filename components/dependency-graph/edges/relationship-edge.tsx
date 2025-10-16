'use client';

import { EdgeProps, EdgeLabelRenderer, getSmoothStepPath } from 'reactflow';

interface RelationshipEdgeData {
  relationship: string;
  properties?: Record<string, string | number>;
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
  // Get edge styling based on relationship type
  const getEdgeStyle = () => {
    const relationshipType = data?.relationship || '';

    // first_purchase - Purple/Magenta solid
    if (relationshipType === 'first_purchase') {
      return {
        strokeWidth: 3,
        strokeDasharray: '',
        stroke: '#d946ef', // magenta/purple
        showArrow: true,
      };
    }

    // existing_relationship - Yellow solid
    if (relationshipType === 'existing_relationship') {
      return {
        strokeWidth: 3,
        strokeDasharray: '',
        stroke: '#fbbf24', // yellow
        showArrow: true,
      };
    }

    // upselling - Blue dashed
    if (relationshipType === 'upselling') {
      return {
        strokeWidth: 3,
        strokeDasharray: '5,5',
        stroke: '#3b82f6', // blue
        showArrow: true,
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

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    console.log('Edge right-clicked:', {
      id,
      relationship: data?.relationship,
    });

    // Create context menu
    const menu = document.createElement('div');
    menu.className =
      'fixed bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;

    // Edit option
    const editOption = document.createElement('button');
    editOption.className =
      'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100';
    editOption.textContent = 'Edit Relationship';
    editOption.onclick = () => {
      if (data?.onEdit) {
        data.onEdit(id, data);
      }
      document.body.removeChild(menu);
    };

    // Delete option
    const deleteOption = document.createElement('button');
    deleteOption.className =
      'block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50';
    deleteOption.textContent = 'Delete Relationship';
    deleteOption.onclick = () => {
      if (data?.onDelete) {
        data.onDelete(id);
      }
      document.body.removeChild(menu);
    };

    menu.appendChild(editOption);
    menu.appendChild(deleteOption);
    document.body.appendChild(menu);

    // Remove menu when clicking elsewhere
    const removeMenu = () => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
      }
      document.removeEventListener('click', removeMenu);
    };

    setTimeout(() => document.addEventListener('click', removeMenu), 0);
  };

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
      </defs>
      <path
        id={id}
        style={{
          stroke: edgeStyle.stroke,
          strokeWidth: edgeStyle.strokeWidth,
          strokeDasharray: edgeStyle.strokeDasharray,
        }}
        className="react-flow__edge-path hover:opacity-80 cursor-context-menu"
        d={edgePath}
        markerEnd={edgeStyle.showArrow ? `url(#arrowhead-${id})` : undefined}
        onContextMenu={onContextMenu}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 10,
            pointerEvents: 'all',
          }}
          className="nodrag nopan bg-white px-2 py-1 rounded border text-xs text-gray-600 hover:bg-gray-50 cursor-context-menu"
          onContextMenu={onContextMenu}
        >
          {data?.relationship || 'relationship'}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
