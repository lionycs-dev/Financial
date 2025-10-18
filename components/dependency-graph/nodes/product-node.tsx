'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import { Package } from 'lucide-react';

interface ProductNodeData {
  id: number;
  name: string;
  unitCost: string;
  productStreamId: number;
}

export function ProductNode({ data }: NodeProps<ProductNodeData>) {
  return (
    <div
      className="bg-green-300 border-3 border-green-700 flex items-center justify-center relative shadow-lg"
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
        <Package className="h-4 w-4 text-green-900" />
        <div className="text-xs font-bold text-green-950 text-center leading-tight max-w-[70px] truncate">
          {data.name}
        </div>
        <div className="text-[10px] text-green-800">${data.unitCost}</div>
      </div>

      {/* Connection handles - small and subtle */}
      <Handle
        type="target"
        id="product_target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-green-600 !border !border-green-800"
      />

      <Handle
        type="source"
        id="product_source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-green-600 !border !border-green-800"
      />

      <Handle
        type="target"
        id="product_target_top"
        position={Position.Top}
        className="!w-2 !h-2 !bg-green-600 !border !border-green-800"
      />

      <Handle
        type="source"
        id="product_source_bottom"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-green-600 !border !border-green-800"
      />
    </div>
  );
}
