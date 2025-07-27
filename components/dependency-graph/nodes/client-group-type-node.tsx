'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import { Tag } from 'lucide-react';

interface ClientGroupTypeNodeData {
  id: string;
  name: string;
  type: 'B2B' | 'B2C' | 'DTC';
  description?: string;
}

export function ClientGroupTypeNode({ data }: NodeProps<ClientGroupTypeNodeData>) {
  return (
    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4 min-w-[200px] shadow-sm text-indigo-900">
      <div className="flex items-center gap-2 mb-2">
        <Tag className="h-4 w-4 text-indigo-600" />
        <div className="font-semibold">Client Group Type</div>
      </div>
      <div className="text-sm font-medium text-gray-900 mb-1">{data.name}</div>
      <div className="text-xs opacity-75 mb-1">{data.type}</div>
      {data.description && (
        <div className="text-xs opacity-70 truncate">{data.description}</div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-indigo-400 border-2 border-indigo-600"
        isValidConnection={(connection) => {
          const sourceType = connection.source?.split('-')[0];
          return sourceType === 'product' || sourceType === 'stream';
        }}
      />

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-indigo-400 border-2 border-indigo-600"
        isValidConnection={(connection) => {
          const targetType = connection.target?.split('-')[0];
          return targetType === 'clientgroup';
        }}
      />
    </div>
  );
}