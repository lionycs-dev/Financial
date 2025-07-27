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
        stroke="#22c55e"
        strokeWidth={2}
        strokeDasharray="4,4"
        className="animated"
        d={edgePath}
      />
      <circle cx={toX} cy={toY} fill="#22c55e" r={3} />
    </g>
  );
}