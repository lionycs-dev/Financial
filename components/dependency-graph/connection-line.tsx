'use client';

import { ConnectionLineType, getSmoothStepPath } from 'reactflow';

interface ConnectionLineProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  connectionLineType: ConnectionLineType;
}

export function ConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
}: ConnectionLineProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    targetX: toX,
    targetY: toY,
  });

  return (
    <g>
      <path
        fill="none"
        stroke="#6b7280"
        strokeWidth={2}
        d={edgePath}
      />
      <circle cx={toX} cy={toY} fill="#6b7280" r={3} />
    </g>
  );
}