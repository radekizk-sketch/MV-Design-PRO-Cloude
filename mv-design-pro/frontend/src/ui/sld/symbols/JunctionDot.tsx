/**
 * JunctionDot — Kropka polaczeniowa IEC 61082
 *
 * REGULA: Renderowana na KAZDYM T-junction i miedzy aparatami w lancuchu.
 * Potwierdza wizualnie polaczenie elektryczne.
 *
 * CANONICAL: IEC 61082 — "filled junction dot"
 *
 * VARIANTS:
 * - FILLED: Standard junction (T-junction, apparatus connection) — default
 * - HOLLOW: Open/disconnected junction point
 * - SMALL: Compact variant for dense apparatus chains
 */
import React from 'react';
import { JUNCTION_DOT_RADIUS } from '../IndustrialAesthetics';

/** Junction dot visual variant per IEC 61082. */
export type JunctionDotVariant = 'FILLED' | 'HOLLOW' | 'SMALL';

export interface JunctionDotProps {
  x: number;
  y: number;
  color?: string;
  radius?: number;
  /** Visual variant (default: FILLED) */
  variant?: JunctionDotVariant;
}

export const JunctionDot: React.FC<JunctionDotProps> = ({
  x,
  y,
  color = 'currentColor',
  radius = JUNCTION_DOT_RADIUS,
  variant = 'FILLED',
}) => {
  const effectiveRadius = variant === 'SMALL' ? radius * 0.6 : radius;
  const isFilled = variant !== 'HOLLOW';

  return (
    <circle
      cx={x}
      cy={y}
      r={effectiveRadius}
      fill={isFilled ? color : 'none'}
      stroke={isFilled ? 'none' : color}
      strokeWidth={isFilled ? 0 : 1.5}
      data-sld-role="junction-dot"
      data-testid={`junction-dot-${x}-${y}`}
      style={{ transition: 'opacity 0.15s ease' }}
    />
  );
};
