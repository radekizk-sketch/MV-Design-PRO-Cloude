/**
 * TreeEtapSymbolIcon — Wrapper symboli ETAP dla Project Tree
 *
 * P9: PowerFactory-style Project Tree ETAP symbol icons
 *
 * CANONICAL ALIGNMENT:
 * - EtapSymbolRenderer.tsx: Źródło symboli SVG
 * - SymbolResolver.ts: Definicje EtapSymbolId
 * - treeSymbolMap.ts: Mapowanie TreeNodeType → EtapSymbolId
 *
 * DESIGN PRINCIPLES:
 * - Monochromatyczne ikony (currentColor)
 * - Rozmiar dostosowany do drzewa (14-18px)
 * - Spójny styl z ETAP/PowerFactory
 * - Dostępność: aria-label po polsku
 */

import React from 'react';
import { EtapSymbol } from '../sld/EtapSymbolRenderer';
import type { EtapSymbolId } from '../sld/SymbolResolver';

export interface TreeEtapSymbolIconProps {
  /** ID symbolu ETAP */
  symbolId: EtapSymbolId;
  /** Rozmiar ikony w pikselach (domyślnie 16) */
  size?: number;
  /** Tryb wyciszony - zmniejszona widoczność (domyślnie false) */
  muted?: boolean;
  /** Tytuł/tooltip po polsku */
  title?: string;
  /** Dodatkowe klasy CSS */
  className?: string;
}

/**
 * Wrapper symboli ETAP dla Project Tree.
 *
 * Renderuje symbol ETAP w kontenerze SVG z odpowiednimi
 * stylami dla wyświetlania w drzewie projektu.
 *
 * Użycie:
 * ```tsx
 * <TreeEtapSymbolIcon
 *   symbolId="busbar"
 *   size={16}
 *   title="Szyna zbiorcza"
 * />
 * ```
 */
export const TreeEtapSymbolIcon: React.FC<TreeEtapSymbolIconProps> = ({
  symbolId,
  size = 16,
  muted = false,
  title,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`inline-block flex-shrink-0 ${muted ? 'opacity-50' : ''} ${className}`}
      style={{ color: 'currentColor' }}
      role="img"
      aria-label={title}
    >
      {title && <title>{title}</title>}
      <EtapSymbol
        symbolId={symbolId}
        stroke="currentColor"
        fill="none"
        size={100}
        strokeWidth={4}
      />
    </svg>
  );
};

export default TreeEtapSymbolIcon;
