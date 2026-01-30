/**
 * Protection Library Types (P14a - READ-ONLY)
 *
 * TypeScript interfaces for Protection Library browser.
 * All types are read-only references (no calculations, no settings derivation).
 */

export type ProtectionCategory = 'DEVICE' | 'CURVE' | 'TEMPLATE';

/**
 * Protection Device Type (relay, fuse, etc.)
 */
export interface ProtectionDeviceType {
  id: string;
  name_pl: string;
  vendor?: string;
  series?: string;
  revision?: string;
  rated_current_a?: number;
  notes_pl?: string;
}

/**
 * Protection Curve (time-current characteristic)
 */
export interface ProtectionCurve {
  id: string;
  name_pl: string;
  standard?: string;
  curve_kind?: string;
  parameters?: Record<string, any>;
}

/**
 * Protection Setting Template
 */
export interface ProtectionSettingTemplate {
  id: string;
  name_pl: string;
  device_type_ref?: string;
  curve_ref?: string;
  setting_fields?: Array<{
    name: string;
    unit?: string;
    min?: number;
    max?: number;
  }>;
}

export type ProtectionTypeUnion = ProtectionDeviceType | ProtectionCurve | ProtectionSettingTemplate;
