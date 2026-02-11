/**
 * SLD Overlay Engine — PR-16 Deterministic Mapping
 *
 * CANONICAL ALIGNMENT:
 * - sld_rules.md § B: Results as Overlay (never modifies model)
 * - SYSTEM_SPEC.md: Overlay = pure projection of ResultSet
 *
 * PURPOSE:
 * Maps OverlayPayloadV1 elements to resolved CSS styles for SLD symbols.
 * This is a PURE FUNCTION layer — no side effects, no state, no physics.
 *
 * RULES:
 * - Match element_ref to symbol elementId
 * - Map visual_state → predefined style token
 * - Use ONLY color_token from token dictionary
 * - If element not found → ignore (no fallback)
 *
 * FORBIDDEN:
 * - if (voltage > 1.05) — NO physics thresholds
 * - if (current > rating) — NO physics comparisons
 * - Any physics interpretation whatsoever
 */

import type { AnySldSymbol } from '../sld-editor/types';
import type {
  OverlayPayloadV1,
  OverlayElement,
  ResolvedOverlayStyle,
} from './overlayTypes';
import {
  COLOR_TOKEN_MAP,
  STROKE_TOKEN_MAP,
  ANIMATION_TOKEN_MAP,
  VISUAL_STATE_STYLE,
} from './overlayTypes';

/**
 * Resolve a single OverlayElement to a CSS style descriptor.
 *
 * DETERMINISTIC: Same input → identical output. No randomness, no timestamps.
 *
 * @param element - Overlay element from backend
 * @returns Resolved style for rendering
 */
export function resolveElementStyle(element: OverlayElement): ResolvedOverlayStyle {
  const stateStyle = VISUAL_STATE_STYLE[element.visual_state];

  return {
    elementRef: element.element_ref,
    colorClass: COLOR_TOKEN_MAP[element.color_token] ?? COLOR_TOKEN_MAP['inactive'],
    strokeClass: STROKE_TOKEN_MAP[element.stroke_token] ?? STROKE_TOKEN_MAP['normal'],
    animationClass: element.animation_token
      ? (ANIMATION_TOKEN_MAP[element.animation_token] ?? '')
      : '',
    stateBg: stateStyle.bg,
    stateText: stateStyle.text,
    stateBorder: stateStyle.border,
    visualState: element.visual_state,
    numericBadges: element.numeric_badges,
  };
}

/**
 * Apply overlay to SLD symbols — produces a Map of elementId → ResolvedOverlayStyle.
 *
 * RULES:
 * - Only elements present in BOTH overlay AND symbols are included
 * - Missing overlay elements → ignored (no fallback styles)
 * - Missing symbols → ignored (overlay data discarded)
 * - Order is deterministic (based on overlay element order)
 *
 * @param symbols - Current SLD symbols
 * @param overlayPayload - Overlay payload from backend
 * @returns Map of elementId → resolved style
 */
export function applyOverlayToSymbols(
  symbols: readonly AnySldSymbol[],
  overlayPayload: OverlayPayloadV1
): Map<string, ResolvedOverlayStyle> {
  const result = new Map<string, ResolvedOverlayStyle>();

  // Build set of existing symbol elementIds for O(1) lookup
  const symbolElementIds = new Set<string>();
  for (const symbol of symbols) {
    symbolElementIds.add(symbol.elementId);
  }

  // Map overlay elements to resolved styles (only if symbol exists)
  for (const element of overlayPayload.elements) {
    if (symbolElementIds.has(element.element_ref)) {
      result.set(element.element_ref, resolveElementStyle(element));
    }
    // If element not in symbols → silently ignore (no fallback)
  }

  return result;
}

/**
 * Get overlay style for a specific element.
 *
 * @param styleMap - Pre-computed style map from applyOverlayToSymbols
 * @param elementId - Element ID to look up
 * @returns Resolved style or undefined if not in overlay
 */
export function getElementOverlayStyle(
  styleMap: Map<string, ResolvedOverlayStyle>,
  elementId: string
): ResolvedOverlayStyle | undefined {
  return styleMap.get(elementId);
}

/**
 * Format numeric badge value for display.
 *
 * DETERMINISTIC: Fixed decimal formatting, no locale-dependent behavior.
 *
 * @param value - Numeric value or null
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string or empty string for null
 */
export function formatBadgeValue(value: number | null, decimals: number = 2): string {
  if (value === null) return '';
  return value.toFixed(decimals);
}
