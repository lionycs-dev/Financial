'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import { Users } from 'lucide-react';

interface ClientGroupNodeData {
  id: number;
  name: string;
  startingCustomers: number;
  churnRate: string;
  acvGrowthRate: string;
}

export function ClientGroupNode({ data }: NodeProps<ClientGroupNodeData>) {
  return (
    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 min-w-[200px] shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-purple-600" />
        <div className="font-semibold text-purple-900">Client Group</div>
      </div>
      <div className="text-sm font-medium text-gray-900 mb-2">{data.name}</div>
      <div className="space-y-1 text-xs text-gray-600">
        <div>Customers: {data.startingCustomers}</div>
        <div>Churn: {(Number(data.churnRate) * 100).toFixed(1)}%</div>
        <div>ACV Growth: {(Number(data.acvGrowthRate) * 100).toFixed(1)}%</div>
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-purple-400 border-2 border-purple-600"
        isConnectable={(connection) => {
          const sourceType = connection.source?.split('-')[0];
          return sourceType === 'product';
        }}
      />
    </div>
  );
}