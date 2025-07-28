'use client';

import {
  EdgeProps,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from 'reactflow';

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
      <path
        id={id}
        style={style}
        className="react-flow__edge-path stroke-2 stroke-gray-400 hover:stroke-gray-600 cursor-context-menu"
        d={edgePath}
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