'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import { TrendingUp } from 'lucide-react';

interface StreamNodeData {
  id: number;
  name: string;
  type: string;
  description?: string | null;
}

export function StreamNode({ data }: NodeProps<StreamNodeData>) {
  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 min-w-[200px] shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-4 w-4 text-blue-600" />
        <div className="font-semibold text-blue-900">Revenue Stream</div>
      </div>
      <div className="text-sm font-medium text-gray-900 mb-1">{data.name}</div>
      <div className="text-xs text-blue-700 mb-1">{data.type}</div>
      {data.description && (
        <div className="text-xs text-gray-600 truncate">{data.description}</div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-400 border-2 border-blue-600"
        isValidConnection={(connection) => {
          const sourceType = connection.source?.split('-')[0];
          return sourceType === 'clientgroup';
        }}
      />

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-400 border-2 border-blue-600"
        isValidConnection={(connection) => {
          const targetType = connection.target?.split('-')[0];
          return targetType === 'product';
        }}
      />
    </div>
  );
}
