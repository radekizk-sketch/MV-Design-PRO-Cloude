/**
 * Vitest Test Setup
 *
 * Konfiguruje środowisko testowe dla React komponentów.
 */

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class IntersectionObserverMock {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

if (!('ResizeObserver' in globalThis)) {
  (globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver =
    ResizeObserverMock;
}

if (!('IntersectionObserver' in globalThis)) {
  (globalThis as typeof globalThis & { IntersectionObserver: typeof IntersectionObserverMock }).IntersectionObserver =
    IntersectionObserverMock;
}

if (!('matchMedia' in globalThis)) {
  (globalThis as typeof globalThis & { matchMedia: (query: string) => MediaQueryList }).matchMedia = (
    query: string,
  ): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

const DOMMatrixCtor = (globalThis as { DOMMatrix?: typeof DOMMatrix }).DOMMatrix;
if (!DOMMatrixCtor) {
  (globalThis as { DOMMatrix?: typeof DOMMatrix }).DOMMatrix = class {
    constructor(..._args: any[]) {}
  } as unknown as typeof DOMMatrix;
}

const canvasContextMock = {
  fillRect: () => {},
  clearRect: () => {},
  drawImage: () => {},
  getImageData: () => ({ data: [] }),
  putImageData: () => {},
  createImageData: () => [],
  setTransform: () => {},
  resetTransform: () => {},
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  stroke: () => {},
  translate: () => {},
  scale: () => {},
  rotate: () => {},
  arc: () => {},
  fill: () => {},
  measureText: () => ({ width: 0 }),
  canvas: document.createElement('canvas'),
};

const getContextMock = vi.fn((type: string) =>
  type === '2d' ? (canvasContextMock as unknown as CanvasRenderingContext2D) : null,
);

HTMLCanvasElement.prototype.getContext =
  getContextMock as unknown as typeof HTMLCanvasElement.prototype.getContext;
