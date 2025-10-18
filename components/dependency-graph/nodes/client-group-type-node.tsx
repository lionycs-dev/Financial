'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import { Tag } from 'lucide-react';

interface ClientGroupTypeNodeData {
  id: string;
  name: string;
  type: 'B2B' | 'B2C' | 'DTC';
  description?: string;
}

export function ClientGroupTypeNode({
  data,
}: NodeProps<ClientGroupTypeNodeData>) {
  return (
    <div
      className="bg-purple-100/50 border-4 border-purple-400 rounded-full flex items-center justify-center relative"
      style={{
        width: '350px',
        height: '350px',
      }}
    >
      {/* Header at top of circle */}
      <div className="absolute top-8 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none z-10">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-purple-700" />
          <div className="font-bold text-purple-900 text-base">{data.type}</div>
        </div>
        <div className="text-sm font-medium text-purple-800">{data.name}</div>
      </div>

      {/* Connection handles - small and positioned with z-index */}
      <Handle
        type="source"
        id="clientgrouptype_source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-600 !border !border-purple-800 !z-50"
        style={{ right: '10px' }}
      />

      <Handle
        type="source"
        id="clientgrouptype_source_top"
        position={Position.Top}
        className="!w-3 !h-3 !bg-purple-600 !border !border-purple-800 !z-50"
        style={{ top: '10px' }}
      />

      <Handle
        type="source"
        id="clientgrouptype_source_bottom"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-purple-600 !border !border-purple-800 !z-50"
        style={{ bottom: '10px' }}
      />

      <Handle
        type="source"
        id="clientgrouptype_source_left"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-600 !border !border-purple-800 !z-50"
        style={{ left: '10px' }}
      />
    </div>
  );
}
