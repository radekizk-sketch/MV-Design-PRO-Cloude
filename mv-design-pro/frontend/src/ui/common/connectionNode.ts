/**
 * Kanoniczne rozpoznawanie identyfikatorów węzła przyłączenia.
 *
 * Zasada: elementy reprezentujące wyłącznie punkt/węzeł przyłączenia
 * nie mogą trafiać do URL selekcji ani do inspektora SLD.
 */

const CONNECTION_NODE_PATTERNS: readonly RegExp[] = [
  /connection_node/i,
  /^bus_connection_node/i,
  /^connection_/i,
  /_connection_node$/i,
  /punkt[_-]?przylaczenia/i,
];

export function isConnectionNodeLikeId(value: string | null | undefined): boolean {
  if (!value) return false;
  return CONNECTION_NODE_PATTERNS.some((pattern) => pattern.test(value));
}

