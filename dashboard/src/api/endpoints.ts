// paths below api/, one entry per consumed backend route
export const ENDPOINTS = {
  ivCurves: 'iv/curves',
  termStructure: 'iv/term-structure',
  skew: 'iv/skew',
  probCurves: 'prob/curves',
  oiByExpiry: 'oi/expiry',
  oiByStrike: 'oi/strike',
  volumeByStrike: 'volume/strike',
  oiChangeByStrike: 'oi/strike-change',
  maxPain: 'oi/max-pain',
  exposureByStrike: 'exposure/strike',
  smileHistory: 'iv/smile-history',
  rvCone: 'vol/cone',
  flowByStrike: 'flow/strike',
  flowByExpiry: 'flow/expiry',
  flowTape: 'flow/tape',
  expiryOutcomes: 'prob/expiry-outcomes',
  historyVol: 'history/vol',
  historyPositioning: 'history/positioning',
  cmBands: 'history/cm-bands',
  stats: 'stats',
  spotHistory: 'spot/history',
  reports: 'report/weekly',
} as const;

export type EndpointName = keyof typeof ENDPOINTS;
