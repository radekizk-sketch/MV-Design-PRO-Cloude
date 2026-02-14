/**
 * Hash parity test: FE SHA-256 == BE SHA-256 na wspolnym fixture.
 *
 * RUN #3I COMMIT N1:
 * - Wczytaj fixture JSON (identyczny w backend/tests/fixtures/).
 * - Oblicz hash w FE (computeConfigHash, SHA-256).
 * - Porownaj z zamrozonym expectedHash (wyliczonym przez backend).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  type SwitchgearConfigV1,
  computeConfigHash,
} from '../switchgearConfig';

// Load shared fixture
const fixturePath = resolve(__dirname, 'fixtures/switchgear_config_fixture_01.json');
const fixtureRaw = JSON.parse(readFileSync(fixturePath, 'utf-8'));

function fixtureToConfig(raw: typeof fixtureRaw): SwitchgearConfigV1 {
  const c = raw.config;
  return {
    configVersion: c.configVersion,
    stationId: c.stationId,
    fields: c.fields.map((f: Record<string, unknown>) => ({
      fieldId: f.fieldId,
      poleType: f.poleType,
      fieldRole: f.fieldRole,
      busSectionId: f.busSectionId ?? null,
    })),
    devices: c.devices.map((d: Record<string, unknown>) => ({
      deviceId: d.deviceId,
      fieldId: d.fieldId,
      deviceType: d.deviceType,
      aparatType: d.aparatType,
    })),
    catalogBindings: c.catalogBindings.map((b: Record<string, unknown>) => ({
      deviceId: b.deviceId,
      catalogId: b.catalogId,
      catalogName: b.catalogName,
      manufacturer: b.manufacturer ?? null,
      catalogVersion: b.catalogVersion ?? null,
    })),
    protectionBindings: c.protectionBindings.map((p: Record<string, unknown>) => ({
      relayDeviceId: p.relayDeviceId,
      cbDeviceId: p.cbDeviceId,
    })),
  };
}

describe('SwitchgearConfig hash parity FE==BE', () => {
  it('FE SHA-256 hash matches frozen expected hash from BE', () => {
    const config = fixtureToConfig(fixtureRaw);
    const feHash = computeConfigHash(config);
    expect(feHash).toBe(fixtureRaw.expectedHash);
  });

  it('hash is 64-char lowercase hex (SHA-256)', () => {
    const config = fixtureToConfig(fixtureRaw);
    const feHash = computeConfigHash(config);
    expect(feHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hash is stable across 50 iterations', () => {
    const config = fixtureToConfig(fixtureRaw);
    const reference = computeConfigHash(config);
    for (let i = 0; i < 50; i++) {
      expect(computeConfigHash(config)).toBe(reference);
    }
  });
});
