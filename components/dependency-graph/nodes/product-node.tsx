'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import { Package } from 'lucide-react';

interface ProductNodeData {
  id: number;
  name: string;
  unitCost: string;
  cac: string;
}

export function ProductNode({ data }: NodeProps<ProductNodeData>) {
  return (
    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 min-w-[200px] shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Package className="h-4 w-4 text-green-600" />
        <div className="font-semibold text-green-900">Product</div>
      </div>
      <div className="text-sm font-medium text-gray-900 mb-2">{data.name}</div>
      <div className="space-y-1 text-xs text-gray-600">
        <div>Cost: ${data.unitCost}</div>
        <div>CAC: ${data.cac}</div>
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-green-400 border-2 border-green-600"
        isConnectable={(connection) => {
          const sourceType = connection.source?.split('-')[0];
          return sourceType === 'stream' || sourceType === 'product';
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-400 border-2 border-green-600"
        isConnectable={(connection) => {
          const targetType = connection.target?.split('-')[0];
          return targetType === 'clientgroup' || targetType === 'product';
        }}
      />
    </div>
  );
}