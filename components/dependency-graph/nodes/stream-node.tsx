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
    <div className="bg-green-200 border-2 border-green-600 rounded-lg p-4 min-w-[200px] shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-4 w-4 text-green-800" />
        <div className="font-semibold text-green-950">Revenue Stream</div>
      </div>
      <div className="text-sm font-medium text-gray-900 mb-1">{data.name}</div>
      <div className="text-xs text-green-800 mb-1">{data.type}</div>
      {data.description && (
        <div className="text-xs text-gray-600 truncate">{data.description}</div>
      )}

      <Handle
        type="target"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-600 border-2 border-green-800"
        isValidConnection={(connection) => {
          const sourceType = connection.source?.split('-')[0];
          return sourceType === 'clientgroup' || sourceType === 'clientgrouptype';
        }}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-600 border-2 border-green-800"
        isValidConnection={(connection) => {
          const targetType = connection.target?.split('-')[0];
          return targetType === 'product' || targetType === 'clientgrouptype';
        }}
      />
    </div>
  );
}
