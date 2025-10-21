'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import { Tag, Link } from 'lucide-react';

interface ClientGroupTypeNodeData {
  id: string;
  name: string;
  type: 'B2B' | 'B2C' | 'DTC';
  description?: string;
  circleSize?: number;
}

export function ClientGroupTypeNode({
  data,
}: NodeProps<ClientGroupTypeNodeData>) {
  const size = data.circleSize || 350;

  return (
    <div
      className="bg-purple-100/50 border-4 border-purple-400 rounded-full flex items-center justify-center relative group"
      style={{
        width: `${size}px`,
        height: `${size}px`,
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

      {/* Drag handle indicator - visible on hover, positioned on the right */}
      <div className="absolute right-0 top-1/2 translate-x-8 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
        <div className="bg-purple-600 text-white rounded-full p-2 shadow-lg border-2 border-white">
          <Link className="w-4 h-4" strokeWidth={2.5} />
        </div>
      </div>

      {/* Connection handles - invisible but functional */}
      <Handle
        type="source"
        id="clientgrouptype_source"
        position={Position.Right}
        className="!w-8 !h-8 !bg-transparent !border-0 !opacity-100"
        style={{ right: '10px' }}
      />

      <Handle
        type="source"
        id="clientgrouptype_source_top"
        position={Position.Top}
        className="!w-8 !h-8 !bg-transparent !border-0 !opacity-100"
        style={{ top: '10px' }}
      />

      <Handle
        type="source"
        id="clientgrouptype_source_bottom"
        position={Position.Bottom}
        className="!w-8 !h-8 !bg-transparent !border-0 !opacity-100"
        style={{ bottom: '10px' }}
      />

      <Handle
        type="source"
        id="clientgrouptype_source_left"
        position={Position.Left}
        className="!w-8 !h-8 !bg-transparent !border-0 !opacity-100"
        style={{ left: '10px' }}
      />
    </div>
  );
}
