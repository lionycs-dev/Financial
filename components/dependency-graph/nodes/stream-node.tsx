'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import { TrendingUp } from 'lucide-react';

interface StreamNodeData {
  id: number;
  name: string;
  type: string;
  description?: string | null;
  circleSize?: number;
}

export function StreamNode({ data }: NodeProps<StreamNodeData>) {
  const size = data.circleSize || 350;

  return (
    <div
      className="bg-green-100/50 border-4 border-green-400 rounded-full flex items-center justify-center relative group"
      style={{
        width: `${size}px`,
        height: `${size}px`,
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

      {/* Connection handles - invisible but functional */}
      <Handle
        type="target"
        id="stream_target"
        position={Position.Left}
        className="!w-8 !h-8 !bg-transparent !border-0 !opacity-100"
        style={{ left: '10px' }}
      />

      <Handle
        type="target"
        id="stream_target_top"
        position={Position.Top}
        className="!w-8 !h-8 !bg-transparent !border-0 !opacity-100"
        style={{ top: '10px' }}
      />

      <Handle
        type="target"
        id="stream_target_bottom"
        position={Position.Bottom}
        className="!w-8 !h-8 !bg-transparent !border-0 !opacity-100"
        style={{ bottom: '10px' }}
      />

      <Handle
        type="target"
        id="stream_target_right"
        position={Position.Right}
        className="!w-8 !h-8 !bg-transparent !border-0 !opacity-100"
        style={{ right: '10px' }}
      />
    </div>
  );
}
