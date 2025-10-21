'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import { ShoppingCart } from 'lucide-react';

interface FirstPurchaseNodeData {
  relationshipId: number;
  sourceId: string;
  targetId: string;
  weight?: string;
}

/**
 * FirstPurchaseNode - Intermediate node that appears on first_purchase relationships.
 * This node acts as a connection point for upselling relationships.
 *
 * Visual: Small square box with shopping cart icon
 * Color: Magenta/Purple to match first_purchase edge color
 * Handles: Target (left) for first purchase edge, Source (right) for connection to product, Source (bottom) for upsell relationships
 */
export function FirstPurchaseNode({ data }: NodeProps<FirstPurchaseNodeData>) {
  return (
    <div className="relative">
      {/* Target handle - receives connection from client group */}
      <Handle
        type="target"
        position={Position.Left}
        id="first-purchase-target"
        className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white"
      />

      {/* Main node - square box */}
      <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 border-3 border-purple-700 rounded-lg shadow-lg flex items-center justify-center">
        <ShoppingCart className="w-8 h-8 text-white" strokeWidth={2.5} />
      </div>

      {/* Source handle for upsell - positioned at bottom for upsell relationships */}
      {/* This is the PRIMARY source handle (listed first so it's the default) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="upsell-source"
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white"
      />

      {/* Source handle - connects to target product (for the automatic first purchase edge) */}
      <Handle
        type="source"
        position={Position.Right}
        id="first-purchase-to-product"
        className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white"
      />

      {/* Weight label if present */}
      {data.weight && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-300 whitespace-nowrap">
          {(parseFloat(data.weight) * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
}
