// paths below api/, one entry per backend route
export const ENDPOINTS = {
  ivSurface: 'iv/surface',
  ivCurves: 'iv/curves',
  termStructure: 'iv/term-structure',
  skew: 'iv/skew',
  probCurves: 'prob/curves',
  greeksChain: 'greeks/chain',
  gexByStrike: 'gex/strike',
  oiByExpiration: 'oi/expiration',
  oiByStrike: 'oi/strike',
  volumeByStrike: 'volume/strike',
  stats: 'stats',
  spotHistory: 'spot/history',
} as const;

export type EndpointName = keyof typeof ENDPOINTS;
