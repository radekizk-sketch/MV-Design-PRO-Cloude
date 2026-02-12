/**
 * Protection Engine v1 — SLD Overlay Adapter (PR-26)
 *
 * Maps ProtectionResultSetV1 to SLD overlay tokens.
 * Token-only: does NOT modify SLD geometry.
 *
 * INVARIANTS:
 * - Token-only rendering
 * - No hex colors (semantic tokens only)
 * - Deterministic: same input → same output
 * - Polish labels
 */

import type { ProtectionResultSetV1, RelayResultV1 } from './types';
import type { OverlayElement, OverlayPayloadV1 } from '../sld-overlay/overlayTypes';

/**
 * Build SLD overlay payload from Protection Engine v1 results.
 *
 * Creates overlay elements for each CB with relay attached,
 * showing function 51 trip time as numeric badge.
 *
 * @param result - Protection Engine v1 result set
 * @param activeTestPointId - Currently active test point (for filtering)
 * @returns OverlayPayloadV1 with protection trip time tokens
 */
export function buildProtectionOverlay(
  result: ProtectionResultSetV1,
  activeTestPointId?: string,
): OverlayPayloadV1 {
  const elements: OverlayElement[] = [];

  for (const relayResult of result.relay_results) {
    const overlayElement = buildRelayOverlayElement(
      relayResult,
      activeTestPointId,
    );
    if (overlayElement) {
      elements.push(overlayElement);
    }
  }

  // Sort deterministically by element_ref
  elements.sort((a, b) => a.element_ref.localeCompare(b.element_ref));

  return {
    run_id: result.deterministic_signature.slice(0, 16),
    analysis_type: 'PROTECTION',
    elements,
    legend: [
      {
        color_token: 'ok',
        label: 'Zabezpieczenie zadziala',
        description: 'Czas wylaczenia obliczony prawidlowo',
      },
      {
        color_token: 'inactive',
        label: 'Brak zadziałania',
        description: 'Prad ponizej nastawy rozruchowej',
      },
    ],
  };
}

function buildRelayOverlayElement(
  relayResult: RelayResultV1,
  activeTestPointId?: string,
): OverlayElement | null {
  // Find the active test point result
  let activeTP = relayResult.per_test_point[0]; // Default to first
  if (activeTestPointId) {
    const found = relayResult.per_test_point.find(
      (tp) => tp.point_id === activeTestPointId,
    );
    if (found) activeTP = found;
  }

  if (!activeTP) return null;

  const f51 = activeTP.function_results['51'];
  const f50 = activeTP.function_results['50'];

  // Determine visual state based on trip
  const hasTrip = f51 != null;
  const visualState = hasTrip ? 'OK' : 'INACTIVE';

  // Build numeric badges
  const numericBadges: Record<string, number | null> = {};
  if (f51) {
    numericBadges['t_51_s'] = f51.t_trip_s;
  }
  if (f50 && f50.picked_up && f50.t_trip_s != null) {
    numericBadges['t_50_s'] = f50.t_trip_s;
  }

  return {
    element_ref: relayResult.attached_cb_id,
    element_type: 'Switch',
    visual_state: visualState,
    numeric_badges: numericBadges,
    color_token: hasTrip ? 'ok' : 'inactive',
    stroke_token: 'normal',
    animation_token: null,
  };
}
