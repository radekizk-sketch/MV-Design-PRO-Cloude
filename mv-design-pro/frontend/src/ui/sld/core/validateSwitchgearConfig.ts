/**
 * validateSwitchgearConfig — FE mirror walidacji konfiguracji rozdzielnicy.
 *
 * RUN #3I COMMIT 1: Mirror backendu (domain/switchgear_config.py).
 *
 * INVARIANTS:
 * - Te same kody i komunikaty co BE (stabilne PL).
 * - Te same reguly walidacji (bez heurystyk, bez auto-uzupelnien).
 * - Frontend uzywany do UX (natychmiastowy feedback), ale NIE zastepuje BE.
 * - Deterministyczny: ten sam config -> te same issues + fixActions.
 */

import {
  type DeviceTypeV1,
  DeviceTypeV1 as DT,
  type FieldRoleV1,
} from './fieldDeviceContracts';

import {
  type SwitchgearConfigV1,
  type ConfigValidationIssueV1,
  type ConfigFixActionV1,
  type SwitchgearConfigValidationResultV1,
  ConfigIssueSeverity,
  FixActionType,
  SwitchgearConfigValidationCode,
  REQUIRED_DEVICES,
  PV_BESS_SN_ROLES,
} from './switchgearConfig';

// =============================================================================
// VALIDATOR
// =============================================================================

/**
 * Waliduje konfiguracje rozdzielnicy (FE mirror BE).
 *
 * Reguly:
 * 1. Brak zduplikowanych ID pol i aparatow.
 * 2. Kazdy aparat musi byc przypisany do istniejacego pola.
 * 3. Kazdy aparat musi miec catalogRef (via catalogBindings).
 * 4. Pole musi miec wymagane aparaty (per FieldRole).
 * 5. Relay musi miec powiazanie z CB (via protectionBindings).
 * 6. PV/BESS na SN wymaga transformatora w polu.
 *
 * ZAKAZ heurystyk, auto-uzupelnien, domyslnych wartosci.
 */
export function validateSwitchgearConfig(
  config: SwitchgearConfigV1,
): SwitchgearConfigValidationResultV1 {
  const issues: ConfigValidationIssueV1[] = [];
  const fixActions: ConfigFixActionV1[] = [];

  const fieldIds = new Set(config.fields.map(f => f.fieldId));
  const deviceIds = new Set(config.devices.map(d => d.deviceId));
  const catalogBoundIds = new Set(config.catalogBindings.map(b => b.deviceId));
  const relayBoundIds = new Set(config.protectionBindings.map(p => p.relayDeviceId));

  // --- Rule 1: Duplicate field IDs ---
  const seenFieldIds = new Set<string>();
  for (const f of config.fields) {
    if (seenFieldIds.has(f.fieldId)) {
      issues.push({
        code: SwitchgearConfigValidationCode.FIELD_DUPLICATE_ID,
        severity: ConfigIssueSeverity.BLOCKER,
        messagePl: `Zduplikowane ID pola: ${f.fieldId}`,
        elementId: f.fieldId,
        fieldId: f.fieldId,
        deviceId: null,
      });
    }
    seenFieldIds.add(f.fieldId);
  }

  // --- Rule 1: Duplicate device IDs ---
  const seenDeviceIds = new Set<string>();
  for (const d of config.devices) {
    if (seenDeviceIds.has(d.deviceId)) {
      issues.push({
        code: SwitchgearConfigValidationCode.DEVICE_DUPLICATE_ID,
        severity: ConfigIssueSeverity.BLOCKER,
        messagePl: `Zduplikowane ID aparatu: ${d.deviceId}`,
        elementId: d.deviceId,
        fieldId: null,
        deviceId: d.deviceId,
      });
    }
    seenDeviceIds.add(d.deviceId);
  }

  // --- Rule 2: Device must belong to existing field ---
  for (const d of config.devices) {
    if (!fieldIds.has(d.fieldId)) {
      issues.push({
        code: SwitchgearConfigValidationCode.DEVICE_ORPHAN,
        severity: ConfigIssueSeverity.BLOCKER,
        messagePl: `Aparat ${d.deviceId}: brak pola o ID ${d.fieldId}`,
        elementId: d.deviceId,
        fieldId: d.fieldId,
        deviceId: d.deviceId,
      });
    }
  }

  // --- Rule 3: Catalog ref required for every device ---
  for (const d of config.devices) {
    if (!catalogBoundIds.has(d.deviceId)) {
      issues.push({
        code: SwitchgearConfigValidationCode.CATALOG_REF_MISSING,
        severity: ConfigIssueSeverity.BLOCKER,
        messagePl: `Brak referencji katalogowej dla aparatu ${d.deviceId} (${d.deviceType})`,
        elementId: d.deviceId,
        fieldId: d.fieldId,
        deviceId: d.deviceId,
      });
      fixActions.push({
        code: SwitchgearConfigValidationCode.CATALOG_REF_MISSING,
        action: FixActionType.NAVIGATE_TO_WIZARD_CATALOG_PICKER,
        messagePl: `Przypisz katalog do aparatu ${d.deviceId} (${d.deviceType})`,
        stationId: config.stationId,
        fieldId: d.fieldId,
        deviceId: d.deviceId,
      });
    }
  }

  // --- Rule 4: Required devices per field ---
  for (const f of config.fields) {
    const fieldDeviceTypes = new Set(
      config.devices.filter(d => d.fieldId === f.fieldId).map(d => d.deviceType),
    );
    const required: readonly DeviceTypeV1[] = REQUIRED_DEVICES[f.fieldRole] ?? [];
    for (const reqType of required) {
      if (!fieldDeviceTypes.has(reqType)) {
        issues.push({
          code: SwitchgearConfigValidationCode.FIELD_MISSING_REQUIRED_DEVICE,
          severity: ConfigIssueSeverity.BLOCKER,
          messagePl: `Pole ${f.fieldId} (${f.poleType}): brak wymaganego aparatu ${reqType}`,
          elementId: f.fieldId,
          fieldId: f.fieldId,
          deviceId: null,
        });
        fixActions.push({
          code: SwitchgearConfigValidationCode.FIELD_MISSING_REQUIRED_DEVICE,
          action: FixActionType.NAVIGATE_TO_WIZARD_FIELD,
          messagePl: `Dodaj aparat ${reqType} do pola ${f.fieldId}`,
          stationId: config.stationId,
          fieldId: f.fieldId,
          deviceId: null,
        });
      }
    }
  }

  // --- Rule 5: Relay must have protection binding ---
  const relayDevices = config.devices.filter(d => d.deviceType === DT.RELAY);
  for (const relay of relayDevices) {
    if (!relayBoundIds.has(relay.deviceId)) {
      issues.push({
        code: SwitchgearConfigValidationCode.PROTECTION_BINDING_MISSING,
        severity: ConfigIssueSeverity.BLOCKER,
        messagePl: `Zabezpieczenie ${relay.deviceId}: brak powiazania z wylacznikiem (CB)`,
        elementId: relay.deviceId,
        fieldId: relay.fieldId,
        deviceId: relay.deviceId,
      });
      fixActions.push({
        code: SwitchgearConfigValidationCode.PROTECTION_BINDING_MISSING,
        action: FixActionType.NAVIGATE_TO_WIZARD_PROTECTION,
        messagePl: `Przypisz zabezpieczenie ${relay.deviceId} do wylacznika CB`,
        stationId: config.stationId,
        fieldId: relay.fieldId,
        deviceId: relay.deviceId,
      });
    }
  }

  // --- Rule 6: PV/BESS SN fields need transformer ---
  for (const f of config.fields) {
    if (PV_BESS_SN_ROLES.has(f.fieldRole as FieldRoleV1)) {
      const fieldDevices = config.devices.filter(d => d.fieldId === f.fieldId);
      const hasTransformer = fieldDevices.some(
        d => d.deviceType === DT.TRANSFORMER_DEVICE,
      );
      if (!hasTransformer) {
        issues.push({
          code: SwitchgearConfigValidationCode.PV_BESS_TRANSFORMER_MISSING,
          severity: ConfigIssueSeverity.WARNING,
          messagePl: `Pole ${f.fieldId} (${f.poleType}): generator PV/BESS wymaga transformatora (SN/nN lub blokowego)`,
          elementId: f.fieldId,
          fieldId: f.fieldId,
          deviceId: null,
        });
      }
    }
  }

  // --- Orphan catalog bindings ---
  for (const b of config.catalogBindings) {
    if (!deviceIds.has(b.deviceId)) {
      issues.push({
        code: SwitchgearConfigValidationCode.CATALOG_BINDING_ORPHAN,
        severity: ConfigIssueSeverity.WARNING,
        messagePl: `Powiazanie katalogowe: brak aparatu o ID ${b.deviceId}`,
        elementId: b.deviceId,
        fieldId: null,
        deviceId: b.deviceId,
      });
    }
  }

  // --- Orphan protection bindings ---
  for (const p of config.protectionBindings) {
    if (!deviceIds.has(p.relayDeviceId)) {
      issues.push({
        code: SwitchgearConfigValidationCode.PROTECTION_BINDING_ORPHAN,
        severity: ConfigIssueSeverity.WARNING,
        messagePl: `Powiazanie ochronne: brak aparatu o ID ${p.relayDeviceId}`,
        elementId: p.relayDeviceId,
        fieldId: null,
        deviceId: p.relayDeviceId,
      });
    }
    if (!deviceIds.has(p.cbDeviceId)) {
      issues.push({
        code: SwitchgearConfigValidationCode.PROTECTION_BINDING_ORPHAN,
        severity: ConfigIssueSeverity.WARNING,
        messagePl: `Powiazanie ochronne: brak aparatu o ID ${p.cbDeviceId}`,
        elementId: p.cbDeviceId,
        fieldId: null,
        deviceId: p.cbDeviceId,
      });
    }
  }

  // Sort issues deterministically
  const sortedIssues = [...issues].sort((a, b) => {
    const cmp1 = a.severity.localeCompare(b.severity);
    if (cmp1 !== 0) return cmp1;
    const cmp2 = a.code.localeCompare(b.code);
    if (cmp2 !== 0) return cmp2;
    const cmp3 = (a.elementId ?? '').localeCompare(b.elementId ?? '');
    if (cmp3 !== 0) return cmp3;
    const cmp4 = (a.fieldId ?? '').localeCompare(b.fieldId ?? '');
    if (cmp4 !== 0) return cmp4;
    return (a.deviceId ?? '').localeCompare(b.deviceId ?? '');
  });

  const sortedFixActions = [...fixActions].sort((a, b) => {
    const cmp1 = a.code.localeCompare(b.code);
    if (cmp1 !== 0) return cmp1;
    const cmp2 = a.stationId.localeCompare(b.stationId);
    if (cmp2 !== 0) return cmp2;
    const cmp3 = (a.fieldId ?? '').localeCompare(b.fieldId ?? '');
    if (cmp3 !== 0) return cmp3;
    return (a.deviceId ?? '').localeCompare(b.deviceId ?? '');
  });

  const hasBlockers = sortedIssues.some(
    i => i.severity === ConfigIssueSeverity.BLOCKER,
  );

  return {
    valid: !hasBlockers,
    issues: sortedIssues,
    fixActions: sortedFixActions,
  };
}
