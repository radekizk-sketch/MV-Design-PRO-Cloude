/**
 * Type Catalog Types
 *
 * CANONICAL ALIGNMENT:
 * - SYSTEM_SPEC.md § 4: Type Catalog (Library)
 * - ADR-007: Type Library Strategy
 * - backend/src/network_model/catalog/types.py (source of truth)
 *
 * These types mirror backend catalog structures for UI consumption.
 */

/**
 * Base type for all catalog types.
 */
export interface CatalogType {
  id: string;
  name: string;
  manufacturer?: string;
}

/**
 * Line Type (overhead line).
 * Source: backend LineType dataclass.
 */
export interface LineType extends CatalogType {
  r_ohm_per_km: number;
  x_ohm_per_km: number;
  b_us_per_km: number;
  rated_current_a: number;
  standard?: string;
  max_temperature_c: number;
  voltage_rating_kv: number;
  conductor_material?: string;
  cross_section_mm2: number;
}

/**
 * Cable Type (underground cable).
 * Source: backend CableType dataclass.
 */
export interface CableType extends CatalogType {
  r_ohm_per_km: number;
  x_ohm_per_km: number;
  c_nf_per_km: number;
  rated_current_a: number;
  voltage_rating_kv: number;
  insulation_type?: string;
  standard?: string;
  conductor_material?: string;
  cross_section_mm2: number;
  max_temperature_c: number;
}

/**
 * Transformer Type.
 * Source: backend TransformerType dataclass.
 */
export interface TransformerType extends CatalogType {
  rated_power_mva: number;
  voltage_hv_kv: number;
  voltage_lv_kv: number;
  uk_percent: number;
  pk_kw: number;
  i0_percent: number;
  p0_kw: number;
  vector_group: string;
  cooling_class?: string;
  tap_min: number;
  tap_max: number;
  tap_step_percent: number;
}

/**
 * Switch Equipment Type.
 * Source: backend SwitchEquipmentType dataclass.
 */
export interface SwitchEquipmentType extends CatalogType {
  equipment_kind: string;
  un_kv: number;
  in_a: number;
  ik_ka: number;
  icw_ka: number;
  medium?: string;
}

/**
 * Converter Type (PV/Wind/BESS inverter).
 * Source: backend ConverterType dataclass.
 */
export interface ConverterType extends CatalogType {
  kind: 'PV' | 'WIND' | 'BESS';
  un_kv: number;
  sn_mva: number;
  pmax_mw: number;
  qmin_mvar?: number;
  qmax_mvar?: number;
  cosphi_min?: number;
  cosphi_max?: number;
  e_kwh?: number;
}

/**
 * Measurement Transformer Type (CT/VT).
 * Derived from backend MeasurementRating + catalog patterns.
 */
export interface MeasurementTransformerType extends CatalogType {
  measurement_kind: 'CT' | 'VT';
  ratio_primary: number;
  ratio_secondary: number;
  accuracy_class: string;
  burden_va: number;
}

/**
 * Protection Device Type.
 * Source: backend ProtectionDeviceType dataclass.
 */
export interface ProtectionDeviceType extends CatalogType {
  vendor?: string;
  series?: string;
  rated_current_a?: number;
}

/**
 * Union of all catalog type categories.
 */
export type TypeCategory = 'LINE' | 'CABLE' | 'TRANSFORMER' | 'SWITCH_EQUIPMENT'
  | 'CONVERTER' | 'MEASUREMENT_TRANSFORMER' | 'PROTECTION_DEVICE';

/**
 * Type reference in element (points to catalog).
 */
export interface TypeReference {
  type_ref: string | null; // UUID or null
  type_name?: string; // Resolved name for display
  type_category?: TypeCategory;
}
