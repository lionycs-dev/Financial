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
    <div
      className="bg-green-100/50 border-4 border-green-400 rounded-full flex items-center justify-center relative"
      style={{
        width: '350px',
        height: '350px',
      }}
    >
      {/* Header at top of circle */}
      <div className="absolute top-8 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none z-10">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-700" />
          <div className="font-bold text-green-900 text-base">
            Revenue Stream
          </div>
        </div>
        <div className="text-sm font-medium text-green-800">{data.name}</div>
        <div className="text-xs text-green-700 italic">{data.type}</div>
      </div>

      {/* Connection handle on left side */}
      <Handle
        type="target"
        id={`stream_target`}
        position={Position.Left}
        className="w-4 h-4 bg-green-600 border-2 border-green-800"
        isValidConnection={(connection) => {
          const sourceType = connection.source?.split('-')[0];
          return (
            sourceType === 'clientgroup' || sourceType === 'clientgrouptype'
          );
        }}
      />
    </div>
  );
}
