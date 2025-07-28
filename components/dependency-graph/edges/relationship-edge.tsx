'use client';

import {
  EdgeProps,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from 'reactflow';

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
  style = {},
  data,
}: EdgeProps<RelationshipEdgeData>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine edge styling based on relationship type
  const isAutomatic = data?.isAutomatic || false;
  const relationshipType = data?.relationship || '';
  
  // Base styles
  let strokeWidth = 2;
  let strokeDasharray = '';
  let stroke = '#6b7280'; // gray-500
  let animation = '';
  
  if (isAutomatic) {
    if (relationshipType === 'belongs_to') {
      strokeWidth = 4; // Thicker for belongs_to
      strokeDasharray = '8,4'; // Longer dashes
      stroke = '#10b981'; // green-500
    } else if (relationshipType === 'belongs_to_type') {
      strokeWidth = 3;
      strokeDasharray = '6,3';
      stroke = '#8b5cf6'; // purple-500
    }
  } else {
    // User-created relationships
    if (relationshipType.includes('product')) {
      // Product relationships get animation
      animation = 'dash 2s linear infinite';
      strokeDasharray = '10,5';
      stroke = '#f59e0b'; // amber-500
    }
  }

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('Edge right-clicked:', { id, relationship: data?.relationship });
    
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'fixed bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    
    // Edit option
    const editOption = document.createElement('button');
    editOption.className = 'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100';
    editOption.textContent = 'Edit Relationship';
    editOption.onclick = () => {
      if (data?.onEdit) {
        data.onEdit(id, data);
      }
      document.body.removeChild(menu);
    };
    
    // Delete option
    const deleteOption = document.createElement('button');
    deleteOption.className = 'block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50';
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

  return (
    <>
      <defs>
        <marker
          id={`arrowhead-${id}`}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={stroke}
          />
        </marker>
        {animation && (
          <style>
            {`
              @keyframes dash {
                to {
                  stroke-dashoffset: -15;
                }
              }
              .animated-${id} {
                animation: ${animation};
              }
            `}
          </style>
        )}
      </defs>
      <path
        id={id}
        style={{
          ...style,
          stroke,
          strokeWidth,
          strokeDasharray,
        }}
        className={`react-flow__edge-path hover:opacity-80 cursor-context-menu ${animation ? `animated-${id}` : ''}`}
        d={edgePath}
        markerEnd={`url(#arrowhead-${id})`}
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