'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import { Users } from 'lucide-react';

interface ClientGroupNodeData {
  id: number;
  name: string;
  startingCustomers: number;
  churnRate: string;
  type: 'B2B' | 'B2C' | 'DTC';
}

export function ClientGroupNode({ data }: NodeProps<ClientGroupNodeData>) {
  return (
    <div
      className="bg-purple-300 border-3 border-purple-700 flex items-center justify-center relative shadow-lg"
      style={{
        width: '100px',
        height: '100px',
        transform: 'rotate(45deg)',
      }}
    >
      {/* Content rotated back to be readable */}
      <div
        className="flex flex-col items-center gap-0.5 pointer-events-none"
        style={{ transform: 'rotate(-45deg)' }}
      >
        <Users className="h-4 w-4 text-purple-900" />
        <div className="text-xs font-bold text-purple-950 text-center leading-tight max-w-[70px] truncate">
          {data.name}
        </div>
        <div className="text-[10px] text-purple-800">
          {data.startingCustomers}
        </div>
      </div>

      {/* Connection handles */}
      <Handle
        type="source"
        id={`clientgroup_to_diamond`}
        position={Position.Right}
        className="w-3 h-3 bg-purple-600 border-2 border-purple-800"
        style={{ right: '-6px', transform: 'rotate(-45deg)' }}
        isValidConnection={(connection) => {
          const targetType = connection.target?.split('-')[0];
          return targetType === 'product' || targetType === 'clientgroup';
        }}
      />

      <Handle
        type="target"
        id={`clientgroup_target`}
        position={Position.Left}
        className="w-3 h-3 bg-purple-600 border-2 border-purple-800"
        style={{ left: '-6px', transform: 'rotate(-45deg)' }}
      />
    </div>
  );
}
