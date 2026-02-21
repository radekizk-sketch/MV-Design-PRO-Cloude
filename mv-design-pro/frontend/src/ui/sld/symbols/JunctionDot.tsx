/**
 * JunctionDot — Kropka polaczeniowa IEC 61082
 *
 * REGULA: Renderowana na KAZDYM T-junction i miedzy aparatami w lancuchu.
 * Potwierdza wizualnie polaczenie elektryczne.
 *
 * CANONICAL: IEC 61082 — "filled junction dot"
 */
import React from 'react';
import { JUNCTION_DOT_RADIUS } from '../IndustrialAesthetics';

export interface JunctionDotProps {
  x: number;
  y: number;
  color?: string;
  radius?: number;
}

export const JunctionDot: React.FC<JunctionDotProps> = ({
  x,
  y,
  color = 'currentColor',
  radius = JUNCTION_DOT_RADIUS,
}) => (
  <circle
    cx={x}
    cy={y}
    r={radius}
    fill={color}
    stroke="none"
    data-sld-role="junction-dot"
  />
);
